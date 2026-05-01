#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="$HOME/.claude/commands"
TARGET="$TARGET_DIR/open-image.md"

mkdir -p "$TARGET_DIR"
cat > "$TARGET" <<'EOF'
---
description: Generate an image with the Open Image CLI.
argument-hint: [prompt]
allowed-tools: Bash(open-image:*)
---

# Open Image Alias

Generate an image from this prompt:

```text
$ARGUMENTS
```

Run:

```bash
open-image --prompt "$ARGUMENTS"
```

Use `OPEN_IMAGE_PROVIDER` from `.env` when present; otherwise use OpenAI. Do not fall back to another provider after an error.
EOF

echo "Installed user command alias: $TARGET"
echo "Restart Claude Code, then use /open-image."

