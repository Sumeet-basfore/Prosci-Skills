#!/bin/sh
# Run a command inside a boundary that contains nothing but the fixture, the interpreter, the pi
# package, and one scoped agent directory.
#
# Everything else — this repo, the real ~/.pi, ssh keys, other projects — is not mounted. A read of
# any of them fails at the filesystem, not at a policy the agent could argue with.
#
#   sandbox.sh <workspace> <home> <agent-dir> <command...>
#   sandbox.sh --verify <workspace> <home> <agent-dir>
#
# --verify runs the negative tests. Any path that should be unreachable but is readable makes it exit
# non-zero, and a series must not start when it does.

set -eu

PI_PACKAGE=/home/sumeet/.local/lib/node_modules/@earendil-works/pi-coding-agent
PI_BIN=/home/sumeet/.local/bin/pi

if [ "${1:-}" = "--verify" ]; then
  WORKSPACE=$2
  HOME_DIR=$3
  AGENT_DIR=$4
else
  WORKSPACE=$1
  HOME_DIR=$2
  AGENT_DIR=$3
  shift 3
fi

sandbox() {
  bwrap \
    --clearenv \
    --ro-bind /usr /usr \
    --ro-bind /bin /bin \
    --ro-bind /lib /lib \
    --ro-bind /lib64 /lib64 \
    --ro-bind /etc /etc \
    --ro-bind /home/sumeet/.local/lib/node_modules /home/sumeet/.local/lib/node_modules \
    --ro-bind /home/sumeet/.local/bin /home/sumeet/.local/bin \
    --ro-bind /home/sumeet/.pi/agent/install /home/sumeet/.pi/agent/install \
    --ro-bind /home/sumeet/.pi/agent/bin/pi /home/sumeet/.pi/agent/bin/pi \
    --tmpfs /tmp \
    --tmpfs /home/sumeet/personal-repo \
    --bind "$WORKSPACE" "$WORKSPACE" \
    --bind "$HOME_DIR" "$HOME_DIR" \
    --proc /proc \
    --dev /dev \
    --unshare-pid \
    --unshare-ipc \
    --unshare-uts \
    --die-with-parent \
    --chdir "$WORKSPACE" \
    --setenv HOME "$HOME_DIR" \
    --setenv PI_CODING_AGENT_DIR "$AGENT_DIR" \
    --setenv PATH /home/sumeet/.local/bin:/usr/local/bin:/usr/bin:/bin \
    --setenv TMPDIR /tmp \
    --setenv LANG C.UTF-8 \
    "$@"
}

if [ "${1:-}" = "--verify" ] || [ "${VERIFY_ONLY:-}" = "1" ]; then
  fails=0
  check_unreadable() {
    if sandbox sh -c "cat $1" >/dev/null 2>&1; then
      echo "LEAK: readable inside the sandbox: $1"
      fails=$((fails + 1))
    else
      echo "ok   unreachable: $1"
    fi
  }
  check_unreadable "$HOME_DIR/../real-auth-probe" # a probe the caller plants outside the boundary
  check_unreadable "/home/sumeet/personal-repo/AGENTS.md"
  check_unreadable "/home/sumeet/.ssh/id_ed25519"
  check_unreadable "/home/sumeet/.pi/agent/auth.json"

  # The one credential the run may use is a dummy token, and it must be the only one in the
  # environment. Any other KEY/TOKEN/SECRET name is a leak.
  if sandbox sh -c 'env' | grep -Ei 'key|token|secret' | grep -v '^PATH=' >/dev/null 2>&1; then
    echo "LEAK: credential-shaped variables in the sandbox environment:"
    sandbox sh -c 'env' | grep -Ei 'key|token|secret' | sed 's/=.*/=<redacted>/'
    fails=$((fails + 1))
  else
    echo "ok   no credential-shaped variables in the environment"
  fi

  # Process and pid isolation.
  if sandbox sh -c 'ls /proc | grep -qE "^1$"' 2>/dev/null; then
    echo "ok   pid namespace is its own"
  else
    echo "LEAK: host pids visible"
    fails=$((fails + 1))
  fi

  if [ "$fails" -gt 0 ]; then
    echo "$fails isolation check(s) failed; refusing to run"
    exit 1
  fi
  echo "isolation checks passed"
  exit 0
fi

sandbox "$@"
