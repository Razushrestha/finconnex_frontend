import { describe, expect, it } from "vitest";
import {
  orderManageColumnsByPin,
  toggleManageColumnPinned,
  visibleManageColumns,
  type ManageColumn,
} from "@/components/work-queue/ManageColumnsModal";

const columns: ManageColumn[] = [
  { id: "name", label: "Task Name", checked: true, required: true },
  { id: "type", label: "Type", checked: true },
  { id: "taskId", label: "Task ID", checked: true },
  { id: "reminder", label: "Reminder Date", checked: false },
];

describe("toggleManageColumnPinned", () => {
  it("moves a pinned column to the top after required columns", () => {
    const next = toggleManageColumnPinned(columns, "reminder");
    expect(next.map((c) => c.id)).toEqual([
      "name",
      "reminder",
      "type",
      "taskId",
    ]);
    expect(next[1]?.pinned).toBe(true);
    expect(next[1]?.checked).toBe(true);
  });

  it("parks an unpinned column just below other pinned columns", () => {
    const pinned = toggleManageColumnPinned(columns, "reminder");
    const withType = toggleManageColumnPinned(pinned, "type");
    expect(withType.map((c) => c.id)).toEqual([
      "name",
      "type",
      "reminder",
      "taskId",
    ]);
    const unpinned = toggleManageColumnPinned(withType, "type");
    expect(unpinned.map((c) => c.id)).toEqual([
      "name",
      "reminder",
      "type",
      "taskId",
    ]);
    expect(unpinned.find((c) => c.id === "type")?.pinned).toBe(false);
  });
});

describe("visibleManageColumns", () => {
  it("shows pinned columns before unpinned visible columns", () => {
    const next = orderManageColumnsByPin(
      toggleManageColumnPinned(columns, "reminder"),
    ).filter((c) => c.checked);
    expect(visibleManageColumns(toggleManageColumnPinned(columns, "reminder")).map((c) => c.id)).toEqual(
      next.map((c) => c.id),
    );
    expect(next.map((c) => c.id)).toEqual(["name", "reminder", "type", "taskId"]);
  });
});
