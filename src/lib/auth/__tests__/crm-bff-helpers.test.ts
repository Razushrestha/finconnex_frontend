import { describe, expect, it } from "vitest";

import {
  isEmptyDashboardLayoutWritePath,
  isEmptyDashboardWidgetBatchPath,
  isEmptySignedInListPath,
  isHostedMissingCrmGet,
  isHostedMissingSignatureListPath,
  normalizeCrmProxyPath,
} from "@/lib/auth/crm-bff-helpers";

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

  it("treats signature request and template lists as empty-list GETs", () => {
    expect(
      isEmptySignedInListPath(
        ["workspaces", workspace, "signature-requests"],
        "GET",
      ),
    ).toBe(true);
    expect(isEmptySignedInListPath(["signature-requests"], "GET")).toBe(true);
    expect(
      isEmptySignedInListPath(
        ["workspaces", workspace, "signature-templates"],
        "GET",
      ),
    ).toBe(true);
    expect(isEmptySignedInListPath(["signature-templates"], "GET")).toBe(true);
    expect(
      isEmptySignedInListPath(
        ["workspaces", workspace, "signature-requests", "abc"],
        "GET",
      ),
    ).toBe(false);
    expect(
      isEmptySignedInListPath(["signature-requests", ""], "GET"),
    ).toBe(true);
    expect(isHostedMissingSignatureListPath(["signature-requests"], "GET")).toBe(
      true,
    );
    expect(isHostedMissingSignatureListPath(["signature-templates"], "GET")).toBe(
      true,
    );
    expect(isHostedMissingSignatureListPath(["leads"], "GET")).toBe(false);
    expect(isHostedMissingCrmGet(["signature-requests"], "GET")).toBe(true);
    expect(isHostedMissingCrmGet(["dashboard"], "GET")).toBe(true);
    expect(isHostedMissingCrmGet(["leads"], "GET")).toBe(false);
  });

  it("normalizes catch-all path strings and v1 prefixes", () => {
    expect(normalizeCrmProxyPath("signature-requests")).toEqual([
      "signature-requests",
    ]);
    expect(normalizeCrmProxyPath(["v1", "signature-templates"])).toEqual([
      "signature-templates",
    ]);
    expect(isEmptySignedInListPath(normalizeCrmProxyPath("signature-requests"), "GET")).toBe(
      true,
    );
  });

  it("treats dashboard and member lists as empty-list GETs", () => {
    expect(isEmptySignedInListPath(["dashboard"], "GET")).toBe(true);
    expect(
      isEmptySignedInListPath(
        ["workspaces", workspace, "dashboard", "layouts"],
        "GET",
      ),
    ).toBe(true);
    expect(
      isEmptySignedInListPath(
        ["workspaces", workspace, "dashboard", "widgets", "catalog"],
        "GET",
      ),
    ).toBe(true);
    expect(
      isEmptySignedInListPath(["workspaces", workspace, "members"], "GET"),
    ).toBe(true);
    expect(
      isEmptySignedInListPath(
        ["workspaces", workspace, "dashboard", "layouts", "abc"],
        "GET",
      ),
    ).toBe(false);
    expect(
      isEmptyDashboardWidgetBatchPath(
        ["workspaces", workspace, "dashboard", "widgets", "batch"],
        "POST",
      ),
    ).toBe(true);
    expect(
      isEmptyDashboardLayoutWritePath(
        ["workspaces", workspace, "dashboard", "layouts"],
        "POST",
      ),
    ).toBe(true);
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
