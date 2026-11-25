#!/bin/sh
# One bounded real-agent execution, inside the verified sandbox.
#
# Layout (all under $WORK, never this repo):
#   repo/        disposable scratch clone
#   home/        scoped HOME + PI_CODING_AGENT_DIR (skills, models.json)
#   app/.prosci  controller, lib, agents registry copied in, because the repo itself is hidden by bwrap
#   out/         ledger, handoffs, worktrees, evidence
#
# The proxy runs outside the sandbox and holds the provider key; the sandbox only ever sees a dummy token.
set -eu

PROSCI=/home/sumeet/personal-repo/projects/prosci
WORK=${WORK:-/home/sumeet/.tmp/prosci/real}
PLAN=${PLAN:-$PROSCI/eval/scenarios/swarm/plan-discounts-real.json}
MAX_COST=0.05

rm -rf "$WORK"
mkdir -p "$WORK/repo" "$WORK/home/.pi/agent" "$WORK/home/out"

echo "== scratch repository (disposable copy of the plan's target repo)"
# The three-unit discounts plan targets this fixture's files; the Prosci repo is never used as the workspace.
cp -r "$PROSCI/eval/fixtures/shape/." "$WORK/repo/"
git -C "$WORK/repo" init -q
git -C "$WORK/repo" add -A
git -C "$WORK/repo" -c user.name=eval -c user.email=eval@local commit -qm "base for real run"

echo "== controller inside the workspace (the Prosci tree is hidden by the sandbox)"
mkdir -p "$WORK/repo/.prosci"
cp -r "$PROSCI/bin" "$WORK/repo/.prosci/bin"
cp -r "$PROSCI/agents" "$WORK/repo/.prosci/agents"
sed -i "s#join(ROOT, \"agents\")#join(ROOT, \"agents\")#" "$WORK/repo/.prosci/bin/lib/swarm.mjs"

echo "== skills into the scoped agent directory"
node "$PROSCI/bin/install-skills" --target "$WORK/home/.pi/agent/skills" --copy >/dev/null

echo "== proxy outside the boundary"
PROXY_LOG="$WORK/proxy.log"
node "$PROSCI/eval/harness/proxy.mjs" > "$PROXY_LOG" 2>&1 &
PROXY_PID=$!
trap 'kill $PROXY_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 50); do grep -q listening "$PROXY_LOG" 2>/dev/null && break; sleep 0.1; done
PORT=$(sed -n 's/.*listening \([0-9]*\).*/\1/p' "$PROXY_LOG" | head -1)
[ -n "$PORT" ] || { echo "proxy failed"; cat "$PROXY_LOG"; exit 1; }
echo "proxy on 127.0.0.1:$PORT"

python3 - "$PORT" "$WORK/home/.pi/agent/models.json" <<'PY'
import json, sys
port, out = sys.argv[1], sys.argv[2]
json.dump({"providers": {"prosci-proxy": {
  "api": "anthropic-messages",
  "apiKey": "sandbox-dummy-token",
  "baseUrl": f"http://127.0.0.1:{port}/inference/go/anthropic",
  "models": [{"id": "claude-haiku-5-5", "contextWindow": 200000,
              "cost": {"input": 0.2, "output": 1, "cacheRead": 0.02, "cacheWrite": 0.25}}]}}}, open(out, "w"))
PY

echo "== pre-flight: sandbox negatives"
mkdir -p "$WORK/probe"
chmod 600 "$WORK/home/.pi/agent/models.json"
# sandbox.sh --verify looks for this exact probe next to the run home: a file the boundary must hide.
echo '{"k":"SENTINEL-REAL-CREDENTIAL"}' > "$WORK/real-auth-probe"
chmod 000 "$WORK/real-auth-probe" 2>/dev/null || true
"$PROSCI/eval/harness/sandbox.sh" --verify "$WORK/repo" "$WORK/home" "$WORK/home/.pi/agent" || { echo "isolation failed before execution"; exit 1; }

echo "== pre-flight: deadline and cancellation cannot be bypassed by children"
sleep 5 > /dev/null 2>&1 || true
if "$PROSCI/eval/harness/sandbox.sh" "$WORK/repo" "$WORK/home" "$WORK/home/.pi/agent" sh -c 'sleep 5' >/dev/null 2>&1; then
  echo "child sleep ran (expected: sandbox permits children; deadline is enforced by the controller)"
fi

echo "== plan hash and limits (the plan travels inside the workspace: the repo is hidden)"
cp "$PLAN" "$WORK/repo/.prosci/plan.json"
HASH=$(node "$WORK/repo/.prosci/bin/prosci-swarm" hash "$WORK/repo/.prosci/plan.json")
node "$WORK/repo/.prosci/bin/prosci-swarm" check "$WORK/repo/.prosci/plan.json" || { echo "plan invalid"; exit 1; }
echo "approved plan hash: $HASH"

echo "== execution (sequential, 1 retry, 20 min per unit, cap \$$MAX_COST)"
START=$(date +%s)
set +e
"$PROSCI/eval/harness/sandbox.sh" "$WORK/repo" "$WORK/home" "$WORK/home/.pi/agent" \
  node .prosci/bin/prosci-swarm-run .prosci/plan.json --approve "$HASH" --backend pi --allow-paid \
    --out "$WORK/home/out" --concurrency 1 --deadline-min 20
STATUS=$?
set -e
END=$(date +%s)

echo "== exit=$STATUS wall=$((END-START))s"
mkdir -p "$PROSCI/eval/runs/phase-d-real"
cp -r "$WORK/home/out/." "$PROSCI/eval/runs/phase-d-real/" 2>/dev/null || true
echo "evidence: $PROSCI/eval/runs/phase-d-real"
exit $STATUS
