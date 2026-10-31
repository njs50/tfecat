#!/usr/bin/env bash
# Wait until the njs50/tcat-preview preview for this push is deployed, then
# record that on the tfecat commit:
#   - commit status context tcat-preview/pages-build-deployment
#   - one sticky PR comment containing that workflow's status badge
#
# Deployed means the Pages build for PREVIEW_SHA is "built" (Pages API).
# If the PAT cannot read Pages, a successful pages-build-deployment run for
# that same SHA is enough. TCAT_PREVIEW_PAT is tried first (it needs Actions
# and Pages read); public Actions is the fallback. DRY_RUN=1 prints the
# status and comment instead of calling gh.
set -euo pipefail

PREVIEW_REPO="${PREVIEW_REPO:-njs50/tcat-preview}"
STATUS_CONTEXT="tcat-preview/pages-build-deployment"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-30}"
SLEEP_SECONDS="${SLEEP_SECONDS:-10}"

: "${PREVIEW_SHA:?PREVIEW_SHA is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${GITHUB_REF_NAME:?GITHUB_REF_NAME is required}"

if [ -z "$MAX_ATTEMPTS" ]; then MAX_ATTEMPTS=30; fi
if [ -z "$SLEEP_SECONDS" ]; then SLEEP_SECONDS=10; fi

command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }
command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
if [ "${DRY_RUN:-}" != "1" ]; then
  command -v gh >/dev/null || { echo "gh is required" >&2; exit 1; }
fi

if [[ ! "$PREVIEW_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo "PREVIEW_SHA must be a 40-character git sha" >&2
  exit 1
fi
PREVIEW_SHA=$(printf '%s' "$PREVIEW_SHA" | tr '[:upper:]' '[:lower:]')

API_ROOT="https://api.github.com/repos/${PREVIEW_REPO}"
WORKFLOW_URL="https://github.com/${PREVIEW_REPO}/actions/workflows/pages/pages-build-deployment"
BADGE_URL="${WORKFLOW_URL}/badge.svg?branch=gh-pages"
PREVIEW_SITE="https://njs50.github.io/tcat-preview/"

BODY_FILE=$(mktemp)
RESP_FILE=$(mktemp)
trap 'rm -f "$BODY_FILE" "$RESP_FILE"' EXIT

PAT_UNUSABLE=0
PAT_WARNED=0

curl_http() {
  local out="$1"
  local url="$2"
  shift 2
  local http rc
  set +e
  http=$(curl -sS \
    -H "Accept: application/vnd.github+json" \
    -H "User-Agent: tfecat-preview-deploy" \
    "$@" \
    -o "$out" \
    -w "%{http_code}" \
    "$url")
  rc=$?
  set -e
  if [ "$rc" -ne 0 ] || [ -z "$http" ]; then
    printf '000'
    return 0
  fi
  printf '%s' "$http"
}

# github_get URL DEST — PAT first, then unauthenticated. Exit 1 if neither is HTTP 200.
github_get() {
  local url="$1"
  local dest="$2"
  local tmp http
  tmp=$(mktemp)
  if [ -n "${TCAT_PREVIEW_PAT:-}" ] && [ "$PAT_UNUSABLE" != "1" ]; then
    http=$(curl_http "$tmp" "$url" -H "Authorization: Bearer ${TCAT_PREVIEW_PAT}")
    if [ "$http" = "200" ]; then
      cat "$tmp" > "$dest"
      rm -f "$tmp"
      return 0
    fi
    if [ "$PAT_WARNED" != "1" ]; then
      echo "tcat-preview API with PAT returned HTTP ${http}; trying public access" >&2
      PAT_WARNED=1
    fi
    case "$http" in
      401|403|429) PAT_UNUSABLE=1 ;;
    esac
  fi
  http=$(curl_http "$tmp" "$url")
  if [ "$http" = "200" ]; then
    cat "$tmp" > "$dest"
    rm -f "$tmp"
    return 0
  fi
  echo "GET ${url} failed: HTTP ${http}" >&2
  rm -f "$tmp"
  return 1
}

post_status() {
  local state="$1"
  local description="$2"
  local target_url="$3"
  if [ "${DRY_RUN:-}" = "1" ]; then
    printf 'status state=%s description=%s target_url=%s\n' "$state" "$description" "$target_url"
    return 0
  fi
  jq -n \
    --arg state "$state" \
    --arg description "$description" \
    --arg target_url "$target_url" \
    --arg context "$STATUS_CONTEXT" \
    '{state:$state, description:$description, target_url:$target_url, context:$context}' \
    | gh api --method POST "repos/${GITHUB_REPOSITORY}/statuses/${GITHUB_SHA}" --input - >/dev/null
}

write_comment() {
  local state="$1"
  local target_url="$2"
  local description="$3"
  local label short src_short
  short="${PREVIEW_SHA:0:7}"
  src_short="${GITHUB_SHA:0:7}"
  case "$state" in
    success)
      if [ "$description" = "Preview deployed" ]; then
        label="deployed"
      else
        label="succeeded"
      fi
      ;;
    failure) label="failed" ;;
    *) label="did not finish" ;;
  esac
  # Markdown backticks in the format strings are literal.
  # shellcheck disable=SC2016
  {
    printf '%s\n' '<!-- tcat-preview-pages-status -->'
    printf '[![pages build and deployment](%s)](%s)\n' "$BADGE_URL" "$WORKFLOW_URL"
    printf '\n'
    printf '[Open preview](%s) · this push **%s** ([pages build](%s), `gh-pages` `%s`)\n' \
      "$PREVIEW_SITE" "$label" "$target_url" "$short"
    printf '\n'
    printf 'Source `%s` @ `%s`. The badge follows the latest Pages build on the shared preview.\n' \
      "$GITHUB_REF_NAME" "$src_short"
  } > "$BODY_FILE"
}

upsert_comment() {
  local prs pr existing
  if [ "${DRY_RUN:-}" = "1" ]; then
    printf '%s\n' '--- comment ---'
    cat "$BODY_FILE"
    printf '%s\n' '--- end comment ---'
    return 0
  fi
  prs=$(gh pr list --repo "$GITHUB_REPOSITORY" --head "$GITHUB_REF_NAME" --state open --json number --jq '.[].number') || {
    echo "warning: could not list pull requests for ${GITHUB_REF_NAME}" >&2
    return 0
  }
  if [ -z "$prs" ]; then
    echo "No open pull request for ${GITHUB_REF_NAME}; skipping Pages badge comment."
    return 0
  fi
  while IFS= read -r pr; do
    [ -n "$pr" ] || continue
    existing=$(gh api --paginate "repos/${GITHUB_REPOSITORY}/issues/${pr}/comments" \
      --jq '.[] | select(.body | contains("<!-- tcat-preview-pages-status -->")) | .id' \
      | tail -n 1) || {
      echo "warning: could not list comments on PR #${pr}" >&2
      continue
    }
    if [ -n "$existing" ]; then
      jq -n --rawfile body "$BODY_FILE" '{body:$body}' \
        | gh api --method PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/${existing}" --input - >/dev/null || {
        echo "warning: could not update Pages badge comment on PR #${pr}" >&2
        continue
      }
      echo "Updated Pages badge comment on PR #${pr}."
    else
      jq -n --rawfile body "$BODY_FILE" '{body:$body}' \
        | gh api --method POST "repos/${GITHUB_REPOSITORY}/issues/${pr}/comments" --input - >/dev/null || {
        echo "warning: could not create Pages badge comment on PR #${pr}" >&2
        continue
      }
      echo "Posted Pages badge comment on PR #${pr}."
    fi
  done <<< "$prs"
}

finish() {
  local state="$1"
  local description="$2"
  local target_url="$3"
  post_status "$state" "$description" "$target_url"
  write_comment "$state" "$target_url" "$description"
  upsert_comment
  echo "tcat-preview pages-build-deployment: ${state} (${description})"
  if [ "$state" != "success" ]; then
    exit 1
  fi
  exit 0
}

description_for() {
  case "$1" in
    success) printf '%s' "Pages build succeeded" ;;
    failure) printf '%s' "Pages build failed" ;;
    cancelled) printf '%s' "Pages build cancelled" ;;
    timed_out) printf '%s' "Pages build timed out" ;;
    *) printf '%s' "Pages build ${1:-failed}" ;;
  esac
}

# Pages API status for PREVIEW_SHA: built, building, queued, errored, missing, unavailable.
read_pages() {
  PAGES_STATUS="unavailable"
  PAGES_ERROR=""
  if ! github_get "${API_ROOT}/pages/builds?per_page=20" "$RESP_FILE"; then
    return 0
  fi
  PAGES_STATUS=$(jq -r --arg sha "$PREVIEW_SHA" '
    (if type == "array" then . else [] end)
    | map(select((.commit // "" | ascii_downcase) == $sha))[0].status // "missing"
  ' "$RESP_FILE" 2>/dev/null) || PAGES_STATUS="unavailable"
  PAGES_ERROR=$(jq -r --arg sha "$PREVIEW_SHA" '
    (if type == "array" then . else [] end)
    | map(select((.commit // "" | ascii_downcase) == $sha))[0].error.message // ""
  ' "$RESP_FILE" 2>/dev/null || true)
  if [ "$PAGES_ERROR" = "null" ]; then
    PAGES_ERROR=""
  fi
}

# Workflow run for PREVIEW_SHA. RUN_STATUS is completed, in_progress, queued,
# missing, or unavailable.
read_run() {
  RUN_STATUS=""
  RUN_CONCLUSION=""
  RUN_URL=""
  if [ -z "${workflow_id:-}" ]; then
    return 0
  fi
  if ! github_get "$runs_url" "$RESP_FILE"; then
    RUN_STATUS="unavailable"
    return 0
  fi
  local run
  run=$(jq -c --arg sha "$PREVIEW_SHA" \
    '[.workflow_runs // [] | .[] | select((.head_sha // "" | ascii_downcase) == $sha)][0] // empty' \
    "$RESP_FILE" 2>/dev/null) || {
    RUN_STATUS="unavailable"
    return 0
  }
  if [ -z "$run" ]; then
    RUN_STATUS="missing"
    return 0
  fi
  RUN_STATUS=$(printf '%s' "$run" | jq -r '.status // empty')
  RUN_CONCLUSION=$(printf '%s' "$run" | jq -r '.conclusion // empty')
  RUN_URL=$(printf '%s' "$run" | jq -r '.html_url // empty')
}

resolve_workflow_id() {
  if [ -n "${workflow_id:-}" ]; then
    return 0
  fi
  if ! github_get "${API_ROOT}/actions/workflows?per_page=100" "$RESP_FILE"; then
    return 0
  fi
  workflow_id=$(jq -r \
    '[.workflows[]? | select(.name == "pages-build-deployment" and .state == "active")][0].id // empty' \
    "$RESP_FILE" 2>/dev/null || true)
  if [ -n "$workflow_id" ]; then
    runs_url="${API_ROOT}/actions/workflows/${workflow_id}/runs?branch=gh-pages&per_page=20"
  fi
}

post_status "pending" "Waiting for tcat-preview Pages build" "$WORKFLOW_URL"
pending_target="$WORKFLOW_URL"
workflow_id=""
runs_url=""
last_run_url=""
attempt=1

while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  resolve_workflow_id
  read_pages
  read_run

  if [ -n "$RUN_URL" ]; then
    last_run_url="$RUN_URL"
    if [ "$RUN_STATUS" != "completed" ] && [ "$RUN_URL" != "$pending_target" ]; then
      pending_target="$RUN_URL"
      post_status "pending" "Waiting for tcat-preview Pages build" "$RUN_URL"
    fi
  fi
  target="${last_run_url:-$WORKFLOW_URL}"
  echo "pages=${PAGES_STATUS} workflow=${RUN_STATUS:-none}${RUN_CONCLUSION:+/}${RUN_CONCLUSION} (attempt ${attempt}/${MAX_ATTEMPTS})"

  if [ "$PAGES_STATUS" = "errored" ]; then
    desc="Preview deploy failed"
    if [ -n "$PAGES_ERROR" ]; then
      desc="Preview deploy failed: ${PAGES_ERROR}"
      desc="${desc:0:140}"
    fi
    finish "failure" "$desc" "$target"
  fi
  if [ "$RUN_STATUS" = "completed" ] && [ "$RUN_CONCLUSION" != "success" ] && [ "$PAGES_STATUS" != "built" ]; then
    finish "failure" "$(description_for "$RUN_CONCLUSION")" "$target"
  fi
  if [ "$PAGES_STATUS" = "built" ]; then
    finish "success" "Preview deployed" "$target"
  fi
  # Pages API is private; a successful workflow run is enough when we cannot read it.
  if [ "$PAGES_STATUS" = "unavailable" ] && [ "$RUN_STATUS" = "completed" ] && [ "$RUN_CONCLUSION" = "success" ]; then
    finish "success" "Pages build succeeded" "$target"
  fi

  pages_down=0
  runs_down=0
  if [ "$PAGES_STATUS" = "unavailable" ]; then pages_down=1; fi
  if [ -z "${workflow_id:-}" ] || [ "$RUN_STATUS" = "unavailable" ]; then runs_down=1; fi
  if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
    if [ "$pages_down" = "1" ] && [ "$runs_down" = "1" ]; then
      finish "error" "Could not read tcat-preview Pages status" "$target"
    fi
    if [ "$RUN_STATUS" = "completed" ] && [ "$RUN_CONCLUSION" = "success" ]; then
      finish "success" "Pages build succeeded" "$target"
    fi
    finish "error" "Timed out waiting for preview deploy" "$target"
  fi
  attempt=$((attempt + 1))
  sleep "$SLEEP_SECONDS"
done

finish "error" "Timed out waiting for preview deploy" "${last_run_url:-$WORKFLOW_URL}"
