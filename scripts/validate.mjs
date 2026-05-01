import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const packageJson = readJson("package.json");
const claudeManifest = readJson(".claude-plugin/plugin.json");
const claudeMarketplace = readJson(".claude-plugin/marketplace.json");
const codexManifest = readJson(".codex-plugin/plugin.json");
const codexMarketplace = readJson(".agents/plugins/marketplace.json");

assert(packageJson.version === claudeManifest.version, "package.json and Claude manifest versions differ");
assert(packageJson.version === codexManifest.version, "package.json and Codex manifest versions differ");
assert(claudeManifest.name === "img", "Claude manifest name must be img");
assert(codexManifest.name === "img", "Codex manifest name must be img");
assert(claudeMarketplace.name === "nyldn-plugins", "Claude marketplace name must be nyldn-plugins");
const claudeImgEntry = claudeMarketplace.plugins?.find((plugin) => plugin.name === claudeManifest.name);
const claudeOctoEntry = claudeMarketplace.plugins?.find((plugin) => plugin.name === "octo");
assert(claudeMarketplace.plugins?.[0]?.name === "octo", "Claude marketplace must keep octo first for Octopus release checks");
assert(claudeImgEntry, "Claude marketplace must include img");
assert(claudeImgEntry.source?.source === "url", "Claude marketplace img source must be a URL source");
assert(claudeImgEntry.source?.url === "https://github.com/nyldn/img.git", "Claude marketplace img source must point at nyldn/img");
assert(claudeImgEntry.version === claudeManifest.version, "Claude marketplace img version must match plugin manifest");
assert(claudeOctoEntry, "Claude marketplace must include octo to avoid nyldn-plugins catalog overwrite conflicts");
assert(claudeOctoEntry.source?.source === "url", "Claude marketplace octo source must be a URL source");
assert(
  claudeOctoEntry.source?.url === "https://github.com/nyldn/claude-octopus.git",
  "Claude marketplace octo source must point at nyldn/claude-octopus",
);
assert(codexMarketplace.name === "nyldn-plugins", "Codex marketplace name must be nyldn-plugins");
assert(codexMarketplace.plugins?.[0]?.name === codexManifest.name, "Codex marketplace plugin name must match plugin manifest");
assert(codexMarketplace.plugins?.[0]?.source?.path === "./", "Codex marketplace plugin source path must be ./");

const requiredFiles = [
  "bin/img",
  "src/img.mjs",
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
  "commands/img.md",
  "commands/openai.md",
  "commands/gemini.md",
  "commands/edit.md",
  "commands/setup.md",
  "docs/setup-file.md",
  "docs/assets/demo.gif",
  "docs/demo/img-demo.sh",
  "docs/demo/img-demo.tape",
  "skills/img/SKILL.md",
  "templates/img.config.json",
  "schemas/config.schema.json",
  "schemas/plan.schema.json",
  "schemas/manifest.schema.json",
  "schemas/recipe.schema.json",
  "tests/fixtures/plan.sample.json",
  "tests/fixtures/manifest.sample.json",
  "tests/fixtures/recipe.sample.json",
  ".env.example",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `Missing required file: ${file}`);
}

for (const command of ["commands/img.md", "commands/openai.md", "commands/gemini.md", "commands/edit.md", "commands/setup.md"]) {
  const content = readFileSync(join(root, command), "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  assert(match, `${command} is missing YAML frontmatter`);
  assert(match[1].includes('allowed-tools: "Bash(${CLAUDE_PLUGIN_ROOT}/bin/img:*)"'), `${command} must use the plugin-local img binary`);
}

const skill = readFileSync(join(root, "skills/img/SKILL.md"), "utf8");
assert(skill.includes("gpt-image-2"), "Skill must mention gpt-image-2");
assert(skill.includes("gemini-3.1-flash-image-preview"), "Skill must mention Gemini model");
assert(skill.includes("version: 0.1.0"), "Skill must include version frontmatter");

function typeMatches(value, expected) {
  if (Array.isArray(expected)) return expected.some((item) => typeMatches(value, item));
  if (expected === "array") return Array.isArray(value);
  if (expected === "integer") return Number.isInteger(value);
  if (expected === "number") return typeof value === "number" && Number.isFinite(value);
  if (expected === "null") return value === null;
  return typeof value === expected;
}

function validateSchema(schema, value, path = "$") {
  if (schema.const !== undefined && value !== schema.const) {
    throw new Error(`${path} must equal ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    throw new Error(`${path} must be one of ${schema.enum.join(", ")}`);
  }
  if (schema.type && !typeMatches(value, schema.type)) {
    throw new Error(`${path} must be type ${Array.isArray(schema.type) ? schema.type.join("|") : schema.type}`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) throw new Error(`${path} is below minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) throw new Error(`${path} is above maximum ${schema.maximum}`);
  }
  if (schema.required && value && typeof value === "object") {
    for (const key of schema.required) {
      if (value[key] === undefined) throw new Error(`${path}.${key} is required`);
    }
  }
  if (schema.type === "array" && Array.isArray(value) && schema.items) {
    value.forEach((item, index) => validateSchema(schema.items, item, `${path}[${index}]`));
  }
  if (schema.type === "object" && value && typeof value === "object" && !Array.isArray(value)) {
    const properties = schema.properties || {};
    for (const [key, item] of Object.entries(value)) {
      if (properties[key]) {
        validateSchema(properties[key], item, `${path}.${key}`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        validateSchema(schema.additionalProperties, item, `${path}.${key}`);
      } else if (schema.additionalProperties === false) {
        throw new Error(`${path}.${key} is not allowed`);
      }
    }
  }
}

const configTemplate = readJson("templates/img.config.json");
assert(configTemplate.schemaVersion === 1, "Config template schemaVersion must be 1");
assert(configTemplate.defaultProvider === "openai", "Config template defaultProvider must be openai");
assert(Array.isArray(configTemplate.prompt.prePrompts), "Config template must include prompt.prePrompts");
assert(Array.isArray(configTemplate.prompt.negativePrompts), "Config template must include prompt.negativePrompts");
assert(configTemplate.project && configTemplate.brand && configTemplate.assetTypes && configTemplate.destinations, "Config template must include project profile fields");

const configSchema = readJson("schemas/config.schema.json");
assert(configSchema.properties?.schemaVersion?.const === 1, "Config schema must target schemaVersion 1");
validateSchema(configSchema, configTemplate, "templates/img.config.json");
validateSchema(readJson("schemas/plan.schema.json"), readJson("tests/fixtures/plan.sample.json"), "tests/fixtures/plan.sample.json");
validateSchema(readJson("schemas/manifest.schema.json"), readJson("tests/fixtures/manifest.sample.json"), "tests/fixtures/manifest.sample.json");
validateSchema(readJson("schemas/recipe.schema.json"), readJson("tests/fixtures/recipe.sample.json"), "tests/fixtures/recipe.sample.json");

console.log(JSON.stringify({ ok: true, checked: requiredFiles.length + 29 }, null, 2));
