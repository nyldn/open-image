#!/usr/bin/env bash
set -euo pipefail

MARKETPLACE="nyldn/img"
PLUGIN="img@img-marketplace"
SCOPE="user"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

fail() { echo "  [error] $1"; exit 1; }
info() { echo "  [ok] $1"; }

while [ "$#" -gt 0 ]; do
  case "$1" in
    --scope)
      [ "$#" -ge 2 ] || fail "--scope requires user, project, or local"
      SCOPE="$2"
      shift 2
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

command -v claude >/dev/null 2>&1 || fail "Missing required command: claude"

echo "Adding Claude marketplace $MARKETPLACE..."
claude plugin marketplace add "$MARKETPLACE" --scope "$SCOPE" || true

echo "Installing $PLUGIN..."
claude plugin install "$PLUGIN" --scope "$SCOPE"

echo "Installing bare /img command alias..."
"$SCRIPT_DIR/install-img-alias.sh"

info "Installed $PLUGIN"
echo "Restart Claude Code, then use /img."
