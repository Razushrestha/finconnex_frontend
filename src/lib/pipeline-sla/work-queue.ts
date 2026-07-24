/**
 * Session 18 — Pipeline SLA Work Queue index.
 * Actionable bands only (excludes On Track / No SLA).
 */

import { listLeadColumns } from "@/lib/leads/store";
import type { LeadStatus } from "@/lib/leads/types";
import { computeSlaForLeadCard } from "@/lib/pipeline-sla/lead-bridge";
import type { LeadSlaViewModel } from "@/lib/pipeline-sla/types";

/** Badge labels that belong on the SLA Work Queue. */
export const SLA_ATTENTION_LABELS = [
  "Overdue",
  "Milestone Overdue",
  "Due Today",
  "At Risk",
] as const;

export type SlaAttentionLabel = (typeof SLA_ATTENTION_LABELS)[number];

/** Lower = worse / higher priority in the queue. */
export const SLA_ATTENTION_RANK: Record<SlaAttentionLabel, number> = {
  Overdue: 0,
  "Milestone Overdue": 1,
  "Due Today": 2,
  "At Risk": 3,
};

export function isSlaAttentionLabel(
  label: string,
): label is SlaAttentionLabel {
  return (SLA_ATTENTION_LABELS as readonly string[]).includes(label);
}

export type SlaWorkQueueEntry = {
  leadId: string;
  name: string;
  stage: string;
  leadStatus: LeadStatus;
  owner: string;
  company: string;
  badgeLabel: SlaAttentionLabel;
  /** Primary clock remaining / overdue text. */
  detail: string;
  dueAt: Date | null;
};

export type ListSlaAttentionOpts = {
  now?: Date;
  /** When set, only leads owned by this user. */
  owner?: string;
  /** Filter to one band; omit / "all" = every attention band. */
  band?: SlaAttentionLabel | "all";
};

function primaryClock(sla: LeadSlaViewModel): {
  detail: string;
  dueAt: Date | null;
} {
  if (sla.badgeLabel === "Milestone Overdue" && sla.milestoneClock) {
    return {
      detail: sla.milestoneClock.detail,
      dueAt: sla.milestoneClock.dueAt,
    };
  }
  if (sla.badgeLabel === "Overdue") {
    const clock =
      sla.stageClock?.band === "overdue"
        ? sla.stageClock
        : (sla.milestoneClock ?? sla.stageClock);
    return {
      detail: clock?.detail ?? "Overdue",
      dueAt: clock?.dueAt ?? null,
    };
  }
  const clock = sla.stageClock ?? sla.milestoneClock;
  return {
    detail: clock?.detail ?? sla.badgeLabel,
    dueAt: clock?.dueAt ?? null,
  };
}

/** Leads whose Pipeline SLA badge needs attention, ranked worst-first. */
export function listSlaAttentionLeads(
  opts: ListSlaAttentionOpts = {},
): SlaWorkQueueEntry[] {
  const now = opts.now ?? new Date();
  const band = opts.band ?? "all";
  const out: SlaWorkQueueEntry[] = [];

  for (const col of listLeadColumns()) {
    for (const card of col.cards) {
      if (opts.owner && card.owner !== opts.owner) continue;
      const sla = computeSlaForLeadCard(card, col.leadStatus, now);
      if (!isSlaAttentionLabel(sla.badgeLabel)) continue;
      if (band !== "all" && sla.badgeLabel !== band) continue;
      const { detail, dueAt } = primaryClock(sla);
      out.push({
        leadId: card.id,
        name: card.name,
        stage: sla.stage,
        leadStatus: col.leadStatus,
        owner: card.owner,
        company: card.company,
        badgeLabel: sla.badgeLabel,
        detail,
        dueAt,
      });
    }
  }

  out.sort((a, b) => {
    const rankDiff =
      SLA_ATTENTION_RANK[a.badgeLabel] - SLA_ATTENTION_RANK[b.badgeLabel];
    if (rankDiff !== 0) return rankDiff;
    const aDue = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aDue - bDue;
  });

  return out;
}
