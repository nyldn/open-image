---
description: Set up img API keys and defaults.
argument-hint: "[--user|--project|--both]"
allowed-tools: "Bash(${CLAUDE_PLUGIN_ROOT}/bin/img:*)"
---

# img Setup

Use this command when the user explicitly wants setup, a preflight check, or
project defaults. Normal `/img <request>` usage creates user setup files on
first run if a provider key is missing.

First ask img to open the interactive setup control panel in a normal macOS
Terminal, then run non-interactive setup and a JSON health check for this Claude
summary:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/img" setup --open-terminal
"${CLAUDE_PLUGIN_ROOT}/bin/img" setup --json
"${CLAUDE_PLUGIN_ROOT}/bin/img" check-health --json
```

Use both JSON results to guide the user conversationally:

- Explain the setup scope: user outside a repo, both user and project inside a repo, or the explicit `--user`, `--project`, or `--both` scope.
- If `envFileCreated` is true, tell them which user `.env.local` file was created.
- If `userConfigFileCreated` is true, tell them which user `config.json` file was created.
- If `projectConfigFileCreated` is true, tell them which project `img.config.json` file was created.
- If `discoveredProjectDefaults.colors` is non-empty, explain that setup seeded project brand colors from local brand/design files.
- If `setupTerminal.opened` is true, tell them the interactive control panel was opened in Terminal.
- If `setupTerminal.opened` is false and `setupTerminal.command` is present, tell them to run that command from a normal terminal.
- Treat `keys.openai: "present"` or `keyDetails.openai.source: "macos-keychain"` as configured. Do not tell the user OpenAI is missing in that case.
- Treat `keys.gemini: "present"` or `keyDetails.gemini.source: "macos-keychain"` as configured. Do not tell the user Gemini is missing in that case.
- If a provider key is `missing` or `placeholder`, ask them to run `"${CLAUDE_PLUGIN_ROOT}/bin/img" key set <provider>` from a normal terminal before using that provider.
- Explain that API keys belong in the user env file, personal defaults belong in user config, and shared brand/model defaults belong in project `img.config.json`.
- Explain that macOS Keychain is preferred for local API keys; the user env file is a fallback for CI or machines without Keychain.
- Explain that Claude's Bash tool cannot host the rich control panel directly; the terminal-opening command is the bridge.
- Use the health JSON to report missing config, missing keys, output folder issues, and missing brand references.
- Do not ask the user to read the README.
- Do not print or echo API key values.
- After setup, suggest a natural-language test such as `/img generate a photorealistic 2:1 image of a dog`.
