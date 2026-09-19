import { describe, expect, it } from "vitest";
import { bindKanbanStageTitle } from "@/lib/kanban/stage-titles";

const stages = [
  { id: "new-lead", label: "New Lead", required: true },
  { id: "appointment-booked", label: "Appointment Booked" },
  { id: "hold", label: "Hold" },
];

describe("bindKanbanStageTitle", () => {
  it("unhides a matching pipeline stage without inventing a new id", () => {
    const result = bindKanbanStageTitle({
      stages,
      selectedStageIds: ["new-lead"],
      stageLabels: {},
      title: "Appointment Booked",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stageId).toBe("appointment-booked");
    expect(result.selectedStageIds).toEqual(["new-lead", "appointment-booked"]);
    expect(result.stageLabels).toEqual({});
  });

  it("binds a custom title onto the first hidden stage", () => {
    const result = bindKanbanStageTitle({
      stages,
      selectedStageIds: ["new-lead"],
      stageLabels: {},
      title: "Waiting on broker",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stageId).toBe("appointment-booked");
    expect(result.stageLabels["appointment-booked"]).toBe("Waiting on broker");
  });

  it("rejects a new title when every pipeline stage is already visible", () => {
    const result = bindKanbanStageTitle({
      stages,
      selectedStageIds: stages.map((stage) => stage.id),
      stageLabels: {},
      title: "Brand new",
    });
    expect(result.ok).toBe(false);
  });
});
