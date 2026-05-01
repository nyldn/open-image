#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="$HOME/.claude/commands"
TARGET="$TARGET_DIR/img.md"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMG_BIN="$(cd "$SCRIPT_DIR/.." && pwd)/bin/img"

mkdir -p "$TARGET_DIR"
cat > "$TARGET" <<'EOF'
---
description: Generate an image with the local img CLI.
argument-hint: "[natural language image request]"
allowed-tools: "Bash(__IMG_BIN__:*)"
---

# img

This is an optional local user-scope alias. It points to:

```text
__IMG_BIN__
```

If the user runs `/img setup`, run the setup workflow:

```bash
"__IMG_BIN__" activate
"__IMG_BIN__" setup
```

Otherwise, generate an image from the user's natural language request:

```text
$ARGUMENTS
```

Default to OpenAI `gpt-image-2`. Preserve aspect, style, size, and subject words
from the user request inside the prompt. Do not ask the user to translate their
request into CLI flags.

Activate the terminal loader, then run:

```bash
"__IMG_BIN__" activate
"__IMG_BIN__" --provider openai --prompt "$ARGUMENTS"
```

Report the saved file path and provider. Do not retry with a different provider
if the command fails. If setup is missing, tell the user to run /img setup.
EOF

IMG_BIN="$IMG_BIN" TARGET="$TARGET" node --input-type=module <<'EOF'
import { readFileSync, writeFileSync } from "node:fs";

const target = process.env.TARGET;
const imgBin = process.env.IMG_BIN;
writeFileSync(target, readFileSync(target, "utf8").replaceAll("__IMG_BIN__", imgBin));
EOF

echo "Installed user command alias: $TARGET"
echo "Restart Claude Code, then use /img. Remove $TARGET if you want the marketplace plugin command to take precedence."
