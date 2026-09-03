import { readJsonStore, writeJsonStore } from "@/lib/rules/storage";
import type { DashboardDateRange } from "@/lib/dashboard/layout";
import type {
  LibraryFilters,
  ReportFolder,
  SavedReportView,
  ScheduledLibraryReport,
} from "@/lib/reports/library/types";

const FAV_KEY = "reports:library:favorites:v1";
const RECENT_KEY = "reports:library:recent:v1";
const VIEWS_KEY = "reports:library:views:v1";
const SCHED_KEY = "reports:library:schedules:v1";
const RANGE_KEY = "reports:library:range:v1";

export const MY_FAVOURITES_FOLDER_ID = "my-favourites";

export function isDefaultFolder(id: string) {
  return id === MY_FAVOURITES_FOLDER_ID;
}

export function listFavoriteReportIds(): string[] {
  return readJsonStore<string[]>(FAV_KEY, []);
}

export function isFavoriteReport(id: string) {
  return listFavoriteReportIds().includes(id);
}

function writeFavourites(ids: string[]) {
  const unique = [...new Set(ids)];
  writeJsonStore(FAV_KEY, unique);
  const folders = readJsonStore<ReportFolder[]>(FOLDER_KEY, []);
  const fav: ReportFolder = {
    id: MY_FAVOURITES_FOLDER_ID,
    name: "My Favourites",
    reportIds: unique,
    createdAt:
      folders.find((folder) => folder.id === MY_FAVOURITES_FOLDER_ID)?.createdAt ??
      new Date().toISOString(),
  };
  writeJsonStore(FOLDER_KEY, [
    fav,
    ...folders.filter((folder) => folder.id !== MY_FAVOURITES_FOLDER_ID),
  ]);
  return unique;
}

export function toggleFavoriteReport(id: string) {
  const cur = listFavoriteReportIds();
  return writeFavourites(cur.includes(id) ? cur.filter((item) => item !== id) : [id, ...cur]);
}

const PIN_KEY = "reports:library:pinned:v1";

export function listPinnedReportIds(): string[] {
  return readJsonStore<string[]>(PIN_KEY, []);
}

export function isPinnedReport(id: string) {
  return listPinnedReportIds().includes(id);
}

export function togglePinnedReport(id: string) {
  const cur = listPinnedReportIds();
  const next = cur.includes(id) ? cur.filter((item) => item !== id) : [id, ...cur];
  writeJsonStore(PIN_KEY, next);
  return next;
}

export function sortReportsWithPins<T extends { id: string }>(
  reports: T[],
  pinnedIds = listPinnedReportIds(),
): T[] {
  const rank = new Map(pinnedIds.map((id, index) => [id, index]));
  return [...reports].sort((a, b) => {
    const aPinned = rank.has(a.id);
    const bPinned = rank.has(b.id);
    if (aPinned && bPinned) return rank.get(a.id)! - rank.get(b.id)!;
    if (aPinned) return -1;
    if (bPinned) return 1;
    return 0;
  });
}

export function listRecentReportIds(): string[] {
  return readJsonStore<string[]>(RECENT_KEY, []);
}

const ACCESSED_KEY = "reports:library:last-accessed:v1";

export function listLastAccessed(): Record<string, string> {
  return readJsonStore<Record<string, string>>(ACCESSED_KEY, {});
}

export function lastAccessedAt(reportId: string) {
  return listLastAccessed()[reportId] ?? null;
}

export function formatLastAccessed(reportId: string) {
  const raw = lastAccessedAt(reportId);
  if (!raw) return "Never";
  const at = new Date(raw);
  if (Number.isNaN(at.getTime())) return "Never";
  return at.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function touchRecentReport(id: string) {
  const next = [id, ...listRecentReportIds().filter((item) => item !== id)].slice(0, 8);
  writeJsonStore(RECENT_KEY, next);
  writeJsonStore(ACCESSED_KEY, { ...listLastAccessed(), [id]: new Date().toISOString() });
  return next;
}

export function listSavedViews(reportId?: string) {
  const all = readJsonStore<SavedReportView[]>(VIEWS_KEY, []);
  return reportId ? all.filter((v) => v.reportId === reportId) : all;
}

export function saveReportView(reportId: string, name: string, filters: LibraryFilters) {
  const row: SavedReportView = {
    id: `view-${Date.now()}`,
    reportId,
    name: name.trim() || "Untitled view",
    filters,
    createdAt: new Date().toISOString(),
  };
  writeJsonStore(VIEWS_KEY, [row, ...listSavedViews()]);
  return row;
}

export function listScheduledReports() {
  return readJsonStore<ScheduledLibraryReport[]>(SCHED_KEY, []);
}

export function scheduleLibraryReport(reportId: string, cadence: ScheduledLibraryReport["cadence"]) {
  const row: ScheduledLibraryReport = {
    id: `sched-${Date.now()}`,
    reportId,
    cadence,
    createdAt: new Date().toISOString(),
  };
  writeJsonStore(SCHED_KEY, [row, ...listScheduledReports().filter((s) => s.reportId !== reportId)]);
  return row;
}

export function loadLibraryRange(): DashboardDateRange {
  const stored = readJsonStore<DashboardDateRange | null>(RANGE_KEY, null);
  return stored ?? "all";
}

export function saveLibraryRange(range: DashboardDateRange) {
  writeJsonStore(RANGE_KEY, range);
}

const FOLDER_KEY = "reports:library:folders:v1";

export function ensureMyFavouritesFolder(): ReportFolder {
  const folders = readJsonStore<ReportFolder[]>(FOLDER_KEY, []);
  const existing = folders.find((folder) => folder.id === MY_FAVOURITES_FOLDER_ID);
  if (existing) {
    writeJsonStore(FAV_KEY, existing.reportIds);
    return existing;
  }
  const fav: ReportFolder = {
    id: MY_FAVOURITES_FOLDER_ID,
    name: "My Favourites",
    reportIds: listFavoriteReportIds(),
    createdAt: new Date().toISOString(),
  };
  writeJsonStore(FOLDER_KEY, [fav, ...folders]);
  return fav;
}

export function listReportFolders(): ReportFolder[] {
  const fav = ensureMyFavouritesFolder();
  const rest = readJsonStore<ReportFolder[]>(FOLDER_KEY, []).filter(
    (folder) => folder.id !== MY_FAVOURITES_FOLDER_ID,
  );
  return [fav, ...rest];
}

export function listCustomFolders(): ReportFolder[] {
  return listReportFolders().filter((folder) => folder.id !== MY_FAVOURITES_FOLDER_ID);
}

export function getReportFolder(id: string) {
  return listReportFolders().find((folder) => folder.id === id) ?? null;
}

export function createReportFolder(name: string, reportIds: string[] = []) {
  const folder: ReportFolder = {
    id: `folder-${Date.now()}`,
    name: name.trim() || "Untitled folder",
    reportIds: [...new Set(reportIds)],
    createdAt: new Date().toISOString(),
  };
  writeJsonStore(FOLDER_KEY, [folder, ...listReportFolders()]);
  return folder;
}

export function renameReportFolder(id: string, name: string) {
  if (isDefaultFolder(id)) return getReportFolder(id);
  const next = listReportFolders().map((folder) =>
    folder.id === id ? { ...folder, name: name.trim() || folder.name } : folder,
  );
  writeJsonStore(FOLDER_KEY, next);
  return next.find((folder) => folder.id === id) ?? null;
}

export function deleteReportFolder(id: string) {
  if (isDefaultFolder(id)) return;
  writeJsonStore(
    FOLDER_KEY,
    listReportFolders().filter((folder) => folder.id !== id),
  );
}

export function setFolderReports(id: string, reportIds: string[]) {
  const unique = [...new Set(reportIds)];
  if (id === MY_FAVOURITES_FOLDER_ID) {
    writeFavourites(unique);
    return getReportFolder(id);
  }
  const next = listReportFolders().map((folder) =>
    folder.id === id ? { ...folder, reportIds: unique } : folder,
  );
  writeJsonStore(FOLDER_KEY, next);
  return next.find((folder) => folder.id === id) ?? null;
}

export function addReportToFolder(folderId: string, reportId: string) {
  const folder = getReportFolder(folderId);
  if (!folder) return null;
  if (folder.reportIds.includes(reportId)) return folder;
  return setFolderReports(folderId, [...folder.reportIds, reportId]);
}

export function removeReportFromFolder(folderId: string, reportId: string) {
  const folder = getReportFolder(folderId);
  if (!folder) return null;
  return setFolderReports(
    folderId,
    folder.reportIds.filter((id) => id !== reportId),
  );
}

export function foldersContainingReport(reportId: string) {
  return listReportFolders().filter((folder) => folder.reportIds.includes(reportId));
}

export function availableFoldersForReport(reportId: string) {
  return listReportFolders().filter((folder) => !folder.reportIds.includes(reportId));
}
