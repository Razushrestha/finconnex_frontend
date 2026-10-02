import { describe, expect, it } from "vitest";

import {
  formatStepDuration,
  formatWaitDuration,
  isRunFinished,
  mergeFirstPage,
  runFinishedAt,
  runLogIsLive,
  stepLabel,
  stepTestNote,
  testDataCountdown,
  testDataRows,
} from "../run-log";
import type { AutomationRunLogEntry } from "../types";

function run(overrides: Partial<AutomationRunLogEntry> = {}): AutomationRunLogEntry {
  return {
    id: "run-1",
    status: "SUCCEEDED",
    triggerKey: "trigger-1",
    triggerEntityType: "LEAD",
    triggerEntityId: "lead-1",
    errorCategory: null,
    isTest: false,
    testDataExpiresAt: null,
    testDataPurgedAt: null,
    startedAt: "2026-10-01T10:00:00.000Z",
    completedAt: "2026-10-01T10:00:01.000Z",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:01.000Z",
    testData: null,
    steps: [],
    ...overrides,
  };
}

describe("run log helpers", () => {
  it("folds run statuses into success, running and fails", async () => {
    const { runOutcomeCounts } = await import("../run-log");
    expect(
      runOutcomeCounts({
        SUCCEEDED: 7,
        QUEUED: 1,
        RUNNING: 2,
        WAITING: 3,
        FAILED: 4,
        MANUAL_INTERVENTION_REQUIRED: 1,
        ROLLED_BACK: 1,
        CANCELLED: 5,
      })
    ).toEqual({ succeeded: 7, running: 6, failed: 6 });
    expect(runOutcomeCounts(undefined)).toEqual({ succeeded: 0, running: 0, failed: 0 });
  });

  it("knows which runs are still moving", () => {
    expect(isRunFinished("RUNNING")).toBe(false);
    expect(isRunFinished("FAILED")).toBe(true);
    expect(runLogIsLive([run()])).toBe(false);
    expect(runLogIsLive([run({ status: "QUEUED" })])).toBe(true);
    // A finished test still changes once its data is deleted.
    expect(runLogIsLive([run({ isTest: true })])).toBe(true);
    expect(
      runLogIsLive([run({ isTest: true, testDataPurgedAt: "2026-10-01T10:02:00.000Z" })])
    ).toBe(false);
  });

  it("dates a failure by its last update, since failed runs have no completedAt", () => {
    expect(
      runFinishedAt(run({ status: "FAILED", completedAt: null, updatedAt: "2026-10-01T10:00:05.000Z" }))
    ).toBe("2026-10-01T10:00:05.000Z");
    expect(runFinishedAt(run({ status: "RUNNING" }))).toBeNull();
  });

  it("names steps from the action and flow-control catalogs", () => {
    expect(stepLabel({ actionType: "SEND_EMAIL", stepType: "ACTION" })).toBe("Send Email");
    expect(stepLabel({ actionType: null, stepType: "WAIT_FOR_DURATION" })).toBe("Wait");
    expect(stepLabel({ actionType: null, stepType: "IF_ELSE" })).toBe("If / Else Branch");
  });

  it("explains what a test step did instead", () => {
    const names = (id: string) => ({ "member-2": "Jane Doe" })[id];
    expect(
      stepTestNote({
        test: { redirectedTo: "me@example.com", wouldHaveSentTo: "lead@example.com" },
        branch: null,
      })
    ).toBe("Sent to you (me@example.com) instead of lead@example.com");
    expect(
      stepTestNote({ test: { assignedTo: "me", wouldHaveAssigned: "member-2" }, branch: null }, names)
    ).toBe("Assigned to you instead of Jane Doe");
    expect(
      stepTestNote({ test: { assignedTo: "me", wouldHaveAssigned: ["me"] }, branch: null }, names)
    ).toBe("Assigned to you");
    expect(stepTestNote({ test: { skipped: "WAIT", wouldWaitMs: 86_400_000 }, branch: null })).toBe(
      "Skipped in test — would have waited 1 day"
    );
    expect(stepTestNote({ test: { skipped: "WEBHOOK", host: "hooks.example.com" }, branch: null })).toBe(
      "Skipped in test — would have called hooks.example.com"
    );
    expect(stepTestNote({ test: { skipped: "REAL_RECORD", recordId: "x" }, branch: null })).toMatch(
      /real record/
    );
    expect(stepTestNote({ test: null, branch: "else" })).toBe(
      "Conditions did not match — took the No branch"
    );
    expect(stepTestNote({ test: null, branch: null })).toBeNull();
  });

  it("counts down to the test data being deleted", () => {
    const now = new Date("2026-10-01T10:00:18.000Z");
    const test = run({ isTest: true, testDataExpiresAt: "2026-10-01T10:02:00.000Z" });
    expect(testDataCountdown(test, now)).toBe("Test data deletes in 1:42");
    expect(testDataCountdown(test, new Date("2026-10-01T10:02:01.000Z"))).toBe("Deleting test data…");
    expect(testDataCountdown({ ...test, testDataPurgedAt: "2026-10-01T10:02:00.200Z" }, now)).toMatch(
      /^Test data deleted /
    );
    expect(testDataCountdown(run(), now)).toBeNull();
  });

  it("shows a test's data without its bookkeeping fields", () => {
    expect(
      testDataRows({
        id: "lead-1",
        status: "QUALIFIED",
        ownerId: "member-2",
        previousStatus: "NEW",
        rating: null,
        tags: [],
        isConverted: false,
        createdAt: "2026-10-01T10:00:00.000Z",
      })
    ).toEqual([
      { label: "Status", value: "QUALIFIED" },
      { label: "Owner", value: "member-2" },
      { label: "Previous status", value: "NEW" },
      { label: "Is converted", value: "No" },
    ]);
  });

  it("formats durations", () => {
    expect(formatWaitDuration(3 * 3_600_000)).toBe("3 hours");
    expect(formatWaitDuration(60_000)).toBe("1 minute");
    expect(
      formatStepDuration({ startedAt: "2026-10-01T10:00:00.000Z", completedAt: "2026-10-01T10:00:00.250Z" })
    ).toBe("250 ms");
    expect(formatStepDuration({ startedAt: null, completedAt: "2026-10-01T10:00:00.250Z" })).toBeNull();
  });

  it("refreshes the first page without dropping older pages", () => {
    const merged = mergeFirstPage(
      [run({ id: "b" }), run({ id: "a" })],
      [run({ id: "c" }), run({ id: "b", status: "FAILED" })]
    );
    expect(merged.map((item) => [item.id, item.status])).toEqual([
      ["c", "SUCCEEDED"],
      ["b", "FAILED"],
      ["a", "SUCCEEDED"],
    ]);
  });
});

describe("runs from a server without the run log endpoint", () => {
  it("shapes a raw run row and its steps like a log entry", async () => {
    const { fromLegacyRun } = await import("../run-log");
    const entry = fromLegacyRun({
      id: "run-9",
      status: "FAILED",
      triggerKey: "trg-1",
      triggerEntityType: "LEAD",
      triggerEntityId: "lead-1",
      errorCategory: "UnprocessableEntityException",
      startedAt: "2026-10-01T10:00:00.000Z",
      completedAt: null,
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:02.000Z",
      automationVersion: { definition: {} },
      triggerEvent: { snapshot: { email: "real@example.com" } },
      steps: [
        { id: "s2", stepKey: "b", stepIndex: 1, stepType: "ACTION", actionType: "SEND_EMAIL", status: "FAILED", safeResult: null },
        { id: "s1", stepKey: "a", stepIndex: 0, stepType: "IF_ELSE", actionType: null, status: "SUCCEEDED", safeResult: { branch: "then" }, completedAt: "2026-10-01T10:00:01.000Z" },
      ],
    });

    expect(entry).toMatchObject({ id: "run-9", isTest: false, testData: null, errorCategory: "UnprocessableEntityException" });
    expect(entry.steps.map((step) => [step.stepKey, step.branch])).toEqual([
      ["a", "then"],
      ["b", null],
    ]);
    expect(runFinishedAt(entry)).toBe("2026-10-01T10:00:02.000Z");
  });
});

describe("step timeline and workspace log helpers", () => {
  it("colours the timeline dot by how the step stands", async () => {
    const { stepDotClass } = await import("../run-log");
    expect(stepDotClass("SUCCEEDED")).toContain("bg-emerald-500");
    expect(stepDotClass("FAILED")).toContain("bg-rose-500");
    expect(stepDotClass("SKIPPED")).toContain("bg-slate-300");
    expect(stepDotClass("RUNNING")).toContain("animate-pulse");
    expect(stepDotClass("PENDING")).toContain("bg-white");
  });

  it("times a step by when it ended, else when it started", async () => {
    const { stepTime } = await import("../run-log");
    expect(stepTime({ startedAt: "a", completedAt: "b" })).toBe("b");
    expect(stepTime({ startedAt: "a", completedAt: null })).toBe("a");
    expect(stepTime({ startedAt: null, completedAt: null })).toBeNull();
  });

  it("names the trigger and keeps the workflow on older-server rows", async () => {
    const { triggerLabel, fromLegacyRun } = await import("../run-log");
    expect(triggerLabel("LEAD_CREATED")).toBe("Lead Created");
    expect(triggerLabel(undefined)).toBeNull();
    const entry = fromLegacyRun({
      id: "r",
      status: "SUCCEEDED",
      triggerType: "LEAD_CREATED",
      automation: { id: "a-1", name: "Welcome", status: "ENABLED" },
      createdAt: "2026-10-01T10:00:00.000Z",
      steps: [],
    });
    expect(entry.automation).toEqual({ id: "a-1", name: "Welcome" });
    expect(entry.triggerType).toBe("LEAD_CREATED");
  });
});
