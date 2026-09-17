import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { bindCrmSession } from "@/lib/activity-timeline";
import { applyCrmTaskStatus, toCreateTaskBody } from "@/lib/tasks/api";

const OWNER = "11111111-1111-4111-8111-111111111111";
const TASK = "22222222-2222-4222-8222-222222222222";

describe("creating a task with a status", () => {
  const originalFetch = globalThis.fetch;
  let calls: string[] = [];

  beforeEach(() => {
    calls = [];
    bindCrmSession({
      baseUrl: "https://crm.test",
      accessToken: "token",
      workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${new URL(String(input)).pathname}`);
      return new Response(
        JSON.stringify({ statusCode: 200, data: { id: TASK, subject: "Call", status: "IN_PROGRESS" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;
  });

  afterEach(() => {
    bindCrmSession(null);
    globalThis.fetch = originalFetch;
  });

  it("never sends status on create, which the API rejects", () => {
    const body = toCreateTaskBody({
      title: "Call",
      taskType: "Call",
      priority: "High",
      status: "In Progress",
      dueDate: "2026-10-01T09:30",
      assignedTo: OWNER,
    } as never);
    expect(body).not.toHaveProperty("status");
    expect(body).toMatchObject({ subject: "Call", taskType: "CALL", priority: "HIGH" });
  });

  it("reaches the chosen status through the lifecycle endpoints", async () => {
    await applyCrmTaskStatus(TASK, "In Progress");
    await applyCrmTaskStatus(TASK, "Waiting");
    await applyCrmTaskStatus(TASK, "Completed");
    await applyCrmTaskStatus(TASK, "Cancelled");
    // The client may use the global or the workspace-scoped task path.
    expect(calls.map((call) => call.replace(/^POST .*\/tasks\//, "POST tasks/"))).toEqual([
      `POST tasks/${TASK}/start`,
      `POST tasks/${TASK}/defer`,
      `POST tasks/${TASK}/complete`,
      `POST tasks/${TASK}/cancel`,
    ]);
  });

  it("leaves Not Started and Review alone", async () => {
    expect(await applyCrmTaskStatus(TASK, "Not Started")).toBeNull();
    expect(await applyCrmTaskStatus(TASK, "Review")).toBeNull();
    expect(calls).toEqual([]);
  });
});
