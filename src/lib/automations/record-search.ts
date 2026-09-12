/**
 * Record lookup for the trigger config panel's "a specific record" mode.
 *
 * Each entity type is routed to the same list/get API its own module screen
 * uses, so the picker only ever offers real workspace records with real ids —
 * the id goes straight into an `id EQUALS <uuid>` trigger condition.
 *
 * Only the entity types with a browsable module screen are pickable. The rest
 * (EMAIL, MESSAGE, DOCUMENT, …) fall back to field conditions in the panel:
 * pinning a workflow to one individual email is not a thing anyone means to
 * do, and there is no picker UI for them to reuse.
 *
 * Meetings are the exception among the activity entities: a meeting is a
 * scheduled thing people already talk about by name ("the Q3 kickoff"), so
 * they are pickable — as a *set* rather than one at a time, since the same
 * follow-up workflow usually covers several. See
 * `MULTI_RECORD_PICKABLE_ENTITY_TYPES`.
 */
import { fetchLeadById, fetchLeadList } from "@/lib/leads/api";
import { getCrmContact, listCrmContacts } from "@/lib/contacts/api";
import { getCrmCompany, listCrmCompanies } from "@/lib/companies/api";
import { getCrmDeal, listCrmDeals } from "@/lib/deals/api";
import { getCrmTask, listCrmTasks } from "@/lib/tasks/api";
import { getCrmMeeting, isCrmMeetingId, listCrmMeetings } from "@/lib/meetings/api";
import {
  getCrmDocument,
  isCrmDocumentId,
  listCrmDocuments,
} from "@/lib/documents/library/api";
import { loadAssignableOwners } from "@/lib/users/assignable";
import type { AutomationEntityType } from "@/lib/automations/types";

/**
 * What a related-record picker points at. Teammates are not an
 * `AutomationEntityType` — no trigger fires on a user — but a message can be
 * addressed to one (`toUserId`), so they are pickable as a target.
 */
export type RelatedTarget = AutomationEntityType | "USER";

export type AutomationRecordOption = {
  id: string;
  label: string;
  sublabel?: string;
};

export const RECORD_PICKABLE_ENTITY_TYPES = [
  "LEAD",
  "CONTACT",
  "COMPANY",
  "DEAL",
  "TASK",
] as const satisfies readonly AutomationEntityType[];

/**
 * Entities picked as a set, on a page of their own, instead of one record
 * inline: the scope stage offers "Specific meetings", which opens a second
 * sidebar page listing the workspace's saved meetings with checkboxes.
 */
export const MULTI_RECORD_PICKABLE_ENTITY_TYPES = [
  "MEETING",
  "DOCUMENT",
] as const satisfies readonly AutomationEntityType[];

export function supportsRecordPicker(entityType: AutomationEntityType): boolean {
  return (RECORD_PICKABLE_ENTITY_TYPES as readonly string[]).includes(entityType);
}

export function supportsMultiRecordPicker(entityType: AutomationEntityType): boolean {
  return (MULTI_RECORD_PICKABLE_ENTITY_TYPES as readonly string[]).includes(entityType);
}

/** "12 Mar, 09:30" — enough to tell two same-titled meetings apart. */
function meetingWhen(iso: string): string {
  const at = new Date(iso);
  if (!iso || Number.isNaN(at.getTime())) return "";
  return at.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function meetingOption(meeting: {
  id: string;
  title: string;
  startDateTime: string;
  status: string;
}): AutomationRecordOption {
  const when = meetingWhen(meeting.startDateTime);
  return {
    id: meeting.id,
    label: clean(meeting.title) || "Untitled meeting",
    sublabel: [when, clean(meeting.status)].filter(Boolean).join(" \u00b7 ") || undefined,
  };
}

function documentOption(doc: {
  id: string;
  fileName: string;
  owner: string;
  sizeLabel: string;
}): AutomationRecordOption {
  const owner = clean(doc.owner);
  return {
    id: doc.id,
    label: clean(doc.fileName) || "Untitled document",
    // Two files often share a name across owners, so the owner disambiguates.
    sublabel:
      [owner === "\u2014" ? "" : owner, clean(doc.sizeLabel)]
        .filter(Boolean)
        .join(" \u00b7 ") || undefined,
  };
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Drops rows with no usable id — an option that can't be saved is noise. */
function usable(options: AutomationRecordOption[]): AutomationRecordOption[] {
  return options.filter((option) => option.id && option.label);
}

/** Teammates, filtered client-side — the list is small and already cached. */
async function searchWorkspaceUsers(
  search: string,
  limit: number,
): Promise<AutomationRecordOption[]> {
  const query = search.trim().toLowerCase();
  const owners = await loadAssignableOwners();
  return owners
    .filter(
      (owner) =>
        !query ||
        owner.name.toLowerCase().includes(query) ||
        owner.email.toLowerCase().includes(query),
    )
    .slice(0, limit)
    .map((owner) => ({
      id: owner.id,
      label: owner.name || owner.email,
      sublabel: owner.email || undefined,
    }));
}

export async function searchRelatedTargets(
  target: RelatedTarget,
  search: string,
  limit = 20,
): Promise<AutomationRecordOption[]> {
  return target === "USER"
    ? searchWorkspaceUsers(search, limit)
    : searchAutomationRecords(target, search, limit);
}

export async function describeRelatedTarget(
  target: RelatedTarget,
  id: string,
): Promise<AutomationRecordOption | null> {
  if (target !== "USER") return describeAutomationRecord(target, id);
  if (!id) return null;
  try {
    const owners = await loadAssignableOwners();
    const owner = owners.find((row) => row.id === id);
    return owner
      ? { id, label: owner.name || owner.email, sublabel: owner.email || undefined }
      : null;
  } catch {
    return null;
  }
}

export async function searchAutomationRecords(
  entityType: AutomationEntityType,
  search: string,
  limit = 20,
): Promise<AutomationRecordOption[]> {
  const query = search.trim();
  switch (entityType) {
    case "LEAD": {
      const rows = await fetchLeadList({ limit, search: query || undefined });
      return usable(
        rows.map((lead) => ({
          id: lead.id,
          label:
            `${clean(lead.firstName)} ${clean(lead.lastName)}`.trim() ||
            clean(lead.email) ||
            "Untitled lead",
          sublabel: clean(lead.email) || clean(lead.companyName) || undefined,
        })),
      );
    }
    case "CONTACT": {
      const rows = await listCrmContacts({ limit, search: query || undefined });
      return usable(
        rows.map(({ contact }) => ({
          id: contact.id,
          label: clean(contact.name) || clean(contact.email) || "Untitled contact",
          sublabel: clean(contact.email) || clean(contact.company) || undefined,
        })),
      );
    }
    case "COMPANY": {
      const rows = await listCrmCompanies({ limit, search: query || undefined });
      return usable(
        rows.map(({ company }) => ({
          id: company.id,
          label: clean(company.name) || "Untitled organization",
          sublabel: clean(company.website) || clean(company.industry) || undefined,
        })),
      );
    }
    case "DEAL": {
      const rows = await listCrmDeals({ limit, search: query || undefined });
      return usable(
        rows.map((deal) => ({
          id: deal.id,
          label: clean(deal.name) || "Untitled deal",
          sublabel: clean(deal.account) || clean(deal.value) || undefined,
        })),
      );
    }
    case "TASK": {
      const rows = await listCrmTasks({ page: 1, limit, search: query || undefined });
      return usable(
        rows.map((task) => ({
          id: task.taskId,
          label: clean(task.title) || "Untitled task",
          sublabel: clean(task.status) || undefined,
        })),
      );
    }
    case "MEETING": {
      const rows = await listCrmMeetings({ page: 1, limit, search: query || undefined });
      // A row the API returned without an id gets a synthesized `crm-meet-N`
      // placeholder, which would save a condition that can never match.
      return usable(rows.filter((row) => isCrmMeetingId(row.id)).map(meetingOption));
    }
    case "DOCUMENT": {
      const rows = await listCrmDocuments({ page: 1, limit, search: query || undefined });
      // Same placeholder hazard as meetings: a row with no id becomes
      // `crm-doc-N`, which would save a condition that can never match.
      return usable(rows.filter((row) => isCrmDocumentId(row.id)).map(documentOption));
    }
    default:
      return [];
  }
}

/**
 * Resolve a saved id back to a label, so reopening a workflow shows
 * "Jane Cooper" where it was saved rather than the bare uuid.
 *
 * Returns null when the record is gone or unreadable; the caller shows the id
 * with a "no longer available" note instead of inventing a name.
 */
export async function describeAutomationRecord(
  entityType: AutomationEntityType,
  id: string,
): Promise<AutomationRecordOption | null> {
  if (!id) return null;
  try {
    switch (entityType) {
      case "LEAD": {
        const lead = await fetchLeadById(id);
        if (!lead) return null;
        return {
          id,
          label:
            `${clean(lead.firstName)} ${clean(lead.lastName)}`.trim() ||
            clean(lead.email) ||
            id,
          sublabel: clean(lead.email) || undefined,
        };
      }
      case "CONTACT": {
        const row = await getCrmContact(id);
        if (!row) return null;
        return { id, label: clean(row.contact.name) || id, sublabel: clean(row.contact.email) || undefined };
      }
      case "COMPANY": {
        const row = await getCrmCompany(id);
        if (!row) return null;
        return { id, label: clean(row.company.name) || id, sublabel: clean(row.company.website) || undefined };
      }
      case "DEAL": {
        const deal = await getCrmDeal(id);
        if (!deal) return null;
        return { id, label: clean(deal.name) || id, sublabel: clean(deal.account) || undefined };
      }
      case "TASK": {
        const task = await getCrmTask(id);
        if (!task) return null;
        return { id, label: clean(task.title) || id, sublabel: clean(task.status) || undefined };
      }
      case "MEETING": {
        const meeting = await getCrmMeeting(id);
        if (!meeting) return null;
        return meetingOption({ ...meeting, id });
      }
      case "DOCUMENT": {
        const doc = await getCrmDocument(id);
        if (!doc) return null;
        return documentOption({ ...doc, id });
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
