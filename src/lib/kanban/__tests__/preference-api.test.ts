import { describe, expect, it } from "vitest";
import {
  applyKanbanPreferenceToView,
  isEmptyLeadKanbanPreference,
  kanbanPreferenceFromView,
  normalizeCrmLeadKanbanPreference,
  toLeadKanbanPreferenceBodies,
  workspaceLeadKanbanPreferencePath,
} from "@/lib/kanban/preference-api";
import type { KanbanViewConfig } from "@/components/common/KanbanViewControls";

const fallback: KanbanViewConfig = {
  id: "leads",
  name: "Leads",
  categorizeBy: "Status",
  aggregateBy: "Lead Count",
  headerStyle: "Multi Colour",
  shareWith: "everyone",
  selectedFieldIds: ["leadName"],
  editableFieldIds: [],
  selectedStageIds: ["new-lead", "appointment-booked"],
  stageLabels: {},
};

describe("lead kanban preference API", () => {
  it("uses the Swagger workspace path", () => {
    expect(workspaceLeadKanbanPreferencePath("ws-1")).toBe(
      "/v1/workspaces/ws-1/preferences/kanban/leads",
    );
  });

  it("reads visible stages and renamed titles from CRM JSON", () => {
    const pref = normalizeCrmLeadKanbanPreference({
      data: {
        selectedFieldIds: ["leadName", "phone"],
        columns: [
          { id: "new-lead", label: "Inbox", visible: true },
          { id: "hold", label: "On hold", visible: false },
        ],
        stageLabels: { "appointment-booked": "Booked" },
      },
    });
    expect(pref.selectedFieldIds).toEqual(["leadName", "phone"]);
    expect(pref.selectedStageIds).toEqual(["new-lead"]);
    expect(pref.stageLabels["new-lead"]).toBe("Inbox");
    expect(pref.stageLabels["appointment-booked"]).toBe("Booked");
  });

  it("applies server prefs onto the local Kanban view", () => {
    const next = applyKanbanPreferenceToView(
      fallback,
      normalizeCrmLeadKanbanPreference({
        selectedStageIds: ["new-lead"],
        stageLabels: { "new-lead": "Inbox" },
        selectedFieldIds: ["leadName", "email"],
      }),
    );
    expect(next.selectedStageIds).toEqual(["new-lead"]);
    expect(next.stageLabels?.["new-lead"]).toBe("Inbox");
    expect(next.selectedFieldIds).toEqual(["leadName", "email"]);
    expect(isEmptyLeadKanbanPreference(kanbanPreferenceFromView(next))).toBe(
      false,
    );
  });

  it("sends a whitelist-safe PUT body with stages and card fields", () => {
    const bodies = toLeadKanbanPreferenceBodies({
      selectedFieldIds: ["leadName"],
      selectedStageIds: ["new-lead"],
      stageLabels: { "new-lead": "Inbox" },
    });
    expect(bodies[0]?.selectedStageIds).toEqual(["new-lead"]);
    expect(bodies[1]?.stageLabels).toEqual({ "new-lead": "Inbox" });
    expect(bodies.at(-1)).toEqual({
      selectedFieldIds: ["leadName"],
      visibleFieldIds: ["leadName"],
      fields: ["leadName"],
    });
  });
});
