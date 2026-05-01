---
description: Generate an image with OpenAI gpt-image-2.
argument-hint: [prompt]
allowed-tools: Bash(open-image:*)
---

# OpenAI Image Generation

Generate an image from this prompt using OpenAI `gpt-image-2`:

```text
$ARGUMENTS
```

Run:

```bash
open-image --provider openai --prompt "$ARGUMENTS"
```

Report the saved file path. Do not fall back to Gemini if OpenAI fails.

