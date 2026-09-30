import { describe, expect, it } from "vitest";
import {
  applyKanbanPreferenceToLeadCard,
  DEFAULT_CRM_LEAD_KANBAN_PREFERENCE,
  kanbanPreferenceFromLeadCard,
  normalizeCrmLeadKanbanPreference,
  sanitizeCrmKanbanDynamicFields,
  toLeadKanbanPreferenceBody,
  workspaceLeadKanbanPreferencePath,
} from "@/lib/kanban/preference-api";
import { DEFAULT_LEAD_CARD_SETTINGS } from "@/lib/leads/lead-card-settings";

describe("lead kanban preference API", () => {
  it("uses the Swagger workspace path", () => {
    expect(workspaceLeadKanbanPreferencePath("ws-1")).toBe(
      "/v1/workspaces/ws-1/preferences/kanban/leads",
    );
  });

  it("reads Nest LeadKanbanPreferenceDto fields from CRM JSON", () => {
    const pref = normalizeCrmLeadKanbanPreference({
      data: {
        showOwnerAvatar: false,
        dynamicFieldKeys: ["company", "email", "tags", "bogus", "phone"],
        unrepliedThresholdHours: 48,
      },
    });
    expect(pref.showOwnerAvatar).toBe(false);
    expect(pref.dynamicFieldKeys).toEqual(["company", "email", "tags", "phone"]);
    expect(pref.unrepliedThresholdHours).toBe(48);
  });

  it("applies server prefs onto Lead Card settings", () => {
    const next = applyKanbanPreferenceToLeadCard(
      {
        ...DEFAULT_LEAD_CARD_SETTINGS,
        dynamicFieldKeys: ["company", "cf:customScore"],
      },
      normalizeCrmLeadKanbanPreference({
        showOwnerAvatar: true,
        dynamicFieldKeys: ["phone", "tags"],
        unrepliedThresholdHours: 12,
      }),
    );
    expect(next.showOwnerAvatar).toBe(true);
    expect(next.unrepliedThresholdHours).toBe(12);
    expect(next.dynamicFieldKeys).toEqual(["phone", "tags", "cf:customScore"]);
  });

  it("sends a whitelist-safe PUT body matching Nest DTO", () => {
    const body = toLeadKanbanPreferenceBody(
      kanbanPreferenceFromLeadCard({
        ...DEFAULT_LEAD_CARD_SETTINGS,
        showOwnerAvatar: false,
        dynamicFieldKeys: ["company", "source", "email", "tags", "phone"],
        unrepliedThresholdHours: 24,
      }),
    );
    expect(body).toEqual({
      showOwnerAvatar: false,
      dynamicFieldKeys: ["company", "email", "tags", "phone"],
      unrepliedThresholdHours: 24,
    });
    expect(sanitizeCrmKanbanDynamicFields(["leadName", "company"])).toEqual([
      "company",
    ]);
    expect(DEFAULT_CRM_LEAD_KANBAN_PREFERENCE.dynamicFieldKeys.length).toBeLessThanOrEqual(
      4,
    );
  });
});
