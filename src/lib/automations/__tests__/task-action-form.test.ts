import { describe, expect, it } from "vitest";

import {
  emptyTaskActionForm,
  offsetFromMs,
  isStoredRepeat,
  TASK_ACTION_STATUSES,
  taskActionConfigFromForm,
  taskActionFormFromConfig,
  type TaskActionFormState,
} from "@/lib/automations/task-action-form";
import { defaultReminderRepeatRule } from "@/lib/tasks/repeat-reminder";

const OWNER = "11111111-1111-4111-8111-111111111111";
const HELPER = "22222222-2222-4222-8222-222222222222";
const DEAL = "33333333-3333-4333-8333-333333333333";
const CONTACT = "44444444-4444-4444-8444-444444444444";

function filled(patch: Partial<TaskActionFormState> = {}): TaskActionFormState {
  return {
    ...emptyTaskActionForm(),
    title: "  Call the client  ",
    taskType: "Call",
    priority: "Critical",
    status: "In Progress",
    description: "Ask about the valuation",
    actionItems: [
      { id: "a", text: "Confirm income", done: false },
      { id: "b", text: "   ", done: false },
    ],
    assignedTo: OWNER,
    collaborators: [HELPER, OWNER],
    dueMode: "date",
    dueDate: "2026-10-01T09:30",
    ...patch,
  };
}

describe("Create Task step form", () => {
  it("starts from the task page's defaults", () => {
    const form = emptyTaskActionForm();
    expect([form.taskType, form.priority, form.status]).toEqual([
      "Follow-up",
      "Medium",
      "Not Started",
    ]);
  });

  it("writes the same API values the task page sends", () => {
    const config = taskActionConfigFromForm(filled(), "Australia/Sydney");
    expect(config).toMatchObject({
      subject: "Call the client",
      taskType: "CALL",
      priority: "URGENT",
      status: "IN_PROGRESS",
      assigneeIds: [OWNER],
      collaboratorIds: [HELPER],
      dueAt: new Date("2026-10-01T09:30").toISOString(),
    });
    expect(config.description).toContain("Ask about the valuation");
    expect(config.description).toContain("Confirm income");
    expect(config).not.toHaveProperty("status", "NOT_STARTED");
  });

  it("leaves Not Started, empty relations and empty lists out", () => {
    const config = taskActionConfigFromForm(
      filled({ status: "Not Started", collaborators: [], actionItems: [], description: "" }),
    );
    for (const key of ["status", "collaboratorIds", "description", "relatedType", "reminderAt", "repeatEvery", "attachmentKeys"]) {
      expect(config).not.toHaveProperty(key);
    }
  });

  it("stores repeats the CRM can hold, with the task page's recurrence settings", () => {
    const weekly = taskActionConfigFromForm(
      filled({ repeatOn: true, taskRepeat: { ...defaultReminderRepeatRule, preset: "weekly" } }),
      "Australia/Sydney",
    );
    expect(weekly).toMatchObject({
      repeatEvery: "WEEKLY",
      recurrenceTimezone: "Australia/Sydney",
      recurrenceLimit: 12,
    });
    const custom = { ...defaultReminderRepeatRule, preset: "biweekly" as const };
    expect(isStoredRepeat(custom)).toBe(false);
    expect(taskActionConfigFromForm(filled({ repeatOn: true, taskRepeat: custom }))).not.toHaveProperty("repeatEvery");
  });

  it("only sends a reminder that is switched on and has a due date", () => {
    const on = filled({ reminderOn: true, reminderDate: "2026-09-30T09:00" });
    expect(taskActionConfigFromForm(on).reminderAt).toBe(new Date("2026-09-30T09:00").toISOString());
    expect(taskActionConfigFromForm({ ...on, reminderOn: false })).not.toHaveProperty("reminderAt");
    expect(taskActionConfigFromForm({ ...on, dueDate: "" })).not.toHaveProperty("reminderAt");
  });

  it("relates the task like the task page: a related record wins over the contact", () => {
    const both = filled({ relatedKind: "Deal", relatedId: DEAL, contactId: CONTACT });
    expect(taskActionConfigFromForm(both)).toMatchObject({ relatedType: "DEAL", dealId: DEAL });
    expect(taskActionConfigFromForm(both)).not.toHaveProperty("contactId");
    const contactOnly = filled({ contactId: CONTACT });
    expect(taskActionConfigFromForm(contactOnly)).toMatchObject({ relatedType: "CONTACT", contactId: CONTACT });
  });

  it("reads a saved step back into the same form", () => {
    const form = filled({
      status: "Waiting",
      relatedKind: "Deal",
      relatedId: DEAL,
      repeatOn: true,
      taskRepeat: { ...defaultReminderRepeatRule, preset: "monthly" },
      reminderOn: true,
      reminderDate: "2026-09-30T09:00",
      attachments: [{ key: "workspace/abc/brief.pdf", name: "brief.pdf" }],
    });
    const back = taskActionFormFromConfig(taskActionConfigFromForm(form));
    expect(back).toMatchObject({
      title: "Call the client",
      taskType: "Call",
      priority: "Critical",
      status: "Waiting",
      description: "Ask about the valuation",
      assignedTo: OWNER,
      collaborators: [HELPER],
      dueDate: "2026-10-01T09:30",
      reminderOn: true,
      reminderDate: "2026-09-30T09:00",
      repeatOn: true,
      relatedKind: "Deal",
      relatedId: DEAL,
      attachments: [{ key: "workspace/abc/brief.pdf", name: "brief.pdf" }],
    });
    expect(back.actionItems.map((item) => item.text)).toEqual(["Confirm income"]);
    expect(back.taskRepeat.preset).toBe("monthly");
  });

  it("defaults a new step to due a day after the workflow runs", () => {
    const form = emptyTaskActionForm();
    expect(form.dueMode).toBe("relative");
    const config = taskActionConfigFromForm({ ...form, title: "Call", assignedTo: OWNER });
    expect(config).toMatchObject({ dueInMs: 86_400_000 });
    expect(config).not.toHaveProperty("dueAt");
  });

  it("schedules a relative task and its reminder as offsets", () => {
    const form = filled({
      dueMode: "relative",
      dueIn: { amount: 3, unit: "days" },
      reminderOn: true,
      reminderBefore: { amount: 2, unit: "hours" },
      reminderDate: "2026-09-30T09:00",
      repeatOn: true,
      taskRepeat: { ...defaultReminderRepeatRule, preset: "daily" },
    });
    const config = taskActionConfigFromForm(form, "Australia/Sydney");
    expect(config).toMatchObject({
      dueInMs: 3 * 86_400_000,
      reminderBeforeDueMs: 2 * 3_600_000,
      repeatEvery: "DAILY",
    });
    // Never both ways at once — the API refuses a mix.
    expect(config).not.toHaveProperty("dueAt");
    expect(config).not.toHaveProperty("reminderAt");

    const back = taskActionFormFromConfig(config);
    expect(back).toMatchObject({
      dueMode: "relative",
      dueIn: { amount: 3, unit: "days" },
      reminderOn: true,
      reminderBefore: { amount: 2, unit: "hours" },
    });
  });

  it("keeps a step saved with a fixed date on that date", () => {
    const back = taskActionFormFromConfig({ subject: "Call", dueAt: "2026-10-01T09:30:00.000Z" });
    expect(back.dueMode).toBe("date");
    expect(back.dueDate).not.toBe("");
  });

  it("shows an offset in the largest unit that fits exactly", () => {
    expect(offsetFromMs(2 * 7 * 86_400_000)).toEqual({ amount: 2, unit: "weeks" });
    expect(offsetFromMs(36 * 3_600_000)).toEqual({ amount: 36, unit: "hours" });
    expect(offsetFromMs(90 * 60_000)).toEqual({ amount: 90, unit: "minutes" });
  });

  it("offers every task page status the CRM has", () => {
    expect(TASK_ACTION_STATUSES).toEqual([
      "Not Started",
      "In Progress",
      "Waiting",
      "Completed",
      "Cancelled",
    ]);
  });
});
