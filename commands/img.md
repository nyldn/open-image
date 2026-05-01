---
description: Generate an image from natural language with OpenAI gpt-image-2 by default.
argument-hint: "[natural language image request]"
allowed-tools: "Bash(img:*)"
---

# img

Generate an image from the user's natural language request:

```text
$ARGUMENTS
```

Default to OpenAI `gpt-image-2`. Preserve aspect, style, size, and subject words from the user request inside the prompt. Do not ask the user to translate their request into CLI flags.

Run:

```bash
img --provider openai --prompt "$ARGUMENTS"
```

Report the saved file path and provider. Do not retry with a different provider if the command fails. If setup is missing, tell the user to run `/img setup`.
