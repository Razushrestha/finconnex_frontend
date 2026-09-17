import { describe, expect, it } from "vitest";

import {
  offerableFieldKeys,
  unknownFieldKeys,
  updatableFields,
  UPDATABLE_FIELDS,
} from "@/lib/automations/updatable-fields";
import { AUTOMATION_FIELD_REGISTRY } from "@/lib/automations/types";

describe("updatable fields", () => {
  /**
   * Copied from MUTABLE_*_FIELDS in automation-action.service.ts. The
   * executor drops any key outside these sets silently — the step reports
   * success and nothing changes — so drift here produces a no-op the UI
   * happily lets you build.
   */
  const BACKEND_MUTABLE = {
    LEAD: ["pipelineStage", "status", "ownerId", "rating", "lifecycleStage", "score"],
    DEAL: ["stage", "ownerId", "probability", "expectedCloseDate", "lostReason"],
    CONTACT: ["status", "ownerId", "lifecycleStage", "doNotContact"],
    COMPANY: ["status", "ownerId", "industry", "size"],
  } as const;

  it("matches the executor's allowlist exactly, per entity", () => {
    for (const [entity, expected] of Object.entries(BACKEND_MUTABLE)) {
      const offered = Object.keys(
        updatableFields(entity as keyof typeof BACKEND_MUTABLE),
      ).sort();
      expect(offered, `${entity} drifted from MUTABLE_${entity}_FIELDS`).toEqual(
        [...expected].sort(),
      );
    }
  });

  it("offers no entity the executor cannot update", () => {
    // updateTriggerRecord() handles exactly these four and throws otherwise.
    expect(Object.keys(UPDATABLE_FIELDS).sort()).toEqual([
      "COMPANY",
      "CONTACT",
      "DEAL",
      "LEAD",
    ]);
    expect(updatableFields("TASK")).toEqual({});
  });

  it("is not the condition registry", () => {
    // AUTOMATION_FIELD_REGISTRY is what a filter may READ. Using it here
    // would offer id/createdAt/isConverted, none of which are writable.
    const readable = Object.keys(AUTOMATION_FIELD_REGISTRY.LEAD);
    const writable = Object.keys(updatableFields("LEAD"));
    for (const key of ["id", "createdAt", "updatedAt", "isConverted"]) {
      expect(readable).toContain(key);
      expect(writable).not.toContain(key);
    }
  });

  it("gives every enum field real options and no free text", () => {
    for (const entity of Object.keys(BACKEND_MUTABLE)) {
      for (const [key, meta] of Object.entries(
        updatableFields(entity as keyof typeof BACKEND_MUTABLE),
      )) {
        if (meta.widget !== "select") continue;
        expect(meta.options?.length, `${entity}.${key} has no options`).toBeGreaterThan(0);
        // Values are written straight to the column, so they must be the
        // enum's own spelling, not a display label.
        for (const opt of meta.options ?? []) {
          expect(opt.value).toMatch(/^[A-Z][A-Z0-9_]*$/);
        }
      }
    }
  });

  it("routes ownerId to a teammate picker on every entity that has it", () => {
    for (const entity of Object.keys(BACKEND_MUTABLE)) {
      const meta = updatableFields(entity as keyof typeof BACKEND_MUTABLE).ownerId;
      expect(meta.widget, `${entity}.ownerId`).toBe("member");
    }
  });

  it("offers a lead's pipeline stages as its Status", () => {
    const status = updatableFields("LEAD").pipelineStage;
    expect(status.label).toBe("Status");
    expect(status.options?.map((o) => o.label)).toEqual([
      "New Lead",
      "Appointment Booked",
      "Appointment Missed",
      "In Conversation",
      "Hold",
      "No Answer",
      "Waiting on Docs",
      "Document Received",
      "Findings",
      "Research & Servicing",
      "Servicing Completed",
      "Loan Proposal Presented",
      "Future Potential Clients",
      "Closed Won",
      "Closed Lost",
    ]);
  });

  it("keeps the old lead status for saved steps without offering it for new rows", () => {
    expect(offerableFieldKeys("LEAD", {})).not.toContain("status");
    expect(offerableFieldKeys("LEAD", {})[0]).toBe("pipelineStage");
    expect(offerableFieldKeys("LEAD", { status: "NEW" })).toContain("status");
    expect(unknownFieldKeys("LEAD", { status: "NEW" })).toEqual([]);
  });

  it("surfaces a saved key it cannot offer instead of dropping it", () => {
    // A step written through the API, or against an older build, must not
    // lose its configuration just by being opened.
    expect(unknownFieldKeys("LEAD", { status: "NEW", mystery: 1 })).toEqual([
      "mystery",
    ]);
    expect(unknownFieldKeys("LEAD", { status: "NEW" })).toEqual([]);
    // An entity with no list keeps everything visible.
    expect(unknownFieldKeys("TASK", { subject: "x" })).toEqual(["subject"]);
  });
});
