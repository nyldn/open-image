# Changelog

## 0.1.16 - 2026-05-02

- Added `img setup --open-terminal` so Claude `/img:setup` can open the rich
  setup panel in a real macOS Terminal while still returning JSON setup and
  health summaries inside Claude.
- Removed the unreleased recipe-index health check from setup diagnostics.
- Seed new project configs from local brand/design/DLS/token files during
  explicit project setup, including discovered hex colors and references.

## 0.1.15 - 2026-05-02

- Made Claude installs update the `nyldn-plugins` marketplace and `img`
  plugin cache instead of leaving stale plugin versions in place.
- Changed `/img:setup` to use JSON setup and health checks without printing the
  activation banner, and to treat macOS Keychain credentials as valid.

## 0.1.14 - 2026-05-02

- Stopped installing a separate Claude user `/img` command so the marketplace
  plugin command does not appear twice.
- Added cleanup for the generated legacy `~/.claude/commands/img.md` alias.

## 0.1.13 - 2026-05-02

- Replaced the interactive setup health check JSON dump with a readable
  diagnostic panel and next-step summary.
- Warn when a project config is loaded outside a git project root.

## 0.1.12 - 2026-05-02

- Replaced per-color project setup prompts with one paste-friendly brand color
  field that accepts space- or comma-separated hex values.

## 0.1.11 - 2026-05-02

- Removed unused project name and framework prompts from the setup control
  panel and default project config.

## 0.1.10 - 2026-05-02

- Made npm postinstall tolerate missing controlling terminals so global
  installs complete cleanly in non-interactive shells.

## 0.1.9 - 2026-05-02

- Changed provider credential entry to prompt for an API key directly instead
  of exposing macOS Keychain's generic password wording.

## 0.1.8 - 2026-05-02

- Documented `npx -y @nyldn.sh/install-img` as the recommended first-time
  installer, with the manual npm/setup/install path kept as a transparent
  fallback.

## 0.1.7 - 2026-05-02

- Updated the setup control panel wordmark to the selected Image Agency ASCII
  treatment with the image emoji on the AGENCY line.

## 0.1.6 - 2026-05-02

- Gave the interactive setup control panel a compact ASCII wordmark, clearer
  status copy, and more human menu labels.
- Made npm postinstall bootstrap user setup files non-interactively so the
  control panel only runs from a normal terminal.

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
