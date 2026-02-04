import { createInterface } from "node:readline/promises";
import {
  ensureChangesetConfig,
  listChangesetFiles,
  runChangesetAdd,
  updateChangesetSummary
} from "../lib/changeset";
import { fetchJiraSummary } from "../lib/jira-api";
import {
  formatSummary,
  getDefaultTicketId,
  isValidDescription,
  promptForDescription,
  promptForTicketId
} from "../lib/ticket";

export async function runChangesetJira(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await ensureChangesetConfig();

    const defaultTicketId = await getDefaultTicketId();
    const ticketId = await promptForTicketId(rl, defaultTicketId);

    let description: string | null = null;
    try {
      const summary = await fetchJiraSummary(ticketId);
      const formattedSummary = formatSummary(summary);
      const candidate = `[${ticketId}] ${formattedSummary}`;
      if (isValidDescription(candidate, ticketId)) {
        description = candidate;
      } else {
        console.warn("Jira summary does not match required format. Falling back to manual input.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Jira fetch failed: ${message}`);
    }

    if (!description) {
      description = await promptForDescription(rl, ticketId);
    }

    console.log(`Using changeset summary: ${description}`);
    console.log("Running changeset add. Follow the prompts for packages and bump types.");
    console.log("Note: the summary you enter there will be replaced with the Jira summary.");

    const before = await listChangesetFiles();
    await runChangesetAdd();
    const after = await listChangesetFiles();

    const newFiles = [...after].filter(file => !before.has(file));
    if (newFiles.length !== 1) {
      throw new Error(
        "Unable to identify the newly created changeset file. Please update the summary manually."
      );
    }

    await updateChangesetSummary(newFiles[0], description);
    console.log(`Updated changeset summary in ${newFiles[0]}.`);
  } finally {
    rl.close();
  }
}
