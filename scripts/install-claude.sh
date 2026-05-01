#!/usr/bin/env bash
set -euo pipefail

MARKETPLACE="https://github.com/nyldn/plugins.git"
PLUGIN="img@nyldn-plugins"
SCOPE="user"
INSTALL_BARE_ALIAS="false"
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
    --bare-alias)
      INSTALL_BARE_ALIAS="true"
      shift
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

command -v claude >/dev/null 2>&1 || fail "Missing required command: claude"

echo "Adding Claude marketplace $MARKETPLACE..."
claude plugin marketplace add "$MARKETPLACE" --scope "$SCOPE"

echo "Installing $PLUGIN..."
claude plugin install "$PLUGIN" --scope "$SCOPE"

if [ "$INSTALL_BARE_ALIAS" = "true" ]; then
  echo "Installing optional bare /img command alias..."
  "$SCRIPT_DIR/install-img-alias.sh"
else
  echo "Skipping bare /img alias. Use /img:img, or rerun with --bare-alias for a local user-scope alias."
fi

info "Installed $PLUGIN"
echo "Restart Claude Code, then use /img:setup."
