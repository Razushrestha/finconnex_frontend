import { formatCurrency } from "@/lib/dashboard/layout";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import type { ReportCell, ReportColumnKind } from "@/lib/reports/library/types";

export function parseDate(raw?: string | null) {
  return parseFlexibleDate(raw);
}

export function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function formatDate(raw?: string | null) {
  const at = parseDate(raw);
  if (!at) return raw?.trim() || "—";
  return at.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function formatMonth(at: Date) {
  return at.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

export function formatCell(value: ReportCell, kind?: ReportColumnKind) {
  if (value == null || value === "") return "—";
  if (kind === "money" && typeof value === "number") return formatCurrency(value);
  if (kind === "percent" && typeof value === "number") return `${value}%`;
  if (kind === "number" && typeof value === "number") {
    return new Intl.NumberFormat("en-AU").format(value);
  }
  if (kind === "date") return formatDate(String(value));
  return String(value);
}

/**
 * Best-effort display name for an email address.
 *
 * Was a lookup table mapping substrings to hardcoded demo people; now derives
 * the name from the address itself ("jane.doe@x.com" -> "Jane Doe") so it
 * reflects the real user instead of inventing one.
 */
export function ownerFromEmail(email?: string) {
  const local = email?.trim().toLowerCase().split("@")[0] ?? "";
  if (!local) return "Unassigned";
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return name || "Unassigned";
}

export function loanFromText(...parts: Array<string | undefined>) {
  const blob = parts.join(" ").toLowerCase();
  if (blob.includes("refinanc")) return "Refinance";
  if (blob.includes("invest")) return "Investment";
  if (blob.includes("purchase") || blob.includes("owner occup") || blob.includes("home")) {
    return "Purchase";
  }
  return "Purchase";
}
