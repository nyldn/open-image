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
- Load `open-image.config.json` for provider/model defaults and prompt defaults.
- Include configured pre-prompts and negative prompts with every provider API prompt.
- Do not fall back from one provider to the other after a failure.
- Save generated files to `OPEN_IMAGE_OUTPUT_DIR` or `./open-image-output`.

## Provider Defaults

- OpenAI: `gpt-image-2`
- Gemini: `gemini-3.1-flash-image-preview`

## Commands

Set up local environment:

```bash
open-image setup
```

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

For the default Claude command path, treat `$ARGUMENTS` as natural language. Do not ask the user to rewrite a prompt as flags.
