---
description: Set up img API keys and defaults.
argument-hint: "[--user|--project|--both]"
allowed-tools: "Bash(${CLAUDE_PLUGIN_ROOT}/bin/img:*)"
---

# img Setup

Activate the terminal loader, then run setup and the health check:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/img" activate
"${CLAUDE_PLUGIN_ROOT}/bin/img" setup
"${CLAUDE_PLUGIN_ROOT}/bin/img" check-health
```

Use the JSON result to guide the user conversationally:

- Explain the setup scope: user outside a repo, both user and project inside a repo, or the explicit `--user`, `--project`, or `--both` scope.
- If `envFileCreated` is true, tell them which user `.env.local` file was created.
- If `userConfigFileCreated` is true, tell them which user `config.json` file was created.
- If `projectConfigFileCreated` is true, tell them which project `img.config.json` file was created.
- If `keys.openai` is `missing` or `placeholder`, ask them to add `OPENAI_API_KEY` before using the default `/img:img` flow.
- If they want Gemini too, ask them to add `GEMINI_API_KEY`.
- Explain that API keys belong in the user env file, personal defaults belong in user config, and shared brand/model defaults belong in project `img.config.json`.
- Use `img check-health` to report missing config, missing keys, output folder issues, and missing brand references.
- Do not ask the user to read the README.
- Do not print or echo API key values.
- After setup, suggest a natural-language test such as `/img:img generate a photorealistic 2:1 image of a dog`.
