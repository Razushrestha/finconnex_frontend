/**
 * Session-backed lead activities created from Lead Card quick actions.
 * Merged into the activity index so cards refresh without full module stores.
 */

import type { LeadActivityCandidate, LeadActivityKind } from "@/lib/leads/card-types";
import {
  isBrowser,
  newRulesId,
  readJsonStore,
  writeJsonStore,
} from "@/lib/rules/storage";

const KEY = "sales:leads:activity-extras:v1";

export type LeadExtraRecord = {
  id: string;
  leadName: string;
  kind: LeadActivityKind;
  title: string;
  /** ISO timestamp */
  dueAt: string | null;
  createdAt: string | null;
  bucket: "broken" | "scheduled" | "completed";
  isMissed?: boolean;
  isUnreplied?: boolean;
};

function readAll(): LeadExtraRecord[] {
  return readJsonStore<LeadExtraRecord[]>(KEY, []);
}

function writeAll(rows: LeadExtraRecord[]) {
  writeJsonStore(KEY, rows);
}

export function emitLeadActivityChange() {
  if (!isBrowser()) return;
  if (typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent("finconnex:lead-activity"));
}

export function onLeadActivityChange(handler: () => void): () => void {
  if (!isBrowser()) return () => {};
  const listener = () => handler();
  window.addEventListener("finconnex:lead-activity", listener);
  return () => window.removeEventListener("finconnex:lead-activity", listener);
}

export function listLeadExtras(leadName?: string): LeadExtraRecord[] {
  const all = readAll();
  if (!leadName) return all;
  const key = leadName.trim().toLowerCase();
  return all.filter((r) => r.leadName.trim().toLowerCase() === key);
}

export function addLeadExtra(
  input: Omit<LeadExtraRecord, "id"> & { id?: string },
): LeadExtraRecord {
  const row: LeadExtraRecord = {
    ...input,
    id: input.id ?? newRulesId("lead-act"),
  };
  writeAll([row, ...readAll()]);
  emitLeadActivityChange();
  return row;
}

export function extrasToCandidates(
  leadName: string,
): LeadActivityCandidate[] {
  return listLeadExtras(leadName).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    dueAt: r.dueAt ? new Date(r.dueAt) : null,
    createdAt: r.createdAt ? new Date(r.createdAt) : null,
    bucket: r.bucket,
    isMissed: r.isMissed,
    isUnreplied: r.isUnreplied,
    sourceModule:
      r.kind === "call"
        ? "calls"
        : r.kind === "meeting"
          ? "meetings"
          : r.kind === "task"
            ? "tasks"
            : r.kind === "sms"
              ? "messages"
              : r.kind === "email"
                ? "emails"
                : "leads",
  }));
}
