import { describe, expect, it } from "vitest";
import {
  compareSortValues,
  parseSortDate,
  sortRows,
  toggleColumnSort,
} from "@/lib/tables/column-sort";

describe("toggleColumnSort", () => {
  it("starts ascending on a new column", () => {
    expect(toggleColumnSort(null, "name")).toEqual({
      field: "name",
      direction: "asc",
    });
  });

  it("toggles the same column to descending", () => {
    expect(
      toggleColumnSort({ field: "name", direction: "asc" }, "name"),
    ).toEqual({ field: "name", direction: "desc" });
  });
});

describe("compareSortValues", () => {
  it("sorts DD/MM/YYYY dates", () => {
    expect(compareSortValues("02/01/2026", "01/01/2026")).toBeGreaterThan(0);
  });

  it("sorts money strings numerically", () => {
    expect(compareSortValues("$1,200", "$90")).toBeGreaterThan(0);
  });

  it("keeps empty values last", () => {
    expect(compareSortValues("", "Ada")).toBeGreaterThan(0);
    expect(compareSortValues("Ada", "")).toBeLessThan(0);
  });
});

describe("sortRows", () => {
  it("sorts strings ascending and descending", () => {
    const rows = [{ name: "Cara" }, { name: "Ada" }, { name: "Bea" }];
    const asc = sortRows(rows, { field: "name", direction: "asc" }, (r) => r.name);
    expect(asc.map((r) => r.name)).toEqual(["Ada", "Bea", "Cara"]);
    const desc = sortRows(rows, { field: "name", direction: "desc" }, (r) => r.name);
    expect(desc.map((r) => r.name)).toEqual(["Cara", "Bea", "Ada"]);
  });
});

describe("parseSortDate", () => {
  it("parses display dates", () => {
    expect(parseSortDate("20 Aug, 2026")).not.toBeNull();
    expect(parseSortDate("17/07/2026 02:00 PM")).not.toBeNull();
  });
});
