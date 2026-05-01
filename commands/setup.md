---
description: Set up img API keys and defaults.
argument-hint: ""
allowed-tools: "Bash(img:*)"
---

# img Setup

Run the setup check:

```bash
img setup
```

Use the JSON result to guide the user conversationally:

- If `envFileCreated` is true, tell them which `.env.local` file was created.
- If `configFileCreated` is true, tell them which `img.config.json` file was created.
- If `keys.openai` is `missing` or `placeholder`, ask them to add `OPENAI_API_KEY` before using the default `/img` flow.
- If they want Gemini too, ask them to add `GEMINI_API_KEY`.
- Explain that model defaults, pre-prompts, and negative prompts belong in `img.config.json`, not `.env.local`.
- Do not ask the user to read the README.
- Do not print or echo API key values.
- After setup, suggest a natural-language test such as `/img generate a photorealistic 2:1 image of a dog`.
