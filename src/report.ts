import chalk from "chalk";
import { UsageReport } from "./docker";

/* Turns a byte count into something readable, e.g. 1536 -> "1.5 KB" */
export function formatBytes(bytes: number): string {
  if (bytes < 0) return "unknown";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

function daysAgo(unixSeconds: number): number {
  return Math.floor((Date.now() / 1000 - unixSeconds) / (24 * 60 * 60));
}

export function printReport(report: UsageReport, olderThanDays: number): number {
  console.log(
    chalk.bold(`\nDocker Cleanup Report`) +
      chalk.dim(` (flagging anything unused for ${olderThanDays}+ days)\n`)
  );

  let totalBytes = 0;

  if (report.unusedImages.length === 0) {
    console.log(chalk.dim("No unused images found.\n"));
  } else {
    console.log(chalk.bold.yellow(`Unused Images (${report.unusedImages.length})`));
    for (const img of report.unusedImages) {
      totalBytes += img.sizeBytes;
      console.log(
        `  ${chalk.red("●")} ${img.tags.join(", ")}  ` +
          chalk.dim(`[${img.id}]`) +
          `  ${chalk.cyan(formatBytes(img.sizeBytes))}` +
          chalk.dim(`  (${daysAgo(img.createdAt)} days old)`)
      );
    }
    console.log("");
  }

  if (report.stoppedContainers.length === 0) {
    console.log(chalk.dim("No old stopped containers found.\n"));
  } else {
    console.log(
      chalk.bold.yellow(`Stopped Containers (${report.stoppedContainers.length})`)
    );
    for (const c of report.stoppedContainers) {
      totalBytes += c.sizeBytes;
      console.log(
        `  ${chalk.red("●")} ${c.name}  ` +
          chalk.dim(`[${c.id}] (${c.state})`) +
          `  ${chalk.cyan(formatBytes(c.sizeBytes))}` +
          chalk.dim(`  (${daysAgo(c.createdAt)} days old)`)
      );
    }
    console.log("");
  }

  if (report.unusedVolumes.length === 0) {
    console.log(chalk.dim("No unused volumes found.\n"));
  } else {
    console.log(chalk.bold.yellow(`Unused Volumes (${report.unusedVolumes.length})`));
    for (const v of report.unusedVolumes) {
      if (v.sizeBytes > 0) totalBytes += v.sizeBytes;
      console.log(
        `  ${chalk.red("●")} ${v.name}  ${chalk.cyan(formatBytes(v.sizeBytes))}`
      );
    }
    console.log("");
  }

  console.log(
    chalk.bold(`Estimated space you could reclaim: `) +
      chalk.green.bold(formatBytes(totalBytes)) +
      "\n"
  );

  return totalBytes;
}
