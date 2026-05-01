# Open Image

Open Image is a minimal Claude Code and Codex plugin for generating and editing images with:

- OpenAI `gpt-image-2`
- Google `gemini-3.1-flash-image-preview`

There is no fallback between providers. Pick the provider you want and the command reports that provider's result or error.

## Setup

Run setup first:

```bash
open-image setup
```

Then add `OPENAI_API_KEY` to the created `.env.local`. Add `GEMINI_API_KEY` only if you want Gemini too.

Use `open-image.config.json` for model defaults, output defaults, pre-prompts, and negative prompts. See [`docs/setup-file.md`](docs/setup-file.md).

## Natural Language

```bash
open-image generate a photorealistic 2:1 image of a dog
```

The default provider is OpenAI `gpt-image-2`. There is no fallback between providers.

## Claude Code

Marketplace install:

```text
/plugin marketplace add nyldn/open-image
/plugin install open-image@open-image-marketplace
```

The Claude installer creates a bare user command:

- `/open-image`
- `/open-image setup`

Marketplace plugin commands remain available as compatibility commands:

- `/open-image:setup`
- `/open-image:openai`
- `/open-image:gemini`
- `/open-image:edit`

For local development:

```bash
claude --plugin-dir /absolute/path/to/open-image/public
```

## Codex

Run:

```bash
./scripts/install-codex.sh
```

Then restart Codex and enable `open-image` from `/plugins`.

## Validation

```bash
npm test
npm run validate
```
