/**
 * Lead audit events → timeline candidates.
 * Live mutations log create / edit / status / delete; seeds fill demo history.
 */

import {
  appendAuditEvent,
  listAuditEvents,
  type AuditEvent,
  type FieldChange,
} from "@/lib/rules/audit";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import type { LeadActivityCandidate, LeadActivityKind } from "@/lib/leads/card-types";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";

const SEED_META = "lead-card-phase-12";
const LEAD_MODULE = "sales.leads";
const LEAD_SCOPED_MODULES = new Set([
  LEAD_MODULE,
  "sales.deals",
  "activities.notes",
  "activities.tasks",
  "activities.meetings",
  "activities.attachments",
  "activities.documents",
]);
const PIPELINE_STAGES = new Set<string>(MORTGAGE_PIPELINE_STAGES);

/** Demo status history so Last Activity can show “Status changed” without a drag. */
export function ensureLeadStatusHistorySeeds() {
  const events = listAuditEvents();
  if (events.some((e) => e.meta?.seed === SEED_META)) return;

  appendAuditEvent(
    {
      action: "status_change",
      module: LEAD_MODULE,
      recordId: "l-c1",
      recordLabel: "Katherina Brooks",
      actor: "Roshna Abraham",
      summary: "Katherina Brooks: New → Contacted",
      changes: [{ field: "status", from: "New", to: "Contacted" }],
      at: "10/07/2026 09:00 AM",
      meta: { seed: SEED_META },
    },
    { emit: false },
  );

  appendAuditEvent(
    {
      action: "status_change",
      module: LEAD_MODULE,
      recordId: "l-n1",
      recordLabel: "William Anderson",
      actor: "John Smith",
      summary: "William Anderson: Contacted → New",
      changes: [{ field: "status", from: "Contacted", to: "New" }],
      at: "01/07/2026 02:00 PM",
      meta: { seed: SEED_META },
    },
    { emit: false },
  );
}

function matchesLead(event: AuditEvent, leadName: string): boolean {
  const key = leadName.trim().toLowerCase();
  if (event.recordLabel?.trim().toLowerCase() === key) return true;
  if (event.summary.toLowerCase().includes(key)) return true;
  return false;
}

function looksLikePipelineStage(value: unknown) {
  return typeof value === "string" && PIPELINE_STAGES.has(value);
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  owner: "Owner",
  source: "Lead Source",
  tags: "Tags",
  estimatedValue: "Estimated Value",
  archived: "Archived",
  "custom.purpose": "Purpose",
  "custom.propertyPrice": "Property Price",
  "custom.loanAmount": "Loan Amount",
  "custom.deposit": "Deposit",
  "custom.householdIncome": "Household Income",
  "custom.timeframe": "Timeframe",
  "custom.citizenship": "Citizenship",
  "custom.firstHomeBuyer": "First Home Buyer",
  "custom.secondaryApplicant": "Secondary applicant",
  "custom.salutation": "Salutation",
  "custom.preferredName": "Preferred name",
  "custom.firstName": "First name",
  "custom.middleName": "Middle name",
  "custom.surname": "Surname",
  "custom.gender": "Gender",
  "custom.relationshipStatus": "Relationship status",
  "custom.dependants": "Dependants",
  "custom.dependantAge1": "Dependant 1 age",
  "custom.dependantAge2": "Dependant 2 age",
  "custom.dependantAge3": "Dependant 3 age",
  "custom.dependantAge4": "Dependant 4 age",
  "custom.dependantAge5": "Dependant 5 age",
  "custom.currentAddress": "Current address",
  "custom.livingArrangement": "Living arrangement",
  "custom.moveInDate": "Move in date",
  "custom.previousAddress": "Previous address",
  "custom.previousMoveInDate": "Previous move in date",
  "custom.previousMoveOutDate": "Previous move out date",
  "custom.previousAddress2": "Previous address 2",
  "custom.previous2MoveInDate": "Previous address 2 move in",
  "custom.previous2MoveOutDate": "Previous address 2 move out",
  "custom.previousAddressCount": "Previous address count",
  "custom.postalSameAsResidential": "Postal same as residential",
  "custom.postalAddress": "Postal address",
  "custom.dateOfBirth": "Date of birth",
  "custom.residencyStatus": "Residency status",
  "custom.visaType": "Visa type",
  "custom.licenceState": "Licence state",
  "custom.licenceCardNumber": "Licence card number",
  "custom.licenceNumber": "Licence number",
  "custom.licenceExpiry": "Licence expiry",
  "custom.employmentType": "Employment type",
  "custom.workArrangement": "Work arrangement",
  "custom.employerName": "Employer name",
  "custom.employerContactName": "Employer contact name",
  "custom.employerAddress": "Employer address",
  "custom.occupation": "Occupation",
  "custom.employmentStartDate": "Employment start date",
  "custom.employmentCount": "Employment count",
  "custom.employment": "Employment",
  "custom.creditIssues": "Credit Issues",
  "custom.creditScore": "Credit score",
  "custom.creditScoreChecked": "Credit score last checked",
  "custom.creditEnquiries": "Credit enquiries",
  "custom.creditDefaults": "Credit defaults",
  "custom.occupancy": "Occupancy",
  "custom.structure": "Loan Structure",
  "custom.rateType": "Rate Type",
  "custom.targetLvr": "Target LVR",
  "custom.lmi": "LMI",
};

function displayValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function fieldLabel(field: string) {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const key = field.startsWith("custom.") ? field.slice(7) : field;
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function formatFieldChange(change: FieldChange) {
  const label = fieldLabel(change.field);
  const from = displayValue(change.from);
  const to = displayValue(change.to);
  if (!from && to) return `${label} filled: ${to}`;
  if (from && !to) return `${label} cleared (was ${from})`;
  return `${label} changed: ${from} → ${to}`;
}

function formatChanges(changes?: FieldChange[]) {
  if (!changes?.length) return "";
  return changes.map(formatFieldChange).join(" · ");
}

function classifyEvent(event: AuditEvent): {
  kind: LeadActivityKind;
  title: string;
  body: string;
  idSuffix?: string;
}[] {
  const ownerChange = event.changes?.find((c) => c.field === "owner");
  const converted = event.changes?.find(
    (c) =>
      c.field === "isConverted" ||
      c.field === "convertedDealId" ||
      c.field === "convertedAt" ||
      c.field === "convertedContactId" ||
      c.field === "convertedCompanyId",
  );
  const stage = event.changes?.find(
    (c) => c.field === "status" || c.field === "pipelineStage",
  );
  const pipelineMove =
    stage?.field === "pipelineStage" ||
    looksLikePipelineStage(stage?.from) ||
    looksLikePipelineStage(stage?.to);
  const body = formatChanges(event.changes);

  if (event.module === "activities.notes") {
    if (event.action === "create") return [];
    return [
      {
        kind: "note",
        title: event.action === "delete" ? "Note deleted" : "Note updated",
        body: body || event.summary,
      },
    ];
  }
  if (event.module === "activities.tasks") {
    if (event.action === "create") return [];
    return [
      {
        kind: "task",
        title: event.action === "delete" ? "Task deleted" : "Task updated",
        body: body || event.summary,
      },
    ];
  }
  if (event.module === "activities.meetings") {
    if (event.action === "create") return [];
    return [
      {
        kind: "meeting",
        title: event.action === "delete" ? "Meeting deleted" : "Meeting updated",
        body: body || event.summary,
      },
    ];
  }
  if (
    event.module === "activities.attachments" ||
    event.module === "activities.documents"
  ) {
    if (event.action === "create") return [];
    return [
      {
        kind: "document",
        title: event.summary || "Document activity",
        body: body || event.summary,
      },
    ];
  }

  if (event.action === "create" && event.module === LEAD_MODULE) {
    return [{ kind: "created", title: "Lead created", body: event.summary }];
  }
  if (event.module === "sales.deals") {
    return [
      {
        kind: "deal",
        title: event.action === "create" ? "Deal created" : event.summary || "Deal activity",
        body: body || event.summary,
      },
    ];
  }
  if (converted || /convert/i.test(event.summary)) {
    return [{ kind: "converted", title: "Lead converted", body: body || event.summary }];
  }
  if (event.action === "status_change") {
    const from = stage ? String(stage.from) : "";
    const to = stage ? String(stage.to) : "";
    if (pipelineMove) {
      return [
        {
          kind: "stage_change",
          title: from && to ? `Stage changed: ${from} → ${to}` : "Stage changed",
          body: body || event.summary,
        },
      ];
    }
    return [
      {
        kind: "status_change",
        title: from && to ? `Status changed: ${from} → ${to}` : "Status changed",
        body: body || event.summary,
      },
    ];
  }
  if (event.action === "edit" && event.changes?.length) {
    return event.changes.map((change) => {
      if (change.field === "owner") {
        return {
          kind: "owner_change" as const,
          title: formatFieldChange(change),
          body: formatFieldChange(change),
          idSuffix: change.field,
        };
      }
      if (change.field === "status" || change.field === "pipelineStage") {
        return {
          kind: (looksLikePipelineStage(change.from) || looksLikePipelineStage(change.to)
            ? "stage_change"
            : "status_change") as LeadActivityKind,
          title: formatFieldChange(change),
          body: formatFieldChange(change),
          idSuffix: change.field,
        };
      }
      return {
        kind: "other" as const,
        title: formatFieldChange(change),
        body: formatFieldChange(change),
        idSuffix: change.field,
      };
    });
  }
  if (ownerChange) {
    return [
      {
        kind: "owner_change",
        title: formatFieldChange(ownerChange),
        body: body || event.summary,
      },
    ];
  }
  if (event.action === "delete") {
    return [{ kind: "other", title: "Lead deleted", body: event.summary }];
  }
  return [];
}

/**
 * Map lead-scoped audit events to completed timeline candidates.
 */
export function statusHistoryToCandidates(
  leadName: string,
): LeadActivityCandidate[] {
  ensureLeadStatusHistorySeeds();
  const out: LeadActivityCandidate[] = [];

  for (const event of listAuditEvents()) {
    if (!LEAD_SCOPED_MODULES.has(event.module)) continue;
    if (!matchesLead(event, leadName)) continue;

    const mapped = classifyEvent(event);
    const at = parseFlexibleDate(event.at);
    for (const item of mapped) {
      out.push({
        id: item.idSuffix ? `${event.id}-${item.idSuffix}` : event.id,
        kind: item.kind,
        title: item.title,
        body: item.body,
        actor: event.actor,
        dueAt: at,
        createdAt: at,
        bucket: "completed",
        sourceModule: "leads",
      });
    }
  }

  return out;
}
