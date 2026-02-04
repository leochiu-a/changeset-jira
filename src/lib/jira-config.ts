import { access, mkdir, readFile, writeFile } from "node:fs/promises";
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

export async function getJiraConfigPath(): Promise<string> {
  return path.join(await getChangesetDir(), "jira.json");
}

export async function ensureChangesetDir(): Promise<void> {
  await mkdir(await getChangesetDir(), { recursive: true });
}

export async function loadExistingJiraConfig(): Promise<JiraConfig | null> {
  try {
    const raw = await readFile(await getJiraConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as JiraConfig;
    if (!parsed || !parsed.baseUrl || !parsed.email || !parsed.apiToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveJiraConfig(config: JiraConfig): Promise<void> {
  await writeFile(await getJiraConfigPath(), JSON.stringify(config, null, 2), "utf8");
}

export async function loadJiraConfig(): Promise<JiraConfig> {
  let fileConfig: Partial<JiraConfig> = {};
  try {
    const raw = await readFile(await getJiraConfigPath(), "utf8");
    fileConfig = JSON.parse(raw) as Partial<JiraConfig>;
  } catch {
    fileConfig = {};
  }

  const baseUrl = process.env.JIRA_BASE_URL ?? fileConfig.baseUrl;
  const email = process.env.JIRA_EMAIL ?? fileConfig.email;
  const apiToken = process.env.JIRA_API_TOKEN ?? fileConfig.apiToken;

  if (!baseUrl || !email || !apiToken) {
    throw new Error(
      "Missing Jira config. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, or run `npx changeset-jira init`."
    );
  }

  return { baseUrl, email, apiToken };
}
