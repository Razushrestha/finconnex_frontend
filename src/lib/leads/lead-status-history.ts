/**
 * Phase 12 — Lead status / stage changes → Last Activity (spec §6).
 * Live moves already call logStatusChange; seeds fill demo history.
 */

import {
  appendAuditEvent,
  listAuditEvents,
  type AuditEvent,
} from "@/lib/rules/audit";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import type { LeadActivityCandidate } from "@/lib/leads/card-types";

const SEED_META = "lead-card-phase-12";
const LEAD_MODULE = "sales.leads";

/** Demo status history so Last Activity can show “Status changed” without a drag. */
export function ensureLeadStatusHistorySeeds() {
  const events = listAuditEvents();
  if (events.some((e) => e.meta?.seed === SEED_META)) return;

  appendAuditEvent({
    action: "status_change",
    module: LEAD_MODULE,
    recordId: "l-c1",
    recordLabel: "Katherina Brooks",
    actor: "Roshna Abraham",
    summary: "Katherina Brooks: New → Contacted",
    changes: [{ field: "status", from: "New", to: "Contacted" }],
    at: "10/07/2026 09:00 AM",
    meta: { seed: SEED_META },
  });

  appendAuditEvent({
    action: "status_change",
    module: LEAD_MODULE,
    recordId: "l-n1",
    recordLabel: "William Anderson",
    actor: "John Smith",
    summary: "William Anderson: Contacted → New",
    changes: [{ field: "status", from: "Contacted", to: "New" }],
    at: "01/07/2026 02:00 PM",
    meta: { seed: SEED_META },
  });
}

function matchesLead(event: AuditEvent, leadName: string): boolean {
  const key = leadName.trim().toLowerCase();
  if (event.recordLabel?.trim().toLowerCase() === key) return true;
  if (event.summary.toLowerCase().includes(key)) return true;
  return false;
}

/**
 * Map lead pipeline audit events to completed timeline candidates.
 * Kind is status_change (Lead statuses); stage_change reserved for deals.
 */
export function statusHistoryToCandidates(
  leadName: string,
): LeadActivityCandidate[] {
  ensureLeadStatusHistorySeeds();
  const out: LeadActivityCandidate[] = [];

  for (const event of listAuditEvents()) {
    if (event.module !== LEAD_MODULE) continue;
    if (event.action !== "status_change") continue;
    if (!matchesLead(event, leadName)) continue;

    const at = parseFlexibleDate(event.at);
    const change = event.changes?.find((c) => c.field === "status");
    const from = change ? String(change.from) : "";
    const to = change ? String(change.to) : "";
    const title =
      from && to
        ? `Status ${from} → ${to}`
        : event.summary || "Status changed";

    out.push({
      id: event.id,
      kind: "status_change",
      title,
      dueAt: at,
      createdAt: at,
      bucket: "completed",
      sourceModule: "leads",
    });
  }

  return out;
}
