/**
 * Record lookup for the trigger config panel's "a specific record" mode.
 *
 * Each entity type is routed to the same list/get API its own module screen
 * uses, so the picker only ever offers real workspace records with real ids —
 * the id goes straight into an `id EQUALS <uuid>` trigger condition.
 *
 * Only the entity types with a browsable module screen are pickable. The rest
 * (EMAIL, MESSAGE, MEETING, DOCUMENT, …) fall back to field conditions in the
 * panel: pinning a workflow to one individual email is not a thing anyone
 * means to do, and there is no picker UI for them to reuse.
 */
import { fetchLeadById, fetchLeadList } from "@/lib/leads/api";
import { getCrmContact, listCrmContacts } from "@/lib/contacts/api";
import { getCrmCompany, listCrmCompanies } from "@/lib/companies/api";
import { getCrmDeal, listCrmDeals } from "@/lib/deals/api";
import { getCrmTask, listCrmTasks } from "@/lib/tasks/api";
import type { AutomationEntityType } from "@/lib/automations/types";

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

export function supportsRecordPicker(entityType: AutomationEntityType): boolean {
  return (RECORD_PICKABLE_ENTITY_TYPES as readonly string[]).includes(entityType);
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Drops rows with no usable id — an option that can't be saved is noise. */
function usable(options: AutomationRecordOption[]): AutomationRecordOption[] {
  return options.filter((option) => option.id && option.label);
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
      default:
        return null;
    }
  } catch {
    return null;
  }
}
