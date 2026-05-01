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
assert(claudeManifest.name === "open-image", "Claude manifest name must be open-image");
assert(codexManifest.name === "open-image", "Codex manifest name must be open-image");

const requiredFiles = [
  "bin/open-image",
  "src/open-image.mjs",
  "commands/open-image.md",
  "commands/openai.md",
  "commands/gemini.md",
  "commands/edit.md",
  "skills/open-image/SKILL.md",
  ".env.example",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `Missing required file: ${file}`);
}

for (const command of ["commands/open-image.md", "commands/openai.md", "commands/gemini.md", "commands/edit.md"]) {
  const content = readFileSync(join(root, command), "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  assert(match, `${command} is missing YAML frontmatter`);
  assert(match[1].includes('allowed-tools: "Bash(open-image:*)"'), `${command} must quote allowed-tools`);
}

const skill = readFileSync(join(root, "skills/open-image/SKILL.md"), "utf8");
assert(skill.includes("gpt-image-2"), "Skill must mention gpt-image-2");
assert(skill.includes("gemini-3.1-flash-image-preview"), "Skill must mention Gemini model");

console.log(JSON.stringify({ ok: true, checked: requiredFiles.length + 7 }, null, 2));
