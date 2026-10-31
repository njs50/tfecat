#!/usr/bin/env bash
# Exercises report-preview-pages-status.sh against a fake GitHub API.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SCRIPT="$ROOT/.github/scripts/report-preview-pages-status.sh"
PREVIEW_SHA=$(printf 'a%.0s' {1..40})
GITHUB_SHA=$(printf 'b%.0s' {1..40})
PASS=0
unset TCAT_PREVIEW_PAT MOCK_PAT_HTTP MOCK_PAGES MOCK_RUNS MOCK_WORKFLOWS MAX_ATTEMPTS || true

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

assert_not_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if grep -F -q -- "$needle" <<<"$haystack"; then
    printf '%s\n' "$haystack" >&2
    fail "${label}: unexpectedly found [${needle}]"
  fi
}

run_case() {
  local name="$1"
  local expect_rc="$2"
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
if [ "$auth" = "1" ] && [ -n "${MOCK_PAT_HTTP:-}" ]; then
  code="$MOCK_PAT_HTTP"
elif [[ "$url" == *"/pages/builds?"* ]] && [ "${MOCK_PAGES:-}" = "httpfail" ]; then
  code=500
elif [[ "$url" == *"/runs?"* ]] && [ "${MOCK_RUNS:-}" = "httpfail" ]; then
  code=500
elif [[ "$url" == *"/actions/workflows?"* ]] && [ "${MOCK_WORKFLOWS:-}" = "httpfail" ]; then
  code=500
fi
if [ "$code" != "200" ]; then
  printf '%s\n' '{"message":"nope"}' > "$out"
  printf '%s' "$code"
  exit 0
fi
sha="${PREVIEW_SHA:?}"
if [[ "$url" == *"/pages/builds?"* ]]; then
  page_sha="$sha"
  page_status="built"
  page_error=""
  case "${MOCK_PAGES:-built}" in
    building|queued) page_status="$MOCK_PAGES" ;;
    errored) page_status="errored"; page_error="Page build failed." ;;
    missing) page_sha="dddddddddddddddddddddddddddddddddddddddd"; page_status="built" ;;
    delay)
      hits=0
      if [ -s "${MOCK_HITS:?}" ]; then hits=$(cat "$MOCK_HITS"); fi
      printf '%s' "$((hits + 1))" > "$MOCK_HITS"
      if [ "$hits" -lt 2 ]; then page_status="building"; else page_status="built"; fi
      ;;
    other) page_sha="cccccccccccccccccccccccccccccccccccccccc"; page_status="built" ;;
  esac
  jq -n --arg sha "$page_sha" --arg status "$page_status" --arg error "$page_error" \
    '[{commit:$sha,status:$status,error:{message:(if $error=="" then null else $error end)}}]' > "$out"
elif [[ "$url" == *"/runs?"* ]]; then
  run_sha="$sha"
  status="completed"
  conclusion="success"
  case "${MOCK_RUNS:-success}" in
    failure) conclusion="failure" ;;
    cancelled) conclusion="cancelled" ;;
    timed_out) conclusion="timed_out" ;;
    queued) status="queued"; conclusion="null" ;;
    missing) run_sha="dddddddddddddddddddddddddddddddddddddddd" ;;
    other) run_sha="cccccccccccccccccccccccccccccccccccccccc" ;;
  esac
  jq -n --arg sha "$run_sha" --arg status "$status" --arg conclusion "$conclusion" \
    '{workflow_runs:[{head_sha:$sha,status:$status,conclusion:(if $conclusion=="null" then null else $conclusion end),html_url:"https://github.com/njs50/tcat-preview/actions/runs/999"}]}' \
    > "$out"
elif [[ "$url" == *"/actions/workflows?"* ]]; then
  if [ "${MOCK_WORKFLOWS:-}" = "empty" ]; then
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
      MOCK_PAGES="${MOCK_PAGES:-built}" \
      MOCK_RUNS="${MOCK_RUNS:-success}" \
      MOCK_WORKFLOWS="${MOCK_WORKFLOWS:-}" \
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

MOCK_PAGES=built MOCK_RUNS=success run_case "pages built" 0
assert_contains "$CASE_OUT" "status state=pending description=Waiting for tcat-preview Pages build" "built pending"
assert_contains "$CASE_OUT" "status state=success description=Preview deployed target_url=https://github.com/njs50/tcat-preview/actions/runs/999" "built final"
assert_contains "$CASE_OUT" "<!-- tcat-preview-pages-status -->" "built marker"
assert_contains "$CASE_OUT" "https://github.com/njs50/tcat-preview/actions/workflows/pages/pages-build-deployment/badge.svg?branch=gh-pages" "built badge"
assert_contains "$CASE_OUT" "https://njs50.github.io/tcat-preview/" "built preview url"
assert_contains "$CASE_OUT" "this push **deployed**" "built label"
assert_contains "$CASE_OUT" "Source \`cursor/example-e482\` @ \`bbbbbbb\`" "built source"
unset MOCK_PAGES MOCK_RUNS

MOCK_PAGES=built MOCK_RUNS=missing run_case "pages built without workflow run" 0
assert_contains "$CASE_OUT" "status state=success description=Preview deployed target_url=https://github.com/njs50/tcat-preview/actions/workflows/pages/pages-build-deployment" "built no run"
unset MOCK_PAGES MOCK_RUNS

MOCK_PAGES=built MOCK_RUNS=httpfail MOCK_WORKFLOWS=empty run_case "pages built when workflows are unreadable" 0
assert_contains "$CASE_OUT" "description=Preview deployed" "pages only"
unset MOCK_PAGES MOCK_RUNS MOCK_WORKFLOWS

MOCK_PAGES=httpfail MOCK_RUNS=success run_case "workflow success when pages api is down" 0
assert_contains "$CASE_OUT" "status state=success description=Pages build succeeded target_url=https://github.com/njs50/tcat-preview/actions/runs/999" "workflow only"
assert_contains "$CASE_OUT" "this push **succeeded**" "workflow only label"
unset MOCK_PAGES MOCK_RUNS

MOCK_PAGES=building MOCK_RUNS=failure run_case "workflow failed" 1
assert_contains "$CASE_OUT" "status state=failure description=Pages build failed" "workflow failed"
assert_not_contains "$CASE_OUT" "attempt 2/3" "workflow failed waits"
unset MOCK_PAGES MOCK_RUNS

MOCK_PAGES=building MOCK_RUNS=cancelled run_case "workflow cancelled" 1
assert_contains "$CASE_OUT" "description=Pages build cancelled" "cancelled"
unset MOCK_PAGES MOCK_RUNS

MOCK_PAGES=errored MOCK_RUNS=queued run_case "pages errored" 1
assert_contains "$CASE_OUT" "status state=failure description=Preview deploy failed: Page build failed." "pages error"
unset MOCK_PAGES MOCK_RUNS

MOCK_PAGES=delay MOCK_RUNS=success run_case "waits until pages built" 0
assert_contains "$CASE_OUT" "pages=building workflow=completed/success (attempt 1/3)" "still building"
assert_contains "$CASE_OUT" "description=Preview deployed" "eventually deployed"
assert_not_contains "$CASE_OUT" "description=Pages build succeeded" "does not stop at workflow success"
unset MOCK_PAGES MOCK_RUNS

MAX_ATTEMPTS=2 MOCK_PAGES=building MOCK_RUNS=queued run_case "still building" 1
assert_contains "$CASE_OUT" "status state=pending description=Waiting for tcat-preview Pages build target_url=https://github.com/njs50/tcat-preview/actions/runs/999" "queued pending run"
assert_contains "$CASE_OUT" "status state=error description=Timed out waiting for preview deploy target_url=https://github.com/njs50/tcat-preview/actions/runs/999" "building timeout"
unset MAX_ATTEMPTS MOCK_PAGES MOCK_RUNS

MAX_ATTEMPTS=2 MOCK_PAGES=other MOCK_RUNS=other run_case "ignores other commits" 1
assert_contains "$CASE_OUT" "pages=missing workflow=missing (attempt 1/2)" "other sha"
assert_contains "$CASE_OUT" "target_url=https://github.com/njs50/tcat-preview/actions/workflows/pages/pages-build-deployment" "other sha url"
unset MAX_ATTEMPTS MOCK_PAGES MOCK_RUNS

MOCK_PAGES=httpfail MOCK_RUNS=httpfail run_case "both apis down" 1
assert_contains "$CASE_OUT" "status state=error description=Could not read tcat-preview Pages status" "both down"
unset MOCK_PAGES MOCK_RUNS

TCAT_PREVIEW_PAT=fake-token MOCK_PAT_HTTP=403 MOCK_PAGES=httpfail MOCK_RUNS=success run_case "pat falls back to public actions" 0
assert_contains "$CASE_ERR" "tcat-preview API with PAT returned HTTP 403; trying public access" "pat warning"
warns=$(grep -c 'trying public access' <<<"$CASE_ERR" || true)
if [ "$warns" != "1" ]; then
  fail "expected one PAT fallback warning, got ${warns}"
fi
assert_contains "$CASE_OUT" "description=Pages build succeeded" "public actions success"
if ! grep -F -q 'auth=1 ' <<<"$CASE_LOG"; then
  fail "expected an authenticated request"
fi
if ! grep -F -q 'auth=0 ' <<<"$CASE_LOG"; then
  fail "expected a public request after PAT 403"
fi
unset TCAT_PREVIEW_PAT MOCK_PAT_HTTP MOCK_PAGES MOCK_RUNS

TCAT_PREVIEW_PAT=fake-token MOCK_PAGES=built MOCK_RUNS=success run_case "pat reads pages and workflows" 0
assert_contains "$CASE_OUT" "description=Preview deployed" "pat deployed"
if grep -F -q 'auth=0 ' <<<"$CASE_LOG"; then
  fail "a working PAT should not fall back to public access"
fi
unset TCAT_PREVIEW_PAT MOCK_PAGES MOCK_RUNS

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
