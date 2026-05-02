# Setup Files

`img setup` prepares img for both personal defaults and shared project defaults.
The default generation path also creates the user env/config files on first run
when the selected provider key is missing.

Default behavior:

- inside a git repo: create/check user files and project `img.config.json`
- outside a git repo: create/check user files only

Explicit modes:

```bash
img setup --user
img setup --project
img setup --both
img setup --json
img check-health
```

In an interactive terminal, `img setup` opens the setup control panel. In
Claude, Codex, CI, or any non-TTY environment, use `img setup --json` or the
default non-interactive JSON output.

## User Files

User files are private to the current machine:

```text
~/.config/img/.env.local
~/.config/img/config.json
```

Use `.env.local` for API keys:

```bash
OPENAI_API_KEY=
GEMINI_API_KEY=
```

On macOS, Keychain is preferred for local API keys:

```bash
img key set openai
img key set gemini
img key status
```

Claude Code and Codex do not need to receive the key. They run the local `img`
binary, and that process reads the provider key from Keychain at runtime. Keep
`.env.local` for CI, non-macOS machines, or explicit project-local overrides.

Use `config.json` for personal provider, output, and prompt defaults. These
defaults are applied before project config.

## Project File

Project config is intended to be committed:

```text
img.config.json
```

It stores team-safe defaults such as brand prompts, asset types, destinations,
ratios, naming rules, and cost limits. Do not put API keys in this file.
Use it for settings the LLM should not have to restate on every image request:
pre-prompts, negative prompts, brand colors, reference files, asset aliases,
aspect ratios, output folders, filename patterns, and batch counts.

Precedence:

1. CLI flags and slash-command choices
2. nearest project `img.config.json`
3. user config at `~/.config/img/config.json`
4. plugin defaults

Prompt arrays append from user config to project config and remove exact
duplicates. Project config can set `mergeMode: "replace"` on an object to
replace that object's supported arrays instead of appending to them.

Environment values already present in the shell or agent process take
precedence over env files. Missing values are filled from the explicit
`--env-file`, nearest project `.env.local`, nearest project `.env`, then
`~/.config/img/.env.local`. If the selected provider key is still missing on
macOS, `img` reads the matching Keychain item before calling the provider API.

## Template

```json
{
  "schemaVersion": 1,
  "defaultProvider": "openai",
  "outputDir": "./img-output",
  "openAfterGeneration": false,
  "count": 1,
  "allowSilentMutation": false,
  "limits": {
    "maxImagesPerRun": 12,
    "maxCostPerRunUsd": 25
  },
  "project": {
    "siteRoot": "."
  },
  "brand": {
    "prePrompts": [],
    "negativePrompts": [],
    "references": [],
    "colors": {
      "primary": "",
      "secondary": "",
      "accent": ""
    }
  },
  "assetTypes": {
    "hero": {
      "aliases": ["hero image", "homepage hero"],
      "provider": "openai",
      "aspect": "16:9",
      "count": 1,
      "size": "auto",
      "style": "",
      "outputDir": "public/generated/hero",
      "filenamePattern": "hero-{slug}-{index}",
      "destination": "project-assets"
    },
    "feature-card": {
      "aliases": ["feature card", "feature tile", "benefit card", "benefit tile"],
      "provider": "openai",
      "aspect": "4:3",
      "count": 1,
      "size": "auto",
      "style": "",
      "outputDir": "public/generated/features",
      "filenamePattern": "feature-{slug}-{index}",
      "destination": "project-assets"
    }
  },
  "destinations": {
    "local": {
      "type": "folder",
      "path": "./img-output"
    },
    "project-assets": {
      "type": "folder",
      "path": "public/generated"
    },
    "site-proposal": {
      "type": "site",
      "mode": "proposal"
    }
  },
  "prompt": {
    "prePrompts": [],
    "negativePrompts": []
  },
  "openai": {
    "model": "gpt-image-2",
    "size": "auto",
    "quality": "auto",
    "format": "png",
    "compression": null
  },
  "gemini": {
    "model": "gemini-3.1-flash-image-preview",
    "aspect": "1:1",
    "imageSize": "1K",
    "googleSearch": false
  }
}
```

## Prompt Defaults

`prePrompts` are prepended to every user prompt sent to the provider API.

`negativePrompts` are appended to every provider API prompt as things to avoid.

Example:

```json
{
  "prompt": {
    "prePrompts": [
      "Use a premium editorial photography style.",
      "Keep lighting natural and physically plausible."
    ],
    "negativePrompts": [
      "watermarks",
      "text overlays",
      "distorted anatomy"
    ]
  }
}
```

When the user runs:

```bash
img generate a photorealistic 2:1 image of a dog
```

img sends a composed prompt containing the pre-prompts, the user's prompt, and
the negative prompts. The saved filename still uses the user's original prompt.
