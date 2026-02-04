import { spawn } from "node:child_process";
import { access, readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { getChangesetDir, getRepoRoot } from "./jira-config";

const require = createRequire(import.meta.url);

export async function ensureChangesetConfig(): Promise<void> {
  try {
    const changesetDir = await getChangesetDir();
    await access(path.join(changesetDir, "config.json"));
  } catch {
    throw new Error("Changesets config not found. Run `pnpm changeset init` first.");
  }
}

export async function listChangesetFiles(): Promise<Set<string>> {
  const changesetDir = await getChangesetDir();
  const entries = await readdir(changesetDir, { withFileTypes: true });
  const files = entries
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .filter(name => name.endsWith(".md") && name !== "README.md")
    .map(name => path.join(changesetDir, name));
  return new Set(files);
}

export async function runChangesetAdd(summary?: string): Promise<void> {
  const repoRoot = await getRepoRoot();
  const changesetBin = require.resolve("@changesets/cli/bin.js", { paths: [repoRoot] });
  const args = [changesetBin, "add"];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let summaryInjected = false;
    let outputBuffer = "";

    const maybeInjectSummary = (chunk: string) => {
      if (!summary || summaryInjected) {
        return;
      }
      outputBuffer += chunk;
      if (outputBuffer.includes("Please enter a summary for this change")) {
        child.stdin.write(`${summary}\n`);
        summaryInjected = true;
      }
      if (outputBuffer.length > 2000) {
        outputBuffer = outputBuffer.slice(-2000);
      }
    };

    process.stdin.pipe(child.stdin);
    child.stdout.on("data", data => {
      process.stdout.write(data);
      maybeInjectSummary(String(data));
    });
    child.stderr.on("data", data => {
      process.stderr.write(data);
      maybeInjectSummary(String(data));
    });
    child.on("error", reject);
    child.on("exit", code => {
      process.stdin.unpipe(child.stdin);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`changeset add exited with code ${code ?? "unknown"}.`));
      }
    });
  });
}

export async function updateChangesetSummary(filePath: string, description: string): Promise<void> {
  const content = await readFile(filePath, "utf8");
  const match = content.match(/^(---\s*\n[\s\S]*?\n---\s*\n)/);
  if (!match) {
    throw new Error(`Unexpected changeset format in ${filePath}.`);
  }
  const updated = `${match[1]}${description}\n`;
  await writeFile(filePath, updated, "utf8");
}
