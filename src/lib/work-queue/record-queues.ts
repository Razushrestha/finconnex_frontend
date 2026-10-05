import { fetchLeadList } from "@/lib/leads/api/client";
import { mapCrmLeadToCard } from "@/lib/leads/api/map";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import type { LeadCardData } from "@/lib/leads/types";
import { listCrmContacts } from "@/lib/contacts/api";
import { listCrmDeals } from "@/lib/deals/api";
import {
  isMortgagePipelineStage,
  pipelineStageToLeadStatus,
} from "@/lib/pipeline-sla/board";
import { computeSlaForLeadCard } from "@/lib/pipeline-sla/lead-bridge";
import type { LeadSlaViewModel } from "@/lib/pipeline-sla/types";
import {
  isSlaAttentionLabel,
  SLA_ATTENTION_RANK,
  type SlaAttentionLabel,
} from "@/lib/pipeline-sla/work-queue";
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
  extras?: Partial<QueueRow>,
): QueueRow {
  const due = when ? parseFlexibleDate(when) : null;
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
    contactName: subject,
    taskOwner: owner,
    fileHandler: owner,
    createdBy: owner,
    createdTime: when ?? undefined,
    itemType: module === "leads" ? "LEAD" : module === "contacts" ? "CONTACT" : "DEAL",
    sourceId: id,
    sortKey: due && !Number.isNaN(due.getTime()) ? -due.getTime() : 0,
    href: workQueueRecordHref(module, id),
    ...extras,
  };
}

function isEarlyLeadStatus(status: string) {
  if (status === "New" || status === "Contacted") return true;
  if (!isMortgagePipelineStage(status)) return false;
  const mapped = pipelineStageToLeadStatus(status);
  return mapped === "New" || mapped === "Contacted";
}

function isPendingReviewStatus(status: string) {
  if (status === "Contacted") return true;
  if (!isMortgagePipelineStage(status)) return /contacted/i.test(status);
  return pipelineStageToLeadStatus(status) === "Contacted";
}

function isStale(status: string, created?: string | null) {
  if (!isEarlyLeadStatus(status)) return false;
  const createdAt = parseFlexibleDate(created ?? undefined);
  if (!createdAt) return false;
  return Date.now() - createdAt.getTime() >= 7 * 86_400_000;
}

function hasEstimatedValue(row: QueueRow) {
  return /(^| · )Value\s+\S/.test(row.description ?? "");
}

function tagIncludes(tag: string | undefined, ...needles: string[]) {
  const parts = (tag ?? "").split(",").map((part) => part.trim().toLowerCase());
  return needles.some((needle) => parts.includes(needle.toLowerCase()));
}

function closingThisMonth(closeDate?: string | null) {
  const d = parseFlexibleDate(closeDate ?? undefined);
  if (!d) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function createdToday(raw?: string | null) {
  const d = parseFlexibleDate(raw ?? undefined);
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function closeDatePassed(raw?: string | null) {
  const d = parseFlexibleDate(raw ?? undefined);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function slaDetail(sla: LeadSlaViewModel) {
  if (sla.badgeLabel === "Milestone Overdue" && sla.milestoneClock) {
    return sla.milestoneClock.detail;
  }
  if (sla.badgeLabel === "Overdue") {
    const clock =
      sla.stageClock?.band === "overdue"
        ? sla.stageClock
        : (sla.milestoneClock ?? sla.stageClock);
    return clock?.detail ?? "Overdue";
  }
  return sla.stageClock?.detail ?? sla.milestoneClock?.detail ?? sla.badgeLabel;
}

function slaPriority(label: SlaAttentionLabel) {
  if (label === "Overdue" || label === "Milestone Overdue") return "High";
  return "Medium";
}

function leadDescription(card: LeadCardData) {
  const notes = [card.notes, card.productInterest].filter(Boolean).join(" · ");
  const value = card.estimatedValue?.trim();
  return [value ? `Value ${value}` : "", notes].filter(Boolean).join(" · ");
}

function leadTag(card: LeadCardData) {
  return [card.source, ...(card.tags ?? [])].filter(Boolean).join(", ");
}

function slaRows(cards: LeadCardData[]): QueueRow[] {
  const now = new Date();
  return cards
    .flatMap((card) => {
      const status = isMortgagePipelineStage(card.pipelineStage ?? "")
        ? pipelineStageToLeadStatus(card.pipelineStage ?? "")
        : "New";
      const sla = computeSlaForLeadCard(card, status, now);
      if (!isSlaAttentionLabel(sla.badgeLabel)) return [];
      return [
        asRow(
          "leads",
          card.id,
          card.name,
          sla.badgeLabel,
          card.owner,
          card.stageEnteredAt || card.createdDate,
          [sla.stage, card.company ? `Company: ${card.company}` : ""]
            .filter(Boolean)
            .join(" · "),
          slaPriority(sla.badgeLabel),
          {
            dueLabel: slaDetail(sla),
            dueColor: slaColor(sla.badgeLabel),
            contactName: card.name,
            tag: leadTag(card),
            description: leadDescription(card),
            modifiedTime: card.modifiedDate,
            lastActivityTime: card.modifiedDate || card.updatedAt,
            sortKey: SLA_ATTENTION_RANK[sla.badgeLabel],
          },
        ),
      ];
    })
    .sort((a, b) => a.sortKey - b.sortKey);
}

function slaColor(label: SlaAttentionLabel) {
  if (label === "Overdue" || label === "Milestone Overdue") return "#DC2626";
  if (label === "Due Today") return "#111827";
  return "#D97706";
}

export type LiveRecordQueues = {
  leads: QueueRow[];
  contacts: QueueRow[];
  deals: QueueRow[];
  sla: QueueRow[];
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

  const leadCards = leads
    .map(mapCrmLeadToCard)
    .filter((card) =>
      ownerHit(opts.scope, card.ownerId ?? null, card.owner, opts.nameById),
    );
  const leadRows = leadCards.map((card) =>
    asRow(
      "leads",
      card.id,
      card.name,
      card.pipelineStage ?? card.lifecycleStage ?? "Lead",
      card.owner,
      card.createdDate,
      card.company ? `Company: ${card.company}` : "",
      "Medium",
      {
        tag: leadTag(card),
        description: leadDescription(card),
        modifiedTime: card.modifiedDate,
        lastActivityTime: card.modifiedDate || card.updatedAt,
      },
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
        "Medium",
        {
          tag: row.contact.source,
          description: row.contact.email,
        },
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
          : deal.account && deal.account !== "—"
            ? `Company: ${deal.account}`
            : "",
        "Medium",
        {
          contactName:
            deal.contact || (deal.account !== "—" ? deal.account : deal.name),
          description: deal.value,
        },
      ),
    );

  return {
    leads: leadRows,
    contacts: contactRows,
    deals: dealRows,
    sla: slaRows(leadCards),
  };
}

function slaBandForNav(nav: string): SlaAttentionLabel | "all" | null {
  switch (nav) {
    case "sla-attention":
      return "all";
    case "sla-overdue":
      return "Overdue";
    case "sla-milestone-overdue":
      return "Milestone Overdue";
    case "sla-due-today":
      return "Due Today";
    case "sla-at-risk":
      return "At Risk";
    default:
      return null;
  }
}

function withPriority(rows: QueueRow[], priority: string) {
  return rows.map((row) => ({ ...row, priority }));
}

export function rowsForRecordNav(
  nav: string,
  records: LiveRecordQueues,
  activityRows: QueueRow[],
): QueueRow[] | null {
  const slaBand = slaBandForNav(nav);
  if (slaBand) {
    const rows = records.sla ?? [];
    return slaBand === "all"
      ? rows
      : rows.filter((row) => row.status === slaBand);
  }
  if (nav === "my-leads") return records.leads;
  if (nav === "new-leads") {
    return records.leads.filter((row) => createdToday(row.createdTime));
  }
  if (nav === "pending-tags") {
    return records.leads.filter(
      (row) => !hasEstimatedValue(row) || tagIncludes(row.tag, "Other"),
    );
  }
  if (nav === "stale-leads") {
    return withPriority(
      records.leads.filter((row) => isStale(row.status, row.createdTime)),
      "High",
    );
  }
  if (nav === "pending-review") {
    return records.leads.filter((row) => isPendingReviewStatus(row.status));
  }
  if (nav === "missing-info") {
    return withPriority(
      records.leads.filter((row) => !row.related || !hasEstimatedValue(row)),
      "High",
    );
  }
  if (nav === "my-contacts") return records.contacts;
  if (nav === "contacts-3h") {
    return records.contacts.filter((row) => createdToday(row.createdTime));
  }
  if (nav === "followup") {
    return records.contacts.filter(
      (row) =>
        /active/i.test(row.status) &&
        tagIncludes(row.tag, "Phone", "Cold Call"),
    );
  }
  if (nav === "my-deals") return records.deals;
  if (nav === "closing-soon") {
    return records.deals.filter((row) => closingThisMonth(row.createdTime));
  }
  if (nav === "stalled") {
    return withPriority(
      records.deals.filter(
        (row) =>
          /prospecting|qualification|discovery|application/i.test(row.status) &&
          closeDatePassed(row.createdTime),
      ),
      "High",
    );
  }
  if (nav === "waiting-approval") {
    return records.deals.filter((row) => /proposal/i.test(row.status));
  }
  if (nav === "awaiting-action") {
    return activityRows
      .filter(
        (row) =>
          ((row.itemType ?? "").toUpperCase() === "TASK" &&
            /not started/i.test(row.status)) ||
          (row.itemType ?? "").toUpperCase() === "CALL",
      )
      .sort((a, b) => a.sortKey - b.sortKey);
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
  ];
  const out: Record<string, number> = {};
  for (const id of ids) {
    out[id] = rowsForRecordNav(id, records, activityRows)?.length ?? 0;
  }
  return out;
}
