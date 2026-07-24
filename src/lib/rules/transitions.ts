/** SRS §28.2 Status / Stage Transitions */

import { fail, ok, type RuleResult } from "@/lib/rules/types";

export const FINAL_LEAD_STATUSES = ["Converted"] as const;
export const FINAL_DEAL_STAGES = ["Closed Won", "Closed Lost"] as const;
export const FINAL_CAMPAIGN_STATUSES = ["Completed"] as const;

export const TICKET_STATUSES = [
  "New",
  "Open",
  "In Progress",
  "Pending",
  "Resolved",
  "Closed",
  "Reopened",
] as const;

export function isFinalLeadStatus(status: string) {
  return (FINAL_LEAD_STATUSES as readonly string[]).includes(status);
}

export function isFinalDealStage(stage: string) {
  return (FINAL_DEAL_STAGES as readonly string[]).includes(stage);
}

export function isFinalCampaignStatus(status: string) {
  return (FINAL_CAMPAIGN_STATUSES as readonly string[]).includes(status);
}

/** Lead "Converted" is final. */
export function assertLeadStatusChange(
  from: string,
  to: string,
): RuleResult {
  if (from === to) return ok();
  if (isFinalLeadStatus(from) && from !== to) {
    return fail(
      "LEAD_STATUS_FINAL",
      'Lead status "Converted" is final and cannot be changed',
    );
  }
  return ok();
}

/** Deal "Closed Won" and "Closed Lost" are final. */
export function assertDealStageChange(from: string, to: string): RuleResult {
  if (from === to) return ok();
  if (isFinalDealStage(from) && from !== to) {
    return fail(
      "DEAL_STAGE_FINAL",
      `Deal stage "${from}" is final and cannot be changed`,
    );
  }
  return ok();
}

/**
 * Ticket "Closed" can be reopened (§28.2).
 * Rejects unknown statuses; Closed/Resolved → any open status is allowed.
 */
export function assertTicketStatusChange(
  from: string,
  to: string,
): RuleResult {
  if (from === to) return ok();
  const known = TICKET_STATUSES as readonly string[];
  if (!to.trim()) {
    return fail("TICKET_STATUS_REQUIRED", "Ticket status is required");
  }
  if (!known.includes(to)) {
    return fail(
      "TICKET_STATUS_UNKNOWN",
      `Unknown ticket status "${to}"`,
    );
  }
  // Closed / Resolved may reopen — SRS explicit allowance
  return ok();
}

export function canReopenTicket(status: string) {
  return status === "Closed" || status === "Resolved";
}

/** Campaign "Completed" cannot be restarted. */
export function assertCampaignStatusChange(
  from: string,
  to: string,
): RuleResult {
  if (from === to) return ok();
  if (isFinalCampaignStatus(from)) {
    const restarting =
      to === "Running" ||
      to === "Scheduled" ||
      to === "Draft" ||
      to === "Paused";
    if (restarting) {
      return fail(
        "CAMPAIGN_COMPLETED_FINAL",
        'Campaign status "Completed" cannot be restarted',
      );
    }
  }
  return ok();
}
