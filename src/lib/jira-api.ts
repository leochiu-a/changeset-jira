import { loadJiraConfig } from "./jira-config";

type JiraErrorPayload = {
  errorMessages?: string[];
  errors?: Record<string, string>;
  message?: string;
};

type JiraIssueResponse = {
  fields?: {
    summary?: string;
  };
};

async function parseJiraError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as JiraErrorPayload | null;
    if (payload) {
      const messages: string[] = [];
      if (Array.isArray(payload.errorMessages)) {
        messages.push(payload.errorMessages.join("; "));
      }
      if (payload.errors && typeof payload.errors === "object") {
        messages.push(Object.values(payload.errors).join("; "));
      }
      if (typeof payload.message === "string") {
        messages.push(payload.message);
      }
      const detail = messages.map(message => message.trim()).filter(Boolean).join("; ");
      if (detail) {
        return detail;
      }
    }
  }
  const text = await response.text().catch(() => "");
  return text.trim();
}

export async function fetchJiraSummary(ticketId: string): Promise<string> {
  const { baseUrl, email, apiToken } = await loadJiraConfig();
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available. Use Node 18+ to run this script.");
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const issueUrl = new URL(`rest/api/3/issue/${ticketId}`, normalizedBase);
  const authHeader = Buffer.from(`${email}:${apiToken}`).toString("base64");

  const response = await fetch(issueUrl, {
    headers: {
      Authorization: `Basic ${authHeader}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const detail = await parseJiraError(response);
    const detailSuffix = detail ? `: ${detail}` : "";
    throw new Error(`Jira API request failed (${response.status} ${response.statusText})${detailSuffix}`);
  }

  const payload = (await response.json()) as JiraIssueResponse;
  const summary = payload.fields?.summary;
  if (!summary || typeof summary !== "string") {
    throw new Error("Jira issue summary is missing.");
  }
  return summary;
}
