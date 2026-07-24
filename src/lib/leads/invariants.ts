/**
 * Lead Card v3 runtime invariants.
 * Used by smokes, Vitest, and optional debug asserts.
 */

import {
  ACTIVITY_TITLE_TRUNCATE_AT,
  type LeadCardViewModel,
} from "@/lib/leads/card-types";
import { truncateActivityTitle } from "@/lib/leads/activity-summary";
import { MAX_DYNAMIC_FIELDS } from "@/lib/leads/lead-card-settings";

export type InvariantIssue = { code: string; message: string };

const QUICK_ORDER = [
  "call",
  "sms",
  "email",
  "meeting",
  "task",
  "note",
  "attachment",
] as const;

/** Validate a single card view-model against spec contracts. */
export function checkLeadCardInvariants(
  vm: LeadCardViewModel,
): InvariantIssue[] {
  const issues: InvariantIssue[] = [];
  const s = vm.activitySummary;

  if (s.moreCount < 0) {
    issues.push({ code: "more_negative", message: `${vm.name}: +X < 0` });
  }
  if (s.primary === null && s.moreCount !== 0) {
    issues.push({
      code: "more_on_empty",
      message: `${vm.name}: +X shown with empty summary`,
    });
  }
  if (s.primary === null && s.urgency !== null) {
    issues.push({
      code: "urgency_on_empty",
      message: `${vm.name}: urgency with no primary`,
    });
  }
  if (s.primary && !s.urgency) {
    issues.push({
      code: "missing_urgency",
      message: `${vm.name}: primary without urgency`,
    });
  }
  if (s.primary && s.sorted[0]?.id !== s.primary.id) {
    issues.push({
      code: "sorted_mismatch",
      message: `${vm.name}: sorted[0] !== primary`,
    });
  }
  if (s.primary) {
    const truncated = truncateActivityTitle(
      s.primary.title,
      ACTIVITY_TITLE_TRUNCATE_AT,
    );
    if (truncated.length > ACTIVITY_TITLE_TRUNCATE_AT) {
      issues.push({
        code: "truncate_over",
        message: `${vm.name}: truncated title longer than cap`,
      });
    }
    if (
      s.primary.title.length > ACTIVITY_TITLE_TRUNCATE_AT &&
      !truncated.endsWith("…")
    ) {
      issues.push({
        code: "truncate_ellipsis",
        message: `${vm.name}: long title missing ellipsis`,
      });
    }
  }

  if (vm.dynamicFields.length > MAX_DYNAMIC_FIELDS) {
    issues.push({
      code: "fields_over_cap",
      message: `${vm.name}: ${vm.dynamicFields.length} dynamic fields`,
    });
  }
  for (const f of vm.dynamicFields) {
    if (!f.value.trim()) {
      issues.push({
        code: "empty_field",
        message: `${vm.name}: empty field ${f.key}`,
      });
    }
  }

  if (vm.quickActions.length !== 7) {
    issues.push({
      code: "quick_count",
      message: `${vm.name}: expected 7 quick actions`,
    });
  }
  const order = vm.quickActions.map((a) => a.kind).join(",");
  if (order !== QUICK_ORDER.join(",")) {
    issues.push({
      code: "quick_order",
      message: `${vm.name}: bad quick order ${order}`,
    });
  }
  for (const a of vm.quickActions) {
    if (
      (a.kind === "call" || a.kind === "sms" || a.kind === "email") &&
      a.urgency === "green"
    ) {
      issues.push({
        code: "no_green_comm",
        message: `${vm.name}: ${a.kind} is green`,
      });
    }
    if (
      (a.kind === "note" || a.kind === "attachment") &&
      (a.urgency !== "neutral" || a.badgeCount !== 0)
    ) {
      issues.push({
        code: "neutral_static",
        message: `${vm.name}: ${a.kind} not neutral`,
      });
    }
    if (a.badgeCount === 1) {
      issues.push({
        code: "badge_one",
        message: `${vm.name}: badge must be 0 or ≥2`,
      });
    }
  }

  return issues;
}

export function assertLeadCardInvariants(vm: LeadCardViewModel): void {
  const issues = checkLeadCardInvariants(vm);
  if (issues.length) {
    throw new Error(
      issues.map((i) => `[${i.code}] ${i.message}`).join("\n"),
    );
  }
}
