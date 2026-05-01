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
const codexManifest = readJson(".codex-plugin/plugin.json");

assert(packageJson.version === claudeManifest.version, "package.json and Claude manifest versions differ");
assert(packageJson.version === codexManifest.version, "package.json and Codex manifest versions differ");
assert(claudeManifest.name === "img", "Claude manifest name must be img");
assert(codexManifest.name === "img", "Codex manifest name must be img");

const requiredFiles = [
  "bin/img",
  "src/img.mjs",
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
  assert(match[1].includes('allowed-tools: "Bash(img:*)"'), `${command} must quote allowed-tools`);
}

const skill = readFileSync(join(root, "skills/img/SKILL.md"), "utf8");
assert(skill.includes("gpt-image-2"), "Skill must mention gpt-image-2");
assert(skill.includes("gemini-3.1-flash-image-preview"), "Skill must mention Gemini model");

const configTemplate = readJson("templates/img.config.json");
assert(configTemplate.schemaVersion === 1, "Config template schemaVersion must be 1");
assert(configTemplate.defaultProvider === "openai", "Config template defaultProvider must be openai");
assert(Array.isArray(configTemplate.prompt.prePrompts), "Config template must include prompt.prePrompts");
assert(Array.isArray(configTemplate.prompt.negativePrompts), "Config template must include prompt.negativePrompts");
assert(configTemplate.project && configTemplate.brand && configTemplate.assetTypes && configTemplate.destinations, "Config template must include project profile fields");

const configSchema = readJson("schemas/config.schema.json");
assert(configSchema.properties?.schemaVersion?.const === 1, "Config schema must target schemaVersion 1");

console.log(JSON.stringify({ ok: true, checked: requiredFiles.length + 14 }, null, 2));
