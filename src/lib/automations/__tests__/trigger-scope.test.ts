import { describe, expect, it } from "vitest";

import {
  CHANGED_FIELD_TRIGGERS,
  describeChangedFields,
  describeTransition,
  describeTriggerScope,
  readTriggerFilter,
  readTriggerScope,
  TRANSITION_TRIGGERS,
  TRANSITION_UNSET,
  writeTriggerFilter,
  writeTriggerScope,
} from "@/lib/automations/trigger-scope";
import type { AutomationConditionGroup } from "@/lib/automations/types";

describe("trigger scope", () => {
  it("treats a missing or empty condition group as any record", () => {
    expect(readTriggerScope(undefined)).toEqual({ mode: "ANY" });
    expect(readTriggerScope(null)).toEqual({ mode: "ANY" });
    expect(readTriggerScope({ mode: "ALL", items: [] })).toEqual({ mode: "ANY" });
  });

  it("round-trips a pinned record id", () => {
    const group = writeTriggerScope({ mode: "RECORD", recordId: "lead-1" });
    expect(group).toEqual({
      mode: "ALL",
      items: [{ field: "id", operator: "EQUALS", value: "lead-1" }],
    });
    expect(readTriggerScope(group)).toEqual({ mode: "RECORD", recordId: "lead-1" });
  });

  it("never emits an empty group", () => {
    // The backend rejects `{ items: [] }` with conditionCountExceeded, so an
    // un-narrowed trigger has to omit `conditions` entirely.
    expect(writeTriggerScope({ mode: "ANY" })).toBeUndefined();
    expect(writeTriggerScope({ mode: "RECORD", recordId: "" })).toBeUndefined();
    expect(
      writeTriggerScope({ mode: "FILTER", group: { mode: "ALL", items: [] } }),
    ).toBeUndefined();
  });

  it("preserves a group it did not write instead of discarding it", () => {
    const group: AutomationConditionGroup = {
      mode: "ANY",
      items: [
        { field: "status", operator: "EQUALS", value: "NEW" },
        { field: "score", operator: "GREATER_THAN", value: 10 },
      ],
    };
    expect(readTriggerScope(group)).toEqual({ mode: "FILTER", group });
    expect(writeTriggerScope({ mode: "FILTER", group })).toBe(group);
  });

  it("does not mistake a non-id or non-EQUALS single condition for a pinned record", () => {
    expect(
      readTriggerScope({ mode: "ALL", items: [{ field: "status", operator: "EQUALS", value: "NEW" }] }).mode,
    ).toBe("FILTER");
    expect(
      readTriggerScope({ mode: "ALL", items: [{ field: "id", operator: "NOT_EQUALS", value: "x" }] }).mode,
    ).toBe("FILTER");
    expect(
      readTriggerScope({ mode: "ALL", items: [{ field: "id", operator: "EQUALS", value: 42 }] }).mode,
    ).toBe("FILTER");
  });

  it("summarizes each scope for the canvas node", () => {
    expect(describeTriggerScope({ mode: "ANY" }, "LEAD")).toBe("Any lead");
    expect(describeTriggerScope({ mode: "RECORD", recordId: "x" }, "LEAD", "Jane Cooper")).toBe(
      "Jane Cooper",
    );
    // No resolved label: never fall back to showing the raw uuid.
    expect(describeTriggerScope({ mode: "RECORD", recordId: "x" }, "LEAD", null)).toBe(
      "One specific lead",
    );
    expect(
      describeTriggerScope(
        {
          mode: "FILTER",
          group: {
            mode: "ANY",
            items: [
              { field: "status", operator: "EQUALS", value: "NEW" },
              { field: "source", operator: "EQUALS", value: "WEB" },
            ],
          },
        },
        "DEAL",
      ),
    ).toBe("deals matching any of 2 conditions");
  });
});

describe("status transitions", () => {
  const STATUS = { from: "previousStatus", to: "status" };

  it("writes from/to as previousStatus and status conditions", () => {
    expect(
      writeTriggerFilter(
        { scope: { mode: "ANY" }, transition: { from: "NEW", to: "QUALIFIED" }, changedFields: [] },
        STATUS,
      ),
    ).toEqual({
      mode: "ALL",
      items: [
        { field: "previousStatus", operator: "EQUALS", value: "NEW" },
        { field: "status", operator: "EQUALS", value: "QUALIFIED" },
      ],
    });
  });

  it("treats each side as optional", () => {
    expect(
      writeTriggerFilter(
        { scope: { mode: "ANY" }, transition: { to: "LOST" }, changedFields: [] },
        STATUS,
      ),
    ).toEqual({ mode: "ALL", items: [{ field: "status", operator: "EQUALS", value: "LOST" }] });
    expect(
      writeTriggerFilter({ scope: { mode: "ANY" }, transition: {}, changedFields: [] }, STATUS),
    ).toBeUndefined();
  });

  it("round-trips a transition combined with a pinned record", () => {
    const filter = {
      scope: { mode: "RECORD" as const, recordId: "lead-1" },
      transition: { from: "NEW", to: "QUALIFIED" },
      changedFields: [],
    };
    expect(readTriggerFilter(writeTriggerFilter(filter, STATUS), STATUS)).toEqual(filter);
  });

  it("round-trips a transition combined with extra filters", () => {
    const filter = {
      scope: {
        mode: "FILTER" as const,
        group: {
          mode: "ALL" as const,
          items: [{ field: "score", operator: "GREATER_THAN" as const, value: 50 }],
        },
      },
      transition: { from: "NEW" },
      changedFields: [],
    };
    expect(readTriggerFilter(writeTriggerFilter(filter, STATUS), STATUS)).toEqual(filter);
  });

  it("nests an ANY filter group rather than flattening it into the outer ALL", () => {
    // Flattening would turn "from NEW AND (a OR b)" into "from NEW AND a AND b".
    const group = {
      mode: "ANY" as const,
      items: [
        { field: "status", operator: "EQUALS" as const, value: "LOST" },
        { field: "score", operator: "LESS_THAN" as const, value: 10 },
      ],
    };
    const written = writeTriggerFilter(
      { scope: { mode: "FILTER", group }, transition: { from: "NEW" }, changedFields: [] },
      STATUS,
    );
    expect(written).toEqual({
      mode: "ALL",
      items: [{ field: "previousStatus", operator: "EQUALS", value: "NEW" }, group],
    });
    expect(readTriggerFilter(written, STATUS)).toEqual({
      scope: { mode: "FILTER", group },
      transition: { from: "NEW" },
      changedFields: [],
    });
  });

  it("does not claim a status condition on a trigger with no transition stage", () => {
    // On e.g. Lead Updated, `status EQUALS NEW` is an ordinary filter and has
    // to stay one rather than silently becoming a "changed to".
    const group = {
      mode: "ALL" as const,
      items: [{ field: "status", operator: "EQUALS" as const, value: "NEW" }],
    };
    expect(readTriggerFilter(group, null)).toEqual({
      scope: { mode: "FILTER", group },
      transition: {},
      changedFields: [],
    });
    expect(readTriggerFilter(group, STATUS)).toEqual({
      scope: { mode: "ANY" },
      transition: { to: "NEW" },
      changedFields: [],
    });
  });

  it("summarizes a transition for the canvas, naming an unset side", () => {
    const options = [
      { label: "New", value: "NEW" },
      { label: "Qualified", value: "QUALIFIED" },
    ];
    const meta = { label: "Status", fields: STATUS, options };
    expect(describeTransition({ from: "NEW", to: "QUALIFIED" }, meta, options)).toBe(
      "New → Qualified",
    );
    expect(describeTransition({ to: "QUALIFIED" }, meta, options)).toBe("Any → Qualified");
    expect(describeTransition({}, meta, options)).toBeNull();
    // An unknown value still renders, rather than collapsing to "Any".
    expect(describeTransition({ from: "ARCHIVED" }, meta, options)).toBe("ARCHIVED → Any");
  });
});

describe("owner transitions", () => {
  const OWNER = { from: "previousOwnerId", to: "ownerId" };
  const filterFor = (transition: { from?: string; to?: string }) => ({
    scope: { mode: "ANY" as const },
    transition,
    changedFields: [] as string[],
  });

  it("writes owner ids against the owner fields", () => {
    expect(
      writeTriggerFilter(filterFor({ from: "user-a", to: "user-b" }), OWNER),
    ).toEqual({
      mode: "ALL",
      items: [
        { field: "previousOwnerId", operator: "EQUALS", value: "user-a" },
        { field: "ownerId", operator: "EQUALS", value: "user-b" },
      ],
    });
  });

  it("expresses an unset side as DOES_NOT_EXIST, not an equality check", () => {
    // "Unassigned → someone" is the common owner workflow, and an owner-less
    // lead has ownerId null — which EQUALS can never match against a value.
    const written = writeTriggerFilter(
      filterFor({ from: TRANSITION_UNSET, to: "user-b" }),
      OWNER,
    );
    expect(written).toEqual({
      mode: "ALL",
      items: [
        { field: "previousOwnerId", operator: "DOES_NOT_EXIST" },
        { field: "ownerId", operator: "EQUALS", value: "user-b" },
      ],
    });
    expect(readTriggerFilter(written, OWNER)).toEqual(
      filterFor({ from: TRANSITION_UNSET, to: "user-b" }),
    );
  });

  it("round-trips 'assigned to nobody' on the to side", () => {
    const filter = filterFor({ from: "user-a", to: TRANSITION_UNSET });
    expect(readTriggerFilter(writeTriggerFilter(filter, OWNER), OWNER)).toEqual(filter);
  });

  it("never reads a DOES_NOT_EXIST id condition as a pinned record", () => {
    // `id DOES_NOT_EXIST` is nonsense as a record pin; it must fall through to
    // the filter scope rather than pinning the literal sentinel as an id.
    const group = {
      mode: "ALL" as const,
      items: [{ field: "id", operator: "DOES_NOT_EXIST" as const }],
    };
    expect(readTriggerFilter(group, OWNER)).toEqual({
      scope: { mode: "FILTER", group },
      transition: {},
      changedFields: [],
    });
  });

  it("labels an unset side with the field's own wording", () => {
    const options = [{ label: "Priya", value: "user-b" }];
    const meta = {
      label: "Owner",
      fields: OWNER,
      source: "owners" as const,
      unsetLabel: "Unassigned",
    };
    expect(describeTransition({ from: TRANSITION_UNSET, to: "user-b" }, meta, options)).toBe(
      "Unassigned → Priya",
    );
  });
});

describe("one-sided transitions (Lead Assigned)", () => {
  const ASSIGNED = { to: "ownerId" };
  const meta = {
    label: "Owner",
    fields: ASSIGNED,
    source: "owners" as const,
    toLabel: "Assigned to",
  };

  it("writes only the to side", () => {
    expect(
      writeTriggerFilter(
        { scope: { mode: "ANY" }, transition: { to: "user-b" }, changedFields: [] },
        ASSIGNED,
      ),
    ).toEqual({ mode: "ALL", items: [{ field: "ownerId", operator: "EQUALS", value: "user-b" }] });
  });

  it("ignores a from value it has no field to write to", () => {
    // Guards against a stale `from` left over from switching triggers
    // silently landing as a condition on some unrelated field.
    expect(
      writeTriggerFilter(
        {
          scope: { mode: "ANY" },
          transition: { from: "user-a", to: "user-b" },
          changedFields: [],
        },
        ASSIGNED,
      ),
    ).toEqual({ mode: "ALL", items: [{ field: "ownerId", operator: "EQUALS", value: "user-b" }] });
  });

  it("round-trips alongside a pinned record", () => {
    const filter = {
      scope: { mode: "RECORD" as const, recordId: "lead-1" },
      transition: { to: "user-b" },
      changedFields: [],
    };
    expect(readTriggerFilter(writeTriggerFilter(filter, ASSIGNED), ASSIGNED)).toEqual(filter);
  });

  it("captions without an arrow, which would imply a change that did not happen", () => {
    const options = [{ label: "Priya", value: "user-b" }];
    expect(describeTransition({ to: "user-b" }, meta, options)).toBe("Owner: Priya");
    expect(describeTransition({}, meta, options)).toBeNull();
  });
});

describe("changed-field selection (Lead Field Changed)", () => {
  const base = (fields: string[]) => ({
    scope: { mode: "ANY" as const },
    transition: {},
    changedFields: fields,
  });

  it("writes a single field as one CONTAINS check", () => {
    expect(writeTriggerFilter(base(["email"]))).toEqual({
      mode: "ALL",
      items: [{ field: "changedFields", operator: "CONTAINS", value: "email" }],
    });
  });

  it("writes several fields as ANY, not ALL", () => {
    // An update writes a set of columns; requiring all of them to appear
    // together would almost never match.
    expect(writeTriggerFilter(base(["email", "phone"]))).toEqual({
      mode: "ANY",
      items: [
        { field: "changedFields", operator: "CONTAINS", value: "email" },
        { field: "changedFields", operator: "CONTAINS", value: "phone" },
      ],
    });
  });

  it("round-trips both shapes", () => {
    for (const fields of [["email"], ["email", "phone", "city"]]) {
      expect(readTriggerFilter(writeTriggerFilter(base(fields)))).toEqual(base(fields));
    }
  });

  it("round-trips fields combined with a pinned record", () => {
    const filter = {
      scope: { mode: "RECORD" as const, recordId: "lead-1" },
      transition: {},
      changedFields: ["email", "phone"],
    };
    expect(readTriggerFilter(writeTriggerFilter(filter))).toEqual(filter);
  });

  it("selecting nothing writes no condition at all", () => {
    expect(writeTriggerFilter(base([]))).toBeUndefined();
  });

  it("leaves a mixed ANY group alone rather than reading it as a field list", () => {
    // Only a group of *nothing but* changed-field checks is a field list.
    const group = {
      mode: "ANY" as const,
      items: [
        { field: "changedFields", operator: "CONTAINS" as const, value: "email" },
        { field: "status", operator: "EQUALS" as const, value: "NEW" },
      ],
    };
    expect(readTriggerFilter(group)).toEqual({
      scope: { mode: "FILTER", group },
      transition: {},
      changedFields: [],
    });
  });

  it("summarizes the selection for the canvas", () => {
    const meta = {
      groups: [
        {
          fields: [
            { label: "Email", value: "email" },
            { label: "Phone", value: "phone" },
            { label: "City", value: "city" },
          ],
        },
      ],
    };
    expect(describeChangedFields([], meta)).toBeNull();
    expect(describeChangedFields(["email"], meta)).toBe("Email");
    expect(describeChangedFields(["email", "phone"], meta)).toBe("Email or Phone");
    expect(describeChangedFields(["email", "phone", "city"], meta)).toBe("3 fields");
  });
});

describe("the changed-field catalogs", () => {
  const valuesFor = (trigger: keyof typeof CHANGED_FIELD_TRIGGERS) =>
    CHANGED_FIELD_TRIGGERS[trigger]!.groups.flatMap((group) =>
      group.fields.map((field) => field.value),
    );

  /**
   * A field only belongs in a catalog if changing it actually raises that
   * trigger. The audit bridge excludes a different set per entity, and
   * offering an excluded field builds a workflow that reads correctly and
   * never fires.
   */
  it.each([
    // automation-audit-bridge.service.ts, Lead case
    ["LEAD_FIELD_CHANGED" as const, ["status", "ownerId"]],
    // ...and its Contact case, which excludes only these two — `status`
    // does raise CONTACT_FIELD_CHANGED and is offered.
    ["CONTACT_FIELD_CHANGED" as const, ["ownerId", "companyId"]],
  ])("%s omits the fields its own trigger excludes", (trigger, excluded) => {
    const fields = valuesFor(trigger);
    for (const field of excluded) expect(fields).not.toContain(field);
    expect(fields.length).toBeGreaterThan(0);
    expect(new Set(fields).size).toBe(fields.length);
  });

  it("offers status on contacts but not on leads", () => {
    // The asymmetry is real, not an oversight: the bridge excludes `status`
    // from the lead trigger and not from the contact one.
    expect(valuesFor("CONTACT_FIELD_CHANGED")).toContain("status");
    expect(valuesFor("LEAD_FIELD_CHANGED")).not.toContain("status");
  });
});

describe("the trigger transition catalog", () => {
  const LEAD_STATUSES = [
    "NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "CONVERTED",
    "OPEN", "IN_PROGRESS", "NURTURE", "LOST",
  ];
  const LEAD_SOURCES = [
    "WEBSITE", "REFERRAL", "COLD_CALL", "SOCIAL_MEDIA", "EMAIL_CAMPAIGN",
    "PAID_AD", "EVENT", "PARTNER", "OTHER",
  ];

  it("offers every LeadStatus and LeadSource value, and nothing invented", () => {
    // Enum parity with prisma/schema.prisma: a value the schema does not have
    // is a condition the backend rejects; a missing one is a workflow the
    // user cannot build.
    expect(
      TRANSITION_TRIGGERS.LEAD_STATUS_CHANGED!.options!.map((o) => o.value),
    ).toEqual(LEAD_STATUSES);
    expect(
      TRANSITION_TRIGGERS.LEAD_SOURCE_CHANGED!.options!.map((o) => o.value),
    ).toEqual(LEAD_SOURCES);
  });

  it("names a previous* field on every two-sided transition", () => {
    // The `from` side is only answerable for fields the repository captures
    // into its audit entry — anything else silently never matches.
    const captured = new Set(["previousStatus", "previousOwnerId", "previousSource"]);
    for (const [trigger, meta] of Object.entries(TRANSITION_TRIGGERS)) {
      if (!meta?.fields.from) continue;
      expect(captured.has(meta.fields.from), `${trigger} reads ${meta.fields.from}`).toBe(true);
    }
  });

  it("round-trips a source transition, including from no source", () => {
    const SOURCE = TRANSITION_TRIGGERS.LEAD_SOURCE_CHANGED!.fields;
    const filter = {
      scope: { mode: "ANY" as const },
      transition: { from: TRANSITION_UNSET, to: "REFERRAL" },
      changedFields: [],
    };
    const written = writeTriggerFilter(filter, SOURCE);
    expect(written).toEqual({
      mode: "ALL",
      items: [
        { field: "previousSource", operator: "DOES_NOT_EXIST" },
        { field: "source", operator: "EQUALS", value: "REFERRAL" },
      ],
    });
    expect(readTriggerFilter(written, SOURCE)).toEqual(filter);
  });
});
