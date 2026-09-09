import { describe, expect, it } from "vitest";

import { FIELD_META } from "@/lib/automations/field-meta";
import {
  ACTION_CATALOG,
  AUTOMATION_ACTION_KEYS,
  AUTOMATION_ACTION_TYPES,
  isActionAllowedForEntity,
  isActionImplemented,
  PLANNED_ACTIONS,
  type AutomationActionType,
} from "@/lib/automations/types";

/**
 * These lists mirror the backend's AUTOMATION_ACTION_REGISTRY,
 * IMPLEMENTED_ACTIONS and ACTION_ENTITY_SCOPE. A mirror drifts silently —
 * an action offered here that the backend rejects only shows up as a 422 at
 * publish time — so the shape is asserted rather than trusted.
 */
describe("automation action catalog", () => {
  it("labels and configures every action type", () => {
    for (const action of AUTOMATION_ACTION_TYPES) {
      expect(ACTION_CATALOG[action], `${action} has no catalog entry`).toBeDefined();
      expect(
        AUTOMATION_ACTION_KEYS[action],
        `${action} has no config-key entry`,
      ).toBeDefined();
    }
  });

  it("gives every allowed config key a rendering widget", () => {
    for (const action of AUTOMATION_ACTION_TYPES) {
      for (const key of AUTOMATION_ACTION_KEYS[action]?.allowed ?? []) {
        expect(FIELD_META[key], `${action}.${key} has no FIELD_META`).toBeDefined();
      }
    }
  });

  it("keeps required keys inside the allowed set", () => {
    for (const action of AUTOMATION_ACTION_TYPES) {
      const entry = AUTOMATION_ACTION_KEYS[action];
      for (const key of entry?.required ?? []) {
        expect(entry?.allowed, `${action}.${key} required but not allowed`).toContain(key);
      }
    }
  });

  it("never lists an action as both available and coming soon", () => {
    const live = new Set(
      AUTOMATION_ACTION_TYPES.map((action) => ACTION_CATALOG[action].label),
    );
    for (const planned of PLANNED_ACTIONS) {
      expect(live.has(planned.label), `${planned.label} is both live and planned`).toBe(
        false,
      );
    }
  });

  it("treats every catalogued action as implemented", () => {
    // NOT_YET_IMPLEMENTED_ACTIONS is empty now that LINK_RECORD and
    // CANCEL_REMINDERS are wired; nothing selectable should be filtered out.
    for (const action of AUTOMATION_ACTION_TYPES) {
      expect(isActionImplemented(action)).toBe(true);
    }
  });

  it("scopes entity-specific actions the way the backend does", () => {
    const cases: [AutomationActionType, string, boolean][] = [
      ["DELETE_LEAD", "LEAD", true],
      ["DELETE_LEAD", "DEAL", false],
      ["DELETE_DEAL", "DEAL", true],
      ["ADD_FOLLOWER", "LEAD", true],
      ["ADD_FOLLOWER", "DEAL", false],
      ["ROUND_ROBIN_ASSIGN", "COMPANY", true],
      ["ROUND_ROBIN_ASSIGN", "TASK", false],
      ["ASSOCIATE_CONTACT", "LEAD", true],
      ["ASSOCIATE_CONTACT", "CONTACT", false],
      ["UPDATE_DOCUMENT_STATUS", "DOCUMENT_REQUEST", true],
      ["UPDATE_DOCUMENT_STATUS", "LEAD", false],
      ["CANCEL_REMINDERS", "CALL", true],
      ["CANCEL_REMINDERS", "EMAIL", false],
      // Unscoped: valid against any trigger entity.
      ["SEND_SMS", "EMAIL", true],
      ["END_AUTOMATION", "MESSAGE", true],
    ];
    for (const [action, entity, expected] of cases) {
      expect(
        isActionAllowedForEntity(action, entity as never),
        `${action} on ${entity}`,
      ).toBe(expected);
    }
  });

  /**
   * Each action offers exactly what its own module's create DTO accepts, so a
   * step configured in the builder maps 1:1 onto what that module's create
   * form would send. Spot-checks the fields that were missing before — the
   * ones that made the automation form a cut-down version of the real one.
   */
  it("offers the same fields as each module's own create form", () => {
    const expected: Record<string, string[]> = {
      // CreateTaskDto — the Create Task form's owner, collaborators,
      // recurrence, billing and attachment fields.
      CREATE_TASK: [
        "subject",
        "taskType",
        "priority",
        "description",
        "assigneeIds",
        "collaboratorIds",
        "followerIds",
        "dueAt",
        "reminderAt",
        "repeatEvery",
        "recurrenceTimezone",
        "recurrenceLimit",
        "isPublic",
        "isBillable",
        "tags",
        "attachmentKeys",
        "relatedType",
      ],
      // Phase2CreateNoteDto — note type, pin and private were all missing.
      CREATE_NOTE: [
        "title",
        "body",
        "noteType",
        "isPinned",
        "isPrivate",
        "relatedType",
        "quoteId",
        "estimateId",
        "invoiceId",
        "creditNoteId",
      ],
      // CreateEmailDto — the compose window's Cc, Bcc and scheduling.
      SEND_EMAIL: [
        "subject",
        "body",
        "toEmail",
        "cc",
        "bcc",
        "templateId",
        "replyToId",
        "scheduledAt",
      ],
      CREATE_REMINDER: [
        "title",
        "remindAt",
        "targetUserId",
        "reminderType",
        "notificationMethod",
      ],
      SCHEDULE_CALL: ["subject", "callType", "phone", "purpose", "reminderAt"],
      CREATE_MEETING: ["title", "meetingType", "endAt", "timezone", "allDay"],
      CREATE_LEAD: [
        "firstName",
        "lastName",
        "email",
        "companySize",
        "pipelineStage",
        "lifecycleStage",
        "rating",
        "score",
        "tags",
        "estimatedValue",
      ],
      CREATE_DEAL: ["name", "stage", "lostReason", "competitor", "pipeline"],
      CREATE_COMPANY: ["name", "size", "employeeCount", "parentId"],
      CREATE_CONTACT: ["email", "lifecycleStage", "source", "doNotContact"],
    };
    for (const [action, fields] of Object.entries(expected)) {
      const allowed = AUTOMATION_ACTION_KEYS[action]?.allowed ?? [];
      for (const field of fields) {
        expect(allowed, `${action} is missing ${field}`).toContain(field);
      }
    }
  });

  it("uses the database enum values for every select", () => {
    const enums: Record<string, string[]> = {
      noteType: ["GENERAL", "CALL_SUMMARY", "MEETING_NOTES", "FOLLOW_UP", "OTHER"],
      repeatEvery: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"],
      priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      taskType: ["CALL", "EMAIL", "MEETING", "FOLLOW_UP", "DEMO", "RESEARCH", "OTHER"],
      reminderType: ["TASK_DUE", "MEETING_START", "FOLLOW_UP", "CUSTOM"],
      notificationMethod: ["IN_APP", "EMAIL", "PUSH", "SMS"],
      rating: ["HOT", "WARM", "COLD"],
      lostReason: ["PRICE", "FEATURE", "COMPETITOR", "NO_BUDGET", "NO_RESPONSE", "OTHER"],
      size: ["MICRO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"],
      lifecycleStage: [
        "SUBSCRIBER",
        "LEAD",
        "MQL",
        "SQL",
        "OPPORTUNITY",
        "CUSTOMER",
        "EVANGELIST",
        "LOST",
      ],
    };
    for (const [key, values] of Object.entries(enums)) {
      const options = FIELD_META[key]?.options ?? [];
      expect(
        options.map((option) => option.value).sort(),
        `${key} options drifted from the schema enum`,
      ).toEqual([...values].sort());
    }
  });

  it("keeps only genuinely unbuilt actions in the coming-soon list", () => {
    // Everything left needs a third-party integration, a missing schema
    // field, or engine work — never merely "an executor".
    for (const planned of PLANNED_ACTIONS) {
      expect(planned.note).not.toBe("Executor not built yet");
    }
    expect(PLANNED_ACTIONS.map((item) => item.label)).toEqual([
      "Wait Until Condition",
      "Stop Other Automation",
      "Assign Team",
      "Activity Action",
      "Send Instagram DM",
      "Send Facebook Messenger",
      "Send Client Notification",
    ]);
  });
});
