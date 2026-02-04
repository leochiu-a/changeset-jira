import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export type JiraConfig = {
  baseUrl: string;
  email: string;
  apiToken: string;
};

const CANDIDATE_ROOT_FILES = ["pnpm-workspace.yaml", ".git", "package.json"];
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

export function getHomeChangesetDir(): string {
  return path.join(os.homedir(), ".changeset");
}

export function getHomeJiraConfigPath(): string {
  return path.join(getHomeChangesetDir(), "jira.json");
}


export async function ensureHomeChangesetDir(): Promise<void> {
  await mkdir(getHomeChangesetDir(), { recursive: true });
}

async function loadJiraConfigFile(filePath: string): Promise<Partial<JiraConfig>> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as Partial<JiraConfig>;
  } catch {
    return {};
  }
}

export async function loadExistingHomeJiraConfig(): Promise<JiraConfig | null> {
  const parsed = (await loadJiraConfigFile(getHomeJiraConfigPath())) as JiraConfig;
  if (!parsed || !parsed.baseUrl || !parsed.email || !parsed.apiToken) {
    return null;
  }
  return parsed;
}

export async function saveHomeJiraConfig(config: JiraConfig): Promise<void> {
  await writeFile(getHomeJiraConfigPath(), JSON.stringify(config, null, 2), "utf8");
}

export async function loadJiraConfig(): Promise<JiraConfig> {
  const homeConfig = await loadJiraConfigFile(getHomeJiraConfigPath());

  const baseUrl = homeConfig.baseUrl;
  const email = homeConfig.email;
  const apiToken = homeConfig.apiToken;

  if (!baseUrl || !email || !apiToken) {
    throw new Error(
      "Missing Jira config. Run `npx changeset-jira init`."
    );
  }

  return { baseUrl, email, apiToken };
}
