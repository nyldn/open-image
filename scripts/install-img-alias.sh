#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "The separate Claude user /img command is deprecated."
echo "Cleaning up the generated alias so Claude uses the marketplace plugin command."
"$SCRIPT_DIR/cleanup-claude-user-command.sh"
