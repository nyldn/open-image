# Changelog

## 0.1.5 - 2026-05-02

- Changed npm postinstall to run only user setup, avoiding Claude/Codex CLI
  registration from inside npm lifecycle scripts.

## 0.1.4 - 2026-05-02

- Added a global npm postinstall hook that opens first-run `img install --user`
  through the controlling terminal when npm is run interactively.

## 0.1.3 - 2026-05-02

- Published the npm package as `@nyldn.sh/img` and made that the primary install path in the public docs.

## 0.1.2 - 2026-05-01

- Added CLI-first `img install` planning/execution for Claude and Codex marketplace setup.
- Added a dependency-free interactive `img setup` terminal control panel for credentials, personal defaults, project brand defaults, asset presets, prompt preview, and health checks.
- Added `--json` non-interactive setup/install output for Claude, Codex, and automation.
- Added `brand.colors` and per-asset `count` config fields so reusable prompts can carry brand colors and batch defaults.

## 0.1.1 - 2026-05-01

- Made `/img` the default Claude Code command installed by `install-claude.sh`.
- Removed the duplicated `/img:img` marketplace command from the package.
- Kept `/img:setup`, `/img:edit`, `/img:openai`, and `/img:gemini` as explicit namespaced commands.
- Shortened the activation loader so Claude Code's collapsed Bash output stays readable.
- Added first-run user setup bootstrapping for missing provider keys; `/img setup` is now optional preflight/project setup rather than a required first step.
- Added macOS Keychain support with `img key set openai`, `img key set gemini`, and `img key status` so Claude Code and Codex can run the local binary without receiving API keys.

## 0.1.0 - 2026-05-01

- Initial img plugin scaffold.
- Added Claude plugin manifest, commands, and skill.
- Added Codex plugin manifest and installer.
- Added provider CLI for OpenAI `gpt-image-2` and Google `gemini-3.1-flash-image-preview`.
- Added `img activate` terminal loader with an image emoji and ASCII wordmark.
- Added README VHS demo for Claude `/img`, Codex `$img`, setup, and project-aware planning flows.
- Added tests, validation script, and GitHub Actions CI.
- Added layered user/project config, scoped setup, `img check-health`, schemas, and project profile fields for brand prompts, asset types, destinations, and limits.
- Fixed review findings around project config permissions, explicit config errors, image-count limits, `allowSilentMutation` warnings, schema validation, and plugin-local Claude command execution.
