/** Hosts a OneDrive picker download link is allowed to come from. */
const DOWNLOAD_HOST_SUFFIXES = [
  "sharepoint.com",
  "onedrive.live.com",
  "1drv.com",
  "livefilestore.com",
  "storage.live.com",
  "microsoftpersonalcontent.com",
];

export function oneDriveDownloadUrl(item: Record<string, unknown>): string {
  const graph = item["@microsoft.graph.downloadUrl"];
  const content = item["@content.downloadUrl"];
  if (typeof graph === "string" && graph.trim()) return graph.trim();
  if (typeof content === "string" && content.trim()) return content.trim();
  return "";
}

export function isAllowedOneDriveDownloadUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return DOWNLOAD_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}
