#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { closeSync, existsSync, openSync, writeSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const imgBin = resolve(root, "bin", "img");
const command = [process.execPath, imgBin, "setup", "--user"];

function postinstallDecision(env = process.env) {
  if (env.IMG_SKIP_POSTINSTALL === "1" || env.IMG_SKIP_POSTINSTALL === "true") {
    return { run: false, reason: "skipped by IMG_SKIP_POSTINSTALL" };
  }
  if (env.CI === "true") {
    return { run: false, reason: "CI environment" };
  }
  if (env.npm_config_global !== "true") {
    return { run: false, reason: "not a global npm install" };
  }
  if (!existsSync(imgBin)) {
    return { run: false, reason: "img binary not found" };
  }
  return { run: true, reason: "global install" };
}

function writeLine(fd, text = "") {
  writeSync(fd, `${text}\n`);
}

const decision = postinstallDecision();

if (process.env.IMG_POSTINSTALL_DRY_RUN === "1") {
  console.log(JSON.stringify({ ...decision, command }, null, 2));
  process.exit(0);
}

if (!decision.run) {
  process.exit(0);
}

const ttyPath = process.env.IMG_POSTINSTALL_TTY || (process.platform === "win32" ? "CON" : "/dev/tty");
let ttyFd;
try {
  ttyFd = openSync(ttyPath, "r+");
} catch {
  process.exit(0);
}

try {
  writeLine(ttyFd);
  writeLine(ttyFd, "img first-run setup");
  writeLine(ttyFd, "Running img setup --user. Press Ctrl+C to cancel setup.");
  writeLine(ttyFd);

  const result = spawnSync(command[0], command.slice(1), {
    cwd: process.env.INIT_CWD || homedir(),
    env: { ...process.env, IMG_NPM_POSTINSTALL: "1" },
    stdio: [ttyFd, ttyFd, ttyFd],
  });

  if (result.error || result.status !== 0) {
    writeLine(ttyFd);
    writeLine(ttyFd, "img setup did not finish during npm install.");
    writeLine(ttyFd, "Run this from a normal terminal when ready:");
    writeLine(ttyFd, "  img setup");
    writeLine(ttyFd);
  }
} finally {
  closeSync(ttyFd);
}
