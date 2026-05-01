---
name: img
description: Generate or edit images with OpenAI gpt-image-2 or Google gemini-3.1-flash-image-preview using API keys from .env. Use when a user asks to create, restyle, or edit an image through img.
---

# img

Use this skill when the user wants image generation or image editing through the img plugin.

## Runtime Contract

- Use `img` from the plugin `bin/` directory.
- Read provider credentials from the user's environment or project `.env`.
- Use `OPENAI_API_KEY` for OpenAI.
- Use `GEMINI_API_KEY` for Gemini.
- Load `img.config.json` for provider/model defaults and prompt defaults.
- Include configured pre-prompts and negative prompts with every provider API prompt.
- Do not fall back from one provider to the other after a failure.
- Save generated files to `IMG_OUTPUT_DIR` or `./img-output`.

## Provider Defaults

- OpenAI: `gpt-image-2`
- Gemini: `gemini-3.1-flash-image-preview`

## Commands

Set up local environment:

```bash
img setup
```

Generate with OpenAI:

```bash
img --provider openai --prompt "$ARGUMENTS"
```

Generate with Gemini:

```bash
img --provider gemini --prompt "$ARGUMENTS"
```

Edit with a reference image:

```bash
img --provider gemini --input ./reference.png --prompt "$ARGUMENTS"
img --provider openai --input ./reference.png --prompt "$ARGUMENTS"
```

Use `--dry-run` before a costly or uncertain request to validate options without calling either API.

For the default Claude command path, treat `$ARGUMENTS` as natural language. Do not ask the user to rewrite a prompt as flags.
