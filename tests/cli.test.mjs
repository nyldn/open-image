import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  GEMINI_DEFAULT_MODEL,
  OPENAI_DEFAULT_MODEL,
  apiErrorFromResponse,
  buildGeminiBody,
  buildOpenAIJsonBody,
  formatErrorForCli,
  loadEnv,
  parseArgs,
  run,
  validateArgs,
} from "../src/open-image.mjs";

test("parseArgs defaults to OpenAI GPT Image 2", () => {
  const args = parseArgs(["--prompt", "A clean app icon"]);
  assert.equal(args.provider, "openai");
  assert.equal(args.model, OPENAI_DEFAULT_MODEL);
  assert.equal(args.prompt, "A clean app icon");
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
  const cwd = mkdtempSync(join(tmpdir(), "open-image-"));
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
  const cwd = mkdtempSync(join(tmpdir(), "open-image-env-"));
  writeFileSync(join(cwd, ".env"), "OPEN_IMAGE_TEST_KEY=from-file\n");
  delete process.env.OPEN_IMAGE_TEST_KEY;
  const args = parseArgs(["--prompt", "x", "--cwd", cwd]);
  const loaded = loadEnv(args, cwd);
  assert.equal(process.env.OPEN_IMAGE_TEST_KEY, "from-file");
  assert.equal(loaded.length, 1);
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
