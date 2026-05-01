# img

img is a minimal Claude Code and Codex plugin for generating and editing images with:

- OpenAI `gpt-image-2`
- Google `gemini-3.1-flash-image-preview`

There is no fallback between providers. Pick the provider you want and the command reports that provider's result or error.

## Setup

Run setup first:

```bash
img setup
```

Then add `OPENAI_API_KEY` to the created `.env.local`. Add `GEMINI_API_KEY` only if you want Gemini too.

Use `img.config.json` for model defaults, output defaults, pre-prompts, and negative prompts. See [`docs/setup-file.md`](docs/setup-file.md).

## Natural Language

```bash
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

## Validation

```bash
npm test
npm run validate
```
