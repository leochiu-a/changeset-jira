import { confirm, input, password } from "@inquirer/prompts";
import {
  ensureJiraConfigDir,
  getJiraConfigPath,
  loadExistingJiraConfig,
  saveJiraConfig,
  type JiraConfig
} from "../lib/jira-config";

async function promptForBaseUrl(defaultValue?: string) {
  const candidate = await input({
    message: "Jira base URL",
    default: defaultValue,
    validate: value => {
      if (!value) {
        return "Base URL is required. Example: https://your-domain.atlassian.net";
      }
      try {
        const url = new URL(value);
        if (!url.protocol.startsWith("http")) {
          return "URL must start with http or https.";
        }
      } catch {
        return "Invalid URL format. Example: https://your-domain.atlassian.net";
      }
      return true;
    }
  });
  return candidate.replace(/\/$/, "");
}

async function promptForEmail(defaultValue?: string) {
  return input({
    message: "Jira email",
    default: defaultValue,
    validate: value => (value ? true : "Email is required.")
  });
}

async function promptForApiToken(defaultValue?: string) {
  const apiToken = await password({
    message: "Jira API token",
    mask: "*",
    validate: value => {
      if (value) {
        return true;
      }
      if (defaultValue) {
        return true;
      }
      return "API token is required.";
    }
  });
  return apiToken || defaultValue || "";
}

export async function runInit(): Promise<void> {
  console.log("Initializing Jira credentials.");
  console.log("You will be asked for Jira base URL, email, and API token.");
  console.log("Jira base URL example: https://your-domain.atlassian.net");
  console.log("API token can be created at https://id.atlassian.com/manage-profile/security/api-tokens");
  console.log("These values are stored in ~/.config/changeset-jira/jira.json (or $XDG_CONFIG_HOME/changeset-jira/jira.json).");
  console.log("Legacy ~/.changeset/jira.json is migrated to the new path and removed.");

  await ensureJiraConfigDir();

  const existingConfig = await loadExistingJiraConfig();
  const jiraConfigPath = getJiraConfigPath();
  if (existingConfig?.source === "primary") {
    const shouldOverwrite = await confirm({
      message: `Overwrite existing Jira config at ${jiraConfigPath}?`,
      default: false
    });
    if (!shouldOverwrite) {
      console.log("Jira config unchanged.");
      return;
    }
  }
  if (existingConfig?.source === "legacy") {
    console.log(`Found legacy Jira config at ${existingConfig.path}.`);
    console.log(`New config will be saved to ${jiraConfigPath}.`);
  }

  const baseUrl = await promptForBaseUrl(existingConfig?.config.baseUrl);
  const email = await promptForEmail(existingConfig?.config.email);
  const apiToken = await promptForApiToken(existingConfig?.config.apiToken);

  const payload: JiraConfig = { baseUrl, email, apiToken };
  await saveJiraConfig(payload);
  console.log(`Saved Jira config to ${jiraConfigPath}.`);
}
