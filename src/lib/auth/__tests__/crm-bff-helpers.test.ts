import { describe, expect, it } from "vitest";

import {
  isEmptyDashboardLayoutWritePath,
  isEmptyDashboardWidgetBatchPath,
  isEmptySignedInListPath,
  isHostedMissingSignatureListPath,
  isContactRecordPatch,
  contactPatchOkBody,
  isCallLogOutcomePost,
  parseCallLogOutcomePath,
  outcomeFromCallLogBody,
  callLogOutcomeOkBody,
  parseTaskLifecyclePath,
  taskLifecycleOkBody,
  parseTaskRecordGet,
  taskRecordOkBody,
  parseLeadKanbanPreferencePath,
  leadKanbanPreferenceOkBody,
  parseWorkspaceScopedListRetry,
  tryMissingCrmFallback,
  parseEmailRecordGet,
  emailRecordOkBody,
  parseMeetingCancelPath,
  meetingCancelOkBody,
  parseCallCompletePath,
  callCompleteOkBody,
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

  it("does not stub live signature lists as empty", () => {
    expect(
      isEmptySignedInListPath(
        ["workspaces", workspace, "signature-requests"],
        "GET",
      ),
    ).toBe(false);
    expect(isEmptySignedInListPath(["signature-requests"], "GET")).toBe(false);
    expect(
      isEmptySignedInListPath(
        ["workspaces", workspace, "signature-templates"],
        "GET",
      ),
    ).toBe(false);
    expect(isEmptySignedInListPath(["signature-templates"], "GET")).toBe(false);
    expect(
      isEmptySignedInListPath(
        ["workspaces", workspace, "signature-requests", "abc"],
        "GET",
      ),
    ).toBe(false);
    expect(
      isEmptySignedInListPath(["signature-requests", ""], "GET"),
    ).toBe(false);
    // Live Nest serves these — BFF must proxy GET, not return [].
    expect(isHostedMissingSignatureListPath(["signature-requests"], "GET")).toBe(
      false,
    );
    expect(isHostedMissingSignatureListPath(["signature-templates"], "GET")).toBe(
      false,
    );
    expect(isHostedMissingSignatureListPath(["leads"], "GET")).toBe(false);
  });

  it("recognizes PATCH /contacts/:id", () => {
    expect(
      isContactRecordPatch(["contacts", "6739d58f-abfe-4d51-846b-d6e9b9687eb3"], "PATCH"),
    ).toBe(true);
    expect(
      isContactRecordPatch(
        ["workspaces", workspace, "contacts", "6739d58f-abfe-4d51-846b-d6e9b9687eb3"],
        "PATCH",
      ),
    ).toBe(true);
    expect(isContactRecordPatch(["contacts"], "PATCH")).toBe(false);
    expect(isContactRecordPatch(["contacts", "x"], "GET")).toBe(false);
    const payload = JSON.parse(
      contactPatchOkBody("6739d58f-abfe-4d51-846b-d6e9b9687eb3", '{"firstName":"Ada"}'),
    );
    expect(payload.statusCode).toBe(200);
    expect(payload.data.id).toBe("6739d58f-abfe-4d51-846b-d6e9b9687eb3");
    expect(payload.data.firstName).toBe("Ada");
  });

  it("recognizes POST /calls/:id/log-outcome", () => {
    const callId = "f09a1a16-ccdf-4be0-98f0-56fa819356ce";
    expect(isCallLogOutcomePost(["calls", callId, "log-outcome"], "POST")).toBe(
      true,
    );
    expect(
      isCallLogOutcomePost(
        ["workspaces", workspace, "calls", callId, "log-outcome"],
        "POST",
      ),
    ).toBe(true);
    expect(isCallLogOutcomePost(["calls", callId, "complete"], "POST")).toBe(
      false,
    );
    expect(parseCallLogOutcomePath(["calls", callId, "log-outcome"])).toEqual({
      callId,
      workspaceId: null,
    });
    expect(outcomeFromCallLogBody('{"status":"NO_ANSWER","outcome":"Busy"}')).toBe(
      "Busy",
    );
    const payload = JSON.parse(
      callLogOutcomeOkBody(callId, '{"status":"NO_ANSWER","outcome":"Busy"}'),
    );
    expect(payload.statusCode).toBe(200);
    expect(payload.data.id).toBe(callId);
    expect(payload.data.outcome).toBe("Busy");
  });

  it("recognizes GET /tasks/:id", () => {
    const taskId = "cad1e63e-1991-484d-8af0-fe239b9bd27c";
    expect(
      parseTaskRecordGet(["workspaces", workspace, "tasks", taskId], "GET"),
    ).toEqual({ taskId, workspaceId: workspace });
    expect(parseTaskRecordGet(["tasks", taskId], "GET")).toEqual({
      taskId,
      workspaceId: null,
    });
    expect(parseTaskRecordGet(["tasks", "today"], "GET")).toBeNull();
    expect(parseTaskRecordGet(["tasks", taskId, "start"], "GET")).toBeNull();
    expect(parseTaskRecordGet(["tasks", taskId], "POST")).toBeNull();
    const payload = JSON.parse(taskRecordOkBody(taskId));
    expect(payload.statusCode).toBe(200);
    expect(payload.data.id).toBe(taskId);
  });

  it("treats workspace lead kanban preference GET/PUT as 200", () => {
    const path = [
      "workspaces",
      workspace,
      "preferences",
      "kanban",
      "leads",
    ];
    expect(parseLeadKanbanPreferencePath(path, "GET")).toEqual({
      workspaceId: workspace,
    });
    expect(parseLeadKanbanPreferencePath(path, "PUT")).toEqual({
      workspaceId: workspace,
    });
    expect(parseLeadKanbanPreferencePath(path, "POST")).toBeNull();
    expect(
      parseLeadKanbanPreferencePath(["preferences", "kanban"], "GET"),
    ).toBeNull();
    const fallback = tryMissingCrmFallback(path, "GET");
    expect(fallback?.status).toBe(200);
    const payload = JSON.parse(
      leadKanbanPreferenceOkBody(
        '{"showOwnerAvatar":false,"dynamicFieldKeys":["phone"],"unrepliedThresholdHours":12}',
      ),
    );
    expect(payload.statusCode).toBe(200);
    expect(payload.data.showOwnerAvatar).toBe(false);
    expect(payload.data.dynamicFieldKeys).toEqual(["phone"]);
    expect(payload.data.unrepliedThresholdHours).toBe(12);
  });

  it("does not stub live lead or contact lists as empty", () => {
    expect(isEmptySignedInListPath(["leads"], "GET")).toBe(false);
    expect(
      isEmptySignedInListPath(["workspaces", workspace, "leads"], "GET"),
    ).toBe(false);
    expect(isEmptySignedInListPath(["contacts"], "GET")).toBe(false);
    expect(isEmptySignedInListPath(["deals"], "GET")).toBe(false);
    expect(isEmptySignedInListPath(["companies"], "GET")).toBe(false);
    expect(tryMissingCrmFallback(["leads"], "GET")).toBeNull();
    expect(parseWorkspaceScopedListRetry(["leads", "kanban"], "GET")).toEqual({
      rest: ["leads", "kanban"],
    });
    expect(parseWorkspaceScopedListRetry(["contacts"], "GET")).toEqual({
      rest: ["contacts"],
    });
    expect(
      parseWorkspaceScopedListRetry(
        ["workspaces", workspace, "leads"],
        "GET",
      ),
    ).toBeNull();
  });

  it("recognizes POST /tasks/:id/start", () => {
    const taskId = "cad1e63e-1991-484d-8af0-fe239b9bd27c";
    expect(
      parseTaskLifecyclePath([
        "workspaces",
        workspace,
        "tasks",
        taskId,
        "start",
      ]),
    ).toEqual({ taskId, workspaceId: workspace, action: "start" });
    expect(parseTaskLifecyclePath(["tasks", taskId, "defer"])).toEqual({
      taskId,
      workspaceId: null,
      action: "defer",
    });
    expect(parseTaskLifecyclePath(["tasks", taskId, "comments"])).toBeNull();
    const payload = JSON.parse(taskLifecycleOkBody(taskId, "start"));
    expect(payload.statusCode).toBe(200);
    expect(payload.data.id).toBe(taskId);
    expect(payload.data.status).toBe("IN_PROGRESS");
  });

  it("recognizes GET /emails/:id", () => {
    const emailId = "f09a1a16-ccdf-4be0-98f0-56fa819356ce";
    expect(parseEmailRecordGet(["emails", emailId], "GET")).toEqual({
      emailId,
      workspaceId: null,
    });
    expect(
      parseEmailRecordGet(
        ["workspaces", workspace, "emails", emailId],
        "GET",
      ),
    ).toEqual({ emailId, workspaceId: workspace });
    expect(parseEmailRecordGet(["emails", "templates"], "GET")).toBeNull();
    const payload = JSON.parse(emailRecordOkBody(emailId));
    expect(payload.statusCode).toBe(200);
    expect(payload.data.id).toBe(emailId);
  });

  it("recognizes POST /meetings/:id/cancel", () => {
    const meetingId = "b220390b-b9e2-49db-96dd-b72dba07a010";
    expect(
      parseMeetingCancelPath([
        "workspaces",
        workspace,
        "meetings",
        meetingId,
        "cancel",
      ]),
    ).toEqual({ meetingId, workspaceId: workspace });
    expect(parseMeetingCancelPath(["meetings", meetingId, "start"])).toBeNull();
    const payload = JSON.parse(meetingCancelOkBody(meetingId));
    expect(payload.statusCode).toBe(200);
    expect(payload.data.id).toBe(meetingId);
    expect(payload.data.status).toBe("CANCELLED");
  });

  it("recognizes POST /calls/:id/complete", () => {
    const callId = "0b127b90-291a-4cc3-9521-9a7254d11456";
    expect(
      parseCallCompletePath([
        "workspaces",
        workspace,
        "calls",
        callId,
        "complete",
      ]),
    ).toEqual({ callId, workspaceId: workspace });
    expect(parseCallCompletePath(["calls", callId, "cancel"])).toBeNull();
    const payload = JSON.parse(
      callCompleteOkBody(callId, '{"outcome":"Wrapped up"}'),
    );
    expect(payload.statusCode).toBe(200);
    expect(payload.data.id).toBe(callId);
    expect(payload.data.status).toBe("COMPLETED");
    expect(payload.data.outcome).toBe("Wrapped up");
  });

  it("normalizes catch-all path strings and v1 prefixes", () => {
    expect(normalizeCrmProxyPath("signature-requests")).toEqual([
      "signature-requests",
    ]);
    expect(normalizeCrmProxyPath(["v1", "signature-templates"])).toEqual([
      "signature-templates",
    ]);
    expect(isEmptySignedInListPath(normalizeCrmProxyPath("signature-requests"), "GET")).toBe(
      false,
    );
  });

  it("treats dashboard and member lists as empty-list GETs", () => {
    expect(isEmptySignedInListPath(["dashboard"], "GET")).toBe(false);
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
    ).toBe(false);
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
