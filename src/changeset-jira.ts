#!/usr/bin/env node
import meow from "meow";
import { runInit } from "./commands/init";
import { runChangesetJira } from "./commands/run";

async function main() {
  const cli = meow(
    `
  Usage:
    $ changeset-jira init         # save Jira credentials locally
    $ changeset-jira [--empty]    # run changeset with Jira summary
`,
    {
      importMeta: import.meta,
      flags: {
        empty: {
          type: "boolean",
          default: false
        }
      }
    }
  );

  const [command, ...rest] = cli.input;
  if (rest.length > 0) {
    console.error("Too many arguments.");
    cli.showHelp(1);
    return;
  }
  
  if (command === "init") {
    if (cli.flags.empty) {
      console.error("--empty cannot be used with init.");
      cli.showHelp(1);
      return;
    }
    await runInit();
    return;
  }
  
  if (command) {
    console.error(`Unknown command: ${command}`);
    cli.showHelp(1);
  }

  await runChangesetJira({ empty: cli.flags.empty });
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
