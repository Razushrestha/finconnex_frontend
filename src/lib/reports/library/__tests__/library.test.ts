import { afterEach, describe, expect, it } from "vitest";
import { LIBRARY_REPORTS, REPORT_CATEGORIES, reportById } from "@/lib/reports/library/catalog";
import { enableSessionPersistence, setPersistenceDriver } from "@/lib/persistence/registry";
import {
  availableFoldersForReport,
  deleteReportFolder,
  listCustomFolders,
  listReportFolders,
  MY_FAVOURITES_FOLDER_ID,
  sortReportsWithPins,
  toggleFavoriteReport,
} from "@/lib/reports/library/prefs";
import { runLibraryReport } from "@/lib/reports/library/run";
import { defaultLibraryFilters } from "@/lib/reports/library/types";
import type { PersistenceDriver } from "@/lib/persistence/types";

function memoryDriver(): PersistenceDriver {
  const mem = new Map<string, string>();
  return {
    mode: "session",
    getItem: (key) => mem.get(key) ?? null,
    setItem: (key, value) => {
      mem.set(key, value);
    },
    removeItem: (key) => {
      mem.delete(key);
    },
  };
}

const july = new Date(2026, 6, 23, 12, 0, 0);

afterEach(() => {
  enableSessionPersistence();
});

describe("report library", () => {
  it("defines 10 categories and 100 purpose-led reports", () => {
    expect(REPORT_CATEGORIES).toHaveLength(10);
    expect(LIBRARY_REPORTS).toHaveLength(100);
    expect(new Set(LIBRARY_REPORTS.map((r) => r.id)).size).toBe(100);
    expect(LIBRARY_REPORTS.every((r) => r.purpose.length > 12)).toBe(true);
  });

  it("runs lead source performance from live CRM stores", () => {
    const data = runLibraryReport(
      "lead-source-performance",
      { ...defaultLibraryFilters(), dateRange: "all" },
      july,
    );
    expect(data.kpis.length).toBeGreaterThan(0);
    expect(data.rows.length).toBeGreaterThan(0);
    expect(data.rows[0]?.cells.leads).toBeGreaterThan(0);
    expect(reportById("lead-source-performance")?.purpose).toContain("sources");
  });

  it("sorts pinned reports to the top", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(sortReportsWithPins(rows, ["c", "a"]).map((row) => row.id)).toEqual(["c", "a", "b"]);
  });

  it("hides folders a report already belongs to", () => {
    setPersistenceDriver(memoryDriver());
    expect(availableFoldersForReport("lead-register").map((folder) => folder.id)).toContain(
      MY_FAVOURITES_FOLDER_ID,
    );
    toggleFavoriteReport("lead-register");
    expect(availableFoldersForReport("lead-register").map((folder) => folder.id)).not.toContain(
      MY_FAVOURITES_FOLDER_ID,
    );
  });

  it("always includes a default My Favourites folder", () => {
    const folders = listReportFolders();
    expect(folders[0]?.id).toBe(MY_FAVOURITES_FOLDER_ID);
    expect(folders[0]?.name).toBe("My Favourites");
    expect(listCustomFolders().some((folder) => folder.id === MY_FAVOURITES_FOLDER_ID)).toBe(false);
    deleteReportFolder(MY_FAVOURITES_FOLDER_ID);
    expect(listReportFolders()[0]?.id).toBe(MY_FAVOURITES_FOLDER_ID);
  });

  it("runs every catalog report without throwing", () => {
    for (const report of LIBRARY_REPORTS) {
      const data = runLibraryReport(
        report.id,
        { ...defaultLibraryFilters(), dateRange: "all" },
        july,
      );
      expect(Array.isArray(data.kpis)).toBe(true);
      expect(Array.isArray(data.rows)).toBe(true);
    }
  });
});
