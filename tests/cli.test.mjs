import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  GEMINI_DEFAULT_MODEL,
  OPENAI_DEFAULT_MODEL,
  buildGeminiBody,
  buildOpenAIJsonBody,
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

test("run dry-run returns provider metadata", async () => {
  const result = await run(["--dry-run", "--provider", "gemini", "--prompt", "A clean app icon"]);
  assert.equal(result.dryRun, true);
  assert.equal(result.provider, "gemini");
  assert.equal(result.model, GEMINI_DEFAULT_MODEL);
});

