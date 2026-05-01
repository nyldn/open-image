---
name: img
version: 0.1.0
description: Generate or edit images with OpenAI gpt-image-2 or Google gemini-3.1-flash-image-preview using API keys from .env. Use when a user asks to create, restyle, or edit an image through img.
---

# img

Use this skill when the user wants image generation or image editing through the img plugin.

## Runtime Contract

- In Claude Code plugin commands, use `"${CLAUDE_PLUGIN_ROOT}/bin/img"` so marketplace installs do not depend on a global `img` binary.
- In Codex or terminal workflows, use `img` when it is installed on PATH.
- Read provider credentials from the user's environment, project `.env`, or user `~/.config/img/.env.local`.
- Use `OPENAI_API_KEY` for OpenAI.
- Use `GEMINI_API_KEY` for Gemini.
- Load user config from `~/.config/img/config.json` and nearest project `img.config.json`; project config overrides user config.
- Include configured pre-prompts and negative prompts with every provider API prompt.
- Do not fall back from one provider to the other after a failure.
- Save generated files to `IMG_OUTPUT_DIR` or `./img-output`.

## Provider Defaults

- OpenAI: `gpt-image-2`
- Gemini: `gemini-3.1-flash-image-preview`

## Commands

Show the activation loader in user-facing terminal workflows:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/img" activate
```

Set up local environment:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/img" setup
"${CLAUDE_PLUGIN_ROOT}/bin/img" check-health
```

Use `img setup --user` for machine-local secrets/defaults, `img setup --project` for shared project config, and `img setup --both` inside a repo when a teammate needs both.

Generate with OpenAI:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/img" --provider openai --prompt "$ARGUMENTS"
```

Generate with Gemini:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/img" --provider gemini --prompt "$ARGUMENTS"
```

Edit with a reference image:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/img" --provider gemini --input ./reference.png --prompt "$ARGUMENTS"
"${CLAUDE_PLUGIN_ROOT}/bin/img" --provider openai --input ./reference.png --prompt "$ARGUMENTS"
```

Use `--dry-run` before a costly or uncertain request to validate options without calling either API.

For the default Claude command path, treat `$ARGUMENTS` as natural language. Do not ask the user to rewrite a prompt as flags.
For Codex, users should be able to invoke this workflow as `$img` and use the same natural-language behavior as `/img:img` in Claude Code.
