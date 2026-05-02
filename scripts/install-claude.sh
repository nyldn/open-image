#!/usr/bin/env bash
set -euo pipefail

MARKETPLACE="https://github.com/nyldn/plugins.git"
PLUGIN="img@nyldn-plugins"
SCOPE="user"
CLEANUP_USER_COMMAND="true"
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
      CLEANUP_USER_COMMAND="true"
      shift
      ;;
    --no-base-command|--no-bare-alias|--keep-user-command)
      CLEANUP_USER_COMMAND="false"
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

echo "Updating Claude marketplace nyldn-plugins..."
claude plugin marketplace update nyldn-plugins

echo "Installing $PLUGIN..."
claude plugin install "$PLUGIN" --scope "$SCOPE"

echo "Updating $PLUGIN..."
claude plugin update "$PLUGIN" --scope "$SCOPE"

if [ "$CLEANUP_USER_COMMAND" = "true" ]; then
  echo "Removing generated user /img command if present..."
  "$SCRIPT_DIR/cleanup-claude-user-command.sh"
else
  echo "Keeping any existing user /img command."
fi

info "Installed $PLUGIN"
echo "Restart Claude Code, then use /img."
