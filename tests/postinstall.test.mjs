import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("package postinstall bootstraps user setup non-interactively for global npm installs", () => {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  assert.equal(pkg.scripts.postinstall, "node scripts/postinstall.mjs");

  const result = spawnSync(process.execPath, ["scripts/postinstall.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      IMG_POSTINSTALL_DRY_RUN: "1",
      npm_config_global: "true",
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.run, true);
  assert.equal(payload.reason, "global install");
  assert.deepEqual(payload.command.slice(-3), ["setup", "--user", "--json"]);
});

test("package postinstall skips non-global installs", () => {
  const result = spawnSync(process.execPath, ["scripts/postinstall.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      IMG_POSTINSTALL_DRY_RUN: "1",
      npm_config_global: "false",
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.run, false);
  assert.equal(payload.reason, "not a global npm install");
});

test("package postinstall tolerates npm without a controlling tty", () => {
  const configHome = mkdtempSync(join(tmpdir(), "img-postinstall-config-"));

  try {
    const result = spawnSync(process.execPath, ["scripts/postinstall.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        IMG_CONFIG_HOME: configHome,
        IMG_POSTINSTALL_TTY: join(configHome, "missing", "tty"),
        npm_config_global: "true",
      },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /img first-run setup/);
  } finally {
    rmSync(configHome, { force: true, recursive: true });
  }
});
