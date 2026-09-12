import { describe, expect, it } from "vitest";

import {
  AUTOMATION_ACTION_KEYS,
} from "@/lib/automations/types";
import {
  actionFieldLabel,
  FIELD_META,
  splitActionConfigKeys,
  TASK_CREATING_ACTIONS,
  visibleActionConfigKeys,
} from "@/lib/automations/field-meta";
import {
  encodeActionItemsInDescription,
  parseActionItemsBlock,
  stripActionItemsBlock,
} from "@/lib/tasks/action-items";

describe("create-task action fields", () => {
  it("offers every field the task page sends to the CRM", () => {
    // toCreateTaskBody() in src/lib/tasks/api.ts builds exactly these keys.
    // Anything it sends that the step form cannot set is a field the page
    // has and the automation does not.
    const sentByTaskPage = [
      "subject",
      "taskType",
      "priority",
      "startAt",
      "dueAt",
      "reminderAt",
      "description",
      "assigneeIds",
      "collaboratorIds",
      "attachmentKeys",
      "repeatEvery",
      "recurrenceTimezone",
      "recurrenceLimit",
      "relatedType",
      "leadId",
      "contactId",
      "companyId",
      "dealId",
    ];
    const allowed = AUTOMATION_ACTION_KEYS.CREATE_TASK.allowed;
    for (const key of sentByTaskPage) {
      expect(allowed).toContain(key);
    }
  });

  it("renders every allowed key — none are hidden for a task step", () => {
    for (const action of TASK_CREATING_ACTIONS) {
      const keys = AUTOMATION_ACTION_KEYS[action];
      expect(visibleActionConfigKeys(action, keys.allowed, {})).toEqual(
        keys.allowed,
      );
    }
  });

  it("gives every task field a real widget, not a bare fallback", () => {
    for (const key of AUTOMATION_ACTION_KEYS.CREATE_TASK.allowed) {
      expect(FIELD_META[key], `${key} has no field meta`).toBeDefined();
    }
  });

  it("picks relations from a list instead of asking for a uuid", () => {
    // These were "Record UUID" text boxes. A workflow author cannot read an
    // id off the screen, so a typed id was the only way to fill them in.
    const relations = {
      leadId: "LEAD",
      contactId: "CONTACT",
      companyId: "COMPANY",
      dealId: "DEAL",
    } as const;
    for (const [key, target] of Object.entries(relations)) {
      expect(FIELD_META[key].widget).toBe("record");
      expect(FIELD_META[key].target).toBe(target);
    }
  });
});

describe("action items on a created task", () => {
  it("round-trips through the description the task page reads", () => {
    // The CRM has no actionItems column; the task page encodes them into the
    // description. A step must use the same encoding or the checklist is
    // invisible to the page that displays it.
    const encoded = encodeActionItemsInDescription("Call the client", [
      { id: "a", text: "Send deck", done: false },
      { id: "b", text: "Book follow-up", done: true },
    ]);
    expect(parseActionItemsBlock(encoded)).toEqual([
      expect.objectContaining({ text: "Send deck", done: false }),
      expect.objectContaining({ text: "Book follow-up", done: true }),
    ]);
    // The prose half stays readable on its own.
    expect(stripActionItemsBlock(encoded)).toBe("Call the client");
  });

  it("keeps the checklist when the description prose is edited", () => {
    const first = encodeActionItemsInDescription("Original", [
      { id: "a", text: "Send deck", done: false },
    ]);
    const edited = encodeActionItemsInDescription(
      "Rewritten",
      parseActionItemsBlock(first),
    );
    expect(stripActionItemsBlock(edited)).toBe("Rewritten");
    expect(parseActionItemsBlock(edited)).toHaveLength(1);
  });

  it("writes no marker block when there are no items", () => {
    const plain = encodeActionItemsInDescription("Just prose", []);
    expect(plain).toBe("Just prose");
    expect(parseActionItemsBlock(plain)).toBeUndefined();
  });
});

describe("create-lead action fields", () => {
  it("offers every field the Create Lead form sends to the CRM", () => {
    // toCrmCreateBody() in src/lib/leads/api/map.ts builds exactly these.
    const sentByLeadForm = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "mobilePhone",
      "jobTitle",
      "linkedinUrl",
      "companyName",
      "companyWebsite",
      "industry",
      "companySize",
      "source",
      "productInterest",
      "budgetRange",
      "estimatedValue",
      "notes",
      "description",
      "ownerId",
      "pipelineStage",
    ];
    for (const key of sentByLeadForm) {
      expect(AUTOMATION_ACTION_KEYS.CREATE_LEAD.allowed).toContain(key);
      expect(FIELD_META[key], `${key} has no field meta`).toBeDefined();
    }
  });

  it("leads with the fields the form asks for and keeps the rest reachable", () => {
    const visible = visibleActionConfigKeys(
      "CREATE_LEAD",
      AUTOMATION_ACTION_KEYS.CREATE_LEAD.allowed,
      {},
    );
    const { primary, more } = splitActionConfigKeys("CREATE_LEAD", visible, {});
    expect(primary).toEqual([
      "firstName",
      "lastName",
      "email",
      "phone",
      "pipelineStage",
      "tags",
      "source",
      "notes",
      "ownerId",
    ]);
    // Nothing is dropped — "more" holds the remainder, still editable.
    expect([...primary, ...more].sort()).toEqual([...visible].sort());
    expect(more.length).toBeGreaterThan(0);
  });

  it("promotes a field that already carries a value, so nothing hides data", () => {
    const visible = visibleActionConfigKeys(
      "CREATE_LEAD",
      AUTOMATION_ACTION_KEYS.CREATE_LEAD.allowed,
      { city: "Sydney" },
    );
    const { primary, more } = splitActionConfigKeys("CREATE_LEAD", visible, {
      city: "Sydney",
    });
    expect(primary).toContain("city");
    expect(more).not.toContain("city");
  });

  it("names ownerId for the form it appears on", () => {
    // FIELD_META calls it "New Owner" because ASSIGN_OWNER asked first.
    expect(FIELD_META.ownerId.label).toBe("New Owner");
    expect(actionFieldLabel("CREATE_LEAD", "ownerId")).toBe("Lead owner");
    expect(actionFieldLabel("CREATE_LEAD", "pipelineStage")).toBe("Lead Status");
    // An action with no override keeps the shared label.
    expect(actionFieldLabel("ASSIGN_OWNER", "ownerId")).toBeUndefined();
  });
});
