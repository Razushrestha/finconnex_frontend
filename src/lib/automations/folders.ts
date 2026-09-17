import type { AutomationFolder } from "./types";

/** Folders directly inside `parentId` (null for the top level), by name. */
export function childFolders(
  folders: AutomationFolder[],
  parentId: string | null,
): AutomationFolder[] {
  return folders
    .filter((folder) => (folder.parentId ?? null) === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/**
 * The chain from the top level down to `folderId`, inclusive — the
 * breadcrumb. Empty for the top level or an id that no longer exists. A
 * cycle in bad data stops the walk instead of looping.
 */
export function folderPath(
  folders: AutomationFolder[],
  folderId: string | null,
): AutomationFolder[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: AutomationFolder[] = [];
  const seen = new Set<string>();
  let cursor = folderId ? byId.get(folderId) : undefined;
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    path.unshift(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return path;
}

/** `folderId` and every folder nested anywhere beneath it. */
export function folderSubtreeIds(
  folders: AutomationFolder[],
  folderId: string,
): Set<string> {
  const ids = new Set([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        grew = true;
      }
    }
  }
  return ids;
}

export type FolderOption = { folder: AutomationFolder; depth: number };

/**
 * Every folder as an indented, depth-first list for a move picker. Moving a
 * folder leaves out that folder and its own subtree, which the backend would
 * refuse as a cycle.
 */
export function folderOptions(
  folders: AutomationFolder[],
  movingFolderId?: string,
): FolderOption[] {
  const excluded = movingFolderId
    ? folderSubtreeIds(folders, movingFolderId)
    : new Set<string>();
  const options: FolderOption[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const folder of childFolders(folders, parentId)) {
      if (excluded.has(folder.id)) continue;
      options.push({ folder, depth });
      visit(folder.id, depth + 1);
    }
  };
  visit(null, 0);
  return options;
}

/** Workflows and subfolders directly inside a folder — what blocks deleting it. */
export function folderItemCount(
  folders: AutomationFolder[],
  folder: AutomationFolder,
): number {
  return folder.automationCount + folders.filter((f) => f.parentId === folder.id).length;
}
