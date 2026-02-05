import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  ensureJiraConfigDir,
  getJiraConfigPath,
  loadJiraConfig,
  saveJiraConfig,
} from "../src/lib/jira-config";

describe("jira-config", () => {
  let tempDir: string;
  let homedirSpy: ReturnType<typeof vi.spyOn>;
  let previousXdgConfigHome: string | undefined;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "changeset-jira-"));
    homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(tempDir);
    previousXdgConfigHome = process.env.XDG_CONFIG_HOME;
  });

  afterEach(async () => {
    homedirSpy.mockRestore();
    if (previousXdgConfigHome === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = previousXdgConfigHome;
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  it("uses XDG_CONFIG_HOME for the primary config path", async () => {
    const xdgDir = path.join(tempDir, "xdg");
    process.env.XDG_CONFIG_HOME = xdgDir;

    await ensureJiraConfigDir();

    expect(getJiraConfigPath()).toBe(path.join(xdgDir, "changeset-jira", "jira.json"));
  });

  it("loads config from the primary path when available", async () => {
    const xdgDir = path.join(tempDir, "xdg");
    process.env.XDG_CONFIG_HOME = xdgDir;

    const primaryPath = path.join(xdgDir, "changeset-jira", "jira.json");
    await mkdir(path.dirname(primaryPath), { recursive: true });
    await writeFile(
      primaryPath,
      JSON.stringify(
        {
          baseUrl: "https://primary.atlassian.net",
          email: "primary@example.com",
          apiToken: "primary-token",
        },
        null,
        2,
      ),
      "utf8",
    );

    const legacyPath = path.join(tempDir, ".changeset", "jira.json");
    await mkdir(path.dirname(legacyPath), { recursive: true });
    await writeFile(
      legacyPath,
      JSON.stringify(
        {
          baseUrl: "https://legacy.atlassian.net",
          email: "legacy@example.com",
          apiToken: "legacy-token",
        },
        null,
        2,
      ),
      "utf8",
    );

    await expect(loadJiraConfig()).resolves.toEqual({
      baseUrl: "https://primary.atlassian.net",
      email: "primary@example.com",
      apiToken: "primary-token",
    });
  });

  it("migrates the legacy config when the primary config is missing", async () => {
    const xdgDir = path.join(tempDir, "xdg");
    process.env.XDG_CONFIG_HOME = xdgDir;

    const legacyPath = path.join(tempDir, ".changeset", "jira.json");
    await mkdir(path.dirname(legacyPath), { recursive: true });
    await writeFile(
      legacyPath,
      JSON.stringify(
        {
          baseUrl: "https://legacy.atlassian.net",
          email: "legacy@example.com",
          apiToken: "legacy-token",
        },
        null,
        2,
      ),
      "utf8",
    );

    await expect(loadJiraConfig()).resolves.toEqual({
      baseUrl: "https://legacy.atlassian.net",
      email: "legacy@example.com",
      apiToken: "legacy-token",
    });

    const primaryPath = path.join(xdgDir, "changeset-jira", "jira.json");
    const raw = await readFile(primaryPath, "utf8");

    expect(JSON.parse(raw)).toEqual({
      baseUrl: "https://legacy.atlassian.net",
      email: "legacy@example.com",
      apiToken: "legacy-token",
    });
    await expect(readFile(legacyPath, "utf8")).rejects.toThrow();
  });

  it("saves config to the primary path", async () => {
    const xdgDir = path.join(tempDir, "xdg");
    process.env.XDG_CONFIG_HOME = xdgDir;

    await ensureJiraConfigDir();
    await saveJiraConfig({
      baseUrl: "https://save.atlassian.net",
      email: "save@example.com",
      apiToken: "save-token",
    });

    const savedPath = path.join(xdgDir, "changeset-jira", "jira.json");
    const raw = await readFile(savedPath, "utf8");

    expect(JSON.parse(raw)).toEqual({
      baseUrl: "https://save.atlassian.net",
      email: "save@example.com",
      apiToken: "save-token",
    });
  });
});
