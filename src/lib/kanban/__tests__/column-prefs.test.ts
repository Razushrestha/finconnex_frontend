import { describe, expect, it } from "vitest";
import {
  addKanbanColumnPrefTitle,
  kanbanPrefsFromCatalog,
  toggleKanbanColumnPref,
} from "@/lib/kanban/column-prefs";

describe("kanban column prefs", () => {
  const defaults = kanbanPrefsFromCatalog([
    { id: "active", label: "Active" },
    { id: "inactive", label: "Inactive" },
  ]);

  it("hides a non-required column", () => {
    const next = toggleKanbanColumnPref(defaults, "inactive");
    expect(next.find((col) => col.id === "inactive")?.visible).toBe(false);
    expect(next.find((col) => col.id === "active")?.visible).toBe(true);
  });

  it("binds a custom title onto a hidden column", () => {
    const hidden = toggleKanbanColumnPref(defaults, "inactive");
    const result = addKanbanColumnPrefTitle(hidden, "Paused");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.columns.find((col) => col.id === "inactive")).toMatchObject({
      visible: true,
      label: "Paused",
    });
  });
});
