#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="$HOME/.claude/commands"
TARGET="$TARGET_DIR/img.md"

mkdir -p "$TARGET_DIR"
cat > "$TARGET" <<'EOF'
---
description: Generate an image with the img CLI.
argument-hint: "[natural language image request]"
allowed-tools: "Bash(img:*)"
---

# img

If the user runs `/img setup`, run the setup workflow:

```bash
img setup
```

Otherwise, generate an image from the user's natural language request:

```text
$ARGUMENTS
```

Default to OpenAI `gpt-image-2`. Preserve aspect, style, size, and subject words from the user request inside the prompt. Do not ask the user to translate their request into CLI flags.

Run:

```bash
img --provider openai --prompt "$ARGUMENTS"
```

Report the saved file path and provider. Do not retry with a different provider if the command fails. If setup is missing, tell the user to run /img setup.
EOF

echo "Installed user command alias: $TARGET"
echo "Restart Claude Code, then use /img."
