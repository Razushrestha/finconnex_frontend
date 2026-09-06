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

export function ownerFromEmail(email?: string) {
  const raw = email?.toLowerCase() ?? "";
  if (raw.includes("john")) return "John Smith";
  if (raw.includes("shiva")) return "Shiva Kadhka";
  if (raw.includes("tejas")) return "Tejas Gokhe";
  if (raw.includes("roshna")) return "Roshna Abraham";
  return "Unassigned";
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
