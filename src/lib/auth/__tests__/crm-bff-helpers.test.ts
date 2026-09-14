import { describe, expect, it } from "vitest";

import { isEmptySignedInListPath } from "@/lib/auth/crm-bff-helpers";

const workspace = "bf046a80-3952-4937-ab2a-4ad5430685f6";

describe("isEmptySignedInListPath", () => {
  it("treats workspace task list views as empty-list GETs", () => {
    for (const rest of [undefined, "today", "overdue", "upcoming", "my"]) {
      const path = rest
        ? ["workspaces", workspace, "tasks", rest]
        : ["workspaces", workspace, "tasks"];
      expect(isEmptySignedInListPath(path, "GET")).toBe(true);
    }
  });

  it("does not swallow a single-task GET or writes", () => {
    expect(
      isEmptySignedInListPath(
        ["workspaces", workspace, "tasks", "a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
        "GET",
      ),
    ).toBe(false);
    expect(
      isEmptySignedInListPath(
        ["workspaces", workspace, "tasks", "upcoming"],
        "POST",
      ),
    ).toBe(false);
  });
});
