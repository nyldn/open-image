import { execFile, execFileSync } from "node:child_process";
import { accessSync, constants, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";

export const OPENAI_DEFAULT_MODEL = "gpt-image-2";
export const GEMINI_DEFAULT_MODEL = "gemini-3.1-flash-image-preview";
export const DEFAULT_CONFIG_FILENAME = "img.config.json";
export const MAX_IMAGES_PER_RUN = 12;

const PROVIDERS = new Set(["openai", "gemini"]);
const PROVIDER_KEY_NAMES = {
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
};
const KEYCHAIN_SERVICE = "nyldn-img";
const MARKETPLACE_URL = "https://github.com/nyldn/plugins.git";
const PLUGIN_REF = "img@nyldn-plugins";
const OPENAI_FORMATS = new Set(["png", "jpeg", "webp"]);
const OPENAI_QUALITIES = new Set(["auto", "low", "medium", "high"]);
const GEMINI_ASPECTS = new Set([
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "4:5",
  "5:4",
  "3:2",
  "2:3",
  "1:4",
  "4:1",
  "1:8",
  "8:1",
  "21:9",
]);
const GEMINI_IMAGE_SIZES = new Set(["1K", "2K", "4K"]);

export class ProviderApiError extends Error {
  constructor({ provider, status, statusText, code, apiStatus, requestId, message, details, hint, bodyExcerpt }) {
    super(message);
    this.name = "ProviderApiError";
    this.provider = provider;
    this.status = status;
    this.statusText = statusText;
    this.code = code;
    this.apiStatus = apiStatus;
    this.requestId = requestId;
    this.details = details;
    this.hint = hint;
    this.bodyExcerpt = bodyExcerpt;
  }
}

export class SetupRequiredError extends Error {
  constructor({ provider, keyName, envFile, envFileCreated, userConfigFile, userConfigFileCreated }) {
    super(`${keyName} is required for --provider ${provider}`);
    this.name = "SetupRequiredError";
    this.provider = provider;
    this.keyName = keyName;
    this.envFile = envFile;
    this.envFileCreated = envFileCreated;
    this.userConfigFile = userConfigFile;
    this.userConfigFileCreated = userConfigFileCreated;
  }
}

function pluginRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

function readValue(argv, index, flag) {
  if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return argv[index + 1];
}

function markExplicit(args, key) {
  args._explicit.add(key);
}

export function userConfigDir(env = process.env) {
  if (env.IMG_CONFIG_HOME) return resolve(env.IMG_CONFIG_HOME);
  if (env.XDG_CONFIG_HOME) return resolve(env.XDG_CONFIG_HOME, "img");
  return resolve(env.HOME || homedir(), ".config", "img");
}

export function userConfigPath(env = process.env) {
  return join(userConfigDir(env), "config.json");
}

export function userEnvPath(env = process.env) {
  return join(userConfigDir(env), ".env.local");
}

export function findUpwardFile(startDir, filenames, stopDir = null) {
  const names = Array.isArray(filenames) ? filenames : [filenames];
  let dir = resolve(startDir);
  const stop = stopDir ? resolve(stopDir) : null;
  while (true) {
    for (const name of names) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    if (stop && dir === stop) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function findProjectRoot(startDir) {
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function parseArgs(argv = []) {
  const args = {
    _explicit: new Set(),
    setup: false,
    setupScope: "",
    json: false,
    install: false,
    installTarget: "all",
    installSetup: "auto",
    key: false,
    keyAction: "status",
    keyProvider: "",
    checkHealth: false,
    activate: false,
    configFile: "",
    provider: process.env.IMG_PROVIDER || "openai",
    assetType: "",
    prompt: "",
    inputs: [],
    mask: "",
    outputDir: process.env.IMG_OUTPUT_DIR || "./img-output",
    filename: "",
    model: "",
    size: "auto",
    quality: "auto",
    format: "png",
    compression: undefined,
    count: 1,
    aspect: "1:1",
    imageSize: "1K",
    open: false,
    dryRun: false,
    googleSearch: false,
    envFile: "",
    cwd: process.cwd(),
    help: false,
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    switch (token) {
      case "activate":
      case "banner":
        if (i === 0 && argv.length === 1) {
          args.activate = true;
        } else {
          positional.push(token);
        }
        break;
      case "--activate":
      case "--banner":
        args.activate = true;
        break;
      case "setup":
        args.setup = true;
        break;
      case "install":
        if (i === 0) {
          args.install = true;
          if (argv[i + 1] && ["all", "claude", "codex"].includes(argv[i + 1].toLowerCase())) {
            args.installTarget = argv[i + 1].toLowerCase();
            i += 1;
          }
        } else {
          positional.push(token);
        }
        break;
      case "--setup":
        if (args.install) {
          args.installSetup = "force";
        } else {
          args.setup = true;
        }
        break;
      case "--no-setup":
        args.installSetup = "never";
        break;
      case "--json":
        args.json = true;
        break;
      case "key":
      case "keys":
      case "keychain":
        if (i === 0 || token === "keychain") {
          args.key = true;
          if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
            args.keyAction = argv[i + 1].toLowerCase();
            i += 1;
          }
          if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
            args.keyProvider = argv[i + 1].toLowerCase();
            i += 1;
          }
        } else {
          positional.push(token);
        }
        break;
      case "check-health":
      case "doctor":
      case "--check-health":
        if (i === 0 || token === "--check-health") {
          args.checkHealth = true;
        } else {
          positional.push(token);
        }
        break;
      case "--user":
        args.setupScope = "user";
        break;
      case "--project":
        args.setupScope = "project";
        break;
      case "--both":
        args.setupScope = "both";
        break;
      case "--provider":
        args.provider = readValue(argv, i, token);
        markExplicit(args, "provider");
        i += 1;
        break;
      case "--asset-type":
        args.assetType = readValue(argv, i, token);
        markExplicit(args, "assetType");
        i += 1;
        break;
      case "--prompt":
      case "-p":
        args.prompt = readValue(argv, i, token);
        markExplicit(args, "prompt");
        i += 1;
        break;
      case "--input":
      case "-i":
        args.inputs.push(readValue(argv, i, token));
        i += 1;
        break;
      case "--mask":
        args.mask = readValue(argv, i, token);
        i += 1;
        break;
      case "--out":
      case "--output":
      case "-o":
        args.outputDir = readValue(argv, i, token);
        markExplicit(args, "outputDir");
        i += 1;
        break;
      case "--filename":
        args.filename = readValue(argv, i, token);
        i += 1;
        break;
      case "--model":
        args.model = readValue(argv, i, token);
        markExplicit(args, "model");
        i += 1;
        break;
      case "--size":
        args.size = readValue(argv, i, token);
        markExplicit(args, "size");
        i += 1;
        break;
      case "--quality":
        args.quality = readValue(argv, i, token);
        markExplicit(args, "quality");
        i += 1;
        break;
      case "--format":
        args.format = readValue(argv, i, token);
        markExplicit(args, "format");
        i += 1;
        break;
      case "--compression":
        args.compression = Number(readValue(argv, i, token));
        markExplicit(args, "compression");
        i += 1;
        break;
      case "--count":
      case "-n":
        args.count = Number.parseInt(readValue(argv, i, token), 10);
        markExplicit(args, "count");
        i += 1;
        break;
      case "--aspect":
        args.aspect = readValue(argv, i, token);
        markExplicit(args, "aspect");
        i += 1;
        break;
      case "--image-size":
        args.imageSize = readValue(argv, i, token);
        markExplicit(args, "imageSize");
        i += 1;
        break;
      case "--config":
        args.configFile = readValue(argv, i, token);
        markExplicit(args, "configFile");
        i += 1;
        break;
      case "--env-file":
        args.envFile = readValue(argv, i, token);
        i += 1;
        break;
      case "--cwd":
        args.cwd = resolve(readValue(argv, i, token));
        i += 1;
        break;
      case "--open":
        args.open = true;
        markExplicit(args, "open");
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--google-search":
        args.googleSearch = true;
        markExplicit(args, "googleSearch");
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        if (token.startsWith("--")) {
          throw new Error(`Unknown argument: ${token}`);
        }
        positional.push(token);
    }
  }

  if (!args.prompt && positional.length > 0) {
    args.prompt = positional.join(" ");
  }

  args.provider = args.provider.toLowerCase();
  if (!args.model) {
    args.model = args.provider === "gemini" ? GEMINI_DEFAULT_MODEL : OPENAI_DEFAULT_MODEL;
  }
  args.format = args.format.toLowerCase();

  return args;
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Invalid img config JSON at ${filePath}: ${error.message}`);
  }
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (typeof value !== "string") {
      result.push(value);
      continue;
    }
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function shouldReplaceArray(override) {
  return override && typeof override === "object" && override.mergeMode === "replace";
}

function mergeConfig(base = {}, override = {}) {
  if (!override || typeof override !== "object" || Array.isArray(override)) return base;
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (key === "mergeMode") continue;
    if (Array.isArray(value)) {
      const baseValue = Array.isArray(base[key]) && !shouldReplaceArray(override) ? base[key] : [];
      result[key] = uniqueStrings([...baseValue, ...value]);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      const baseValue = base[key] && typeof base[key] === "object" && !Array.isArray(base[key]) ? base[key] : {};
      result[key] = mergeConfig(baseValue, value);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function loadConfig(args, root = pluginRoot()) {
  const layers = [];
  if (args.configFile) {
    const explicitPath = resolve(args.cwd, args.configFile);
    if (!existsSync(explicitPath)) {
      throw new Error(`Explicit config file not found: ${explicitPath}`);
    }
    const config = safeReadJson(explicitPath);
    return {
      path: explicitPath,
      config,
      layers: [{ type: "explicit", path: explicitPath, config }],
    };
  }

  const globalPath = userConfigPath();
  if (existsSync(globalPath)) {
    layers.push({ type: "user", path: globalPath, config: safeReadJson(globalPath) });
  }
  const projectRoot = findProjectRoot(args.cwd);
  const projectPath = findUpwardFile(args.cwd, [DEFAULT_CONFIG_FILENAME, ".img.json"], projectRoot || resolve(args.cwd));
  if (projectPath) {
    layers.push({ type: "project", path: projectPath, config: safeReadJson(projectPath) });
  }
  const pluginDefaultPath = resolve(root, DEFAULT_CONFIG_FILENAME);
  if (layers.length === 0 && existsSync(pluginDefaultPath)) {
    layers.push({ type: "plugin", path: pluginDefaultPath, config: safeReadJson(pluginDefaultPath) });
  }

  const merged = layers.reduce((config, layer) => mergeConfig(config, layer.config), {});
  const primary = [...layers].reverse().find((layer) => layer.type !== "plugin") || layers[layers.length - 1];
  return {
    path: primary?.path || null,
    config: merged,
    layers,
  };
}

function defaultModelForProvider(provider) {
  return provider === "gemini" ? GEMINI_DEFAULT_MODEL : OPENAI_DEFAULT_MODEL;
}

function normalizeAssetType(value) {
  return String(value || "").trim().toLowerCase();
}

export function resolveAssetType(config = {}, requested = "") {
  const target = normalizeAssetType(requested);
  if (!target) return null;
  const assetTypes = config.assetTypes || {};
  for (const [id, assetConfig] of Object.entries(assetTypes)) {
    const aliases = normalizePromptList(assetConfig?.aliases);
    const names = [id, ...aliases].map(normalizeAssetType);
    if (names.includes(target)) return { id, config: assetConfig || {} };
  }
  throw new Error(`Unknown asset type "${requested}". Add it to assetTypes in img.config.json or use a configured alias.`);
}

function normalizePromptList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function normalizeBrandColors(colors = {}) {
  if (!colors || typeof colors !== "object" || Array.isArray(colors)) return [];
  return Object.entries(colors)
    .map(([name, value]) => [String(name).trim(), String(value).trim()])
    .filter(([name, value]) => name && value);
}

export function parseBrandColorInput(value = "") {
  const colors = {};
  const tokens = String(value || "")
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  for (const token of tokens) {
    let hex = token.replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      hex = hex.split("").map((char) => `${char}${char}`).join("");
    }
    if (!/^[0-9a-f]{6}$/i.test(hex)) continue;
    colors[`color${Object.keys(colors).length + 1}`] = `#${hex.toLowerCase()}`;
  }

  return colors;
}

function brandColorInputValue(colors = {}) {
  return normalizeBrandColors(colors).map(([, value]) => value).join(" ");
}

export function composePrompt(userPrompt, promptConfig = {}) {
  const prePrompts = [
    ...normalizePromptList(promptConfig.prePrompt),
    ...normalizePromptList(promptConfig.prePrompts),
  ];
  const negativePrompts = [
    ...normalizePromptList(promptConfig.negativePrompt),
    ...normalizePromptList(promptConfig.negativePrompts),
  ];
  const brandColors = normalizeBrandColors(promptConfig.brandColors);
  if (prePrompts.length === 0 && negativePrompts.length === 0 && brandColors.length === 0) {
    return userPrompt;
  }
  const parts = [];
  if (prePrompts.length > 0) {
    parts.push(`Always apply these instructions:\n${prePrompts.join("\n")}`);
  }
  if (brandColors.length > 0) {
    parts.push(`Brand colors:\n${brandColors.map(([name, value]) => `${name}: ${value}`).join("\n")}`);
  }
  parts.push(`User prompt:\n${userPrompt}`);
  if (negativePrompts.length > 0) {
    parts.push(`Negative prompt - avoid:\n${negativePrompts.join("\n")}`);
  }
  return parts.join("\n\n");
}

function maybeApply(args, key, value) {
  if (args._explicit?.has?.(key) || value === undefined || value === null || value === "") return;
  args[key] = value;
}

export function applyConfigDefaults(args, config = {}) {
  const provider = config.defaultProvider || config.provider;
  maybeApply(args, "provider", provider);
  args.provider = args.provider.toLowerCase();

  let assetConfig = {};
  if (args.assetType) {
    const resolvedAssetType = resolveAssetType(config, args.assetType);
    args.assetType = resolvedAssetType.id;
    assetConfig = resolvedAssetType.config;
    maybeApply(args, "provider", assetConfig.provider);
    args.provider = args.provider.toLowerCase();
  }

  maybeApply(args, "outputDir", config.outputDir);
  maybeApply(args, "outputDir", assetConfig.outputDir);
  maybeApply(args, "count", config.count);
  maybeApply(args, "count", assetConfig.count);
  maybeApply(args, "open", config.openAfterGeneration);
  args.limits = config.limits || {};

  const providerConfig = args.provider === "gemini" ? config.gemini || {} : config.openai || {};
  if (!args._explicit.has("model")) {
    args.model = providerConfig.model || defaultModelForProvider(args.provider);
  }
  maybeApply(args, "size", providerConfig.size);
  maybeApply(args, "size", assetConfig.size);
  maybeApply(args, "quality", providerConfig.quality);
  maybeApply(args, "format", providerConfig.format);
  maybeApply(args, "compression", providerConfig.compression);
  maybeApply(args, "aspect", providerConfig.aspect);
  maybeApply(args, "aspect", assetConfig.aspect);
  maybeApply(args, "imageSize", providerConfig.imageSize);
  maybeApply(args, "googleSearch", providerConfig.googleSearch);

  args.format = args.format.toLowerCase();
  args.promptConfig = {
    prePrompts: uniqueStrings([
      ...normalizePromptList(config.prompt?.prePrompts),
      ...normalizePromptList(config.prompt?.prePrompt),
      ...normalizePromptList(config.brand?.prePrompts),
      ...normalizePromptList(assetConfig.style),
    ]),
    negativePrompts: uniqueStrings([
      ...normalizePromptList(config.prompt?.negativePrompts),
      ...normalizePromptList(config.prompt?.negativePrompt),
      ...normalizePromptList(config.brand?.negativePrompts),
    ]),
    brandColors: config.brand?.colors || {},
  };
  args.apiPrompt = composePrompt(args.prompt, args.promptConfig);
  return args;
}

function parseEnvContent(content) {
  const parsed = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[match[1]] = value;
  }
  return parsed;
}

export function loadEnv(args, root = pluginRoot()) {
  const candidates = [];
  if (args.envFile) candidates.push(resolve(args.cwd, args.envFile));
  const projectRoot = findProjectRoot(args.cwd);
  const envSearchRoot = projectRoot || resolve(args.cwd);
  const projectEnvLocal = findUpwardFile(args.cwd, ".env.local", envSearchRoot);
  const projectEnv = findUpwardFile(args.cwd, ".env", envSearchRoot);
  if (projectEnvLocal) candidates.push(projectEnvLocal);
  if (projectEnv) candidates.push(projectEnv);
  candidates.push(userEnvPath());
  candidates.push(resolve(root, ".env.local"));
  candidates.push(resolve(root, ".env"));

  const loaded = [];
  const seen = new Set();
  for (const file of candidates) {
    if (seen.has(file)) continue;
    seen.add(file);
    if (!existsSync(file)) continue;
    const values = parseEnvContent(readFileSync(file, "utf8"));
    for (const [key, value] of Object.entries(values)) {
      if (!process.env[key]) process.env[key] = value;
    }
    loaded.push(file);
  }
  return loaded;
}

function keychainEnabled(env = process.env) {
  return process.platform === "darwin" && env.IMG_DISABLE_KEYCHAIN !== "1";
}

function keyNameForProvider(provider) {
  const normalized = String(provider || "").toLowerCase();
  if (!PROVIDERS.has(normalized)) {
    throw new Error(`Unsupported provider "${provider}". Use openai or gemini.`);
  }
  return PROVIDER_KEY_NAMES[normalized];
}

function providerForKeyName(keyName) {
  return Object.entries(PROVIDER_KEY_NAMES).find(([, value]) => value === keyName)?.[0] || "";
}

export function keyPromptLabel(keyName) {
  const provider = providerForKeyName(keyName);
  if (provider === "openai") return "OpenAI API key";
  if (provider === "gemini") return "Gemini API key";
  return `${keyName} API key`;
}

function readMacKeychainSecret(keyName) {
  if (!keychainEnabled()) return "";
  try {
    return execFileSync("security", [
      "find-generic-password",
      "-a",
      keyName,
      "-s",
      KEYCHAIN_SERVICE,
      "-w",
    ], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

async function readHiddenValue(prompt) {
  if (!process.stdin.isTTY) {
    throw new Error("Run this from a normal terminal so img can read the API key securely.");
  }

  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stderr.write(chunk, encoding);
      callback();
    },
  });
  const rl = createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });

  try {
    output.write(prompt);
    muted = true;
    const value = await rl.question("");
    muted = false;
    process.stderr.write("\n");
    return value.trim();
  } finally {
    rl.close();
  }
}

async function writeMacKeychainSecret(keyName) {
  if (!keychainEnabled()) {
    throw new Error("macOS Keychain storage is only available on macOS and when IMG_DISABLE_KEYCHAIN is not set.");
  }
  const value = await readHiddenValue(`${keyPromptLabel(keyName)}: `);
  if (!value) throw new Error(`${keyPromptLabel(keyName)} was empty; no Keychain entry was saved.`);
  execFileSync("security", [
    "add-generic-password",
    "-U",
    "-a",
    keyName,
    "-s",
    KEYCHAIN_SERVICE,
    "-l",
    `Image Agency ${keyPromptLabel(keyName)}`,
    "-w",
    value,
  ], { stdio: ["ignore", "ignore", "pipe"] });
}

function deleteMacKeychainSecret(keyName) {
  if (!keychainEnabled()) {
    throw new Error("macOS Keychain storage is only available on macOS and when IMG_DISABLE_KEYCHAIN is not set.");
  }
  try {
    execFileSync("security", [
      "delete-generic-password",
      "-a",
      keyName,
      "-s",
      KEYCHAIN_SERVICE,
    ], { stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    throw new Error(`${keyName} was not found in macOS Keychain service ${KEYCHAIN_SERVICE}.`);
  }
}

function keyStatusFor(keyName) {
  const env = envStatus(process.env[keyName]);
  const keychainSecret = readMacKeychainSecret(keyName);
  const keychain = keychainSecret ? "present" : keychainEnabled() ? "missing" : "unavailable";
  const effective = env === "present" || keychain === "present" ? "present" : env === "placeholder" ? "placeholder" : "missing";
  const source = env === "present" ? "environment" : keychain === "present" ? "macos-keychain" : null;
  return {
    provider: providerForKeyName(keyName),
    keyName,
    effective,
    source,
    environment: env,
    macosKeychain: keychain,
  };
}

function keyStatusMap(loadedCredentialKeys = []) {
  const loadedSources = new Map(loadedCredentialKeys.map((item) => [item.keyName, item.source]));
  return Object.fromEntries(
    Object.values(PROVIDER_KEY_NAMES).map((keyName) => {
      const status = keyStatusFor(keyName);
      if (loadedSources.has(keyName) && status.effective === "present") {
        status.source = loadedSources.get(keyName);
        status.loadedFromCredentialStore = true;
      }
      return [providerForKeyName(keyName), status];
    }),
  );
}

function loadStoredProviderKeys() {
  const loaded = [];
  for (const keyName of Object.values(PROVIDER_KEY_NAMES)) {
    if (envStatus(process.env[keyName]) === "present") continue;
    const secret = readMacKeychainSecret(keyName);
    if (!secret) continue;
    process.env[keyName] = secret;
    loaded.push({
      provider: providerForKeyName(keyName),
      keyName,
      source: "macos-keychain",
    });
  }
  return loaded;
}

async function keyCommand(args, loadedEnvFiles = []) {
  const action = args.keyAction || "status";
  if (!["status", "list", "set", "delete", "remove"].includes(action)) {
    throw new Error("Unsupported key action. Use: img key status, img key set openai, or img key delete openai.");
  }

  if (action === "status" || action === "list") {
    return {
      key: true,
      action: "status",
      store: "macos-keychain",
      service: KEYCHAIN_SERVICE,
      supported: keychainEnabled(),
      loadedEnvFiles,
      keys: keyStatusMap(),
      nextSteps: keychainEnabled()
        ? [
            "Run img key set openai from a normal terminal to save the default provider key in macOS Keychain.",
            "Run img key set gemini only if you want Gemini image generation too.",
          ]
        : [
            "Set OPENAI_API_KEY or GEMINI_API_KEY in the shell, an env file, or a platform secret manager.",
          ],
    };
  }

  if (!args.keyProvider) throw new Error(`img key ${action} requires a provider: openai or gemini.`);
  const provider = args.keyProvider;
  const keyName = keyNameForProvider(provider);

  if (action === "set") {
    await writeMacKeychainSecret(keyName);
    process.env[keyName] = readMacKeychainSecret(keyName);
    return {
      key: true,
      action: "set",
      provider,
      keyName,
      store: "macos-keychain",
      service: KEYCHAIN_SERVICE,
      status: "stored",
      nextSteps: ["Re-run the same /img or img request."],
    };
  }

  deleteMacKeychainSecret(keyName);
  delete process.env[keyName];
  return {
    key: true,
    action: "delete",
    provider,
    keyName,
    store: "macos-keychain",
    service: KEYCHAIN_SERVICE,
    status: "deleted",
  };
}

function commandExists(command) {
  try {
    execFileSync("sh", ["-lc", `command -v ${command}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function setupNeeded() {
  if (!existsSync(userConfigPath())) return true;
  let defaultProvider = "openai";
  try {
    const loaded = loadConfig(parseArgs([]));
    defaultProvider = String(loaded.config.defaultProvider || loaded.config.provider || defaultProvider).toLowerCase();
  } catch {
    defaultProvider = "openai";
  }
  return envPresence()[defaultProvider] !== "present";
}

export function buildInstallPlan({ target = "all", hasClaude = false, hasCodex = false, configured = false, setupMode = "auto" } = {}) {
  const includeClaude = target === "all" || target === "claude";
  const includeCodex = target === "all" || target === "codex";
  const setupAction = setupMode === "never"
    ? "skip"
    : setupMode === "force" || !configured
      ? "run"
      : "skip";

  return {
    install: true,
    marketplace: MARKETPLACE_URL,
    plugin: PLUGIN_REF,
    target,
    targets: {
      claude: {
        selected: includeClaude,
        available: includeClaude && hasClaude,
        actions: includeClaude && hasClaude
          ? [
              `claude plugin marketplace add ${MARKETPLACE_URL} --scope user`,
              `claude plugin install ${PLUGIN_REF} --scope user`,
              "remove generated Claude user /img command if present",
            ]
          : [],
        skippedReason: includeClaude && !hasClaude ? "claude command not found" : null,
      },
      codex: {
        selected: includeCodex,
        available: includeCodex && hasCodex,
        actions: includeCodex && hasCodex
          ? [
              `codex plugin marketplace add ${MARKETPLACE_URL}`,
              "open Codex /plugins and enable img if non-interactive install is unavailable",
            ]
          : [],
        skippedReason: includeCodex && !hasCodex ? "codex command not found" : null,
      },
    },
    setup: {
      action: setupAction,
      reason: setupAction === "run"
        ? (configured ? "setup was requested" : "first install or missing default configuration")
        : "setup skipped by flag or existing configuration",
      command: "img setup",
    },
  };
}

function runInstallStep(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

async function installCommand(args, loadedEnvFiles, loadedCredentialKeys) {
  const plan = buildInstallPlan({
    target: args.installTarget,
    hasClaude: commandExists("claude"),
    hasCodex: commandExists("codex"),
    configured: !setupNeeded(),
    setupMode: args.installSetup,
  });

  if (args.dryRun || args.json) return plan;

  const results = [];
  if (plan.targets.claude.available) {
    runInstallStep("claude", ["plugin", "marketplace", "add", MARKETPLACE_URL, "--scope", "user"]);
    runInstallStep("claude", ["plugin", "install", PLUGIN_REF, "--scope", "user"]);
    const cleanupScript = resolve(pluginRoot(), "scripts", "cleanup-claude-user-command.sh");
    if (existsSync(cleanupScript)) runInstallStep(cleanupScript, []);
    results.push({ target: "claude", installed: true });
  }

  if (plan.targets.codex.available) {
    runInstallStep("codex", ["plugin", "marketplace", "add", MARKETPLACE_URL]);
    results.push({
      target: "codex",
      installed: true,
      nextStep: "Open /plugins in Codex and enable img if it is not already enabled.",
    });
  }

  if (plan.setup.action === "run") {
    if (isInteractiveTerminal(args)) {
      await setupTui(args, loadedEnvFiles, loadedCredentialKeys);
    } else {
      results.push({ target: "setup", installed: false, nextStep: "Run img setup in a normal terminal." });
    }
  }

  return {
    installed: true,
    plan,
    results,
  };
}

function mimeTypeFor(filePath, fallback = "image/png") {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return fallback;
}

function extensionForMime(mimeType, fallback = "png") {
  const normalized = (mimeType || "").toLowerCase();
  if (normalized.includes("jpeg")) return "jpg";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  if (normalized.includes("png")) return "png";
  return fallback;
}

function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || "image";
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export function validateArgs(args, requireKeys = true) {
  if (args.help) return;
  if (args.setup) return;
  if (args.install) return;
  if (args.key) return;
  if (args.checkHealth) return;
  if (!PROVIDERS.has(args.provider)) {
    throw new Error(`Unsupported provider "${args.provider}". Use openai or gemini.`);
  }
  if (!args.prompt.trim()) {
    throw new Error("Missing prompt. Use --prompt \"...\" or pass the prompt as positional text.");
  }
  if (!Number.isInteger(args.count) || args.count < 1 || args.count > MAX_IMAGES_PER_RUN) {
    throw new Error(`--count must be an integer from 1 to ${MAX_IMAGES_PER_RUN}`);
  }
  const configuredLimit = args.limits?.maxImagesPerRun;
  const effectiveLimit = Number.isInteger(configuredLimit)
    ? Math.min(configuredLimit, MAX_IMAGES_PER_RUN)
    : MAX_IMAGES_PER_RUN;
  if (args.count > effectiveLimit) {
    throw new Error(`--count ${args.count} exceeds the configured image limit (${effectiveLimit}).`);
  }
  for (const input of args.inputs) {
    if (!existsSync(resolve(args.cwd, input))) throw new Error(`Input image not found: ${input}`);
  }
  if (args.mask && !existsSync(resolve(args.cwd, args.mask))) {
    throw new Error(`Mask image not found: ${args.mask}`);
  }
  if (args.provider === "openai") {
    if (!OPENAI_FORMATS.has(args.format)) throw new Error("--format must be png, jpeg, or webp");
    if (!OPENAI_QUALITIES.has(args.quality)) throw new Error("--quality must be auto, low, medium, or high");
    if (args.compression !== undefined && (!Number.isInteger(args.compression) || args.compression < 0 || args.compression > 100)) {
      throw new Error("--compression must be an integer from 0 to 100");
    }
    if (requireKeys && envStatus(process.env.OPENAI_API_KEY) !== "present") throw new Error("OPENAI_API_KEY is required for --provider openai");
  }
  if (args.provider === "gemini") {
    if (!GEMINI_ASPECTS.has(args.aspect)) throw new Error(`Unsupported Gemini aspect ratio: ${args.aspect}`);
    if (!GEMINI_IMAGE_SIZES.has(args.imageSize)) throw new Error(`Unsupported Gemini image size: ${args.imageSize}. Use 1K, 2K, or 4K.`);
    if (args.mask) throw new Error("--mask is only supported with --provider openai");
    if (requireKeys && envStatus(process.env.GEMINI_API_KEY) !== "present") throw new Error("GEMINI_API_KEY is required for --provider gemini");
  }
}

function ensureProviderKeyOrBootstrap(args) {
  const providerKey = keyNameForProvider(args.provider);
  if (envStatus(process.env[providerKey]) === "present") return;

  const envPath = args.envFile ? resolve(args.cwd, args.envFile) : userEnvPath();
  const configPath = userConfigPath();
  const envFileCreated = writeSetupEnvFile(envPath);
  const userConfigFileCreated = writeSetupConfigFile(configPath, 0o600);

  throw new SetupRequiredError({
    provider: args.provider,
    keyName: providerKey,
    envFile: envPath,
    envFileCreated,
    userConfigFile: configPath,
    userConfigFileCreated,
  });
}

function envStatus(value) {
  if (!value) return "missing";
  if (value.includes("...") || value.toLowerCase().includes("your-key")) return "placeholder";
  return "present";
}

function writeSetupEnvFile(envPath) {
  if (existsSync(envPath)) return false;
  mkdirSync(dirname(envPath), { recursive: true });
  const content = [
    "OPENAI_API_KEY=",
    "GEMINI_API_KEY=",
    "",
  ].join("\n");
  writeFileSync(envPath, content, { mode: 0o600 });
  return true;
}

function defaultConfigTemplate() {
  return {
    defaultProvider: "openai",
    outputDir: "./img-output",
    openAfterGeneration: false,
    count: 1,
    prompt: {
      prePrompts: [],
      negativePrompts: [],
    },
    openai: {
      model: OPENAI_DEFAULT_MODEL,
      size: "auto",
      quality: "auto",
      format: "png",
      compression: null,
    },
    gemini: {
      model: GEMINI_DEFAULT_MODEL,
      aspect: "1:1",
      imageSize: "1K",
      googleSearch: false,
    },
  };
}

function readConfigTemplate() {
  const templatePath = resolve(pluginRoot(), "templates", DEFAULT_CONFIG_FILENAME);
  if (!existsSync(templatePath)) {
    return `${JSON.stringify(defaultConfigTemplate(), null, 2)}\n`;
  }
  return readFileSync(templatePath, "utf8");
}

function writeSetupConfigFile(configPath, mode = 0o644) {
  if (existsSync(configPath)) return false;
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, readConfigTemplate(), { mode });
  return true;
}

function isWritableOrCreatable(dirPath) {
  try {
    if (existsSync(dirPath)) {
      const stat = statSync(dirPath);
      if (!stat.isDirectory()) return false;
      accessSync(dirPath, constants.W_OK);
      return true;
    }
    let parent = dirname(resolve(dirPath));
    while (!existsSync(parent)) {
      const next = dirname(parent);
      if (next === parent) return false;
      parent = next;
    }
    accessSync(parent, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function envPresence() {
  return {
    openai: keyStatusFor(PROVIDER_KEY_NAMES.openai).effective,
    gemini: keyStatusFor(PROVIDER_KEY_NAMES.gemini).effective,
  };
}

function setupScopeFor(args) {
  if (args.setupScope) return args.setupScope;
  return findProjectRoot(args.cwd) ? "both" : "user";
}

function setupCommand(args, loadedEnvFiles, loadedCredentialKeys = []) {
  const scope = setupScopeFor(args);
  const projectRoot = findProjectRoot(args.cwd) || resolve(args.cwd);
  const envPath = args.envFile ? resolve(args.cwd, args.envFile) : userEnvPath();
  const userConfig = userConfigPath();
  const projectConfig = resolve(projectRoot, args.configFile || DEFAULT_CONFIG_FILENAME);
  const created = scope === "user" || scope === "both" ? writeSetupEnvFile(envPath) : false;
  const userConfigCreated = scope === "user" || scope === "both" ? writeSetupConfigFile(userConfig, 0o600) : false;
  const projectConfigCreated = scope === "project" || scope === "both" ? writeSetupConfigFile(projectConfig) : false;
  const loadedConfig = loadConfig({ ...args, cwd: projectRoot });
  const defaultProvider = loadedConfig.config.defaultProvider || process.env.IMG_PROVIDER || "openai";
  return {
    setup: true,
    interactive: false,
    scope,
    projectRoot,
    envFile: scope === "project" ? null : envPath,
    envFileCreated: created,
    userConfigFile: scope === "project" ? null : userConfig,
    userConfigFileCreated: userConfigCreated,
    projectConfigFile: scope === "user" ? null : projectConfig,
    projectConfigFileCreated: projectConfigCreated,
    configFile: scope === "user" ? userConfig : projectConfig,
    configFileCreated: scope === "user" ? userConfigCreated : projectConfigCreated,
    defaultProvider,
    keys: envPresence(),
    loadedEnvFiles,
    loadedCredentialKeys,
    nextSteps: [
      "Run img key set openai from a normal terminal to save the default provider key in macOS Keychain.",
      "Run img key set gemini only if you want Gemini image generation too.",
      "Use the user env file only for machines where Keychain is not available.",
      "Edit user config for personal defaults and project img.config.json for team defaults.",
      "Run: img generate a photorealistic 2:1 image of a dog",
    ],
  };
}

function isInteractiveTerminal(args) {
  return !args.json && process.stdin.isTTY === true && process.stdout.isTTY === true;
}

function writeJsonFile(filePath, value, mode = 0o644) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode });
}

function readConfigOrDefault(configPath) {
  return existsSync(configPath) ? safeReadJson(configPath) : defaultConfigTemplate();
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function askValue(rl, label, current = "") {
  const suffix = current ? ` [${current}]` : "";
  const answer = await rl.question(`${label}${suffix}: `);
  return answer.trim() || current;
}

async function askChoice(rl, label, choices, current = "") {
  const rendered = choices.map((choice, index) => `${index + 1}) ${choice}`).join("  ");
  const answer = await rl.question(`${label}${current ? ` [${current}]` : ""}\n${rendered}\n> `);
  const trimmed = answer.trim();
  if (!trimmed) return current || choices[0];
  const index = Number.parseInt(trimmed, 10) - 1;
  if (choices[index]) return choices[index];
  return choices.includes(trimmed) ? trimmed : current || choices[0];
}

async function pause(rl) {
  await rl.question("\nPress Enter to continue.");
}

const SETUP_WORDMARK = [
  " ___ __  __   _   ___ ___",
  "|_ _|  \\/  | /_\\ / __| __|",
  " | || |\\/| |/ _ \\ (_ | _|",
  "|___|_|  |_/_/ \\_\\___|___|",
  "     🖼️  A G E N C Y",
].join("\n");

function setupMood(status) {
  const missing = [status.keys?.openai, status.keys?.gemini].some((value) => value !== "present");
  if (missing) return "Status check: secure, but not yet useful.";
  return "Status check: keys tucked away; pixels may proceed.";
}

export function formatSetupPanel(status) {
  return [
    SETUP_WORDMARK,
    "setup control panel - pixels with paperwork",
    "=".repeat(60),
    setupMood(status),
    "",
    `Scope: ${status.scope}`,
    `Project: ${status.projectRoot}`,
    `User config: ${status.userConfigFile || "not used"}`,
    `Project config: ${status.projectConfigFile || "not used"}`,
    `Keys: OpenAI ${status.keys.openai}; Gemini ${status.keys.gemini}`,
    `Default provider: ${status.defaultProvider}`,
    "",
    "1) Credentials                 keys, minus the copy-paste circus",
    "2) Personal defaults           fewer flags, fewer tiny regrets",
    "3) Project brand defaults      colors, voice, and house rules",
    "4) Asset types and batches     repeatable image chores",
    "5) Preview composed prompt     inspect before spending tokens",
    "6) Health check                find the loose screw",
    "q) Save and exit               leave before this becomes a dashboard",
  ].join("\n");
}

function formatSetupHeader(title) {
  return [
    SETUP_WORDMARK,
    `setup / ${title}`,
    "=".repeat(60),
  ].join("\n");
}

function renderSetupHeader(title) {
  process.stdout.write("\x1b[2J\x1b[H");
  console.log(formatSetupHeader(title));
}

async function credentialsPanel(rl) {
  renderSetupHeader("Credentials");
  console.log("1) Save OpenAI key in macOS Keychain");
  console.log("2) Save Gemini key in macOS Keychain");
  console.log("3) Delete OpenAI key from macOS Keychain");
  console.log("4) Delete Gemini key from macOS Keychain");
  console.log("b) Back");
  const choice = (await rl.question("> ")).trim().toLowerCase();
  if (choice === "1") await writeMacKeychainSecret(PROVIDER_KEY_NAMES.openai);
  if (choice === "2") await writeMacKeychainSecret(PROVIDER_KEY_NAMES.gemini);
  if (choice === "3") deleteMacKeychainSecret(PROVIDER_KEY_NAMES.openai);
  if (choice === "4") deleteMacKeychainSecret(PROVIDER_KEY_NAMES.gemini);
}

async function personalDefaultsPanel(rl) {
  const configPath = userConfigPath();
  const config = readConfigOrDefault(configPath);
  renderSetupHeader("Personal Defaults");
  config.defaultProvider = await askChoice(rl, "Default provider", ["openai", "gemini"], config.defaultProvider || "openai");
  config.outputDir = await askValue(rl, "Default output directory", config.outputDir || "./img-output");
  config.count = Number.parseInt(await askValue(rl, "Default images per run", String(config.count || 1)), 10);
  config.openAfterGeneration = (await askChoice(rl, "Open first image after generation", ["false", "true"], String(config.openAfterGeneration === true))) === "true";
  config.openai = config.openai || {};
  config.openai.quality = await askChoice(rl, "OpenAI quality", ["auto", "low", "medium", "high"], config.openai.quality || "auto");
  config.openai.format = await askChoice(rl, "OpenAI format", ["png", "jpeg", "webp"], config.openai.format || "png");
  config.gemini = config.gemini || {};
  config.gemini.aspect = await askValue(rl, "Gemini default aspect", config.gemini.aspect || "1:1");
  config.gemini.imageSize = await askChoice(rl, "Gemini image size", ["1K", "2K", "4K"], config.gemini.imageSize || "1K");
  writeJsonFile(configPath, config, 0o600);
}

async function projectBrandPanel(rl, args) {
  const projectRoot = findProjectRoot(args.cwd) || resolve(args.cwd);
  const configPath = resolve(projectRoot, args.configFile || DEFAULT_CONFIG_FILENAME);
  const config = readConfigOrDefault(configPath);
  config.project = config.project || {};
  config.brand = config.brand || {};
  renderSetupHeader("Project Brand Defaults");
  config.project.siteRoot = await askValue(rl, "Site root", config.project.siteRoot || ".");

  const prePrompt = await askValue(rl, "Add brand pre-prompt (blank to skip)", "");
  if (prePrompt) config.brand.prePrompts = uniqueStrings([...normalizePromptList(config.brand.prePrompts), prePrompt]);
  const negativePrompt = await askValue(rl, "Add negative prompt (blank to skip)", "");
  if (negativePrompt) config.brand.negativePrompts = uniqueStrings([...normalizePromptList(config.brand.negativePrompts), negativePrompt]);
  const refs = splitList(await askValue(rl, "Brand/reference image paths, comma-separated", normalizePromptList(config.brand.references).join(", ")));
  if (refs.length > 0) config.brand.references = uniqueStrings(refs);

  const colorAnswer = await askValue(
    rl,
    "Brand colors, space or comma-separated hex codes (# optional)",
    brandColorInputValue(config.brand.colors),
  );
  const colors = parseBrandColorInput(colorAnswer);
  if (Object.keys(colors).length > 0 || !colorAnswer.trim()) config.brand.colors = colors;

  writeJsonFile(configPath, config);
}

async function assetPresetPanel(rl, args) {
  const projectRoot = findProjectRoot(args.cwd) || resolve(args.cwd);
  const configPath = resolve(projectRoot, args.configFile || DEFAULT_CONFIG_FILENAME);
  const config = readConfigOrDefault(configPath);
  config.assetTypes = config.assetTypes || {};
  renderSetupHeader("Asset Types And Batch Presets");
  const currentIds = Object.keys(config.assetTypes);
  if (currentIds.length > 0) console.log(`Existing: ${currentIds.join(", ")}`);
  const id = await askValue(rl, "Asset type id", currentIds[0] || "hero");
  const preset = config.assetTypes[id] || {};
  preset.aliases = splitList(await askValue(rl, "Aliases, comma-separated", normalizePromptList(preset.aliases).join(", ")));
  preset.provider = await askChoice(rl, "Provider", ["openai", "gemini"], preset.provider || config.defaultProvider || "openai");
  preset.aspect = await askValue(rl, "Aspect ratio", preset.aspect || "16:9");
  preset.count = Number.parseInt(await askValue(rl, "Default batch count", String(preset.count || 1)), 10);
  preset.style = await askValue(rl, "Style pre-prompt for this asset", preset.style || "");
  preset.outputDir = await askValue(rl, "Output directory", preset.outputDir || `public/generated/${id}`);
  preset.filenamePattern = await askValue(rl, "Filename pattern", preset.filenamePattern || `${id}-{slug}-{index}`);
  preset.destination = await askValue(rl, "Destination id", preset.destination || "project-assets");
  config.assetTypes[id] = preset;
  writeJsonFile(configPath, config);
}

async function previewPanel(rl, args) {
  renderSetupHeader("Prompt Preview");
  const samplePrompt = await askValue(rl, "Sample prompt", "A website hero image");
  const assetType = await askValue(rl, "Asset type (blank for none)", "");
  const dryRunArgs = ["--dry-run", "--cwd", args.cwd, "--prompt", samplePrompt];
  if (assetType) dryRunArgs.push("--asset-type", assetType);
  const result = await run(dryRunArgs);
  console.log("\nComposed API prompt:");
  console.log("-".repeat(48));
  console.log(result.apiPrompt);
  console.log("-".repeat(48));
  console.log(`Provider: ${result.provider}`);
  console.log(`Count: ${result.count}`);
  console.log(`Output: ${result.outputDir}`);
  await pause(rl);
}

async function setupTui(args, loadedEnvFiles, loadedCredentialKeys = []) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    setupCommand(args, loadedEnvFiles, loadedCredentialKeys);
    while (true) {
      const status = setupCommand(args, loadedEnvFiles, loadedCredentialKeys);
      process.stdout.write("\x1b[2J\x1b[H");
      console.log(formatSetupPanel(status));
      const choice = (await rl.question("> ")).trim().toLowerCase();
      if (choice === "q" || choice === "") break;
      if (choice === "1") await credentialsPanel(rl);
      if (choice === "2") await personalDefaultsPanel(rl);
      if (choice === "3") await projectBrandPanel(rl, args);
      if (choice === "4") await assetPresetPanel(rl, args);
      if (choice === "5") await previewPanel(rl, args);
      if (choice === "6") {
        renderSetupHeader("Health Check");
        console.log(formatHealthPanel(healthCommand(args, loadedEnvFiles, loadConfig(args), loadedCredentialKeys)));
        await pause(rl);
      }
    }
    return setupCommand(args, loadedEnvFiles, loadedCredentialKeys);
  } finally {
    rl.close();
  }
}

function configWarnings(config, type) {
  const warnings = [];
  const allowed = new Set([
    "schemaVersion",
    "defaultProvider",
    "provider",
    "outputDir",
    "openAfterGeneration",
    "count",
    "allowSilentMutation",
    "limits",
    "project",
    "brand",
    "assetTypes",
    "destinations",
    "prompt",
    "openai",
    "gemini",
  ]);
  for (const key of Object.keys(config || {})) {
    if (!allowed.has(key)) warnings.push(`${type} config has unknown top-level field "${key}"`);
  }
  if (config && config.schemaVersion === undefined) warnings.push(`${type} config is legacy v1 without schemaVersion`);
  if (config?.schemaVersion !== undefined && config.schemaVersion !== 1) warnings.push(`${type} config schemaVersion ${config.schemaVersion} is not supported`);
  return warnings;
}

function configErrors(config, type) {
  const errors = [];
  if (!config || Object.keys(config).length === 0) return errors;
  const provider = config.defaultProvider || config.provider;
  if (provider && !PROVIDERS.has(String(provider).toLowerCase())) {
    errors.push(`${type} config defaultProvider must be openai or gemini`);
  }
  if (config.count !== undefined && (!Number.isInteger(config.count) || config.count < 1 || config.count > MAX_IMAGES_PER_RUN)) {
    errors.push(`${type} config count must be an integer from 1 to ${MAX_IMAGES_PER_RUN}`);
  }
  if (config.limits?.maxImagesPerRun !== undefined && (!Number.isInteger(config.limits.maxImagesPerRun) || config.limits.maxImagesPerRun < 1 || config.limits.maxImagesPerRun > MAX_IMAGES_PER_RUN)) {
    errors.push(`${type} config limits.maxImagesPerRun must be an integer from 1 to ${MAX_IMAGES_PER_RUN}`);
  }
  if (config.limits?.maxCostPerRunUsd !== undefined && (typeof config.limits.maxCostPerRunUsd !== "number" || config.limits.maxCostPerRunUsd < 0)) {
    errors.push(`${type} config limits.maxCostPerRunUsd must be a non-negative number`);
  }
  return errors;
}

function runtimeWarnings(layers = []) {
  const warnings = [];
  for (const layer of layers) {
    if (layer.type !== "project" && layer.config?.allowSilentMutation === true) {
      warnings.push(`${layer.type} config sets allowSilentMutation=true, but only project config may request it.`);
    }
    if (layer.type === "project" && layer.config?.allowSilentMutation === true) {
      warnings.push("allowSilentMutation=true is set in project config; runtime confirmation is still required for site edits and production uploads.");
    }
  }
  return warnings;
}

function referencedBrandFiles(config = {}) {
  return [
    ...normalizePromptList(config.brand?.references),
    ...normalizePromptList(config.project?.references),
  ];
}

function destinationPaths(config = {}) {
  const destinations = config.destinations || {};
  return Object.entries(destinations)
    .filter(([, destination]) => destination?.type === "folder" && destination.path)
    .map(([name, destination]) => ({ name, path: destination.path }));
}

function insidePath(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!!rel && !rel.startsWith("..") && !isAbsolute(rel));
}

function statusLabel(status) {
  if (status === "ok") return "OK";
  if (status === "warning") return "WARN";
  if (status === "error") return "ERR";
  return "INFO";
}

function healthStatusCounts(checks = []) {
  return checks.reduce((counts, check) => {
    counts[check.status] = (counts[check.status] || 0) + 1;
    return counts;
  }, { ok: 0, warning: 0, error: 0, info: 0 });
}

function healthNextSteps(health) {
  const steps = [];
  for (const check of health.checks || []) {
    if (check.status !== "warning" && check.status !== "error") continue;
    if (check.name === "user-config") {
      steps.push("Run img setup --user to create user defaults.");
    } else if (check.name === "user-env") {
      steps.push("Use macOS Keychain for keys, or add provider keys to the user env file.");
    } else if (check.name === "default-provider-key" || check.name.endsWith("-key")) {
      steps.push(`Run img key set ${check.provider || "openai"} from a normal terminal.`);
    } else if (check.name === "project-root") {
      steps.push("Run img setup from inside the project repository when using project defaults.");
    } else if (check.name === "project-config" && health.projectRoot) {
      steps.push("Run img setup --project inside this repo to create img.config.json.");
    } else if (check.name === "project-config") {
      steps.push("Move this img.config.json into a git project folder, or remove it if it should not apply here.");
    } else if (check.name.startsWith("config-warning-") && /schemaVersion/.test(check.message || "")) {
      steps.push(`Add "schemaVersion": 1 to ${check.path}.`);
    } else if (check.path) {
      steps.push(`${check.message} (${check.path})`);
    } else {
      steps.push(check.message);
    }
  }
  return uniqueStrings(steps.filter(Boolean));
}

export function formatHealthPanel(health) {
  const checks = health.checks || [];
  const counts = healthStatusCounts(checks);
  const result = counts.error > 0 ? "failed" : counts.warning > 0 ? "needs attention" : "healthy";
  const lines = [
    `Result: ${result}`,
    `Checks run: ${checks.length}  OK: ${counts.ok}  WARN: ${counts.warning}  ERR: ${counts.error}  INFO: ${counts.info}`,
    "",
    "Context",
    `  cwd: ${health.cwd || "unknown"}`,
    `  project root: ${health.projectRoot || "not detected"}`,
    `  config files: ${(health.configFiles || []).map((file) => `${file.type}:${file.path}`).join(", ") || "none"}`,
    `  env files: ${(health.loadedEnvFiles || []).join(", ") || "none"}`,
    "",
    "Credentials",
    `  OpenAI: ${health.keys?.openai || "unknown"} via ${health.keyDetails?.openai?.source || "unknown"}`,
    `  Gemini: ${health.keys?.gemini || "unknown"} via ${health.keyDetails?.gemini?.source || "unknown"}`,
    "",
    "Checks",
  ];

  for (const check of checks) {
    lines.push(`  ${statusLabel(check.status).padEnd(5)} ${check.name.padEnd(28)} ${check.message}`);
    if (check.path) lines.push(`        ${check.path}`);
  }

  const nextSteps = healthNextSteps(health);
  lines.push("", "Next steps");
  if (nextSteps.length === 0) {
    lines.push("  No action needed.");
  } else {
    for (const step of nextSteps) lines.push(`  - ${step}`);
  }
  return lines.join("\n");
}

function healthCommand(args, loadedEnvFiles, loadedConfig, loadedCredentialKeys = []) {
  const projectRoot = findProjectRoot(args.cwd);
  const projectConfigLayer = loadedConfig.layers?.find((layer) => layer.type === "project");
  const checks = [];
  const add = (name, status, message, extra = {}) => checks.push({ name, status, message, ...extra });

  const userConfig = userConfigPath();
  add(
    "user-config",
    existsSync(userConfig) ? "ok" : "warning",
    existsSync(userConfig) ? "User config exists." : "User config is missing; run img setup --user.",
    { path: userConfig },
  );

  const userEnv = userEnvPath();
  add(
    "user-env",
    existsSync(userEnv) ? "ok" : "info",
    existsSync(userEnv) ? "User env file exists." : "User env file is missing; this is okay if keys are in macOS Keychain.",
    { path: userEnv },
  );

  const keys = envPresence();
  const keyDetails = keyStatusMap(loadedCredentialKeys);
  const defaultProvider = String(loadedConfig.config.defaultProvider || loadedConfig.config.provider || "openai").toLowerCase();
  add(
    "default-provider-key",
    keys[defaultProvider] === "present" ? "ok" : "warning",
    keys[defaultProvider] === "present"
      ? `${defaultProvider} API key is present via ${keyDetails[defaultProvider].source}.`
      : `${defaultProvider} API key is ${keys[defaultProvider]}.`,
    { provider: defaultProvider, source: keyDetails[defaultProvider].source },
  );

  if (projectRoot) {
    add("project-root", "ok", "Git project root detected.", { path: projectRoot });
  } else {
    add("project-root", "info", "No git project root detected; img will use user-level defaults.", { path: null });
  }

  if (projectConfigLayer) {
    add(
      "project-config",
      projectRoot ? "ok" : "warning",
      projectRoot ? "Project config loaded." : "Project config loaded outside a git project; it may affect every img command run from this folder.",
      { path: projectConfigLayer.path },
    );
  } else if (projectRoot) {
    add("project-config", "warning", "No project img.config.json found; run img setup --project.", { path: join(projectRoot, DEFAULT_CONFIG_FILENAME) });
  } else {
    add("project-config", "info", "No project config expected outside a repo.", { path: null });
  }

  for (const layer of loadedConfig.layers || []) {
    for (const warning of configWarnings(layer.config, layer.type)) {
      add(`config-warning-${layer.type}`, "warning", warning, { path: layer.path });
    }
    for (const error of configErrors(layer.config, layer.type)) {
      add(`config-error-${layer.type}`, "error", error, { path: layer.path });
    }
    for (const warning of runtimeWarnings([layer])) {
      add(`runtime-warning-${layer.type}`, "warning", warning, { path: layer.path });
    }
  }

  const outputDir = resolve(args.cwd, loadedConfig.config.outputDir || args.outputDir || "./img-output");
  add(
    "output-dir",
    isWritableOrCreatable(outputDir) ? "ok" : "error",
    isWritableOrCreatable(outputDir) ? "Output folder is writable or can be created." : "Output folder is not writable.",
    { path: outputDir },
  );

  const referenceRoot = projectRoot || args.cwd;
  for (const ref of referencedBrandFiles(loadedConfig.config)) {
    const refPath = resolve(referenceRoot, ref);
    add(
      `brand-reference:${ref}`,
      existsSync(refPath) ? "ok" : "warning",
      existsSync(refPath) ? "Brand reference exists." : "Brand reference is missing.",
      { path: refPath },
    );
  }

  for (const destination of destinationPaths(loadedConfig.config)) {
    const destinationPath = resolve(referenceRoot, destination.path);
    const external = loadedConfig.config.destinations?.[destination.name]?.external === true;
    add(
      `destination:${destination.name}`,
      external || !projectRoot || insidePath(projectRoot, destinationPath) ? "ok" : "error",
      external || !projectRoot || insidePath(projectRoot, destinationPath)
        ? "Destination is inside the project or explicitly external."
        : "Destination points outside the project and is not marked external.",
      { path: destinationPath },
    );
  }

  const recipeIndex = resolve(pluginRoot(), "resources", "prompt-recipes.jsonl");
  add(
    "recipe-index",
    existsSync(recipeIndex) ? "ok" : "info",
    existsSync(recipeIndex) ? "Bundled recipe index exists." : "Bundled recipe index is not installed yet; recipe matching will be unavailable.",
    { path: recipeIndex },
  );

  const ok = !checks.some((check) => check.status === "error");
  return {
    checkHealth: true,
    ok,
    cwd: resolve(args.cwd),
    projectRoot,
    configFiles: loadedConfig.layers?.map((layer) => ({ type: layer.type, path: layer.path })) || [],
    loadedEnvFiles,
    loadedCredentialKeys,
    keys,
    keyDetails,
    checks,
  };
}

export function buildOpenAIJsonBody(args) {
  const body = {
    model: args.model,
    prompt: args.apiPrompt || composePrompt(args.prompt, args.promptConfig),
  };
  if (args.size) body.size = args.size;
  if (args.quality) body.quality = args.quality;
  if (args.format) body.output_format = args.format;
  if (args.compression !== undefined) body.output_compression = args.compression;
  return body;
}

export function buildGeminiBody(args) {
  const parts = [{ text: args.apiPrompt || composePrompt(args.prompt, args.promptConfig) }];
  for (const input of args.inputs) {
    const filePath = resolve(args.cwd, input);
    parts.push({
      inline_data: {
        mime_type: mimeTypeFor(filePath),
        data: readFileSync(filePath).toString("base64"),
      },
    });
  }
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
      imageConfig: {
        aspectRatio: args.aspect,
        imageSize: args.imageSize,
      },
    },
  };
  if (args.googleSearch) {
    body.tools = [{ google_search: {} }];
  }
  return body;
}

function firstHeader(headers, names) {
  for (const name of names) {
    const value = headers.get(name);
    if (value) return value;
  }
  return undefined;
}

function compactDetails(details) {
  if (!Array.isArray(details) || details.length === 0) return undefined;
  return details.slice(0, 5).map((detail) => {
    if (!detail || typeof detail !== "object") return detail;
    const compact = {};
    for (const key of ["@type", "reason", "domain", "metadata", "fieldViolations", "violations"]) {
      if (detail[key] !== undefined) compact[key] = detail[key];
    }
    return Object.keys(compact).length > 0 ? compact : detail;
  });
}

function hintForApiError(provider, response, parsed, args) {
  const error = parsed?.error || parsed || {};
  const code = error.code || response?.status;
  const apiStatus = error.status || error.type || "";
  const message = String(error.message || parsed?.message || "").toLowerCase();

  if (response?.status === 401 || response?.status === 403) {
    return provider === "OpenAI"
      ? "Check OPENAI_API_KEY, project access, billing, and whether the organization is verified for GPT Image models."
      : "Check GEMINI_API_KEY, API restrictions, billing, region availability, and access to the selected Gemini image model.";
  }
  if (response?.status === 429 || apiStatus === "RESOURCE_EXHAUSTED") {
    return "The provider rate-limited the request. Retry later or lower concurrency.";
  }
  if (provider === "Gemini" && response?.status === 400) {
    if (args?.imageSize === "0.5K" || message.includes("invalid argument")) {
      return "Check Gemini ImageConfig values. The REST API reference currently supports --image-size 1K, 2K, or 4K.";
    }
    return "Run --dry-run to inspect the selected model and options, then check Gemini aspect ratio, image size, and input image MIME types.";
  }
  if (provider === "OpenAI" && response?.status === 400) {
    return "Run --dry-run to inspect the selected endpoint and options, then check size, quality, format, mask, and input image parameters.";
  }
  if (response?.status >= 500) {
    return "The provider returned a server error. Retry later with the same provider; img will not switch providers automatically.";
  }
  return undefined;
}

function networkApiError(provider, error) {
  return new ProviderApiError({
    provider,
    code: "NETWORK_ERROR",
    message: `${provider} network error: ${error.message}`,
    hint: "Check network connectivity, proxy settings, and provider service status.",
  });
}

export async function apiErrorFromResponse(response, provider, args = {}) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    const error = parsed.error || {};
    const message = error.message || parsed.message || response.statusText || "API request failed";
    return new ProviderApiError({
      provider,
      status: response.status,
      statusText: response.statusText,
      code: error.code || parsed.code,
      apiStatus: error.status || error.type || parsed.status,
      requestId: firstHeader(response.headers, ["x-request-id", "x-goog-request-id", "x-cloud-trace-context"]),
      message: `${provider} API error ${response.status}: ${message}`,
      details: compactDetails(error.details || parsed.details),
      hint: hintForApiError(provider, response, parsed, args),
      bodyExcerpt: text.slice(0, 1000),
    });
  } catch {
    return new ProviderApiError({
      provider,
      status: response.status,
      statusText: response.statusText,
      requestId: firstHeader(response.headers, ["x-request-id", "x-goog-request-id", "x-cloud-trace-context"]),
      message: `${provider} API error ${response.status}: ${text.slice(0, 500)}`,
      hint: hintForApiError(provider, response, undefined, args),
      bodyExcerpt: text.slice(0, 1000),
    });
  }
}

export function formatErrorForCli(error) {
  if (error instanceof SetupRequiredError) {
    return {
      error: error.message,
      setupRequired: true,
      provider: error.provider,
      keyName: error.keyName,
      envFile: error.envFile,
      envFileCreated: error.envFileCreated,
      userConfigFile: error.userConfigFile,
      userConfigFileCreated: error.userConfigFileCreated,
      nextSteps: [
        `Run img key set ${error.provider} from a normal terminal to save ${error.keyName} in macOS Keychain.`,
        `Or add ${error.keyName}=... to ${error.envFile}.`,
        "Re-run the same /img request.",
        "Run /img setup only if you want to refresh setup files or add project defaults.",
      ],
    };
  }
  if (error instanceof ProviderApiError) {
    const output = {
      error: error.message,
      provider: error.provider,
    };
    if (error.status !== undefined) output.status = error.status;
    if (error.statusText) output.statusText = error.statusText;
    if (error.code !== undefined) output.code = error.code;
    if (error.apiStatus) output.apiStatus = error.apiStatus;
    if (error.requestId) output.requestId = error.requestId;
    if (error.hint) output.hint = error.hint;
    if (error.details) output.details = error.details;
    if (error.bodyExcerpt) output.bodyExcerpt = error.bodyExcerpt;
    return output;
  }
  return { error: error.message };
}

async function blobForFile(filePath) {
  return new Blob([readFileSync(filePath)], { type: mimeTypeFor(filePath) });
}

async function generateOpenAI(args) {
  const endpoint = args.inputs.length > 0
    ? "https://api.openai.com/v1/images/edits"
    : "https://api.openai.com/v1/images/generations";

  let response;
  if (args.inputs.length > 0) {
    const form = new FormData();
    form.append("model", args.model);
    form.append("prompt", args.apiPrompt || composePrompt(args.prompt, args.promptConfig));
    if (args.size) form.append("size", args.size);
    if (args.quality) form.append("quality", args.quality);
    if (args.format) form.append("output_format", args.format);
    if (args.compression !== undefined) form.append("output_compression", String(args.compression));
    for (const input of args.inputs) {
      const filePath = resolve(args.cwd, input);
      form.append("image[]", await blobForFile(filePath), basename(filePath));
    }
    if (args.mask) {
      const maskPath = resolve(args.cwd, args.mask);
      form.append("mask", await blobForFile(maskPath), basename(maskPath));
    }
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: form,
      });
    } catch (error) {
      throw networkApiError("OpenAI", error);
    }
  } else {
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildOpenAIJsonBody(args)),
      });
    } catch (error) {
      throw networkApiError("OpenAI", error);
    }
  }

  if (!response.ok) throw await apiErrorFromResponse(response, "OpenAI", args);
  const data = await response.json();
  const images = [];
  for (const item of data.data || []) {
    const base64 = item.b64_json || item.b64Json;
    if (base64) images.push({ base64, mimeType: `image/${args.format}` });
  }
  if (images.length === 0) {
    throw new ProviderApiError({
      provider: "OpenAI",
      code: "NO_IMAGE_DATA",
      message: "OpenAI response did not include base64 image data.",
      hint: "Check whether the selected OpenAI endpoint/model supports base64 image output for these parameters.",
    });
  }
  return { images, responseText: null };
}

async function generateGemini(args) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent`;
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildGeminiBody(args)),
    });
  } catch (error) {
    throw networkApiError("Gemini", error);
  }

  if (!response.ok) throw await apiErrorFromResponse(response, "Gemini", args);
  const data = await response.json();
  const images = [];
  const text = [];
  for (const candidate of data.candidates || []) {
    if (candidate.finishReason === "SAFETY") {
      throw new ProviderApiError({
        provider: "Gemini",
        code: "SAFETY_BLOCKED",
        apiStatus: "SAFETY",
        message: "Gemini blocked the request with finishReason SAFETY.",
        hint: "Revise the prompt or input image to avoid content that violates Gemini safety policy.",
      });
    }
    for (const part of candidate.content?.parts || []) {
      const inlineData = part.inlineData || part.inline_data;
      if (inlineData?.data) {
        images.push({
          base64: inlineData.data,
          mimeType: inlineData.mimeType || inlineData.mime_type || "image/png",
        });
      } else if (part.text && !part.thought) {
        text.push(part.text);
      }
    }
  }
  if (images.length === 0) {
    throw new ProviderApiError({
      provider: "Gemini",
      code: "NO_IMAGE_DATA",
      message: `Gemini response did not include image data.${text.length ? ` Text response: ${text.join("\n").slice(0, 500)}` : ""}`,
      hint: "Check response modalities, prompt wording, model access, and whether the model returned text-only guidance instead of an image.",
    });
  }
  return { images, responseText: text.join("\n").trim() || null };
}

function saveImages(args, images) {
  const outputDir = resolve(args.cwd, args.outputDir);
  mkdirSync(outputDir, { recursive: true });
  const baseName = args.filename || `${args.provider}-${slugify(args.prompt)}-${timestamp()}`;
  const files = [];
  images.forEach((image, index) => {
    const ext = extensionForMime(image.mimeType, args.format || "png");
    const suffix = images.length > 1 ? `-${index + 1}` : "";
    const filePath = join(outputDir, `${baseName}${suffix}.${ext}`);
    writeFileSync(filePath, Buffer.from(image.base64, "base64"));
    files.push(resolve(filePath));
  });
  return files;
}

function openFiles(files) {
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const first = files[0];
  if (!first) return;
  const args = process.platform === "win32" ? ["/c", "start", "", first] : [first];
  execFile(opener, args, () => {});
}

export function helpText() {
  return `img

Usage:
  img activate
  img install [claude|codex|all] [--setup|--no-setup]
  img setup [--user|--project|--both]
  img key status
  img key set openai
  img key set gemini
  img key delete openai
  img check-health
  img generate a photorealistic 2:1 image of a dog
  img --provider openai --prompt "A clean app icon"
  img --provider gemini --prompt "A clean app icon" --aspect 1:1 --image-size 1K
  img --provider gemini --input ./reference.png --prompt "Restyle this image"

Options:
  --provider openai|gemini       Provider to call. Default: config defaultProvider, IMG_PROVIDER, or openai.
  --asset-type VALUE             Configured asset type id or alias.
  --prompt, -p TEXT              Image prompt.
  --config FILE                  Explicit config file.
  --env-file FILE                Explicit env file.
  --input, -i FILE               Reference image. Repeat for multiple images.
  --mask FILE                    OpenAI edit mask.
  --out, -o DIR                  Output directory. Default: config outputDir, IMG_OUTPUT_DIR, or ./img-output.
  --model MODEL                  Override provider model.
  --size SIZE                    OpenAI image size. Default: auto.
  --quality VALUE                OpenAI quality: auto, low, medium, high.
  --format VALUE                 OpenAI output format: png, jpeg, webp.
  --aspect RATIO                 Gemini aspect ratio. Default: 1:1.
  --image-size VALUE             Gemini image size: 1K, 2K, 4K.
  --count N                      Number of images to generate, 1-${MAX_IMAGES_PER_RUN}.
  --open                         Open the first saved image with the OS viewer.
  --dry-run                      Validate and print request metadata without API calls.
  --json                         Return non-interactive JSON for setup/install.
`;
}

export function activationText() {
  return `🖼️ img image workflow loader
context -> plan -> generate -> deliver
`;
}

export async function run(rawArgs = []) {
  const args = parseArgs(rawArgs);
  if (args.activate) return { text: activationText() };
  if (args.help) return { text: helpText() };
  const loadedEnvFiles = loadEnv(args);
  if (args.key) return keyCommand(args, loadedEnvFiles);
  const loadedCredentialKeys = args.dryRun ? [] : loadStoredProviderKeys();
  if (args.install) return installCommand(args, loadedEnvFiles, loadedCredentialKeys);
  if (args.setup) {
    if (isInteractiveTerminal(args)) return setupTui(args, loadedEnvFiles, loadedCredentialKeys);
    return setupCommand(args, loadedEnvFiles, loadedCredentialKeys);
  }
  const loadedConfig = loadConfig(args);
  if (args.checkHealth) return healthCommand(args, loadedEnvFiles, loadedConfig, loadedCredentialKeys);
  applyConfigDefaults(args, loadedConfig.config);
  validateArgs(args, false);
  if (!args.dryRun) ensureProviderKeyOrBootstrap(args);

  const endpoint = args.provider === "openai"
    ? (args.inputs.length > 0 ? "https://api.openai.com/v1/images/edits" : "https://api.openai.com/v1/images/generations")
    : `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent`;

  if (args.dryRun) {
    return {
      dryRun: true,
      provider: args.provider,
      model: args.model,
      endpoint,
      prompt: args.prompt,
      apiPrompt: args.apiPrompt,
      assetType: args.assetType || null,
      count: args.count,
      inputs: args.inputs,
      outputDir: resolve(args.cwd, args.outputDir),
      loadedEnvFiles,
      configFile: loadedConfig.path,
      warnings: runtimeWarnings(loadedConfig.layers),
    };
  }

  const allImages = [];
  let responseText = null;
  for (let i = 0; i < args.count; i += 1) {
    const result = args.provider === "openai" ? await generateOpenAI(args) : await generateGemini(args);
    allImages.push(...result.images);
    if (result.responseText) responseText = result.responseText;
  }
  const allFiles = saveImages(args, allImages);
  if (args.open) openFiles(allFiles);
  return {
    provider: args.provider,
    model: args.model,
    configFile: loadedConfig.path,
    assetType: args.assetType || null,
    files: allFiles,
    responseText,
  };
}

export async function main(rawArgs = process.argv.slice(2)) {
  try {
    const result = await run(rawArgs);
    if (result?.text) {
      console.log(result.text);
    } else if (result?.checkHealth && !rawArgs.includes("--json")) {
      console.log(formatHealthPanel(result));
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error(JSON.stringify(formatErrorForCli(error), null, 2));
    process.exitCode = 1;
  }
}
