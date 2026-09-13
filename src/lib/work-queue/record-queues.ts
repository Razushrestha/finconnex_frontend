import { fetchLeadList } from "@/lib/leads/api/client";
import { mapCrmLeadToCard } from "@/lib/leads/api/map";
import { listCrmContacts } from "@/lib/contacts/api";
import { listCrmDeals } from "@/lib/deals/api";
import { workQueueRecordHref } from "@/lib/work-queue/navigation";
import {
  dueColorForLabel,
  formatDueLabel,
  type QueueRow,
} from "@/lib/work-queue/live";
import type { WorkqueueItemId } from "@/lib/work-queue/config";

function ownerHit(
  scope: string,
  ownerId?: string | null,
  ownerName?: string | null,
  nameById?: Record<string, string>,
): boolean {
  if (!scope) return true;
  if (ownerId && ownerId === scope) return true;
  const label = (nameById?.[scope] ?? scope).trim().toLowerCase();
  return (ownerName ?? "").trim().toLowerCase() === label;
}

function asRow(
  module: "leads" | "contacts" | "deals",
  id: string,
  subject: string,
  status: string,
  owner: string,
  when?: string | null,
  related?: string,
  priority = "Medium",
): QueueRow {
  const due = when ? new Date(when) : null;
  const dueLabel =
    due && !Number.isNaN(due.getTime()) ? formatDueLabel(due) : "";
  return {
    id,
    subject,
    dueLabel,
    dueColor: dueColorForLabel(dueLabel),
    status,
    priority,
    related: related ?? "",
    taskOwner: owner,
    fileHandler: owner,
    createdTime: when ?? undefined,
    itemType: module === "leads" ? "LEAD" : module === "contacts" ? "CONTACT" : "DEAL",
    sourceId: id,
    sortKey: due && !Number.isNaN(due.getTime()) ? -due.getTime() : 0,
    href: workQueueRecordHref(module, id),
  };
}

function isStale(status: string, created?: string | null) {
  if (/converted|unqualified|lost|closed/i.test(status)) return false;
  if (!created) return false;
  const t = new Date(created).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t > 14 * 86_400_000;
}

function closingThisMonth(closeDate?: string | null) {
  if (!closeDate) return false;
  const d = new Date(closeDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export type LiveRecordQueues = {
  leads: QueueRow[];
  contacts: QueueRow[];
  deals: QueueRow[];
};

export async function fetchLiveRecordQueues(opts: {
  scope: string;
  nameById?: Record<string, string>;
}): Promise<LiveRecordQueues> {
  const [leads, contacts, deals] = await Promise.all([
    fetchLeadList({ page: 1, limit: 100 }).catch(() => []),
    listCrmContacts({ page: 1, limit: 100 }).catch(() => []),
    listCrmDeals({ page: 1, limit: 100 }).catch(() => []),
  ]);

  const leadRows = leads
    .map(mapCrmLeadToCard)
    .filter((card) =>
      ownerHit(opts.scope, card.ownerId ?? null, card.owner, opts.nameById),
    )
    .map((card) =>
      asRow(
        "leads",
        card.id,
        card.name,
        card.pipelineStage ?? card.lifecycleStage ?? "Lead",
        card.owner,
        card.createdDate,
        card.company ? `Company: ${card.company}` : "",
      ),
    );

  const contactRows = contacts
    .filter((row) =>
      ownerHit(
        opts.scope,
        row.contact.ownerId,
        row.contact.owner,
        opts.nameById,
      ),
    )
    .map((row) =>
      asRow(
        "contacts",
        row.contact.id,
        row.contact.name,
        row.status,
        row.contact.owner,
        row.contact.createdDate,
        row.contact.company ? `Company: ${row.contact.company}` : "",
      ),
    );

  const dealRows = deals
    .filter((deal) => ownerHit(opts.scope, null, deal.owner, opts.nameById))
    .map((deal) =>
      asRow(
        "deals",
        deal.id,
        deal.name,
        deal.stageTitle,
        deal.owner,
        deal.closeDate,
        deal.contact
          ? `Contact: ${deal.contact}`
          : deal.account
            ? `Company: ${deal.account}`
            : "",
      ),
    );

  return { leads: leadRows, contacts: contactRows, deals: dealRows };
}

export function rowsForRecordNav(
  nav: string,
  records: LiveRecordQueues,
  activityRows: QueueRow[],
): QueueRow[] | null {
  if (nav === "my-leads") return records.leads;
  if (nav === "stale-leads") {
    return records.leads.filter((row) => isStale(row.status, row.createdTime));
  }
  if (nav === "pending-review") {
    return records.leads.filter((row) => /contacted/i.test(row.status));
  }
  if (nav === "missing-info") {
    return records.leads.filter((row) => !row.related);
  }
  if (nav === "my-contacts") return records.contacts;
  if (nav === "followup") {
    return records.contacts.filter((row) => /active/i.test(row.status));
  }
  if (nav === "my-deals") return records.deals;
  if (nav === "closing-soon") {
    return records.deals.filter((row) => closingThisMonth(row.createdTime));
  }
  if (nav === "stalled") {
    return records.deals.filter((row) =>
      /prospecting|qualification|discovery|application/i.test(row.status),
    );
  }
  if (nav === "waiting-approval") {
    return records.deals.filter((row) => /proposal/i.test(row.status));
  }
  if (nav === "overdue") {
    return activityRows.filter(
      (row) =>
        row.urgency === "OVERDUE" ||
        row.dueLabel === "Yesterday" ||
        row.dueLabel.includes("overdue"),
    );
  }
  if (nav === "high-priority") {
    return activityRows.filter((row) => /high|critical/i.test(row.priority));
  }
  if (nav === "escalated") {
    return activityRows.filter(
      (row) =>
        /high|critical/i.test(row.priority) &&
        (row.urgency === "OVERDUE" || row.dueLabel.includes("overdue")),
    );
  }
  if (isKnownQueueItem(nav)) return [];
  return null;
}

function isKnownQueueItem(nav: string): nav is WorkqueueItemId {
  return [
    "my-leads",
    "new-leads",
    "pending-tags",
    "stale-leads",
    "my-contacts",
    "contacts-3h",
    "followup",
    "my-deals",
    "closing-soon",
    "stalled",
    "pending-review",
    "missing-info",
    "awaiting-action",
    "waiting-approval",
    "overdue",
    "high-priority",
    "escalated",
    "sla-attention",
    "sla-overdue",
    "sla-milestone-overdue",
    "sla-due-today",
    "sla-at-risk",
  ].includes(nav);
}

export function countRecordNavs(
  records: LiveRecordQueues,
  activityRows: QueueRow[],
): Record<string, number> {
  const ids: WorkqueueItemId[] = [
    "my-leads",
    "stale-leads",
    "my-contacts",
    "my-deals",
    "closing-soon",
    "stalled",
    "pending-review",
    "missing-info",
    "waiting-approval",
    "overdue",
    "high-priority",
    "escalated",
    "followup",
  ];
  const out: Record<string, number> = {};
  for (const id of ids) {
    out[id] = rowsForRecordNav(id, records, activityRows)?.length ?? 0;
  }
  return out;
}
