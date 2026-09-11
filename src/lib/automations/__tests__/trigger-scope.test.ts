import { describe, expect, it } from "vitest";

import {
  CHANGED_FIELD_TRIGGERS,
  describeChangedFields,
  describeTransition,
  describeTriggerScope,
  readTriggerFilter,
  readTriggerScope,
  RELATED_RECORD_TRIGGERS,
  showsConditionBuilder,
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

  it("round-trips a hand-picked set of records as an IN_LIST", () => {
    const group = writeTriggerScope({
      mode: "RECORDS",
      recordIds: ["meet-1", "meet-2"],
    });
    expect(group).toEqual({
      mode: "ALL",
      items: [{ field: "id", operator: "IN_LIST", value: ["meet-1", "meet-2"] }],
    });
    expect(readTriggerScope(group)).toEqual({
      mode: "RECORDS",
      recordIds: ["meet-1", "meet-2"],
    });
  });

  it("writes a one-record set as EQUALS and reads it back as a single pin", () => {
    // IN_LIST of one is the same predicate written the long way, and the
    // panel re-widens a single pin back to a set where the entity needs it.
    const group = writeTriggerScope({ mode: "RECORDS", recordIds: ["meet-1"] });
    expect(group).toEqual({
      mode: "ALL",
      items: [{ field: "id", operator: "EQUALS", value: "meet-1" }],
    });
    expect(readTriggerScope(group)).toEqual({ mode: "RECORD", recordId: "meet-1" });
  });

  it("caps a pinned set at the operator's 50-value limit", () => {
    const ids = Array.from({ length: 60 }, (_, i) => `meet-${i}`);
    const group = writeTriggerScope({ mode: "RECORDS", recordIds: ids });
    const leaf = group?.items[0] as { value: string[] };
    expect(leaf.value).toHaveLength(50);
  });

  it("never emits an empty group", () => {
    expect(writeTriggerScope({ mode: "RECORDS", recordIds: [] })).toBeUndefined();
    expect(writeTriggerScope({ mode: "RECORDS", recordIds: [""] })).toBeUndefined();
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
      describeTriggerScope({ mode: "RECORDS", recordIds: ["a", "b", "c"] }, "MEETING"),
    ).toBe("3 selected meetings");
    expect(
      describeTriggerScope({ mode: "RECORDS", recordIds: ["a"] }, "MEETING", "Q3 kickoff"),
    ).toBe("Q3 kickoff");
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
        { scope: { mode: "ANY" }, transition: { from: "NEW", to: "QUALIFIED" }, changedFields: [], related: {} },
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
        { scope: { mode: "ANY" }, transition: { to: "LOST" }, changedFields: [], related: {} },
        STATUS,
      ),
    ).toEqual({ mode: "ALL", items: [{ field: "status", operator: "EQUALS", value: "LOST" }] });
    expect(
      writeTriggerFilter({ scope: { mode: "ANY" }, transition: {}, changedFields: [], related: {} }, STATUS),
    ).toBeUndefined();
  });

  it("round-trips a transition combined with a pinned record", () => {
    const filter = {
      scope: { mode: "RECORD" as const, recordId: "lead-1" },
      transition: { from: "NEW", to: "QUALIFIED" },
      changedFields: [],
      related: {},
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
      related: {},
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
      { scope: { mode: "FILTER", group }, transition: { from: "NEW" }, changedFields: [], related: {} },
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
      related: {},
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
      related: {},
    });
    expect(readTriggerFilter(group, STATUS)).toEqual({
      scope: { mode: "ANY" },
      transition: { to: "NEW" },
      changedFields: [],
      related: {},
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
    related: {},
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
      related: {},
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
        { scope: { mode: "ANY" }, transition: { to: "user-b" }, changedFields: [], related: {} },
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
          related: {},
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
      related: {},
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
    related: {},
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
      related: {},
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
      related: {},
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
    // ...and its Deal case, which excludes neither `companyId` nor `source`.
    ["DEAL_FIELD_CHANGED" as const, ["stage", "ownerId"]],
    // Tasks have no bridge exclusions, but a status change records
    // `{ from, to }` and no field list, so `status` can never appear.
    ["TASK_UPDATED" as const, ["status"]],
    // Company excludes ownerId; `version` is the optimistic-lock counter,
    // bumped on every write, so offering it would match every update.
    ["ORGANIZATION_FIELD_CHANGED" as const, ["ownerId", "version"]],
  ])("%s omits the fields its own trigger excludes", (trigger, excluded) => {
    const fields = valuesFor(trigger);
    for (const field of excluded) expect(fields).not.toContain(field);
    expect(fields.length).toBeGreaterThan(0);
    expect(new Set(fields).size).toBe(fields.length);
  });

  it("offers exactly the UpdateTaskDto keys for tasks", () => {
    // TaskService records `Object.keys(dto).sort()`, so these are request
    // fields rather than Prisma columns — a column name here would never
    // match. Mirrors src/modules/task/dtos/create-task.dto.ts.
    expect(valuesFor("TASK_UPDATED").sort()).toEqual(
      [
        "subject", "taskType", "priority", "startDate", "dueDate",
        "reminderAt", "repeatEvery", "recurrenceTimezone", "recurrenceLimit",
        "isPublic", "isBillable", "description", "relatedType", "leadId",
        "contactId", "companyId", "dealId", "assigneeIds", "followerIds",
        "collaboratorIds", "tags", "attachmentKeys",
      ].sort(),
    );
  });

  it("offers companyId on deals but not on contacts", () => {
    // Another real asymmetry: changing a deal's account raises
    // DEAL_FIELD_CHANGED, while changing a contact's company raises the
    // association triggers instead.
    expect(valuesFor("DEAL_FIELD_CHANGED")).toContain("companyId");
    expect(valuesFor("CONTACT_FIELD_CHANGED")).not.toContain("companyId");
  });

  it("omits derived columns a user never edits", () => {
    // weightedValue is computed from value x probability; picking it would
    // mean "fired because the system recalculated", not a user edit.
    expect(valuesFor("DEAL_FIELD_CHANGED")).not.toContain("weightedValue");
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

  const DEAL_STAGES = [
    "PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION",
    "CONTRACT_SENT", "CLOSED_WON", "CLOSED_LOST",
  ];

  it.each(["DEAL_UPDATED", "DEAL_STAGE_CHANGED"] as const)(
    "%s offers every DealStage value, and nothing invented",
    (trigger) => {
      expect(TRANSITION_TRIGGERS[trigger]!.options!.map((o) => o.value)).toEqual(
        DEAL_STAGES,
      );
    },
  );

  it("gives every owner-changed trigger the identical transition", () => {
    // Lead, Organization and Deal all capture ownerId into the same
    // previousOwnerId snapshot field, so the three must not drift.
    const owner = TRANSITION_TRIGGERS.LEAD_OWNER_CHANGED;
    expect(TRANSITION_TRIGGERS.ORGANIZATION_OWNER_CHANGED).toBe(owner);
    expect(TRANSITION_TRIGGERS.DEAL_OWNER_CHANGED).toBe(owner);
    expect(owner!.unsetLabel).toBe("Unassigned");
    expect(owner!.source).toBe("owners");
  });

  it("gives both deal triggers the identical transition", () => {
    // They fire on the same change; a workflow buildable on one must be
    // buildable on the other.
    expect(TRANSITION_TRIGGERS.DEAL_STAGE_CHANGED).toBe(
      TRANSITION_TRIGGERS.DEAL_UPDATED,
    );
  });

  it("offers no unset option for a non-nullable field", () => {
    // Deal.stage is NOT NULL, so a "no stage" side would be unmatchable.
    expect(TRANSITION_TRIGGERS.DEAL_UPDATED!.unsetLabel).toBeUndefined();
    expect(TRANSITION_TRIGGERS.DEAL_STAGE_CHANGED!.unsetLabel).toBeUndefined();
    // ...while the nullable ones do offer it.
    expect(TRANSITION_TRIGGERS.LEAD_SOURCE_CHANGED!.unsetLabel).toBeDefined();
    expect(TRANSITION_TRIGGERS.LEAD_OWNER_CHANGED!.unsetLabel).toBeDefined();
  });

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
    // LeadRepository.update and DealRepository.update are the two that
    // capture a `previous` block today.
    const captured = new Set([
      "previousStatus",
      "previousOwnerId",
      "previousSource",
      "previousStage",
    ]);
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
      related: {},
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

describe("triggers that deliberately have no second stage", () => {
  /**
   * These fire on a discrete event, not on a field edit. The audit bridge
   * raises each from a specific status or a create — MEETING_CANCELLED is
   * "status became CANCELLED", CALL_MISSED is "status became NO_ANSWER",
   * EMAIL_BOUNCED is "status became BOUNCED". There is no "from -> to" to
   * choose (the destination is the trigger's identity) and no "which field"
   * (the event names it).
   *
   * They may still carry a related-record pin — CALL_CREATED does, for the
   * contact the call is about — which is a separate question from either of
   * these and is asserted below.
   *
   * Pinned so a later pass does not add a field list that reads plausibly and
   * matches nothing.
   */
  const EVENT_TRIGGERS = [
    "MEETING_BOOKED",
    "MEETING_RESCHEDULED",
    "MEETING_CANCELLED",
    "MEETING_COMPLETED",
    "MEETING_NO_SHOW",
    "CALL_CREATED",
    "CALL_COMPLETED",
    "CALL_MISSED",
    "MESSAGE_RECEIVED",
    "MESSAGE_FAILED",
    "SMS_REPLIED",
    "WHATSAPP_REPLIED",
    "EMAIL_SENT",
    "EMAIL_FAILED",
    "EMAIL_REPLIED",
    "EMAIL_BOUNCED",
    "DOCUMENT_UPLOADED",
    "DOCUMENT_REQUEST_SUBMITTED",
    "DOCUMENT_REQUEST_COMPLETED",
    "SIGNATURE_REQUEST_COMPLETED",
    "TASK_COMPLETED",
    "TASK_CANCELLED",
    "LEAD_CREATED",
    "CONTACT_CREATED",
    "COMPANY_CREATED",
    "DEAL_CREATED",
  ] as const;

  it.each(EVENT_TRIGGERS)("%s offers neither a transition nor a field list", (trigger) => {
    expect(TRANSITION_TRIGGERS[trigger]).toBeUndefined();
    expect(CHANGED_FIELD_TRIGGERS[trigger]).toBeUndefined();
  });

  it("allows a related-record pin only where the entity links a counterparty", () => {
    // Calls, messages and emails all carry a linkable contact, so an event
    // trigger on them can still be narrowed to who it was with.
    for (const trigger of [
      "CALL_CREATED",
      "MESSAGE_RECEIVED",
      "SMS_REPLIED",
      "WHATSAPP_REPLIED",
      "MESSAGE_FAILED",
      "EMAIL_SENT",
      "EMAIL_FAILED",
      "EMAIL_BOUNCED",
      "EMAIL_REPLIED",
    ] as const) {
      expect(RELATED_RECORD_TRIGGERS[trigger]).toBeDefined();
    }
    // Documents and signatures link no contact, so they offer none.
    expect(RELATED_RECORD_TRIGGERS.DOCUMENT_UPLOADED).toBeUndefined();
    expect(RELATED_RECORD_TRIGGERS.SIGNATURE_REQUEST_COMPLETED).toBeUndefined();
  });

  it("points each pin at a field its own entity actually has", () => {
    // An inbound message's sender is `contactId`; an outbound one's recipient
    // is `toContactId` / `toUserId`. Getting these backwards produces a
    // filter that reads correctly and never matches.
    expect(RELATED_RECORD_TRIGGERS.MESSAGE_RECEIVED![0].field).toBe("contactId");
    expect(RELATED_RECORD_TRIGGERS.MESSAGE_FAILED!.map((e) => e.field)).toEqual([
      "toContactId",
      "toUserId",
    ]);
    expect(RELATED_RECORD_TRIGGERS.EMAIL_SENT![0].field).toBe("contactId");
  });

  it("offers teammates as a pickable target for internal messages", () => {
    const teammate = RELATED_RECORD_TRIGGERS.MESSAGE_FAILED!.find(
      (entry) => entry.entityType === "USER",
    );
    expect(teammate?.field).toBe("toUserId");
  });
});

describe("related-record pins (Call Scheduled)", () => {
  const CALL_RELATED = ["contactId"];
  const base = (related: Record<string, string[]>) => ({
    scope: { mode: "ANY" as const },
    transition: {},
    changedFields: [],
    related,
  });

  it("writes the pin as a condition on the call's own contact field", () => {
    expect(writeTriggerFilter(base({ contactId: ["contact-1"] }))).toEqual({
      mode: "ALL",
      items: [{ field: "contactId", operator: "EQUALS", value: "contact-1" }],
    });
  });

  it("round-trips only when the trigger declares that related field", () => {
    const written = writeTriggerFilter(base({ contactId: ["contact-1"] }));
    expect(readTriggerFilter(written, null, CALL_RELATED)).toEqual(
      base({ contactId: ["contact-1"] }),
    );
    // A trigger with no related fields must not claim the condition — it
    // stays an ordinary filter rather than silently becoming a pin.
    expect(readTriggerFilter(written, null, []).scope.mode).toBe("FILTER");
  });

  it("treats an empty pin as no condition at all", () => {
    expect(writeTriggerFilter(base({ contactId: [] }))).toBeUndefined();
  });

  it("is distinct from a RECORD scope, which pins the call itself", () => {
    // Pinning the call and pinning its contact are different questions; both
    // must survive together.
    const filter = {
      scope: { mode: "RECORD" as const, recordId: "call-1" },
      transition: {},
      changedFields: [],
      related: { contactId: ["contact-1"] },
    };
    const written = writeTriggerFilter(filter);
    expect(written).toEqual({
      mode: "ALL",
      items: [
        { field: "contactId", operator: "EQUALS", value: "contact-1" },
        { field: "id", operator: "EQUALS", value: "call-1" },
      ],
    });
    expect(readTriggerFilter(written, null, CALL_RELATED)).toEqual(filter);
  });

  it("declares Call Scheduled's contact pin", () => {
    expect(RELATED_RECORD_TRIGGERS.CALL_CREATED).toEqual([
      { label: "Contact", field: "contactId", entityType: "CONTACT" },
    ]);
  });
});

describe("the condition builder's visibility", () => {
  const ANY = { mode: "ANY" as const };
  const FILTER = {
    mode: "FILTER" as const,
    group: {
      mode: "ALL" as const,
      items: [{ field: "status", operator: "EQUALS" as const, value: "SCHEDULED" }],
    },
  };

  it("is hidden on calls, where the related-record stage asks the real question", () => {
    expect(showsConditionBuilder("CALL", ANY)).toBe(false);
  });

  it("still shows for a call that already has a saved group", () => {
    // Suppression is display-only: hiding the control on a workflow that
    // already uses it would strand a filter the user cannot see or edit.
    expect(showsConditionBuilder("CALL", FILTER)).toBe(true);
  });

  it("is unaffected for every other entity", () => {
    for (const entity of ["LEAD", "CONTACT", "COMPANY", "DEAL", "TASK"] as const) {
      expect(showsConditionBuilder(entity, ANY)).toBe(true);
    }
  });
});

describe("selecting several related records", () => {
  const CALL_RELATED = ["contactId"];
  const base = (related: Record<string, string[]>) => ({
    scope: { mode: "ANY" as const },
    transition: {},
    changedFields: [],
    related,
  });

  it("writes several ids as IN_LIST, which the engine reads as 'any of these'", () => {
    expect(writeTriggerFilter(base({ contactId: ["a", "b", "c"] }))).toEqual({
      mode: "ALL",
      items: [{ field: "contactId", operator: "IN_LIST", value: ["a", "b", "c"] }],
    });
  });

  it("still writes a single id as EQUALS", () => {
    // IN_LIST of one would work, but EQUALS is what the rest of the builder
    // emits and what a reader expects to see.
    expect(writeTriggerFilter(base({ contactId: ["a"] }))).toEqual({
      mode: "ALL",
      items: [{ field: "contactId", operator: "EQUALS", value: "a" }],
    });
  });

  it("round-trips both shapes", () => {
    for (const ids of [["a"], ["a", "b"]]) {
      const filter = base({ contactId: ids });
      expect(readTriggerFilter(writeTriggerFilter(filter), null, CALL_RELATED)).toEqual(
        filter,
      );
    }
  });

  it("writes nothing when the selection is empty", () => {
    // "Selected calls" with nothing picked must not save a condition that
    // matches every call — the panel blocks it, and this is the backstop.
    expect(writeTriggerFilter(base({ contactId: [] }))).toBeUndefined();
  });

  it("ignores an IN_LIST holding anything but ids", () => {
    const group = {
      mode: "ALL" as const,
      items: [
        { field: "contactId", operator: "IN_LIST" as const, value: ["a", 42] },
      ],
    };
    // Not recognisable as a pin, so it survives as an ordinary filter rather
    // than being silently rewritten.
    expect(readTriggerFilter(group, null, CALL_RELATED).related).toEqual({});
    expect(readTriggerFilter(group, null, CALL_RELATED).scope.mode).toBe("FILTER");
  });
});
