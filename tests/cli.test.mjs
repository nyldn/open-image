import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  GEMINI_DEFAULT_MODEL,
  MAX_IMAGES_PER_RUN,
  OPENAI_DEFAULT_MODEL,
  applyConfigDefaults,
  apiErrorFromResponse,
  activationText,
  buildGeminiBody,
  buildOpenAIJsonBody,
  composePrompt,
  formatErrorForCli,
  findProjectRoot,
  loadConfig,
  loadEnv,
  parseArgs,
  resolveAssetType,
  run,
  userConfigPath,
  userEnvPath,
  validateArgs,
} from "../src/img.mjs";

async function withEnv(updates, callback) {
  const previous = {};
  for (const key of Object.keys(updates)) {
    previous[key] = process.env[key];
    if (updates[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = updates[key];
    }
  }
  try {
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function tempConfigHome() {
  return mkdtempSync(join(tmpdir(), "img-config-home-"));
}

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

test("activate prints the image workflow loader", async () => {
  const result = await run(["activate"]);
  assert.equal(result.text, activationText());
  assert.match(result.text, /img image workflow loader/);
  assert.match(result.text, /🖼️/);
});

test("activate remains usable as natural language when it is not the whole command", () => {
  const args = parseArgs(["activate", "a", "neon", "product", "photo"]);
  assert.equal(args.activate, false);
  assert.equal(args.prompt, "activate a neon product photo");
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
  return withEnv({ IMG_CONFIG_HOME: tempConfigHome() }, async () => {
    const args = parseArgs(["--prompt", "x", "--cwd", cwd]);
    const loaded = loadEnv(args, cwd);
    assert.equal(process.env.IMG_TEST_KEY, "from-file");
    assert.equal(loaded.includes(join(cwd, ".env")), true);
  });
});

test("loadEnv leaves an existing process env value in place", () => {
  const cwd = mkdtempSync(join(tmpdir(), "img-env-precedence-"));
  writeFileSync(join(cwd, ".env"), "IMG_TEST_KEY=from-file\n");
  return withEnv({
    IMG_CONFIG_HOME: tempConfigHome(),
    IMG_TEST_KEY: "from-process",
  }, async () => {
    const args = parseArgs(["--prompt", "x", "--cwd", cwd]);
    loadEnv(args, cwd);
    assert.equal(process.env.IMG_TEST_KEY, "from-process");
  });
});

test("loadEnv does not walk above the detected git project root", () => {
  const parent = mkdtempSync(join(tmpdir(), "img-env-parent-"));
  const repo = join(parent, "repo");
  const nested = join(repo, "app");
  mkdirSync(join(repo, ".git"), { recursive: true });
  mkdirSync(nested, { recursive: true });
  writeFileSync(join(parent, ".env"), "IMG_PARENT_SECRET=do-not-load\n");
  delete process.env.IMG_PARENT_SECRET;

  return withEnv({ IMG_CONFIG_HOME: tempConfigHome() }, async () => {
    const args = parseArgs(["--prompt", "x", "--cwd", nested]);
    const loaded = loadEnv(args, repo);
    assert.equal(loaded.includes(join(parent, ".env")), false);
    assert.equal(process.env.IMG_PARENT_SECRET, undefined);
  });
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
  return withEnv({ IMG_CONFIG_HOME: tempConfigHome() }, async () => {
    const loaded = loadConfig(parseArgs(["--cwd", cwd, "A", "prompt"]));
    assert.equal(loaded.path, configPath);
    assert.equal(loaded.config.defaultProvider, "openai");
  });
});

test("loadConfig rejects missing explicit config files", () => {
  const cwd = mkdtempSync(join(tmpdir(), "img-missing-config-"));
  assert.throws(
    () => loadConfig(parseArgs(["--cwd", cwd, "--config", "missing.json", "A", "prompt"])),
    /Explicit config file not found/,
  );
});

test("loadConfig layers user config and nearest project config", () => {
  const configHome = tempConfigHome();
  const repo = mkdtempSync(join(tmpdir(), "img-layered-"));
  const nested = join(repo, "packages", "site");
  mkdirSync(join(repo, ".git"));
  mkdirSync(nested, { recursive: true });
  writeFileSync(userConfigPath({ IMG_CONFIG_HOME: configHome }), JSON.stringify({
    defaultProvider: "openai",
    outputDir: "./user-output",
    prompt: {
      prePrompts: ["Use global brand polish."],
      negativePrompts: ["watermarks"],
    },
  }, null, 2));
  writeFileSync(join(repo, "img.config.json"), JSON.stringify({
    schemaVersion: 1,
    defaultProvider: "gemini",
    outputDir: "./project-output",
    prompt: {
      prePrompts: ["Use project campaign styling."],
      negativePrompts: ["watermarks", "fake UI text"],
    },
  }, null, 2));

  return withEnv({ IMG_CONFIG_HOME: configHome }, async () => {
    const loaded = loadConfig(parseArgs(["--cwd", nested, "A", "prompt"]));
    assert.equal(loaded.path, join(repo, "img.config.json"));
    assert.deepEqual(loaded.layers.map((layer) => layer.type), ["user", "project"]);
    assert.equal(loaded.config.defaultProvider, "gemini");
    assert.equal(loaded.config.outputDir, "./project-output");
    assert.deepEqual(loaded.config.prompt.prePrompts, [
      "Use global brand polish.",
      "Use project campaign styling.",
    ]);
    assert.deepEqual(loaded.config.prompt.negativePrompts, ["watermarks", "fake UI text"]);
  });
});

test("resolveAssetType accepts configured ids and aliases", () => {
  const config = {
    assetTypes: {
      "feature-card": {
        aliases: ["feature tile", "benefit card"],
        provider: "openai",
      },
    },
  };
  assert.equal(resolveAssetType(config, "feature-card").id, "feature-card");
  assert.equal(resolveAssetType(config, "benefit card").id, "feature-card");
  assert.throws(() => resolveAssetType(config, "unknown"), /Unknown asset type/);
});

test("asset type defaults can shape a dry-run request", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "img-asset-type-"));
  writeFileSync(join(cwd, "img.config.json"), JSON.stringify({
    schemaVersion: 1,
    assetTypes: {
      "feature-card": {
        aliases: ["benefit card"],
        provider: "gemini",
        aspect: "4:3",
        outputDir: "public/generated/features",
        style: "Use a compact editorial feature-card composition.",
      },
    },
  }, null, 2));

  await withEnv({ IMG_CONFIG_HOME: tempConfigHome() }, async () => {
    const result = await run(["--dry-run", "--cwd", cwd, "--asset-type", "benefit card", "--prompt", "A member savings image"]);
    assert.equal(result.assetType, "feature-card");
    assert.equal(result.provider, "gemini");
    assert.equal(result.outputDir, join(cwd, "public/generated/features"));
    assert.match(result.apiPrompt, /compact editorial feature-card/);
  });
});

test("validateArgs allows dry-run without API keys", () => {
  const args = parseArgs(["--provider", "openai", "--prompt", "A clean app icon"]);
  assert.doesNotThrow(() => validateArgs(args, false));
});

test("validateArgs rejects unsupported Gemini image sizes before calling the API", () => {
  const args = parseArgs(["--provider", "gemini", "--prompt", "A clean app icon", "--image-size", "0.5K"]);
  assert.throws(() => validateArgs(args, false), /Use 1K, 2K, or 4K/);
});

test("validateArgs enforces configured image count limit", () => {
  const args = parseArgs(["--prompt", "A clean app icon", "--count", "3"]);
  applyConfigDefaults(args, {
    limits: { maxImagesPerRun: 2 },
  });
  assert.throws(() => validateArgs(args, false), /exceeds the configured image limit \(2\)/);
});

test("validateArgs allows counts up to the absolute image cap", () => {
  const args = parseArgs(["--prompt", "A clean app icon", "--count", String(MAX_IMAGES_PER_RUN)]);
  assert.doesNotThrow(() => validateArgs(args, false));
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

test("setup creates user files outside a git repo without requiring API keys", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "img-setup-"));
  const configHome = tempConfigHome();
  await withEnv({
    IMG_CONFIG_HOME: configHome,
    OPENAI_API_KEY: undefined,
    GEMINI_API_KEY: undefined,
  }, async () => {
    const result = await run(["setup", "--cwd", cwd]);
    const envPath = userEnvPath({ IMG_CONFIG_HOME: configHome });
    const configPath = userConfigPath({ IMG_CONFIG_HOME: configHome });
    assert.equal(result.setup, true);
    assert.equal(result.scope, "user");
    assert.equal(result.defaultProvider, "openai");
    assert.equal(result.envFile, envPath);
    assert.equal(result.envFileCreated, true);
    assert.equal(result.userConfigFile, configPath);
    assert.equal(result.userConfigFileCreated, true);
    assert.equal(result.projectConfigFile, null);
    assert.equal(result.keys.openai, "missing");
    assert.equal(existsSync(envPath), true);
    assert.equal(existsSync(configPath), true);
    assert.equal(existsSync(join(cwd, "img.config.json")), false);
    assert.match(readFileSync(configPath, "utf8"), /"assetTypes"/);
  });
});

test("setup --both inside a git repo creates user files and project config", async () => {
  const repo = mkdtempSync(join(tmpdir(), "img-setup-repo-"));
  mkdirSync(join(repo, ".git"));
  const configHome = tempConfigHome();
  await withEnv({
    IMG_CONFIG_HOME: configHome,
    OPENAI_API_KEY: undefined,
    GEMINI_API_KEY: undefined,
  }, async () => {
    const result = await run(["setup", "--both", "--cwd", repo]);
    assert.equal(result.scope, "both");
    assert.equal(result.projectRoot, repo);
    assert.equal(result.envFile, userEnvPath({ IMG_CONFIG_HOME: configHome }));
    assert.equal(result.userConfigFile, userConfigPath({ IMG_CONFIG_HOME: configHome }));
    assert.equal(result.projectConfigFile, join(repo, "img.config.json"));
    assert.equal(existsSync(result.envFile), true);
    assert.equal(existsSync(result.userConfigFile), true);
    assert.equal(existsSync(result.projectConfigFile), true);
  });
});

test("setup --project creates only project config", async () => {
  const repo = mkdtempSync(join(tmpdir(), "img-setup-project-"));
  mkdirSync(join(repo, ".git"));
  const configHome = tempConfigHome();
  await withEnv({ IMG_CONFIG_HOME: configHome }, async () => {
    const result = await run(["setup", "--project", "--cwd", repo]);
    assert.equal(result.scope, "project");
    assert.equal(result.envFile, null);
    assert.equal(result.userConfigFile, null);
    assert.equal(result.projectConfigFile, join(repo, "img.config.json"));
    assert.equal(existsSync(userEnvPath({ IMG_CONFIG_HOME: configHome })), false);
    assert.equal(existsSync(result.projectConfigFile), true);
    assert.equal(statSync(result.projectConfigFile).mode & 0o777, 0o644);
  });
});

test("findProjectRoot walks upward from nested project folders", () => {
  const repo = mkdtempSync(join(tmpdir(), "img-root-"));
  const nested = join(repo, "apps", "site");
  mkdirSync(join(repo, ".git"));
  mkdirSync(nested, { recursive: true });
  assert.equal(findProjectRoot(nested), repo);
});

test("check-health reports config layers without exposing secrets", async () => {
  const repo = mkdtempSync(join(tmpdir(), "img-health-"));
  mkdirSync(join(repo, ".git"));
  const configHome = tempConfigHome();
  writeFileSync(userConfigPath({ IMG_CONFIG_HOME: configHome }), JSON.stringify({
    schemaVersion: 1,
    defaultProvider: "openai",
  }, null, 2));
  writeFileSync(join(repo, "img.config.json"), JSON.stringify({
    schemaVersion: 1,
    outputDir: "./generated",
    brand: {
      references: ["docs/brand.md"],
    },
  }, null, 2));

  await withEnv({
    IMG_CONFIG_HOME: configHome,
    OPENAI_API_KEY: "sk-test-secret",
    GEMINI_API_KEY: undefined,
  }, async () => {
    const result = await run(["check-health", "--cwd", repo]);
    assert.equal(result.checkHealth, true);
    assert.equal(result.ok, true);
    assert.deepEqual(result.configFiles.map((file) => file.type), ["user", "project"]);
    assert.equal(result.keys.openai, "present");
    assert.equal(JSON.stringify(result).includes("sk-test-secret"), false);
    assert.equal(result.checks.some((check) => check.name === "brand-reference:docs/brand.md" && check.status === "warning"), true);
  });
});

test("check-health and dry-run warn when allowSilentMutation is set", async () => {
  const repo = mkdtempSync(join(tmpdir(), "img-silent-mutation-"));
  mkdirSync(join(repo, ".git"));
  writeFileSync(join(repo, "img.config.json"), JSON.stringify({
    schemaVersion: 1,
    allowSilentMutation: true,
  }, null, 2));

  await withEnv({ IMG_CONFIG_HOME: tempConfigHome() }, async () => {
    const health = await run(["check-health", "--cwd", repo]);
    assert.equal(health.checks.some((check) => check.name === "runtime-warning-project" && check.status === "warning"), true);

    const dryRun = await run(["--dry-run", "--cwd", repo, "--prompt", "A clean app icon"]);
    assert.equal(dryRun.warnings.some((warning) => warning.includes("allowSilentMutation=true")), true);
  });
});
