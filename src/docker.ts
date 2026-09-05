import Docker from "dockerode";

const docker = new Docker();

export interface ImageInfo {
  id: string;
  tags: string[];
  sizeBytes: number;
  createdAt: number; // unix timestamp, seconds
}

export interface ContainerInfo {
  id: string;
  name: string;
  state: string;
  sizeBytes: number;
  createdAt: number;
}

export interface VolumeInfo {
  name: string;
  sizeBytes: number; // -1 means Docker didn't report a size
  refCount: number;
}

export interface UsageReport {
  unusedImages: ImageInfo[];
  stoppedContainers: ContainerInfo[];
  unusedVolumes: VolumeInfo[];
}

const DAY_IN_SECONDS = 24 * 60 * 60;

export async function getUsageReport(
  olderThanDays: number
): Promise<UsageReport> {
  const df = await docker.df();
  const cutoff = Date.now() / 1000 - olderThanDays * DAY_IN_SECONDS;

  const unusedImages: ImageInfo[] = (df.Images || [])
    .filter((img: any) => img.Containers === 0 && img.Created < cutoff)
    .map((img: any) => ({
      id: img.Id.replace("sha256:", "").slice(0, 12),
      tags: img.RepoTags && img.RepoTags.length ? img.RepoTags : ["<untagged>"],
      sizeBytes: img.Size ?? 0,
      createdAt: img.Created,
    }));

  const stoppedContainers: ContainerInfo[] = (df.Containers || [])
    .filter((c: any) => c.State !== "running" && c.Created < cutoff)
    .map((c: any) => ({
      id: c.Id.slice(0, 12),
      name: (c.Names && c.Names[0]) ? c.Names[0].replace(/^\//, "") : c.Id.slice(0, 12),
      state: c.State,
      sizeBytes: c.SizeRw ?? 0,
      createdAt: c.Created,
    }));

  const unusedVolumes: VolumeInfo[] = (df.Volumes || [])
    .filter((v: any) => (v.UsageData?.RefCount ?? 0) === 0)
    .map((v: any) => ({
      name: v.Name,
      sizeBytes: v.UsageData?.Size ?? -1,
      refCount: v.UsageData?.RefCount ?? 0,
    }));

  return { unusedImages, stoppedContainers, unusedVolumes };
}

/** Actually deletes the flagged items. Only call this after the user confirms. */
export async function cleanUp(report: UsageReport): Promise<void> {
  for (const img of report.unusedImages) {
    try {
      await docker.getImage(img.id).remove({ force: true });
    } catch (err: any) {
      console.error(`Could not remove image ${img.id}: ${err.message}`);
    }
  }
  for (const c of report.stoppedContainers) {
    try {
      await docker.getContainer(c.id).remove({ force: true });
    } catch (err: any) {
      console.error(`Could not remove container ${c.name}: ${err.message}`);
    }
  }
  for (const v of report.unusedVolumes) {
    try {
      await docker.getVolume(v.name).remove();
    } catch (err: any) {
      console.error(`Could not remove volume ${v.name}: ${err.message}`);
    }
  }
}
