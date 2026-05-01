---
description: Generate an image with Gemini 3.1 Flash Image Preview.
argument-hint: "[prompt]"
allowed-tools: "Bash(open-image:*)"
---

# Gemini Image Generation

Generate an image from this prompt using Gemini `gemini-3.1-flash-image-preview`:

```text
$ARGUMENTS
```

Run:

```bash
open-image --provider gemini --prompt "$ARGUMENTS"
```

Report the saved file path. Do not fall back to OpenAI if Gemini fails.
