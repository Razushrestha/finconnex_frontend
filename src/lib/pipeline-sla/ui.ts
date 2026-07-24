import type { SlaBand } from "@/lib/pipeline-sla/types";

/** Card / list chip surfaces — separate from Activity Summary urgency. */
export const SLA_BAND_SURFACE: Record<SlaBand, string> = {
  on_track: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
  due_today: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80",
  at_risk: "bg-orange-50 text-orange-900 ring-1 ring-orange-200/80",
  overdue: "bg-rose-50 text-rose-900 ring-1 ring-rose-200/80",
};

/** Compact top-right badge on the Lead Card (PDF card examples). */
export const SLA_BADGE_PILL: Record<SlaBand, string> = {
  on_track: "bg-emerald-100 text-emerald-800",
  due_today: "bg-amber-100 text-amber-900",
  at_risk: "bg-orange-100 text-orange-900",
  overdue: "bg-rose-100 text-rose-900",
};

export const SLA_BAND_WORDS: Record<SlaBand, string> = {
  on_track: "On track",
  due_today: "Due today",
  at_risk: "At risk",
  overdue: "Overdue",
};

/** Per-clock row text (PDF: stage can stay green while milestone is red). */
export const SLA_CLOCK_TEXT: Record<SlaBand, string> = {
  on_track: "text-emerald-800",
  due_today: "text-amber-900",
  at_risk: "text-orange-900",
  overdue: "text-rose-800",
};

export const SLA_CLOCK_ICON: Record<SlaBand, string> = {
  on_track: "text-emerald-600",
  due_today: "text-amber-600",
  at_risk: "text-orange-600",
  overdue: "text-rose-600",
};

/** Format timestamps matching lead seed convention (dd/MM/yyyy h:mm AM/PM). */
export function formatPipelineTimestamp(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${dd}/${mm}/${yyyy} ${h}:${min} ${ampm}`;
}

/** Due stamp on Stage / Milestone rows (e.g. "24 Jul, 10:00 am"). */
export function formatSlaDueAt(d: Date): string {
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
