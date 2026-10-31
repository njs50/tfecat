#!/usr/bin/env bash
# Exercises report-preview-pages-status.sh against a fake GitHub API.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SCRIPT="$ROOT/.github/scripts/report-preview-pages-status.sh"
PREVIEW_SHA=$(printf 'a%.0s' {1..40})
GITHUB_SHA=$(printf 'b%.0s' {1..40})
PASS=0
unset TCAT_PREVIEW_PAT MOCK_PAT_HTTP MAX_ATTEMPTS || true

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if ! grep -F -q -- "$needle" <<<"$haystack"; then
    printf '%s\n' "$haystack" >&2
    fail "${label}: missing [${needle}]"
  fi
}

run_case() {
  local name="$1"
  local mode="$2"
  local expect_rc="$3"
  local tmp bin err out rc pat_env
  tmp=$(mktemp -d)
  bin="$tmp/bin"
  err="$tmp/err"
  mkdir -p "$bin"
  cat > "$bin/curl" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
out=""
url=""
auth=0
prev=""
for arg in "$@"; do
  if [ "$prev" = "-o" ]; then out="$arg"; prev=""; continue; fi
  if [ "$prev" = "-w" ]; then prev=""; continue; fi
  if [ "$prev" = "-H" ]; then
    case "$arg" in
      Authorization:*) auth=1 ;;
    esac
    prev=""
    continue
  fi
  case "$arg" in
    -o) prev="-o" ;;
    -w) prev="-w" ;;
    -H) prev="-H" ;;
    -sS|-s|-S|-f|-L) ;;
    http://*|https://*) url="$arg" ;;
  esac
done
printf 'auth=%s %s\n' "$auth" "$url" >> "${MOCK_LOG:?}"
code=200
if [ "${MOCK_MODE:-}" = "httpfail" ]; then
  code=500
elif [ "$auth" = "1" ] && [ -n "${MOCK_PAT_HTTP:-}" ]; then
  code="$MOCK_PAT_HTTP"
fi
if [ "$code" != "200" ]; then
  printf '%s\n' '{"message":"nope"}' > "$out"
  printf '%s' "$code"
  exit 0
fi
if [[ "$url" == *"/runs?"* ]]; then
  status="completed"
  conclusion="success"
  sha="${PREVIEW_SHA:?}"
  case "${MOCK_MODE:-success}" in
    failure) conclusion="failure" ;;
    cancelled) conclusion="cancelled" ;;
    timed_out) conclusion="timed_out" ;;
    timeout) status="queued"; conclusion="null" ;;
    othersha) sha="cccccccccccccccccccccccccccccccccccccccc" ;;
    delay)
      hits=0
      if [ -s "${MOCK_HITS:?}" ]; then hits=$(cat "$MOCK_HITS"); fi
      printf '%s' "$((hits + 1))" > "$MOCK_HITS"
      if [ "$hits" -lt 2 ]; then
        status="in_progress"
        conclusion="null"
      fi
      ;;
  esac
  jq -n --arg sha "$sha" --arg status "$status" --arg conclusion "$conclusion" \
    '{workflow_runs:[{head_sha:$sha,status:$status,conclusion:(if $conclusion=="null" then null else $conclusion end),html_url:"https://github.com/njs50/tcat-preview/actions/runs/999"}]}' \
    > "$out"
elif [[ "$url" == *"/actions/workflows?"* ]]; then
  if [ "${MOCK_MODE:-}" = "noworkflow" ]; then
    printf '%s\n' '{"workflows":[]}' > "$out"
  else
    printf '%s\n' '{"workflows":[{"id":402696036,"name":"pages-build-deployment","state":"active"}]}' > "$out"
  fi
else
  printf '%s\n' '{"message":"unexpected url"}' > "$out"
  printf '404'
  exit 0
fi
printf '%s' "200"
EOF
  cat > "$bin/gh" << 'EOF'
#!/usr/bin/env bash
echo "gh should not be called in DRY_RUN: $*" >&2
exit 99
EOF
  chmod +x "$bin/curl" "$bin/gh"
  : > "$tmp/log"
  : > "$tmp/hits"
  pat_env=()
  if [ -n "${TCAT_PREVIEW_PAT:-}" ]; then
    pat_env+=(TCAT_PREVIEW_PAT="$TCAT_PREVIEW_PAT")
  fi
  set +e
  out=$(
    env "${pat_env[@]}" \
      DRY_RUN=1 \
      MOCK_MODE="$mode" \
      MOCK_LOG="$tmp/log" \
      MOCK_HITS="$tmp/hits" \
      MOCK_PAT_HTTP="${MOCK_PAT_HTTP:-}" \
      PREVIEW_SHA="$PREVIEW_SHA" \
      GITHUB_SHA="$GITHUB_SHA" \
      GITHUB_REPOSITORY="njs50/tfecat" \
      GITHUB_REF_NAME="cursor/example-e482" \
      MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}" \
      SLEEP_SECONDS=0 \
      PATH="$bin:$PATH" \
      bash "$SCRIPT" 2>"$err"
  )
  rc=$?
  set -e
  if [ "$rc" != "$expect_rc" ]; then
    echo "---- stdout ----" >&2
    printf '%s\n' "$out" >&2
    echo "---- stderr ----" >&2
    cat "$err" >&2
    fail "${name}: exit ${rc}, expected ${expect_rc}"
  fi
  CASE_OUT="$out"
  CASE_ERR=$(cat "$err")
  CASE_LOG=$(cat "$tmp/log")
  PASS=$((PASS + 1))
  echo "ok ${name}"
}

run_case "success" "success" 0
assert_contains "$CASE_OUT" "status state=pending description=Waiting for tcat-preview Pages build" "success pending"
assert_contains "$CASE_OUT" "status state=success description=Pages build succeeded target_url=https://github.com/njs50/tcat-preview/actions/runs/999" "success final"
assert_contains "$CASE_OUT" "<!-- tcat-preview-pages-status -->" "success marker"
assert_contains "$CASE_OUT" "https://github.com/njs50/tcat-preview/actions/workflows/pages/pages-build-deployment/badge.svg?branch=gh-pages" "success badge"
assert_contains "$CASE_OUT" "https://njs50.github.io/tcat-preview/" "success preview url"
assert_contains "$CASE_OUT" "this push **succeeded**" "success label"
assert_contains "$CASE_OUT" "Source \`cursor/example-e482\` @ \`bbbbbbb\`" "success source"
pending_line=$(grep -n 'state=pending' <<<"$CASE_OUT" | head -1 | cut -d: -f1)
success_line=$(grep -n 'state=success' <<<"$CASE_OUT" | head -1 | cut -d: -f1)
if [ "$pending_line" -ge "$success_line" ]; then
  fail "pending status should be posted before success"
fi

run_case "failure" "failure" 1
assert_contains "$CASE_OUT" "status state=failure description=Pages build failed target_url=https://github.com/njs50/tcat-preview/actions/runs/999" "failure status"
assert_contains "$CASE_OUT" "this push **failed**" "failure label"

run_case "cancelled" "cancelled" 1
assert_contains "$CASE_OUT" "status state=failure description=Pages build cancelled" "cancelled status"

run_case "timed out conclusion" "timed_out" 1
assert_contains "$CASE_OUT" "status state=failure description=Pages build timed out" "timed_out status"

MAX_ATTEMPTS=2 run_case "still queued" "timeout" 1
assert_contains "$CASE_OUT" "status state=error description=Timed out waiting for Pages build target_url=https://github.com/njs50/tcat-preview/actions/runs/999" "timeout status"
assert_contains "$CASE_OUT" "this push **did not finish**" "timeout label"
unset MAX_ATTEMPTS

MAX_ATTEMPTS=2 run_case "ignores other commits" "othersha" 1
assert_contains "$CASE_OUT" "pages build not started (attempt 1/2)" "other sha ignored"
assert_contains "$CASE_OUT" "status state=error description=Timed out waiting for Pages build target_url=https://github.com/njs50/tcat-preview/actions/workflows/pages/pages-build-deployment" "other sha timeout url"
unset MAX_ATTEMPTS

run_case "delay" "delay" 0
assert_contains "$CASE_OUT" "pages build status=in_progress (attempt 1/3)" "delay progress"
assert_contains "$CASE_OUT" "status state=pending description=Waiting for tcat-preview Pages build target_url=https://github.com/njs50/tcat-preview/actions/runs/999" "delay pending run"
assert_contains "$CASE_OUT" "status state=success description=Pages build succeeded" "delay success"

run_case "missing workflow" "noworkflow" 1
assert_contains "$CASE_OUT" "status state=error description=pages-build-deployment workflow not found" "missing workflow"
if grep -F -q '/runs?' <<<"$CASE_LOG"; then
  fail "missing workflow should not poll runs"
fi

run_case "api error" "httpfail" 1
assert_contains "$CASE_OUT" "pages workflow list failed (attempt 1/3)" "api retry"
assert_contains "$CASE_OUT" "status state=error description=Could not read tcat-preview Pages workflow" "api error"

TCAT_PREVIEW_PAT=fake-token MOCK_PAT_HTTP=403 run_case "pat falls back to public api" "success" 0
assert_contains "$CASE_ERR" "tcat-preview API with PAT returned HTTP 403; trying public access" "pat warning"
warns=$(grep -c 'trying public access' <<<"$CASE_ERR" || true)
if [ "$warns" != "1" ]; then
  fail "expected one PAT fallback warning, got ${warns}"
fi
if ! grep -F -q 'auth=1 ' <<<"$CASE_LOG"; then
  fail "expected an authenticated request"
fi
if ! grep -F -q 'auth=0 ' <<<"$CASE_LOG"; then
  fail "expected a public request after PAT 403"
fi
unset TCAT_PREVIEW_PAT MOCK_PAT_HTTP

set +e
bad=$(
  env DRY_RUN=1 \
    PREVIEW_SHA="not-a-sha" \
    GITHUB_SHA="$GITHUB_SHA" \
    GITHUB_REPOSITORY="njs50/tfecat" \
    GITHUB_REF_NAME="cursor/example-e482" \
    bash "$SCRIPT" 2>&1
)
bad_rc=$?
set -e
if [ "$bad_rc" = "0" ]; then
  fail "invalid sha should fail"
fi
assert_contains "$bad" "PREVIEW_SHA must be a 40-character git sha" "invalid sha"
PASS=$((PASS + 1))
echo "ok invalid sha"

echo "${PASS} tests passed"
