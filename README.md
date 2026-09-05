# docker-cleanup-cli

A command-line tool that scans your local Docker setup and tells you exactly
how much disk space you could reclaim by removing unused images, stopped
containers, and orphaned volumes — before you delete anything.

## Why I built this

After working with Docker during my vacation work at BBD Software
Development, I noticed how quickly unused images and stopped containers pile
up and eat disk space, with no easy way to see what's actually safe to
remove. Rather than run `docker system prune` blind, I wanted a tool that
shows you what it found and how much space it'll free, and only deletes
something once you've said yes.

## What it does

- Scans images, containers, and volumes using the Docker API (no manual
  `docker` commands needed)
- Flags only items that are genuinely unused (not attached to any running
  container) **and** older than a configurable threshold, so nothing you
  built five minutes ago gets flagged
- Reports the exact size of each item and a total "space you could reclaim"
- Defaults to a **dry run** — it only reports, never deletes, unless you
  explicitly pass `--clean` and confirm

## Example output

```
Docker Cleanup Report (flagging anything unused for 7+ days)

Unused Images (2)
  ● my-old-project:latest  [a1b2c3d4e5f6]  340.2 MB  (14 days old)
  ● <untagged>  [f6e5d4c3b2a1]  120.5 MB  (21 days old)

Stopped Containers (1)
  ● test-container  [123456789abc] (exited)  15.3 MB  (9 days old)

No unused volumes found.

Estimated space you could reclaim: 475.9 MB

This was a dry run — nothing was deleted. Re-run with --clean to remove these.
```

## Screenshot
<img width="759" height="426" alt="Screenshot 2026-09-05 184724" src="https://github.com/user-attachments/assets/c89b2592-e6c7-462d-8cbb-a75b142f8a60" />

## Getting started

**Requirements:** Node.js 18+ and Docker Desktop (or another Docker engine)
running locally.

```bash
git clone <your-repo-url>
cd docker-cleanup-cli
npm install
npm run build
npm start
```

### Options

| Flag                 | What it does                                              |
|----------------------|------------------------------------------------------------|
| `--older-than <days>`| Only flag items unused for this many days (default: 7)     |
| `--clean`            | After reporting, asks to confirm, then actually deletes    |

Examples:

```bash
npm start                        # dry run, default 7-day threshold
npm start -- --older-than 14     # dry run, only flag items 14+ days old
npm start -- --clean             # report, then prompt to delete
```

## Tech stack

TypeScript · Node.js · [dockerode](https://github.com/apocas/dockerode) (Docker Engine API client) · [commander](https://github.com/tj/commander.js) (CLI parsing) · [chalk](https://github.com/chalk/chalk) (terminal colors)

## Possible next steps

- `--json` output for piping into other tools
- A scheduled mode (run automatically once a week via cron)
- Support for Docker build cache cleanup too
