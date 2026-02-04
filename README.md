# Changeset Jira Wrapper

`changeset-jira` will fetch a Jira ticket summary and create a Changeset with a single-line description in this format:

`[PROJ-1234] Verb-started English description.`

## Setup

1. Initialize Changesets (if not already done):

```bash
pnpm changeset init
```

2. Initialize Jira credentials (local config) or set env vars.

```bash
npx changeset-jira init
```

This writes `~/.changeset/jira.json` (global config). You can also provide env vars instead:

```bash
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_EMAIL="you@example.com"
export JIRA_API_TOKEN="your_api_token"
```

## Usage

```bash
npx changeset-jira
```

What happens:

- If a ticket ID is found in the branch name, it is used automatically. Otherwise the CLI asks for one.
- It fetches the Jira summary and formats the description as `[PROJ-1234] {summary}`.
- It runs the standard Changeset prompts for package selection and bump types.
- The summary entered in the Changeset prompt is replaced with the Jira summary to enforce the required format.

Note: If you prefer local scripts, `pnpm changeset-jira` runs the same flow.

## Manual fallback

If the Jira API fails or the summary does not match the required format, the CLI will ask you to enter the description manually. The input must be a single line in this format:

`[PROJ-1234] Verb-started English description.`
