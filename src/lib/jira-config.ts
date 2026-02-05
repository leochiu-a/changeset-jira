import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export type JiraConfig = {
  baseUrl: string;
  email: string;
  apiToken: string;
};

type JiraConfigSource = "primary" | "legacy";
type ExistingJiraConfig = {
  config: JiraConfig;
  path: string;
  source: JiraConfigSource;
};

const CANDIDATE_ROOT_FILES = ["pnpm-workspace.yaml", ".git", "package.json"];
const APP_CONFIG_DIR_NAME = "changeset-jira";
const LEGACY_CONFIG_DIR_NAME = ".changeset";
const CONFIG_FILE_NAME = "jira.json";
let cachedRepoRoot: string | null = null;

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRoot(startDir: string): Promise<string> {
  let current = path.resolve(startDir);
  while (true) {
    const matches = await Promise.all(
      CANDIDATE_ROOT_FILES.map(candidate => pathExists(path.join(current, candidate)))
    );
    if (matches.some(Boolean)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }
    current = parent;
  }
}

export async function getRepoRoot(): Promise<string> {
  if (!cachedRepoRoot) {
    cachedRepoRoot = await findRepoRoot(process.cwd());
  }
  return cachedRepoRoot;
}

export async function getChangesetDir(): Promise<string> {
  return path.join(await getRepoRoot(), ".changeset");
}

function getXdgConfigHome(): string {
  const envHome = process.env.XDG_CONFIG_HOME?.trim();
  return envHome ? envHome : path.join(os.homedir(), ".config");
}

export function getJiraConfigDir(): string {
  return path.join(getXdgConfigHome(), APP_CONFIG_DIR_NAME);
}

export function getJiraConfigPath(): string {
  return path.join(getJiraConfigDir(), CONFIG_FILE_NAME);
}

export function getLegacyJiraConfigPath(): string {
  return path.join(os.homedir(), LEGACY_CONFIG_DIR_NAME, CONFIG_FILE_NAME);
}

export async function ensureJiraConfigDir(): Promise<void> {
  await mkdir(getJiraConfigDir(), { recursive: true });
}

async function loadJiraConfigFile(filePath: string): Promise<Partial<JiraConfig>> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as Partial<JiraConfig>;
  } catch {
    return {};
  }
}

async function isFilePresent(filePath: string): Promise<boolean> {
  return pathExists(filePath);
}

function isCompleteConfig(config: Partial<JiraConfig>): config is JiraConfig {
  return Boolean(config.baseUrl && config.email && config.apiToken);
}

async function migrateLegacyConfigIfNeeded(
  legacyConfig: JiraConfig,
  legacyPath: string,
  primaryPath: string
): Promise<void> {
  const primaryExists = await isFilePresent(primaryPath);
  if (primaryExists) {
    return;
  }

  // Best-effort migration so we can remove legacy support in the next release.
  try {
    await ensureJiraConfigDir();
    await writeFile(primaryPath, JSON.stringify(legacyConfig, null, 2), "utf8");
    await rm(legacyPath, { force: true });
  } catch {
    // If migration fails, keep using the legacy config for this run.
  }
}

export async function loadExistingJiraConfig(): Promise<ExistingJiraConfig | null> {
  const primaryPath = getJiraConfigPath();
  const primaryConfig = await loadJiraConfigFile(primaryPath);
  if (isCompleteConfig(primaryConfig)) {
    return { config: primaryConfig, path: primaryPath, source: "primary" };
  }

  const legacyPath = getLegacyJiraConfigPath();
  const legacyConfig = await loadJiraConfigFile(legacyPath);
  if (isCompleteConfig(legacyConfig)) {
    return { config: legacyConfig, path: legacyPath, source: "legacy" };
  }

  return null;
}

export async function saveJiraConfig(config: JiraConfig): Promise<void> {
  await writeFile(getJiraConfigPath(), JSON.stringify(config, null, 2), "utf8");
  try {
    await rm(getLegacyJiraConfigPath(), { force: true });
  } catch {
    // Ignore cleanup failures; the primary config is already written.
  }
}

export async function loadJiraConfig(): Promise<JiraConfig> {
  const primaryPath = getJiraConfigPath();
  const primaryConfig = await loadJiraConfigFile(primaryPath);
  if (isCompleteConfig(primaryConfig)) {
    return primaryConfig;
  }

  const legacyPath = getLegacyJiraConfigPath();
  const legacyConfig = await loadJiraConfigFile(legacyPath);
  if (isCompleteConfig(legacyConfig)) {
    await migrateLegacyConfigIfNeeded(legacyConfig, legacyPath, primaryPath);
    return legacyConfig;
  }

  throw new Error(
    `Missing Jira config. Run \`npx changeset-jira init\`. Checked ${primaryPath} and ${legacyPath}.`
  );
}
