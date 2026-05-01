---
description: Edit or restyle an image with img.
argument-hint: "[provider=openai|gemini] [image-path] [prompt]"
allowed-tools: "Bash(img:*)"
---

# img Edit

Edit or restyle an existing image. Parse the user's arguments as:

1. provider: `openai` or `gemini`
2. image path
3. edit prompt

Run `img` with the selected provider and image path:

```bash
img --provider <provider> --input <image-path> --prompt "<prompt>"
```

If the provider is missing, use `img.config.json` defaultProvider, otherwise use OpenAI. Do not fall back to another provider after an error.
