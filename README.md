# Changeset Jira Wrapper

`changeset-jira` will fetch a Jira ticket summary and create a Changeset with a single-line description in this format:

`[KB2CW-XXXX] Verb-started English description.`

## Setup

1. Initialize Changesets (if not already done):

```bash
pnpm changeset init
```

2. Initialize Jira credentials (local config) or set env vars.

```bash
npx changeset-jira init
```

This writes `.changeset/jira.json` locally. You can also provide env vars instead:

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

- The CLI asks for a Jira ticket ID, defaulting to the first `JIRA-XXXX` found in your branch name.
- It fetches the Jira summary and formats the description as `[JIRA-XXXX] {summary}`.
- It runs the standard Changeset prompts for package selection and bump types.
- The summary entered in the Changeset prompt is replaced with the Jira summary to enforce the required format.

Note: If you prefer local scripts, `pnpm changeset-jira` runs the same flow.

## Manual fallback

If the Jira API fails or the summary does not match the required format, the CLI will ask you to enter the description manually. The input must be a single line in this format:

`[KB2CW-XXXX] Verb-started English description.`
