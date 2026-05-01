# 🖼️ Image Agency

Image Agency is the public-facing name for the `img` Claude Code and Codex workflow: natural language in, planned on-brand image work out.

It can call:

- OpenAI `gpt-image-2`
- Google `gemini-3.1-flash-image-preview`

There is no fallback between providers. Pick the provider you want, or use the project defaults, and Image Agency reports that provider's result or error.

<p align="center">
  <img src="docs/assets/demo.gif" alt="Image Agency demo showing Claude /img, Codex $img, planning, setup, and generated asset workflow" width="720">
</p>

## Primary Workflows

Use natural language from the agent you already have open:

```text
/img review the 6 benefit cards and create on-brand versions of appropriate images for each one
$img "create three launch social cards for the new member app"
/img turn the homepage hero into a warmer 16:9 editorial image that matches this site
/img prepare replacement imagery for these pricing feature tiles, but do not edit the site yet
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
```

Then add `OPENAI_API_KEY` to the created `.env.local`. Add `GEMINI_API_KEY` only if you want Gemini too.

Use `img.config.json` for model defaults, output defaults, pre-prompts, and negative prompts. See [`docs/setup-file.md`](docs/setup-file.md).

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

The Claude installer creates a bare user command:

- `/img`
- `/img setup`

Marketplace plugin commands remain available as compatibility commands:

- `/img:setup`
- `/img:openai`
- `/img:gemini`
- `/img:edit`

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
