import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  GEMINI_DEFAULT_MODEL,
  OPENAI_DEFAULT_MODEL,
  applyConfigDefaults,
  apiErrorFromResponse,
  buildGeminiBody,
  buildOpenAIJsonBody,
  composePrompt,
  formatErrorForCli,
  loadConfig,
  loadEnv,
  parseArgs,
  run,
  validateArgs,
} from "../src/img.mjs";

test("parseArgs defaults to OpenAI GPT Image 2", () => {
  const args = parseArgs(["--prompt", "A clean app icon"]);
  assert.equal(args.provider, "openai");
  assert.equal(args.model, OPENAI_DEFAULT_MODEL);
  assert.equal(args.prompt, "A clean app icon");
});

test("parseArgs accepts a natural language request without flags", () => {
  const args = parseArgs(["generate", "a", "photorealistic", "2:1", "image", "of", "a", "dog"]);
  assert.equal(args.provider, "openai");
  assert.equal(args.model, OPENAI_DEFAULT_MODEL);
  assert.equal(args.prompt, "generate a photorealistic 2:1 image of a dog");
});

test("parseArgs uses Gemini default model when selected", () => {
  const args = parseArgs(["--provider", "gemini", "--prompt", "A clean app icon"]);
  assert.equal(args.model, GEMINI_DEFAULT_MODEL);
});

test("OpenAI body uses image generation parameters", () => {
  const args = parseArgs([
    "--provider",
    "openai",
    "--prompt",
    "A clean app icon",
    "--size",
    "1024x1024",
    "--quality",
    "high",
    "--format",
    "webp",
  ]);
  assert.deepEqual(buildOpenAIJsonBody(args), {
    model: OPENAI_DEFAULT_MODEL,
    prompt: "A clean app icon",
    size: "1024x1024",
    quality: "high",
    output_format: "webp",
  });
});

test("Gemini body includes image config and inline input data", () => {
  const cwd = mkdtempSync(join(tmpdir(), "img-"));
  const inputPath = join(cwd, "reference.png");
  writeFileSync(inputPath, Buffer.from("png"));
  const args = parseArgs([
    "--provider",
    "gemini",
    "--prompt",
    "Restyle this",
    "--input",
    inputPath,
    "--aspect",
    "16:9",
    "--image-size",
    "2K",
    "--cwd",
    cwd,
  ]);
  const body = buildGeminiBody(args);
  assert.equal(body.contents[0].parts[0].text, "Restyle this");
  assert.equal(body.contents[0].parts[1].inline_data.mime_type, "image/png");
  assert.equal(body.generationConfig.imageConfig.aspectRatio, "16:9");
  assert.equal(body.generationConfig.imageConfig.imageSize, "2K");
});

test("loadEnv reads project .env without overriding process env", () => {
  const cwd = mkdtempSync(join(tmpdir(), "img-env-"));
  writeFileSync(join(cwd, ".env"), "IMG_TEST_KEY=from-file\n");
  delete process.env.IMG_TEST_KEY;
  const args = parseArgs(["--prompt", "x", "--cwd", cwd]);
  const loaded = loadEnv(args, cwd);
  assert.equal(process.env.IMG_TEST_KEY, "from-file");
  assert.equal(loaded.length, 1);
});

test("loadConfig applies provider defaults and prompt composition", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "img-config-"));
  writeFileSync(join(cwd, "img.config.json"), JSON.stringify({
    defaultProvider: "gemini",
    outputDir: "./configured-output",
    prompt: {
      prePrompts: ["Use premium editorial lighting."],
      negativePrompts: ["watermarks", "text overlays"],
    },
    gemini: {
      model: GEMINI_DEFAULT_MODEL,
      aspect: "16:9",
      imageSize: "2K",
    },
  }, null, 2));

  const result = await run(["--dry-run", "--cwd", cwd, "generate", "a", "mountain", "landscape"]);
  assert.equal(result.provider, "gemini");
  assert.equal(result.model, GEMINI_DEFAULT_MODEL);
  assert.equal(result.outputDir, join(cwd, "configured-output"));
  assert.match(result.apiPrompt, /Use premium editorial lighting/);
  assert.match(result.apiPrompt, /User prompt:\ngenerate a mountain landscape/);
  assert.match(result.apiPrompt, /Negative prompt - avoid:\nwatermarks\ntext overlays/);
});

test("explicit CLI provider overrides config default provider", () => {
  const args = parseArgs(["--provider", "openai", "--prompt", "A clean app icon"]);
  applyConfigDefaults(args, {
    defaultProvider: "gemini",
    openai: { model: OPENAI_DEFAULT_MODEL, quality: "high" },
    gemini: { model: GEMINI_DEFAULT_MODEL, imageSize: "2K" },
  });
  assert.equal(args.provider, "openai");
  assert.equal(args.model, OPENAI_DEFAULT_MODEL);
  assert.equal(args.quality, "high");
});

test("composePrompt leaves plain prompts unchanged without prompt defaults", () => {
  assert.equal(composePrompt("A clean app icon"), "A clean app icon");
});

test("loadConfig reads img.config.json from cwd", () => {
  const cwd = mkdtempSync(join(tmpdir(), "img-load-config-"));
  const configPath = join(cwd, "img.config.json");
  writeFileSync(configPath, JSON.stringify({ defaultProvider: "openai" }));
  const loaded = loadConfig(parseArgs(["--cwd", cwd, "A", "prompt"]));
  assert.equal(loaded.path, configPath);
  assert.equal(loaded.config.defaultProvider, "openai");
});

test("validateArgs allows dry-run without API keys", () => {
  const args = parseArgs(["--provider", "openai", "--prompt", "A clean app icon"]);
  assert.doesNotThrow(() => validateArgs(args, false));
});

test("validateArgs rejects unsupported Gemini image sizes before calling the API", () => {
  const args = parseArgs(["--provider", "gemini", "--prompt", "A clean app icon", "--image-size", "0.5K"]);
  assert.throws(() => validateArgs(args, false), /Use 1K, 2K, or 4K/);
});

test("apiErrorFromResponse preserves provider status, request id, details, and hint", async () => {
  const args = parseArgs(["--provider", "gemini", "--prompt", "A clean app icon", "--image-size", "1K"]);
  const response = new Response(JSON.stringify({
    error: {
      code: 400,
      status: "INVALID_ARGUMENT",
      message: "Request contains an invalid argument.",
      details: [
        {
          "@type": "type.googleapis.com/google.rpc.BadRequest",
          fieldViolations: [
            {
              field: "generationConfig.imageConfig.imageSize",
              description: "Unsupported value",
            },
          ],
        },
      ],
    },
  }), {
    status: 400,
    statusText: "Bad Request",
    headers: { "x-goog-request-id": "gemini-request-123" },
  });

  const error = await apiErrorFromResponse(response, "Gemini", args);
  const output = formatErrorForCli(error);
  assert.equal(output.provider, "Gemini");
  assert.equal(output.status, 400);
  assert.equal(output.apiStatus, "INVALID_ARGUMENT");
  assert.equal(output.requestId, "gemini-request-123");
  assert.match(output.hint, /ImageConfig/);
  assert.equal(output.details[0].fieldViolations[0].field, "generationConfig.imageConfig.imageSize");
});

test("run dry-run returns provider metadata", async () => {
  const result = await run(["--dry-run", "--provider", "gemini", "--prompt", "A clean app icon"]);
  assert.equal(result.dryRun, true);
  assert.equal(result.provider, "gemini");
  assert.equal(result.model, GEMINI_DEFAULT_MODEL);
});

test("setup creates a local env template without requiring API keys", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "img-setup-"));
  const result = await run(["setup", "--cwd", cwd]);
  const envPath = join(cwd, ".env.local");
  const configPath = join(cwd, "img.config.json");
  assert.equal(result.setup, true);
  assert.equal(result.defaultProvider, "openai");
  assert.equal(result.envFile, envPath);
  assert.equal(result.envFileCreated, true);
  assert.equal(result.configFile, configPath);
  assert.equal(result.configFileCreated, true);
  assert.equal(result.keys.openai, "missing");
  assert.equal(existsSync(envPath), true);
  assert.equal(existsSync(configPath), true);
  assert.match(readFileSync(configPath, "utf8"), /"prePrompts"/);
});
