# Changelog

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
