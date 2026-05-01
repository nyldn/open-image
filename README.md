# Open Image

Open Image is a minimal Claude Code and Codex plugin for generating and editing images with:

- OpenAI `gpt-image-2`
- Google `gemini-3.1-flash-image-preview`

There is no fallback between providers. Pick the provider you want and the command reports that provider's result or error.

## Setup

Create a `.env` file in the project where you run the command:

```bash
OPENAI_API_KEY=...
GEMINI_API_KEY=...
OPEN_IMAGE_PROVIDER=openai
OPEN_IMAGE_OUTPUT_DIR=./open-image-output
```

## CLI

```bash
open-image --provider openai --prompt "A clean app icon for a photo editor"
open-image --provider gemini --prompt "A clean app icon for a photo editor" --aspect 1:1 --image-size 1K
open-image --provider gemini --input ./reference.png --prompt "Restyle this as a polished product shot"
open-image --provider openai --input ./reference.png --prompt "Turn this into a polished product shot"
```

Use `--dry-run` to validate options without calling either API.

## Claude Code

Marketplace install:

```text
/plugin marketplace add nyldn/open-image
/plugin install open-image@open-image-marketplace
```

Plugin commands are namespaced by Claude Code:

- `/open-image:open-image`
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

