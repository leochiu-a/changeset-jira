import { execFile as execFileCb } from "node:child_process";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

const TICKET_PREFIX = "KB2CW";
const TICKET_ID_PATTERN = new RegExp(`${TICKET_PREFIX}-\\d+`, "i");
const DESCRIPTION_PATTERN = new RegExp(`^\\[${TICKET_PREFIX}-\\d+\\] [A-Za-z][^\\r\\n]+$`);

export async function getCurrentBranch(): Promise<string | null> {
  try {
    const { stdout } = await execFile("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    const branch = stdout.trim();
    return branch.length > 0 ? branch : null;
  } catch {
    return null;
  }
}

export function normalizeTicketId(value: string): string | null {
  const match = value.match(TICKET_ID_PATTERN);
  return match ? match[0].toUpperCase() : null;
}

export async function getDefaultTicketId(): Promise<string | null> {
  const branch = await getCurrentBranch();
  return branch ? normalizeTicketId(branch) : null;
}

export function formatSummary(summary: string): string {
  return summary.replace(/\s+/g, " ").trim();
}

export function isValidDescription(description: string, ticketId: string): boolean {
  if (!DESCRIPTION_PATTERN.test(description)) {
    return false;
  }
  const match = description.match(/^\[(.+?)\]/);
  if (!match) {
    return false;
  }
  return match[1].toUpperCase() === ticketId;
}

export async function promptForTicketId(
  rl: ReturnType<typeof createInterface>,
  defaultTicketId: string | null
) {
  const defaultLabel = defaultTicketId ? ` (default: ${defaultTicketId})` : "";
  while (true) {
    const input = (await rl.question(`Jira Ticket ID${defaultLabel}: `)).trim();
    const candidate = (input || defaultTicketId || "").trim();
    if (!candidate) {
      console.error("Ticket ID is required. Example: KB2CW-1234.");
      continue;
    }
    const normalized = normalizeTicketId(candidate);
    if (!normalized) {
      console.error("Invalid ticket ID format. Example: KB2CW-1234.");
      continue;
    }
    return normalized;
  }
}

export async function promptForDescription(rl: ReturnType<typeof createInterface>, ticketId: string) {
  const example = `[${ticketId}] Add concise summary`;
  while (true) {
    const input = (await rl.question(`Changeset description (${example}): `)).trim();
    if (!input) {
      console.error("Description is required.");
      continue;
    }
    if (!isValidDescription(input, ticketId)) {
      console.error(`Description must be a single line in format: [${ticketId}] Verb-started English description.`);
      continue;
    }
    return input;
  }
}
