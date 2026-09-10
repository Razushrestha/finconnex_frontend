/**
 * "Which records does this trigger fire for?" — the model behind the trigger
 * config panel.
 *
 * The backend has no per-trigger record filter of its own: `triggerConfig` is
 * rejected outright for every non-temporal trigger
 * (`automation.error.triggerConfigNotAllowed` in
 * automation-definition.service.ts). Narrowing a trigger to one record, or to
 * a set of records, is expressed as the definition's top-level `conditions`
 * group, which the planner and the engine both evaluate against the trigger
 * record's snapshot before any step runs.
 *
 * `id` is a registered condition field for LEAD / CONTACT / COMPANY / DEAL /
 * TASK (AUTOMATION_FIELD_REGISTRY), so "this one lead" is exactly
 * `id EQUALS <uuid>` — no new backend surface needed.
 */
import type {
  AutomationCondition,
  AutomationConditionGroup,
  AutomationEntityType,
  AutomationTriggerType,
} from "@/lib/automations/types";

export type TriggerScope =
  /** Every record of the trigger's entity type. */
  | { mode: "ANY" }
  /** Exactly one record, pinned by id. */
  | { mode: "RECORD"; recordId: string }
  /** Any record matching a field-condition group. */
  | { mode: "FILTER"; group: AutomationConditionGroup };

export const EMPTY_CONDITION_GROUP: AutomationConditionGroup = {
  mode: "ALL",
  items: [],
};

function isLeaf(
  item: AutomationCondition | AutomationConditionGroup,
): item is AutomationCondition {
  return "field" in item;
}

/**
 * One side of a transition: a field value, `TRANSITION_UNSET` for "had no
 * value", or undefined for "anything".
 */
export const TRANSITION_UNSET = "__unset__";

/**
 * A transition — "changed from NEW to QUALIFIED", "changed from Unassigned
 * to Priya".
 *
 * `from` reads a `previous*` field, which exists only on trigger events
 * raised by an update: the repository captures the row's prior scalars into
 * the audit entry and the automation bridge surfaces them on the snapshot.
 * Either side may be omitted, meaning "from anything" / "to anything".
 */
export type TriggerTransition = { from?: string; to?: string };

/**
 * Which snapshot fields the sides of a transition read.
 *
 * `from` is optional: a trigger like "Lead Assigned" only asks who it went
 * to, and offering a From select there would invite a filter that reads as
 * "assigned away from X" — which is what Owner Changed is for.
 */
export type TransitionFields = { from?: string; to: string };

/** Everything the trigger panel edits, as one round-trippable value. */
export type TriggerFilter = {
  scope: TriggerScope;
  transition: TriggerTransition;
  /** Column names, for a "field changed" trigger. Empty means any field. */
  changedFields: string[];
};

const CHANGED_FIELDS = "changedFields";

/** `changedFields CONTAINS "<column>"` — the shape a field selection writes. */
function changedFieldLeaf(field: string): AutomationCondition {
  return { field: CHANGED_FIELDS, operator: "CONTAINS", value: field };
}

function changedFieldValue(
  item: AutomationCondition | AutomationConditionGroup,
): string | null {
  if (!isLeaf(item)) return null;
  if (item.field !== CHANGED_FIELDS || item.operator !== "CONTAINS") return null;
  return typeof item.value === "string" && item.value ? item.value : null;
}

/** An ANY group of nothing but changed-field checks — "any of these fields". */
function changedFieldGroup(
  item: AutomationCondition | AutomationConditionGroup,
): string[] | null {
  if (isLeaf(item) || item.mode !== "ANY" || item.items.length === 0) return null;
  const fields = item.items.map(changedFieldValue);
  return fields.every((field): field is string => field !== null) ? fields : null;
}

function transitionLeaf(field: string, value: string): AutomationCondition {
  return value === TRANSITION_UNSET
    ? { field, operator: "DOES_NOT_EXIST" }
    : { field, operator: "EQUALS", value };
}

/** Reads a transition side back off a condition leaf on `field`, or null. */
function transitionValue(
  item: AutomationCondition | AutomationConditionGroup,
  field: string,
): string | null {
  if (!isLeaf(item) || item.field !== field) return null;
  if (item.operator === "DOES_NOT_EXIST") return TRANSITION_UNSET;
  if (item.operator !== "EQUALS") return null;
  return typeof item.value === "string" && item.value ? item.value : null;
}

/**
 * Split a saved condition group back into the panel's controls.
 *
 * `fields` names the transition's two snapshot fields, and gates whether they
 * are claimed by the from/to selects at all — on a trigger with no transition
 * stage, a `status` condition is an ordinary filter and must stay one.
 *
 * Anything not recognised round-trips through the FILTER scope, so a group
 * written by a template or by hand is preserved rather than silently dropped.
 */
export function readTriggerFilter(
  conditions: AutomationConditionGroup | null | undefined,
  fields: TransitionFields | null = null,
): TriggerFilter {
  if (!conditions || !Array.isArray(conditions.items) || conditions.items.length === 0) {
    return { scope: { mode: "ANY" }, transition: {}, changedFields: [] };
  }
  // An ANY group is a single indivisible predicate — pulling leaves out of it
  // would change what it means. The exception is a group that is *only*
  // changed-field checks, which is how a multi-field selection is written.
  if (conditions.mode !== "ALL") {
    const only = changedFieldGroup(conditions);
    if (only) return { scope: { mode: "ANY" }, transition: {}, changedFields: only };
    return { scope: { mode: "FILTER", group: conditions }, transition: {}, changedFields: [] };
  }

  const transition: TriggerTransition = {};
  const changedFields: string[] = [];
  let recordId: string | null = null;
  const rest: Array<AutomationCondition | AutomationConditionGroup> = [];

  for (const item of conditions.items) {
    if (fields?.from && !transition.from) {
      const from = transitionValue(item, fields.from);
      if (from) {
        transition.from = from;
        continue;
      }
    }
    if (fields && !transition.to) {
      const to = transitionValue(item, fields.to);
      if (to) {
        transition.to = to;
        continue;
      }
    }
    if (changedFields.length === 0) {
      const group = changedFieldGroup(item);
      if (group) {
        changedFields.push(...group);
        continue;
      }
      const single = changedFieldValue(item);
      if (single) {
        changedFields.push(single);
        continue;
      }
    }
    if (!recordId) {
      const id = transitionValue(item, "id");
      if (id && id !== TRANSITION_UNSET) {
        recordId = id;
        continue;
      }
    }
    rest.push(item);
  }

  if (rest.length === 0) {
    return {
      scope: recordId ? { mode: "RECORD", recordId } : { mode: "ANY" },
      transition,
      changedFields,
    };
  }
  // A lone nested group is the FILTER scope exactly as it was written.
  if (rest.length === 1 && !isLeaf(rest[0]) && !recordId) {
    return { scope: { mode: "FILTER", group: rest[0] }, transition, changedFields };
  }
  return {
    scope: { mode: "FILTER", group: { mode: "ALL", items: rest } },
    transition,
    changedFields,
  };
}

/**
 * Back to the wire shape. Returns `undefined` — never an empty group — when
 * nothing is set: the backend rejects `{ items: [] }` outright
 * (`automation.error.conditionCountExceeded`), and an unfiltered trigger is
 * expressed by omitting `conditions` entirely.
 */
export function writeTriggerFilter(
  filter: TriggerFilter,
  fields: TransitionFields | null = null,
): AutomationConditionGroup | undefined {
  const items: Array<AutomationCondition | AutomationConditionGroup> = [];
  if (fields) {
    if (fields.from && filter.transition.from) {
      items.push(transitionLeaf(fields.from, filter.transition.from));
    }
    if (filter.transition.to) items.push(transitionLeaf(fields.to, filter.transition.to));
  }

  // One field is a plain check; several are an ANY group, since a record's
  // update touches a set of columns and matching *all* of them would almost
  // never fire.
  if (filter.changedFields.length === 1) {
    items.push(changedFieldLeaf(filter.changedFields[0]));
  } else if (filter.changedFields.length > 1) {
    items.push({ mode: "ANY", items: filter.changedFields.map(changedFieldLeaf) });
  }

  const { scope } = filter;
  if (scope.mode === "RECORD" && scope.recordId) {
    items.push({ field: "id", operator: "EQUALS", value: scope.recordId });
  } else if (scope.mode === "FILTER" && scope.group.items.length > 0) {
    // Flatten an ALL group into the outer ALL; anything else has to nest to
    // keep its own mode.
    if (scope.group.mode === "ALL") items.push(...scope.group.items);
    else items.push(scope.group);
  }

  if (items.length === 0) return undefined;
  // Don't wrap a single nested group in a pointless second layer.
  if (items.length === 1 && !isLeaf(items[0])) return items[0];
  return { mode: "ALL", items };
}

/** Scope alone, for callers with no transition to think about. */
export function readTriggerScope(
  conditions: AutomationConditionGroup | null | undefined,
): TriggerScope {
  return readTriggerFilter(conditions).scope;
}

export function writeTriggerScope(
  scope: TriggerScope,
): AutomationConditionGroup | undefined {
  return writeTriggerFilter({ scope, transition: {}, changedFields: [] });
}

const ENTITY_NOUN: Record<AutomationEntityType, { one: string; many: string }> = {
  LEAD: { one: "lead", many: "leads" },
  CONTACT: { one: "contact", many: "contacts" },
  COMPANY: { one: "organization", many: "organizations" },
  DEAL: { one: "deal", many: "deals" },
  TASK: { one: "task", many: "tasks" },
  CALL: { one: "call", many: "calls" },
  MESSAGE: { one: "message", many: "messages" },
  EMAIL: { one: "email", many: "emails" },
  MEETING: { one: "meeting", many: "meetings" },
  DOCUMENT: { one: "document", many: "documents" },
  DOCUMENT_REQUEST: { one: "document request", many: "document requests" },
  SIGNATURE_REQUEST: { one: "signature request", many: "signature requests" },
  REMINDER: { one: "reminder", many: "reminders" },
  NOTE: { one: "note", many: "notes" },
  NOTIFICATION: { one: "notification", many: "notifications" },
};

export function entityNoun(entityType: AutomationEntityType): { one: string; many: string } {
  return ENTITY_NOUN[entityType] ?? { one: "record", many: "records" };
}

/** One-line summary for the canvas node and the panel header. */
export function describeTriggerScope(
  scope: TriggerScope,
  entityType: AutomationEntityType,
  recordLabel?: string | null,
): string {
  const noun = entityNoun(entityType);
  if (scope.mode === "ANY") return `Any ${noun.one}`;
  if (scope.mode === "RECORD") return recordLabel?.trim() || `One specific ${noun.one}`;
  const count = scope.group.items.length;
  const joiner = scope.group.mode === "ALL" ? "all" : "any";
  return count === 1
    ? `${noun.many} matching 1 condition`
    : `${noun.many} matching ${joiner} of ${count} conditions`;
}

export type TransitionOption = { label: string; value: string };

export type TransitionMeta = {
  /** Names the thing that changed, e.g. "Status" / "Owner". */
  label: string;
  fields: TransitionFields;
  /** Fixed options, for a field backed by an enum. */
  options?: TransitionOption[];
  /** Options fetched at open time, for a field backed by workspace records. */
  source?: "owners";
  /** Label for the TRANSITION_UNSET option, when the field is nullable. */
  unsetLabel?: string;
  /** Overrides the default "<label> changed from/to" field wording. */
  fromLabel?: string;
  toLabel?: string;
};

/**
 * Triggers that offer a "changed from → changed to" stage.
 *
 * Deliberately narrow: the `from` side reads a `previous*` field, which
 * exists only because `LeadRepository.update` captures the row's prior
 * scalars into its audit entry. The other status-like triggers (deal stage,
 * contact and organization status, task status) need the same capture in
 * their own repositories before they can appear here — listing one early
 * would render a From select that silently never matches.
 */
export const TRANSITION_TRIGGERS: Partial<
  Record<AutomationTriggerType, TransitionMeta>
> = {
  LEAD_STATUS_CHANGED: {
    label: "Status",
    fields: { from: "previousStatus", to: "status" },
    // prisma/schema.prisma → enum LeadStatus
    options: [
      { label: "New", value: "NEW" },
      { label: "Contacted", value: "CONTACTED" },
      { label: "Qualified", value: "QUALIFIED" },
      { label: "Unqualified", value: "UNQUALIFIED" },
      { label: "Converted", value: "CONVERTED" },
      { label: "Open", value: "OPEN" },
      { label: "In Progress", value: "IN_PROGRESS" },
      { label: "Nurture", value: "NURTURE" },
      { label: "Lost", value: "LOST" },
    ],
  },
  LEAD_SOURCE_CHANGED: {
    label: "Source",
    fields: { from: "previousSource", to: "source" },
    // prisma/schema.prisma → enum LeadSource
    options: [
      { label: "Website", value: "WEBSITE" },
      { label: "Referral", value: "REFERRAL" },
      { label: "Cold Call", value: "COLD_CALL" },
      { label: "Social Media", value: "SOCIAL_MEDIA" },
      { label: "Email Campaign", value: "EMAIL_CAMPAIGN" },
      { label: "Paid Ad", value: "PAID_AD" },
      { label: "Event", value: "EVENT" },
      { label: "Partner", value: "PARTNER" },
      { label: "Other", value: "OTHER" },
    ],
    // `source` is nullable, and "no source → Referral" is how an untracked
    // lead gets attributed.
    unsetLabel: "No source",
  },
  LEAD_ASSIGNED: {
    label: "Owner",
    // Assignment asks only who it landed with. There is deliberately no
    // "Unassigned" option: a lead assigned to nobody is not an assignment.
    fields: { to: "ownerId" },
    toLabel: "Assigned to",
    source: "owners",
  },
  LEAD_OWNER_CHANGED: {
    label: "Owner",
    fields: { from: "previousOwnerId", to: "ownerId" },
    source: "owners",
    // A lead can have no owner, and "Unassigned → someone" is the whole point
    // of most owner-change workflows.
    unsetLabel: "Unassigned",
  },
};

export function transitionMeta(
  triggerType: AutomationTriggerType | null,
): TransitionMeta | null {
  return triggerType ? (TRANSITION_TRIGGERS[triggerType] ?? null) : null;
}

/**
 * Appends "New → Qualified" to the canvas node's scope caption — or
 * "Owner: Priya" for a one-sided transition, where an arrow from nothing
 * would read as a change that did not happen.
 */
export function describeTransition(
  transition: TriggerTransition,
  meta: TransitionMeta,
  options: TransitionOption[],
): string | null {
  const name = (value?: string) => {
    if (!value) return "Any";
    if (value === TRANSITION_UNSET) return meta.unsetLabel ?? "None";
    return options.find((option) => option.value === value)?.label ?? value;
  };
  if (!meta.fields.from) {
    return transition.to ? `${meta.label}: ${name(transition.to)}` : null;
  }
  if (!transition.from && !transition.to) return null;
  return `${name(transition.from)} → ${name(transition.to)}`;
}

/**
 * The columns a "field changed" trigger can watch, grouped the way the
 * record's own form groups them.
 *
 * Values are Prisma column names on the model, because that is literally what
 * lands in the audit entry: `LeadRepository.update` records
 * `Object.keys(data)` of the update payload.
 *
 * `status` and `ownerId` are deliberately absent — they have their own
 * triggers (Lead Status Changed, Lead Owner Changed / Assigned), and changing
 * either on its own does not raise a field-changed event at all, so offering
 * them here would build a workflow that looks right and never fires.
 */
export const CHANGED_FIELD_TRIGGERS: Partial<
  Record<
    AutomationTriggerType,
    { label: string; groups: { label: string; fields: TransitionOption[] }[] }
  >
> = {
  LEAD_FIELD_CHANGED: {
    label: "Lead field",
    groups: [
      {
        label: "Contact details",
        fields: [
          { label: "First Name", value: "firstName" },
          { label: "Last Name", value: "lastName" },
          { label: "Email", value: "email" },
          { label: "Phone", value: "phone" },
          { label: "Mobile Phone", value: "mobilePhone" },
          { label: "Job Title", value: "jobTitle" },
          { label: "Department", value: "department" },
          { label: "LinkedIn URL", value: "linkedinUrl" },
          { label: "Website URL", value: "websiteUrl" },
          { label: "Twitter URL", value: "twitterUrl" },
        ],
      },
      {
        label: "Address",
        fields: [
          { label: "Street", value: "street" },
          { label: "City", value: "city" },
          { label: "State", value: "state" },
          { label: "Country", value: "country" },
          { label: "Postal Code", value: "postalCode" },
        ],
      },
      {
        label: "Company",
        fields: [
          { label: "Company", value: "companyId" },
          { label: "Company Name", value: "companyName" },
          { label: "Company Website", value: "companyWebsite" },
          { label: "Industry", value: "industry" },
          { label: "Company Size", value: "companySize" },
        ],
      },
      {
        label: "Qualification",
        fields: [
          { label: "Lifecycle Stage", value: "lifecycleStage" },
          { label: "Source", value: "source" },
          { label: "Score", value: "score" },
          { label: "Rating", value: "rating" },
          { label: "Pipeline Stage", value: "pipelineStage" },
          { label: "Do Not Contact", value: "doNotContact" },
        ],
      },
      {
        label: "Opportunity",
        fields: [
          { label: "Product Interest", value: "productInterest" },
          { label: "Budget Range", value: "budgetRange" },
          { label: "Estimated Value", value: "estimatedValue" },
          { label: "Currency", value: "currency" },
          { label: "Probability", value: "probability" },
          { label: "Expected Close Date", value: "expectedCloseDate" },
        ],
      },
      {
        label: "Notes",
        fields: [
          { label: "Description", value: "description" },
          { label: "Notes", value: "notes" },
        ],
      },
    ],
  },
  CONTACT_FIELD_CHANGED: {
    label: "Contact field",
    // Unlike the lead trigger, `status` DOES raise CONTACT_FIELD_CHANGED —
    // the audit bridge only excludes ownerId and companyId here — so it
    // belongs in the list. Those two have their own triggers (Contact Owner
    // Changed, Contact Associated with / Removed from Organization).
    groups: [
      {
        label: "Contact details",
        fields: [
          { label: "First Name", value: "firstName" },
          { label: "Last Name", value: "lastName" },
          { label: "Email", value: "email" },
          { label: "Phone", value: "phone" },
          { label: "Mobile Phone", value: "mobilePhone" },
          { label: "Job Title", value: "jobTitle" },
          { label: "Department", value: "department" },
          { label: "LinkedIn URL", value: "linkedinUrl" },
        ],
      },
      {
        label: "Qualification",
        fields: [
          { label: "Status", value: "status" },
          { label: "Lifecycle Stage", value: "lifecycleStage" },
          { label: "Source", value: "source" },
          { label: "Do Not Contact", value: "doNotContact" },
        ],
      },
      {
        label: "Notes",
        fields: [{ label: "Notes", value: "notes" }],
      },
    ],
  },
};

export function changedFieldMeta(triggerType: AutomationTriggerType | null) {
  return triggerType ? (CHANGED_FIELD_TRIGGERS[triggerType] ?? null) : null;
}

/** "Email or Phone" / "3 fields" for the canvas node's caption. */
export function describeChangedFields(
  fields: string[],
  meta: { groups: { fields: TransitionOption[] }[] },
): string | null {
  if (fields.length === 0) return null;
  const all = meta.groups.flatMap((group) => group.fields);
  const name = (value: string) =>
    all.find((option) => option.value === value)?.label ?? value;
  if (fields.length === 1) return name(fields[0]);
  if (fields.length === 2) return `${name(fields[0])} or ${name(fields[1])}`;
  return `${fields.length} fields`;
}
