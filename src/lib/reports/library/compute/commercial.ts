import { parseDate } from "@/lib/reports/library/format";
import {
  applyCommonFilters,
  inDateRange,
  loadCampaigns,
  loadDeals,
  loadEstimates,
  loadInvoices,
  loadLeads,
  loadPayments,
  loadProducts,
} from "@/lib/reports/library/records";
import {
  barChart,
  groupBy,
  kpi,
  lineChart,
  moneyKpi,
  monthKey,
  rate,
  row,
  sum,
} from "@/lib/reports/library/compute/helpers";
import type { LibraryFilters, ReportResult } from "@/lib/reports/library/types";

export function runMarketingReport(id: string, filters: LibraryFilters, now: Date): ReportResult {
  const campaigns = loadCampaigns().filter((c) => inDateRange(c.createdAt, filters.dateRange, now));
  const leads = applyCommonFilters(
    loadLeads(now).filter((l) => inDateRange(l.createdAt, filters.dateRange, now)),
    filters,
  );
  const deals = applyCommonFilters(loadDeals(now), filters);

  const attributed = campaigns.map((c) => {
    const cLeads = leads.filter(
      (l) => l.campaign === c.name || l.source.toLowerCase().includes(c.name.toLowerCase().slice(0, 8)),
    );
    const cDeals = deals.filter((d) =>
      cLeads.some((l) => l.name === d.contact || l.company === d.account),
    );
    const settled = cDeals.filter((d) => d.won);
    return { ...c, leads: cLeads, deals: cDeals, settled };
  });

  if (id === "campaign-performance") {
    return {
      kpis: [
        kpi("campaigns", "Campaigns", attributed.length),
        kpi("leads", "Attributed leads", sum(attributed.map((c) => c.leads.length))),
        kpi("deals", "Attributed deals", sum(attributed.map((c) => c.deals.length))),
      ],
      rows: attributed.map((c) =>
        row(c.id, {
          name: c.name,
          channel: c.channel,
          sent: c.sent,
          engaged: c.engaged,
          leads: c.leads.length,
          deals: c.deals.length,
        }),
      ),
      chart: barChart(
        "Leads by campaign",
        attributed.map((c) => ({ name: c.name, value: c.leads.length })),
      ),
    };
  }

  if (id === "marketing-lead-source") {
    const groups = groupBy(leads, (l) => l.source);
    return {
      kpis: [kpi("sources", "Sources", groups.length), kpi("leads", "Leads", leads.length)],
      rows: groups.map(([source, items]) => {
        const dealsN = items.filter((l) => l.converted).length;
        return row(source, {
          source,
          leads: items.length,
          qualified: items.filter((l) => l.status !== "New" && l.status !== "Unqualified").length,
          deals: dealsN,
          conversion: rate(dealsN, items.length),
        });
      }),
    };
  }

  if (id === "leads-by-campaign") {
    return {
      kpis: [kpi("leads", "Leads", leads.length), kpi("campaigns", "Campaigns", new Set(leads.map((l) => l.campaign)).size)],
      rows: leads.map((l) =>
        row(l.id, {
          name: l.name,
          campaign: l.campaign,
          source: l.source,
          owner: l.owner,
          stage: l.stage,
          value: l.value,
        }),
      ),
    };
  }

  if (id === "campaign-deal-conversion" || id === "campaign-settlement-conversion" || id === "campaign-revenue") {
    return {
      kpis: [
        kpi("deals", "Deals", sum(attributed.map((c) => c.deals.length))),
        kpi("settled", "Settlements", sum(attributed.map((c) => c.settled.length))),
        moneyKpi("rev", "Attributed revenue", sum(attributed.flatMap((c) => c.settled.map((d) => d.value)))),
      ],
      rows: attributed.map((c) =>
        row(c.id, {
          campaign: c.name,
          leads: c.leads.length,
          deals: c.deals.length,
          settled: c.settled.length,
          conversion: id === "campaign-settlement-conversion" ? rate(c.settled.length, c.leads.length) : rate(c.deals.length, c.leads.length),
          value: sum((id === "campaign-deal-conversion" ? c.deals : c.settled).map((d) => d.value)),
        }),
      ),
      chart: barChart(
        "Attributed revenue",
        attributed.map((c) => ({ name: c.name, value: sum(c.settled.map((d) => d.value)) })),
      ),
    };
  }

  if (id === "cost-per-lead" || id === "cost-per-deal" || id === "marketing-roi") {
    return {
      kpis: [
        kpi("note", "Spend recorded", "Not in CRM", "Campaign cost is not a stored field — efficiency uses send volume."),
        kpi("leads", "Leads", leads.length),
        moneyKpi("rev", "Attributed revenue", sum(attributed.flatMap((c) => c.settled.map((d) => d.value)))),
      ],
      rows: attributed.map((c) =>
        row(c.id, {
          campaign: c.name,
          leads: c.leads.length,
          deals: c.deals.length,
          sent: c.sent,
          efficiency:
            c.sent > 0
              ? Math.round(((id === "cost-per-deal" ? c.deals.length : c.leads.length) / c.sent) * 1000) / 10
              : 0,
          value: sum(c.settled.map((d) => d.value)),
          yield: c.sent > 0 ? Math.round((sum(c.settled.map((d) => d.value)) / c.sent) * 100) : 0,
        }),
      ),
    };
  }

  const trend = groupBy(leads, (l) => monthKey(l.createdAt));
  return {
    kpis: [kpi("leads", "Campaign leads", leads.length)],
    rows: trend.map(([period, items]) =>
      row(period, {
        period,
        leads: items.length,
        deals: items.filter((l) => l.converted).length,
        value: sum(items.map((l) => l.value)),
      }),
    ),
    chart: lineChart(
      "Campaign leads",
      trend.map(([period, items]) => ({ name: period, value: items.length })),
    ),
  };
}

export function runFinanceReport(id: string, filters: LibraryFilters, now: Date): ReportResult {
  const estimates = applyCommonFilters(
    loadEstimates().filter((e) => inDateRange(parseDate(e.createdAt), filters.dateRange, now)),
    filters,
  );
  const invoices = applyCommonFilters(
    loadInvoices().filter((e) => inDateRange(parseDate(e.createdAt), filters.dateRange, now)),
    filters,
  );
  const payments = applyCommonFilters(
    loadPayments().filter((e) => inDateRange(parseDate(e.receivedAt), filters.dateRange, now)),
    filters,
  );

  if (id === "estimate-register") {
    return {
      kpis: [
        kpi("total", "Estimates", estimates.length),
        moneyKpi("value", "Value", sum(estimates.map((e) => e.total))),
        kpi("converted", "Accepted / converted", estimates.filter((e) => e.status === "Accepted" || e.status === "Converted").length),
      ],
      rows: estimates.map((e) =>
        row(e.id, {
          ref: e.estimateId,
          client: e.clientName,
          owner: e.owner,
          status: e.status,
          total: e.total,
          created: e.createdAt,
        }),
      ),
    };
  }

  if (id === "estimate-conversion") {
    const groups = groupBy(estimates, (e) => e.owner);
    return {
      kpis: [
        kpi("rate", "Conversion", `${rate(estimates.filter((e) => e.status === "Accepted" || e.status === "Converted").length, estimates.length)}%`),
      ],
      rows: groups.map(([owner, items]) => {
        const converted = items.filter((e) => e.status === "Accepted" || e.status === "Converted");
        return row(owner, {
          owner,
          total: items.length,
          converted: converted.length,
          rate: rate(converted.length, items.length),
          value: sum(converted.map((e) => e.total)),
        });
      }),
    };
  }

  if (id === "invoice-register") {
    return {
      kpis: [
        kpi("invoices", "Invoices", invoices.length),
        moneyKpi("billed", "Billed", sum(invoices.map((i) => i.total))),
        moneyKpi("due", "Outstanding", sum(invoices.map((i) => i.amountDue))),
      ],
      rows: invoices.map((i) =>
        row(i.id, {
          ref: i.invoiceId,
          client: i.clientName,
          owner: i.owner,
          status: i.status,
          total: i.total,
          due: i.amountDue,
        }),
      ),
    };
  }

  if (id === "invoice-ageing" || id === "overdue-invoice") {
    const open = invoices.filter((i) => i.amountDue > 0 && i.status !== "Cancelled" && i.status !== "Void");
    const rows = open.map((i) => {
      const due = parseDate(i.dueDate);
      const age = due ? Math.round((now.getTime() - due.getTime()) / 86_400_000) : 0;
      const bucket = age <= 0 ? "Current" : age <= 30 ? "1–30 days" : age <= 60 ? "31–60 days" : "60+ days";
      return { i, age, bucket, overdue: age > 0 };
    });
    const shown = id === "overdue-invoice" ? rows.filter((r) => r.overdue) : rows;
    return {
      kpis: [
        kpi("open", "Open invoices", shown.length),
        moneyKpi("due", "Amount due", sum(shown.map((r) => r.i.amountDue))),
      ],
      rows: shown.map(({ i, bucket }) =>
        row(i.id, {
          ref: i.invoiceId,
          client: i.clientName,
          owner: i.owner,
          bucket,
          due: i.amountDue,
          dueDate: i.dueDate,
        }),
      ),
    };
  }

  if (id === "payment-collection") {
    return {
      kpis: [
        kpi("payments", "Payments", payments.length),
        moneyKpi("collected", "Collected", sum(payments.filter((p) => p.status === "Completed").map((p) => p.amount))),
      ],
      rows: payments.map((p) =>
        row(p.id, {
          ref: p.paymentId,
          invoice: p.invoiceRef,
          client: p.clientName,
          amount: p.amount,
          method: p.method,
          when: p.receivedAt,
        }),
      ),
    };
  }

  if (id === "revenue-by-team-member") {
    const groups = groupBy(invoices, (i) => i.owner);
    return {
      kpis: [moneyKpi("rev", "Revenue", sum(invoices.map((i) => i.total))), moneyKpi("paid", "Collected", sum(invoices.map((i) => i.amountPaid)))],
      rows: groups.map(([owner, items]) =>
        row(owner, {
          owner,
          invoices: items.length,
          revenue: sum(items.map((i) => i.total)),
          collected: sum(items.map((i) => i.amountPaid)),
        }),
      ),
    };
  }

  if (id === "revenue-by-service") {
    const lines = invoices.flatMap((inv) => inv.lineItems.map((line) => ({ ...line, owner: inv.owner })));
    const catalog = loadProducts();
    const groups = groupBy(lines, (l) => l.name || catalog.find((p) => p.id === l.productId)?.name || "Item");
    return {
      kpis: [kpi("items", "Line items", lines.length), moneyKpi("rev", "Revenue", sum(lines.map((l) => l.quantity * l.unitPrice)))],
      rows: groups.map(([name, items]) =>
        row(name, {
          name,
          qty: sum(items.map((l) => l.quantity)),
          revenue: sum(items.map((l) => l.quantity * l.unitPrice)),
        }),
      ),
    };
  }

  const trend = groupBy(invoices, (i) => monthKey(parseDate(i.createdAt)));
  const payTrend = groupBy(payments, (p) => monthKey(parseDate(p.receivedAt)));
  return {
    kpis: [
      moneyKpi("rev", "Billed", sum(invoices.map((i) => i.total))),
      moneyKpi("col", "Collected", sum(payments.filter((p) => p.status === "Completed").map((p) => p.amount))),
    ],
    rows: trend.map(([period, items]) =>
      row(period, {
        period,
        invoices: items.length,
        revenue: sum(items.map((i) => i.total)),
        collected: sum((payTrend.find(([p]) => p === period)?.[1] ?? []).map((p) => p.amount)),
      }),
    ),
    chart: (id === "revenue-collection-trend" ? lineChart : barChart)(
      id === "revenue-collection-trend" ? "Billed vs collected" : "Revenue by month",
      trend.map(([period, items]) => ({ name: period, value: sum(items.map((i) => i.total)) })),
    ),
  };
}
