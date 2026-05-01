#!/usr/bin/env bash
set -euo pipefail

REPO="nyldn/open-image"
PLUGIN_NAME="open-image"
CHECKOUT_ROOT="$HOME/.codex/plugins/open-image-repo"
MARKETPLACE_FILE="$HOME/.agents/plugins/marketplace.json"
PLUGIN_ROOT=""

info() { echo "  [ok] $1"; }
fail() { echo "  [error] $1"; exit 1; }

while [ "$#" -gt 0 ]; do
  case "$1" in
    --plugin-root)
      [ "$#" -ge 2 ] || fail "--plugin-root requires a path"
      PLUGIN_ROOT="$2"
      shift 2
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

resolve_plugin_root() {
  local root="$1"
  if [ -f "$root/.codex-plugin/plugin.json" ]; then
    printf '%s\n' "$root"
  elif [ -f "$root/public/.codex-plugin/plugin.json" ]; then
    printf '%s\n' "$root/public"
  else
    fail "Could not find .codex-plugin/plugin.json under $root"
  fi
}

ensure_checkout() {
  require_cmd gh
  require_cmd git
  mkdir -p "$(dirname "$CHECKOUT_ROOT")"
  if [ -d "$CHECKOUT_ROOT/.git" ]; then
    echo "Updating Open Image checkout at $CHECKOUT_ROOT..."
    git -C "$CHECKOUT_ROOT" pull --quiet 2>/dev/null || true
  else
    echo "Cloning Open Image to $CHECKOUT_ROOT..."
    gh auth status >/dev/null 2>&1 || fail "GitHub CLI is not authenticated. Run: gh auth login"
    gh repo clone "$REPO" "$CHECKOUT_ROOT" -- --quiet
  fi
}

require_cmd python3

if [ -z "$PLUGIN_ROOT" ]; then
  ensure_checkout
  PLUGIN_ROOT="$(resolve_plugin_root "$CHECKOUT_ROOT")"
else
  PLUGIN_ROOT="$(resolve_plugin_root "$PLUGIN_ROOT")"
fi

PLUGIN_ROOT="$(cd "$PLUGIN_ROOT" && pwd)"

echo "Registering Codex plugin from $PLUGIN_ROOT..."
python3 "$PLUGIN_ROOT/scripts/register_codex_plugin.py" "$PLUGIN_ROOT" "$MARKETPLACE_FILE"

info "Codex personal marketplace updated: $MARKETPLACE_FILE"
info "Codex plugin source: $HOME/.codex/plugins/$PLUGIN_NAME"
echo ""
echo "Next steps:"
echo "  1. Restart Codex"
echo "  2. Open /plugins"
echo "  3. Install or enable $PLUGIN_NAME"

