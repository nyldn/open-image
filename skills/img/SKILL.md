---
name: img
version: 0.1.5
description: Generate or edit images with OpenAI gpt-image-2 or Google gemini-3.1-flash-image-preview using keys from macOS Keychain or env files. Use when a user asks to create, restyle, or edit an image through img.
---

# img

Use this skill when the user wants image generation or image editing through the img plugin.

## Runtime Contract

- In Claude Code plugin commands, use `"${CLAUDE_PLUGIN_ROOT}/bin/img"` so marketplace installs do not depend on a global `img` binary.
- In Codex or terminal workflows, use `img` when it is installed on PATH.
- Read provider credentials from the user's environment, project `.env`, or user `~/.config/img/.env.local`.
- Prefer macOS Keychain for local provider keys. Use `img key set openai`, `img key set gemini`, and `img key status` from a normal terminal; do not ask the user to paste API keys into Claude or Codex chat.
- If a generation request is missing the selected provider key, the CLI creates the user env/config files and returns `setupRequired: true`; tell the user to run `img key set <provider>` from a normal terminal, then re-run the same request. Use the reported `envFile` only as a fallback for CI or machines without Keychain.
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

Optionally pre-create or refresh local setup files. Use JSON mode from agent
commands; the rich setup control panel is for a normal terminal:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/img" setup --json
"${CLAUDE_PLUGIN_ROOT}/bin/img" check-health
```

Use `img setup --user` for machine-local secrets/defaults, `img setup --project` for shared project config, and `img setup --both` inside a repo when a teammate needs both. Run `img setup` in a normal terminal to open the interactive control panel for credentials, defaults, brand prompts, brand colors, asset presets, preview, and health checks. The default generation path does not require running setup first.

Manage local keys:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/img" key status
"${CLAUDE_PLUGIN_ROOT}/bin/img" key set openai
"${CLAUDE_PLUGIN_ROOT}/bin/img" key set gemini
```

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
For Codex, users should be able to invoke this workflow as `$img` and use the same natural-language behavior as `/img` in Claude Code.
