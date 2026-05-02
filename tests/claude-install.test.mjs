import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

function tempHome() {
  return mkdtempSync(join(tmpdir(), "img-claude-home-"));
}

function commandPath(home) {
  return join(home, ".claude", "commands", "img.md");
}

test("Claude install cleanup removes the generated user /img command", () => {
  const home = tempHome();
  const target = commandPath(home);
  mkdirSync(join(home, ".claude", "commands"), { recursive: true });
  writeFileSync(target, [
    "---",
    "description: Generate an image with img.",
    "---",
    "This is the user-scope base command for img.",
    "",
  ].join("\n"));

  const result = spawnSync("bash", ["scripts/cleanup-claude-user-command.sh"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, HOME: home },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(existsSync(target), false);
  assert.match(result.stdout, /Removed generated Claude user \/img command/);
});

test("Claude install cleanup preserves a custom user /img command", () => {
  const home = tempHome();
  const target = commandPath(home);
  mkdirSync(join(home, ".claude", "commands"), { recursive: true });
  writeFileSync(target, "custom command\n");

  const result = spawnSync("bash", ["scripts/cleanup-claude-user-command.sh"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, HOME: home },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(readFileSync(target, "utf8"), "custom command\n");
  assert.match(result.stdout, /Kept existing Claude user \/img command/);
});
