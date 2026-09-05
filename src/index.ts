import { Command } from "commander";
import readline from "readline";
import chalk from "chalk";
import { getUsageReport, cleanUp } from "./docker";
import { printReport } from "./report";

const program = new Command();

program
  .name("docker-cleanup")
  .description(
    "Scans your local Docker setup for unused images, stopped containers, " +
      "and orphaned volumes, and reports how much disk space you could free up."
  )
  .option(
    "--older-than <days>",
    "only flag items older than this many days",
    "7"
  )
  .option(
    "--clean",
    "actually delete the flagged items (after asking you to confirm)",
    false
  )
  .parse(process.argv);

const opts = program.opts();
const olderThanDays = parseInt(opts.olderThan, 10);

function askToConfirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

async function main() {
  console.log(chalk.dim("Connecting to Docker..."));

  let report;
  try {
    report = await getUsageReport(olderThanDays);
  } catch (err: any) {
    console.error(
      chalk.red(
        "\nCouldn't connect to Docker. Is Docker Desktop (or your Docker " +
          "engine) running?\n"
      )
    );
    console.error(chalk.dim(err.message));
    process.exit(1);
  }

  const totalFlagged =
    report.unusedImages.length +
    report.stoppedContainers.length +
    report.unusedVolumes.length;

  const totalBytes = printReport(report, olderThanDays);

  if (totalFlagged === 0) {
    console.log(chalk.green("Nothing to clean up — you're all tidy!"));
    return;
  }

  if (!opts.clean) {
    console.log(
      chalk.dim(
        "This was a dry run — nothing was deleted. Re-run with --clean to remove these."
      )
    );
    return;
  }

  const confirmed = await askToConfirm(
    chalk.yellow(
      `Delete all ${totalFlagged} flagged item(s) above? (y/N): `
    )
  );

  if (!confirmed) {
    console.log(chalk.dim("Cancelled. Nothing was deleted."));
    return;
  }

  console.log(chalk.dim("Deleting..."));
  await cleanUp(report);
  console.log(chalk.green(`Done. Reclaimed roughly ${totalBytes} bytes.`));
}

main();
