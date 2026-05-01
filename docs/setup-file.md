# Setup File

`img setup` creates two local files in the current project:

- `.env.local` for API keys
- `img.config.json` for non-secret defaults

Do not put API keys in `img.config.json`.

## Template

```json
{
  "defaultProvider": "openai",
  "outputDir": "./img-output",
  "openAfterGeneration": false,
  "count": 1,
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

img sends a composed prompt containing the pre-prompts, the user's prompt, and the negative prompts. The saved filename still uses the user's original prompt.

