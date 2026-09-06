import { formatCurrency } from "@/lib/dashboard/layout";
import { formatMonth, pct } from "@/lib/reports/library/format";
import type { ReportCell, ReportChartPoint, ReportKpi, ReportResult, ReportRow } from "@/lib/reports/library/types";

export function kpi(id: string, label: string, value: string | number, hint?: string): ReportKpi {
  return { id, label, value, hint };
}

export function moneyKpi(id: string, label: string, value: number, hint?: string) {
  return kpi(id, label, formatCurrency(value), hint);
}

export function row(id: string, cells: Record<string, ReportCell>): ReportRow {
  return { id, cells };
}

export function result(
  kpis: ReportKpi[],
  rows: ReportRow[],
  chart?: { type: ReportResult["chart"] extends infer T ? T : never },
): ReportResult {
  return { kpis, rows, chart: chart as ReportResult["chart"] };
}

export function barChart(title: string, points: ReportChartPoint[]): NonNullable<ReportResult["chart"]> {
  return { type: "bar", title, points };
}

export function lineChart(title: string, points: ReportChartPoint[]): NonNullable<ReportResult["chart"]> {
  return { type: "line", title, points };
}

export function pieChart(title: string, points: ReportChartPoint[]): NonNullable<ReportResult["chart"]> {
  return { type: "pie", title, points };
}

export function funnelChart(title: string, points: ReportChartPoint[]): NonNullable<ReportResult["chart"]> {
  return { type: "funnel", title, points };
}

export function groupBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const id = key(item) || "Unassigned";
    const list = map.get(id) ?? [];
    list.push(item);
    map.set(id, list);
  }
  return [...map.entries()];
}

export function monthKey(at: Date | null, fallback = "Unknown") {
  return at ? formatMonth(at) : fallback;
}

export function sum(items: number[]) {
  return items.reduce((n, v) => n + v, 0);
}

export function rate(part: number, total: number) {
  return pct(part, total);
}

export function impliedTarget(actual: number, previous = 0) {
  return Math.max(previous > 0 ? previous * 1.13 : 0, actual > 0 ? actual / 0.87 : 0);
}
