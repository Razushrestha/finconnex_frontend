/** Lead Card v3 view-model contracts (spec §2–§7). */

import type { LeadSource, LeadStatus } from "@/lib/leads/types";
import { UNREPLIED_THRESHOLD_HOURS_DEFAULT } from "@/lib/leads/product-decisions";
import type { LeadSlaViewModel } from "@/lib/pipeline-sla/types";

/** Activity kinds that compete for Activity Summary / Last Activity. */
export type LeadActivityKind =
  | "call"
  | "meeting"
  | "task"
  | "reminder"
  | "sms"
  | "email"
  | "note"
  | "attachment"
  | "status_change"
  | "stage_change"
  | "document"
  | "workflow"
  | "other";

/** Spec §10 urgency: red broken · amber today · green future. */
export type ActivityUrgency = "red" | "amber" | "green";

/**
 * Normalized pending or completed activity for ranking.
 * Pending items use bucket "broken" | "scheduled"; history uses "completed".
 */
export interface LeadActivityCandidate {
  id: string;
  kind: LeadActivityKind;
  title: string;
  /** Due / received / occurred timestamp used for ranking & labels. */
  dueAt: Date | null;
  /** Record creation timestamp (tie-breaker #6). */
  createdAt: Date | null;
  bucket: "broken" | "scheduled" | "completed";
  isMissed?: boolean;
  isUnreplied?: boolean;
  /** Optional module deep-link id (same as source record id). */
  sourceModule?:
    | "calls"
    | "meetings"
    | "tasks"
    | "reminders"
    | "messages"
    | "emails"
    | "notes"
    | "attachments"
    | "documents"
    | "leads";
}

export interface ActivitySummarySelection {
  /** Headline item, or null → hide section (§12). */
  primary: LeadActivityCandidate | null;
  /** Spec "+X": other competing pending items; 0 → omit label. */
  moreCount: number;
  urgency: ActivityUrgency | null;
  dueLabel: string;
  /** Full list sorted with the same algorithm (expanded panel). */
  sorted: LeadActivityCandidate[];
}

export interface LastActivitySelection {
  event: LeadActivityCandidate;
  /** Short type label, e.g. "Completed call". */
  label: string;
  relativeTime: string;
}

export interface LeadCardDynamicField {
  key: string;
  label: string;
  value: string;
}

export interface LeadCardQuickActionState {
  kind: "call" | "sms" | "email" | "meeting" | "task" | "note" | "attachment";
  urgency: ActivityUrgency | "neutral";
  /** Badge count when ≥ 2 pending for this type (spec §7). */
  badgeCount: number;
}

/** Assembled card model for Lead Card UI. */
export interface LeadCardViewModel {
  id: string;
  leadId: string;
  name: string;
  status: LeadStatus;
  source: LeadSource;
  owner: {
    name: string;
    initials: string;
  };
  /** Admin toggle; default false (spec §3). */
  showOwnerAvatar: boolean;
  /** Live Lead Details fields, max 3–4 (spec §4). */
  dynamicFields: LeadCardDynamicField[];
  activitySummary: ActivitySummarySelection;
  lastActivity: LastActivitySelection | null;
  /** Fixed 7 quick actions with urgency + badges. */
  quickActions: LeadCardQuickActionState[];
  /** Session 16 — pipeline stage/milestone SLA (null when Lost / disabled). */
  sla: LeadSlaViewModel | null;
}

/** Default unreplied SMS/email threshold (locked product decision). */
export const UNREPLIED_THRESHOLD_MS =
  UNREPLIED_THRESHOLD_HOURS_DEFAULT * 60 * 60 * 1000;

/** Display truncate length for Activity Summary titles (spec §11). */
export const ACTIVITY_TITLE_TRUNCATE_AT = 36;
