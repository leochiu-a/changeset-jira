# Changeset Jira Wrapper

`changeset-jira` will fetch a Jira ticket summary and create a Changeset with a single-line description in this format:

`[PROJ-1234] Description.`

## Setup

1. Initialize Changesets (if not already done):

```bash
pnpm changeset init
```

2. Initialize Jira credentials (local config) or set env vars.

```bash
npx changeset-jira init
```

This writes `~/.config/changeset-jira/jira.json` (global config). If `XDG_CONFIG_HOME` is set, it uses
`$XDG_CONFIG_HOME/changeset-jira/jira.json`. If a legacy `~/.changeset/jira.json` is found, the CLI will
migrate it to the new path on first run (and remove the legacy file). Legacy reads will be removed in a
future release.

## Usage

```bash
npx changeset-jira
```

Create an empty changeset (no version bumps) but still link the Jira ticket:

```bash
npx changeset-jira --empty
```

What happens:

- If a ticket ID is found in the branch name, it is used automatically. Otherwise the CLI asks for one.
- It fetches the Jira summary and formats the description as `[PROJ-1234] {summary}`.
- It runs the standard Changeset prompts for package selection and bump types.
- The summary entered in the Changeset prompt is replaced with the Jira summary to enforce the required format.

When `--empty` is used, Changesets skips package/bump prompts and creates an empty changeset with the Jira summary.

Note: If you prefer local scripts, `pnpm changeset-jira` runs the same flow.

## Manual fallback

If the Jira API fails or the summary does not match the required format, the CLI will ask you to enter the description manually. The input must be a single line in this format:

`[PROJ-1234] Description.`
