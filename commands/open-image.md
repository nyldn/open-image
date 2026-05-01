---
description: Generate an image with Open Image using the configured provider.
argument-hint: "[prompt]"
allowed-tools: "Bash(open-image:*)"
---

# Open Image

Generate an image from this prompt:

```text
$ARGUMENTS
```

Use `OPEN_IMAGE_PROVIDER` from `.env` when present; otherwise use OpenAI. Run:

```bash
open-image --prompt "$ARGUMENTS"
```

Report the saved file path and provider. Do not retry with a different provider if the command fails.
