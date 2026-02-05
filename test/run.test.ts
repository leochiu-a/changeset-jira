import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("node:readline/promises", () => ({
  createInterface: vi.fn(() => ({
    close: vi.fn(),
    question: vi.fn()
  }))
}));

vi.mock("../src/lib/changeset", () => ({
  ensureChangesetConfig: vi.fn(),
  listChangesetFiles: vi.fn(),
  runChangesetAdd: vi.fn(),
  updateChangesetSummary: vi.fn()
}));

vi.mock("../src/lib/jira-api", () => ({
  fetchJiraSummary: vi.fn()
}));

vi.mock("../src/lib/ticket", () => ({
  formatSummary: vi.fn(),
  getDefaultTicketId: vi.fn(),
  isValidDescription: vi.fn(),
  promptForDescription: vi.fn(),
  promptForTicketId: vi.fn()
}));

const changeset = await import("../src/lib/changeset");
const jiraApi = await import("../src/lib/jira-api");
const ticket = await import("../src/lib/ticket");
const { runChangesetJira } = await import("../src/commands/run");

const createSet = (values: string[]) => new Set(values);

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("runChangesetJira", () => {
  it("uses branch ticket id and Jira summary when available", async () => {
    vi.mocked(ticket.getDefaultTicketId).mockResolvedValue("GT-421");
    vi.mocked(ticket.promptForTicketId).mockResolvedValue("GT-999");
    vi.mocked(jiraApi.fetchJiraSummary).mockResolvedValue("Improve perf");
    vi.mocked(ticket.formatSummary).mockReturnValue("Improve perf");
    vi.mocked(ticket.isValidDescription).mockReturnValue(true);
    vi.mocked(changeset.listChangesetFiles)
      .mockResolvedValueOnce(createSet(["/repo/.changeset/a.md"]))
      .mockResolvedValueOnce(createSet(["/repo/.changeset/a.md", "/repo/.changeset/new.md"]));

    await runChangesetJira();

    expect(ticket.promptForTicketId).not.toHaveBeenCalled();
    expect(jiraApi.fetchJiraSummary).toHaveBeenCalledWith("GT-421");
    expect(changeset.runChangesetAdd).toHaveBeenCalledWith("[GT-421] Improve perf", {
      empty: false
    });
    expect(changeset.updateChangesetSummary).toHaveBeenCalledWith(
      "/repo/.changeset/new.md",
      "[GT-421] Improve perf"
    );
  });

  it("falls back to manual description when Jira fetch fails", async () => {
    vi.mocked(ticket.getDefaultTicketId).mockResolvedValue(null);
    vi.mocked(ticket.promptForTicketId).mockResolvedValue("GT-123");
    vi.mocked(jiraApi.fetchJiraSummary).mockRejectedValue(new Error("boom"));
    vi.mocked(ticket.promptForDescription).mockResolvedValue("[GT-123] Manual summary");
    vi.mocked(changeset.listChangesetFiles)
      .mockResolvedValueOnce(createSet(["/repo/.changeset/old.md"]))
      .mockResolvedValueOnce(createSet(["/repo/.changeset/old.md", "/repo/.changeset/new.md"]));

    await runChangesetJira();

    expect(ticket.promptForTicketId).toHaveBeenCalledWith(expect.any(Object), null);
    expect(ticket.promptForDescription).toHaveBeenCalled();
    expect(changeset.runChangesetAdd).toHaveBeenCalledWith("[GT-123] Manual summary", {
      empty: false
    });
    expect(changeset.updateChangesetSummary).toHaveBeenCalledWith(
      "/repo/.changeset/new.md",
      "[GT-123] Manual summary"
    );
  });

  it("passes --empty through to changeset add", async () => {
    vi.mocked(ticket.getDefaultTicketId).mockResolvedValue("GT-9");
    vi.mocked(jiraApi.fetchJiraSummary).mockResolvedValue("Docs only");
    vi.mocked(ticket.formatSummary).mockReturnValue("Docs only");
    vi.mocked(ticket.isValidDescription).mockReturnValue(true);
    vi.mocked(changeset.listChangesetFiles)
      .mockResolvedValueOnce(createSet(["/repo/.changeset/old.md"]))
      .mockResolvedValueOnce(createSet(["/repo/.changeset/old.md", "/repo/.changeset/new.md"]));

    await runChangesetJira({ empty: true });

    expect(changeset.runChangesetAdd).toHaveBeenCalledWith("[GT-9] Docs only", {
      empty: true
    });
  });
});
