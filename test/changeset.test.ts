import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { updateChangesetSummary } from "../src/lib/changeset";

describe("updateChangesetSummary", () => {
  it("replaces content after frontmatter with the provided summary", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "changeset-jira-"));
    const filePath = path.join(dir, "example.md");
    const initial = `---\n"pkg": patch\n---\nOld summary\n`;
    await writeFile(filePath, initial, "utf8");

    await updateChangesetSummary(filePath, "[GT-421] Some summary");

    const updated = await readFile(filePath, "utf8");
    expect(updated).toBe(`---\n"pkg": patch\n---\n[GT-421] Some summary\n`);
  });

  it("throws when frontmatter is missing", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "changeset-jira-"));
    const filePath = path.join(dir, "bad.md");
    await writeFile(filePath, "no frontmatter\n", "utf8");

    await expect(updateChangesetSummary(filePath, "[GT-421] Some summary")).rejects.toThrow(
      "Unexpected changeset format",
    );
  });

  it("supports empty changesets created with --empty", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "changeset-jira-"));
    const filePath = path.join(dir, "empty.md");
    const initial = `---\n---\n`;
    await writeFile(filePath, initial, "utf8");

    await updateChangesetSummary(filePath, "[GT-421] Empty summary");

    const updated = await readFile(filePath, "utf8");
    expect(updated).toBe(`---\n---\n\n[GT-421] Empty summary\n`);
  });
});
