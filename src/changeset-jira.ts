#!/usr/bin/env node
import meow from "meow";
import { runInit } from "./commands/init";
import { runChangesetJira } from "./commands/run";

async function main() {
  const cli = meow(
    `
  Usage:
    $ changeset-jira init   # save Jira credentials locally
    $ changeset-jira        # run changeset with Jira summary
`,
    {
      importMeta: import.meta
    }
  );

  const [command, ...rest] = cli.input;
  if (rest.length > 0) {
    console.error("Too many arguments.");
    cli.showHelp(1);
    return;
  }
  if (command === "init") {
    await runInit();
    return;
  }
  if (command) {
    console.error(`Unknown command: ${command}`);
    cli.showHelp(1);
  }

  await runChangesetJira();
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
