#!/usr/bin/env bash
set -euo pipefail

TARGET="$HOME/.claude/commands/img.md"

if [ ! -f "$TARGET" ]; then
  echo "No generated Claude user /img command found."
  exit 0
fi

if grep -q "This is the user-scope base command for img." "$TARGET" ||
  grep -q "nyldn-plugins/img" "$TARGET"; then
  rm "$TARGET"
  echo "Removed generated Claude user /img command: $TARGET"
  echo "Claude will use the marketplace plugin /img command after restart."
  exit 0
fi

echo "Kept existing Claude user /img command: $TARGET"
echo "It does not look like the generated img alias, so it was not removed."
