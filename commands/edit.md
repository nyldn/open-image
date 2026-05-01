---
description: Edit or restyle an image with img.
argument-hint: "--input <image-path> [--provider openai|gemini] [natural language edit request]"
allowed-tools: "Bash(${CLAUDE_PLUGIN_ROOT}/bin/img:*)"
---

# img Edit

Edit or restyle an existing image. Prefer explicit flags for the provider and
input path, then preserve the remaining user words as the edit prompt. If the
input path is missing, ask for it before running the command.

Run img with the selected provider and image path:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/img" --provider <provider> --input <image-path> --prompt "<prompt>"
```

If the provider is missing, use `img.config.json` defaultProvider, otherwise use OpenAI. Do not fall back to another provider after an error.
