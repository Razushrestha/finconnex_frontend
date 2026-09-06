import {
  applyCommonFilters,
  inDateRange,
  loadDeals,
  loadLeads,
  type CrmDeal,
} from "@/lib/reports/library/records";
import {
  barChart,
  groupBy,
  impliedTarget,
  kpi,
  lineChart,
  moneyKpi,
  monthKey,
  pieChart,
  rate,
  row,
  sum,
} from "@/lib/reports/library/compute/helpers";
import type { LibraryFilters, ReportResult } from "@/lib/reports/library/types";

function dealsInScope(filters: LibraryFilters, now: Date) {
  return applyCommonFilters(
    loadDeals(now).filter((deal) => inDateRange(deal.closeAt, filters.dateRange, now) || deal.status === "Open"),
    filters,
  );
}

function openDeals(deals: CrmDeal[]) {
  return deals.filter((d) => !d.won && !d.lost);
}

export function runDealsReport(id: string, filters: LibraryFilters, now: Date): ReportResult {
  const deals = dealsInScope(filters, now);
  const open = openDeals(deals);
  const won = deals.filter((d) => d.won);
  const lost = deals.filter((d) => d.lost);

  if (id === "deal-register") {
    return {
      kpis: [
        kpi("total", "Deals", deals.length),
        kpi("open", "Open", open.length),
        moneyKpi("value", "Total value", sum(deals.map((d) => d.value))),
        kpi("win", "Win rate", `${rate(won.length, won.length + lost.length)}%`),
      ],
      rows: deals.map((d) =>
        row(d.id, {
          name: d.name,
          account: d.account,
          owner: d.owner,
          stage: d.stage,
          value: d.value,
          close: d.closeRaw,
        }),
      ),
    };
  }

  if (id === "deal-pipeline-by-stage") {
    const groups = groupBy(deals, (d) => d.stage);
    return {
      kpis: [
        kpi("deals", "Deals", deals.length),
        moneyKpi("value", "Value", sum(deals.map((d) => d.value))),
        moneyKpi("weighted", "Weighted", sum(deals.map((d) => d.weighted))),
      ],
      rows: groups.map(([stage, items]) =>
        row(stage, {
          stage,
          deals: items.length,
          value: sum(items.map((d) => d.value)),
          weighted: sum(items.map((d) => d.weighted)),
        }),
      ),
      chart: barChart("Value by stage", groups.map(([stage, items]) => ({ name: stage, value: sum(items.map((d) => d.value)) }))),
    };
  }

  if (id === "deal-owner-performance" || id === "deal-conversion") {
    const groups = groupBy(deals, (d) => d.owner);
    return {
      kpis: [
        kpi("owners", "Owners", groups.length),
        kpi("won", "Won deals", won.length),
        kpi("win", "Win rate", `${rate(won.length, won.length + lost.length)}%`),
        moneyKpi("value", "Won value", sum(won.map((d) => d.value))),
      ],
      rows: groups.map(([owner, items]) => {
        const w = items.filter((d) => d.won);
        const l = items.filter((d) => d.lost);
        return row(owner, {
          owner,
          open: items.filter((d) => !d.won && !d.lost).length,
          won: w.length,
          lost: l.length,
          considered: items.length,
          winRate: rate(w.length, w.length + l.length),
          conversion: rate(w.length, items.length),
          value: sum(w.map((d) => d.value)),
        });
      }),
    };
  }

  if (id === "won-deal-analysis") {
    return {
      kpis: [
        kpi("won", "Won deals", won.length),
        moneyKpi("value", "Won value", sum(won.map((d) => d.value))),
        moneyKpi("avg", "Avg deal size", won.length ? Math.round(sum(won.map((d) => d.value)) / won.length) : 0),
      ],
      rows: won.map((d) =>
        row(d.id, {
          name: d.name,
          owner: d.owner,
          account: d.account,
          value: d.value,
          close: d.closeRaw,
          loanType: d.loanType,
        }),
      ),
    };
  }

  if (id === "lost-deal-analysis") {
    return {
      kpis: [
        kpi("lost", "Lost deals", lost.length),
        moneyKpi("value", "Value lost", sum(lost.map((d) => d.value))),
        kpi("rate", "Loss rate", `${rate(lost.length, won.length + lost.length)}%`),
      ],
      rows: lost.map((d) =>
        row(d.id, {
          name: d.name,
          owner: d.owner,
          reason: d.lostReason,
          value: d.value,
          close: d.closeRaw,
          stage: d.stage,
        }),
      ),
    };
  }

  if (id === "lost-deal-reasons") {
    const groups = groupBy(lost, (d) => d.lostReason);
    return {
      kpis: [
        kpi("reasons", "Reasons", groups.length),
        kpi("lost", "Lost deals", lost.length),
        moneyKpi("value", "Value lost", sum(lost.map((d) => d.value))),
      ],
      rows: groups.map(([reason, items]) =>
        row(reason, {
          reason,
          deals: items.length,
          value: sum(items.map((d) => d.value)),
          share: rate(items.length, lost.length),
        }),
      ),
      chart: pieChart("Lost reasons", groups.map(([reason, items]) => ({ name: reason, value: items.length }))),
    };
  }

  if (id === "deal-ageing" || id === "stalled-deal") {
    const aged = open.filter((d) => d.ageDays > 0 || !d.closeAt || (d.closeAt && d.closeAt < now));
    return {
      kpis: [
        kpi("stalled", "Stalled / ageing", aged.length),
        moneyKpi("value", "At-risk value", sum(aged.map((d) => d.value))),
        kpi("avg", "Avg days past close", aged.length ? Math.round(sum(aged.map((d) => d.ageDays)) / aged.length) : 0),
      ],
      rows: aged
        .sort((a, b) => b.ageDays - a.ageDays)
        .map((d) =>
          row(d.id, {
            name: d.name,
            owner: d.owner,
            stage: d.stage,
            close: d.closeRaw,
            age: d.ageDays,
            value: d.value,
          }),
        ),
    };
  }

  const trend = groupBy(deals, (d) => monthKey(d.closeAt));
  return {
    kpis: [
      kpi("deals", "Deals", deals.length),
      kpi("won", "Won", won.length),
      moneyKpi("value", "Won value", sum(won.map((d) => d.value))),
    ],
    rows: trend.map(([period, items]) =>
      row(period, {
        period,
        created: items.length,
        won: items.filter((d) => d.won).length,
        value: sum(items.filter((d) => d.won).map((d) => d.value)),
      }),
    ),
    chart: lineChart(
      "Won value trend",
      trend.map(([period, items]) => ({
        name: period,
        value: sum(items.filter((d) => d.won).map((d) => d.value)),
      })),
    ),
  };
}

export function runPipelineReport(id: string, filters: LibraryFilters, now: Date): ReportResult {
  const deals = applyCommonFilters(
    loadDeals(now).filter((d) => !d.won && !d.lost),
    filters,
  );
  const leads = applyCommonFilters(loadLeads(now), filters);

  if (id === "current-pipeline" || id === "expected-settlement") {
    return {
      kpis: [
        kpi("deals", "Open deals", deals.length),
        moneyKpi("value", "Gross pipeline", sum(deals.map((d) => d.value))),
        moneyKpi("weighted", "Weighted", sum(deals.map((d) => d.weighted))),
      ],
      rows: deals.map((d) =>
        row(d.id, {
          name: d.name,
          owner: d.owner,
          stage: d.stage,
          value: d.value,
          weighted: d.weighted,
          close: d.closeRaw,
          probability: d.probability,
        }),
      ),
    };
  }

  if (id === "pipeline-by-stage" || id === "pipeline-movement") {
    const groups = groupBy(deals, (d) => d.stage);
    const leadGroups = groupBy(leads, (l) => l.stage);
    return {
      kpis: [
        kpi("stages", "Active stages", groups.length),
        moneyKpi("value", "Pipeline", sum(deals.map((d) => d.value))),
        moneyKpi("weighted", "Weighted", sum(deals.map((d) => d.weighted))),
      ],
      rows: groups.map(([stage, items]) =>
        row(stage, {
          stage,
          deals: items.length,
          leads: leadGroups.find(([s]) => s === stage)?.[1].length ?? 0,
          value: sum(items.map((d) => d.value)),
          weighted: sum(items.map((d) => d.weighted)),
        }),
      ),
      chart: barChart(
        "Weighted pipeline",
        groups.map(([stage, items]) => ({ name: stage, value: sum(items.map((d) => d.weighted)) })),
      ),
    };
  }

  if (id === "pipeline-by-owner" || id === "expected-revenue") {
    const groups = groupBy(deals, (d) => d.owner);
    return {
      kpis: [
        kpi("owners", "Owners", groups.length),
        moneyKpi("gross", "Gross", sum(deals.map((d) => d.value))),
        moneyKpi("expected", "Expected revenue", sum(deals.map((d) => d.weighted))),
      ],
      rows: groups.map(([owner, items]) =>
        row(owner, {
          owner,
          deals: items.length,
          value: sum(items.map((d) => d.value)),
          weighted: sum(items.map((d) => d.weighted)),
        }),
      ),
    };
  }

  if (id === "pipeline-by-loan-type") {
    const groups = groupBy(deals, (d) => d.loanType);
    return {
      kpis: [
        kpi("types", "Loan types", groups.length),
        moneyKpi("value", "Pipeline", sum(deals.map((d) => d.value))),
      ],
      rows: groups.map(([loanType, items]) =>
        row(loanType, {
          loanType,
          deals: items.length,
          value: sum(items.map((d) => d.value)),
          weighted: sum(items.map((d) => d.weighted)),
        }),
      ),
      chart: pieChart("Pipeline mix", groups.map(([name, items]) => ({ name, value: sum(items.map((d) => d.value)) }))),
    };
  }

  if (id === "sales-forecast") {
    const groups = groupBy(deals, (d) => monthKey(d.closeAt, "Unscheduled"));
    return {
      kpis: [
        moneyKpi("forecast", "Forecast", sum(deals.map((d) => d.weighted))),
        kpi("deals", "Forecast deals", deals.length),
      ],
      rows: groups.map(([period, items]) =>
        row(period, {
          period,
          deals: items.length,
          value: sum(items.map((d) => d.value)),
          weighted: sum(items.map((d) => d.weighted)),
        }),
      ),
      chart: barChart(
        "Forecast by period",
        groups.map(([period, items]) => ({ name: period, value: sum(items.map((d) => d.weighted)) })),
      ),
    };
  }

  if (id === "forecast-vs-target") {
    const groups = groupBy(deals, (d) => d.owner);
    const rows = groups.map(([owner, items]) => {
      const forecast = sum(items.map((d) => d.weighted));
      const target = impliedTarget(forecast);
      return { owner, forecast, target, gap: forecast - target, progress: rate(forecast, target) };
    });
    return {
      kpis: [
        moneyKpi("forecast", "Forecast", sum(rows.map((r) => r.forecast))),
        moneyKpi("target", "Implied target", sum(rows.map((r) => r.target))),
      ],
      rows: rows.map((r) => row(r.owner, r)),
    };
  }

  const aged = [...deals.map((d) => ({ kind: "Deal", ...d })), ...leads.filter((l) => l.stage !== "Closed Won" && l.stage !== "Closed Lost").map((l) => ({
    id: l.id,
    name: l.name,
    owner: l.owner,
    stage: l.stage,
    ageDays: l.ageDays,
    value: l.value,
  }))].filter((r) => r.ageDays > 15);
  return {
    kpis: [
      kpi("aged", "Aged records", aged.length),
      moneyKpi("value", "Aged value", sum(aged.map((r) => r.value))),
    ],
    rows: aged.map((r) =>
      row(r.id, {
        name: r.name,
        owner: r.owner,
        stage: r.stage,
        age: r.ageDays,
        value: r.value,
      }),
    ),
  };
}
