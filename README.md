# 🖼️ Image Agency

Image Agency is a Claude Code and Codex image generation tool for brands and
agencies working across one or multiple clients.

It can call:

- OpenAI `gpt-image-2`
- Google `gemini-3.1-flash-image-preview`

<p align="center">
  <img src="docs/assets/demo.gif" alt="Image Agency demo showing Claude /img:img, Codex $img, planning, setup, and generated asset workflow" width="720">
</p>

## Primary Workflows

Use natural language from the agent you already have open:

```text
/img:img review this landing page and create on-brand hero and feature-card images, then prepare a site insertion proposal
$img "create three launch social cards for the new member app"
/img:img turn the homepage hero into a warmer 16:9 editorial image that matches this site
/img:img prepare replacement imagery for these pricing feature tiles, but do not edit the site yet
```

For terminal workflows, show the loader:

```bash
img activate
```

It prints the Image Agency loader with the `img` ASCII wordmark, the image emoji, and the workflow stages: context, plan, generate, deliver.

## Setup

Run setup first:

```bash
img setup
img check-health
```

Inside a git repo, setup prepares both user files and a project
`img.config.json`. Outside a repo, it prepares user files only. You can force
the scope with `img setup --user`, `img setup --project`, or `img setup --both`.

Add `OPENAI_API_KEY` to `~/.config/img/.env.local`. Add `GEMINI_API_KEY` only
if you want Gemini too. Use project `img.config.json` for shared model
defaults, brand prompts, asset types, destinations, pre-prompts, and negative
prompts. See [`docs/setup-file.md`](docs/setup-file.md).

## Natural Language

```bash
img activate
img generate a photorealistic 2:1 image of a dog
```

The default provider is OpenAI `gpt-image-2`. There is no fallback between providers.

## Claude Code

Marketplace install:

```text
/plugin marketplace add nyldn/img
/plugin install img@img-marketplace
```

Marketplace plugin commands:

- `/img:img`
- `/img:setup`
- `/img:openai`
- `/img:gemini`
- `/img:edit`

The local installer can create an optional bare `/img` user command with
`./scripts/install-claude.sh --bare-alias`, but the namespaced plugin commands
are canonical because they stay tied to the installed plugin version.

For local development:

```bash
claude --plugin-dir /absolute/path/to/img/public
```

## Codex

Run:

```bash
./scripts/install-codex.sh
```

Then restart Codex and enable `img` from `/plugins`.

Use the skill in Codex as:

```text
$img "create three on-brand article header images for this project"
```

Codex and Claude should share the same behavior: inspect project context when available, use `img.config.json` for project defaults, and ask before ambiguous delivery or site edits.

## Demo GIF

The README demo is generated with [VHS](https://github.com/charmbracelet/vhs):

```bash
vhs docs/demo/img-demo.tape
```

## Validation

```bash
npm test
npm run validate
```
