---
name: open-image
description: Generate or edit images with OpenAI gpt-image-2 or Google gemini-3.1-flash-image-preview using API keys from .env. Use when a user asks to create, restyle, or edit an image through Open Image.
---

# Open Image

Use this skill when the user wants image generation or image editing through the Open Image plugin.

## Runtime Contract

- Use `open-image` from the plugin `bin/` directory.
- Read provider credentials from the user's environment or project `.env`.
- Use `OPENAI_API_KEY` for OpenAI.
- Use `GEMINI_API_KEY` for Gemini.
- Do not fall back from one provider to the other after a failure.
- Save generated files to `OPEN_IMAGE_OUTPUT_DIR` or `./open-image-output`.

## Provider Defaults

- OpenAI: `gpt-image-2`
- Gemini: `gemini-3.1-flash-image-preview`

## Commands

Generate with OpenAI:

```bash
open-image --provider openai --prompt "$ARGUMENTS"
```

Generate with Gemini:

```bash
open-image --provider gemini --prompt "$ARGUMENTS"
```

Edit with a reference image:

```bash
open-image --provider gemini --input ./reference.png --prompt "$ARGUMENTS"
open-image --provider openai --input ./reference.png --prompt "$ARGUMENTS"
```

Use `--dry-run` before a costly or uncertain request to validate options without calling either API.

