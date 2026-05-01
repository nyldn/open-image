# Provider Notes

## OpenAI

- Default model: `gpt-image-2`
- API key: `OPENAI_API_KEY`
- Text-to-image endpoint: `POST https://api.openai.com/v1/images/generations`
- Image edit endpoint: `POST https://api.openai.com/v1/images/edits`
- Output: base64 image data saved locally

Useful options:

- `--size auto|1024x1024|1536x1024|1024x1536`
- `--quality auto|low|medium|high`
- `--format png|jpeg|webp`

## Gemini

- Default model: `gemini-3.1-flash-image-preview`
- API key: `GEMINI_API_KEY`
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`
- Output: inline image data saved locally

Useful options:

- `--aspect 1:1|16:9|9:16|4:3|3:4|4:5|5:4|3:2|2:3|1:4|4:1|1:8|8:1|21:9`
- `--image-size 0.5K|1K|2K|4K`
- `--google-search` to request Gemini search grounding when supported

## No Fallback

Open Image does not fail over from one provider to the other. This is intentional so image provenance, cost, and provider-specific errors stay explicit.

