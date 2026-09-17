import { describe, expect, it } from "vitest";

import {
  childFolders,
  folderItemCount,
  folderOptions,
  folderPath,
  folderSubtreeIds,
} from "../folders";
import type { AutomationFolder } from "../types";

const f = (
  id: string,
  parentId: string | null,
  name = id,
  automationCount = 0,
): AutomationFolder => ({ id, parentId, name, automationCount });

// sales > nurture > week-1, sales > onboarding, and support at the top.
const folders = [
  f("week-1", "nurture", "Week 1"),
  f("support", null, "Support", 2),
  f("nurture", "sales", "Nurture", 1),
  f("sales", null, "sales"),
  f("onboarding", "sales", "Onboarding"),
];

describe("automation folders", () => {
  it("lists a level's folders alphabetically, ignoring case", () => {
    expect(childFolders(folders, null).map((x) => x.id)).toEqual(["sales", "support"]);
    expect(childFolders(folders, "sales").map((x) => x.id)).toEqual(["nurture", "onboarding"]);
  });

  it("builds the breadcrumb from the top level down", () => {
    expect(folderPath(folders, "week-1").map((x) => x.id)).toEqual([
      "sales",
      "nurture",
      "week-1",
    ]);
    expect(folderPath(folders, null)).toEqual([]);
    expect(folderPath(folders, "gone")).toEqual([]);
  });

  it("stops on a cycle instead of looping", () => {
    const looped = [f("a", "b"), f("b", "a")];
    expect(folderPath(looped, "a").map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("collects a folder's whole subtree", () => {
    expect([...folderSubtreeIds(folders, "sales")].sort()).toEqual([
      "nurture",
      "onboarding",
      "sales",
      "week-1",
    ]);
    expect([...folderSubtreeIds(folders, "support")]).toEqual(["support"]);
  });

  it("offers every folder, depth-first, as a move target", () => {
    expect(folderOptions(folders).map(({ folder, depth }) => `${depth}:${folder.id}`)).toEqual([
      "0:sales",
      "1:nurture",
      "2:week-1",
      "1:onboarding",
      "0:support",
    ]);
  });

  it("never offers a moving folder its own subtree", () => {
    expect(folderOptions(folders, "nurture").map(({ folder }) => folder.id)).toEqual([
      "sales",
      "onboarding",
      "support",
    ]);
  });

  it("counts direct workflows and subfolders as a folder's contents", () => {
    expect(folderItemCount(folders, folders[3])).toBe(2);
    expect(folderItemCount(folders, folders[2])).toBe(2);
    expect(folderItemCount(folders, folders[0])).toBe(0);
  });
});
