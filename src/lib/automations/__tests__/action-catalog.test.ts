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
