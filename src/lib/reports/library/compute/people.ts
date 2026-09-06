import { parseDate } from "@/lib/reports/library/format";
import {
  applyCommonFilters,
  inDateRange,
  loadActivities,
  loadCompanies,
  loadContacts,
  loadDeals,
  loadInvoices,
  loadLeads,
  qualifiedLead,
} from "@/lib/reports/library/records";
import {
  barChart,
  funnelChart,
  groupBy,
  impliedTarget,
  kpi,
  lineChart,
  moneyKpi,
  monthKey,
  rate,
  row,
  sum,
} from "@/lib/reports/library/compute/helpers";
import type { LibraryFilters, ReportResult } from "@/lib/reports/library/types";

export function runTeamReport(id: string, filters: LibraryFilters, now: Date): ReportResult {
  const leads = applyCommonFilters(loadLeads(now).filter((l) => inDateRange(l.createdAt, filters.dateRange, now)), filters);
  const deals = applyCommonFilters(loadDeals(now), filters);
  const invoices = applyCommonFilters(loadInvoices(), filters);
  const activities = applyCommonFilters(loadActivities(), filters);
  const owners = [...new Set([...leads, ...deals, ...invoices, ...activities].map((r) => r.owner))];

  const rows = owners.map((owner) => {
    const l = leads.filter((x) => x.owner === owner);
    const d = deals.filter((x) => x.owner === owner);
    const won = d.filter((x) => x.won);
    const inv = invoices.filter((x) => x.owner === owner);
    const acts = activities.filter((x) => x.owner === owner);
    return {
      owner,
      leads: l.length,
      qualified: l.filter(qualifiedLead).length,
      converted: l.filter((x) => x.converted).length,
      open: d.filter((x) => !x.won && !x.lost).length,
      won: won.length,
      lost: d.filter((x) => x.lost).length,
      winRate: rate(won.length, won.length + d.filter((x) => x.lost).length),
      settled: won.length,
      value: sum(won.map((x) => x.value)),
      revenue: sum(inv.map((x) => x.total)),
      collected: sum(inv.map((x) => x.amountPaid)),
      activities: acts.length,
      tasks: acts.filter((a) => a.kind === "Task").length,
      calls: acts.filter((a) => a.kind === "Call").length,
      emails: acts.filter((a) => a.kind === "Email").length,
      meetings: acts.filter((a) => a.kind === "Meeting").length,
      leadToDeal: rate(d.length, l.length),
      dealToWon: rate(won.length, d.length),
      leadToWon: rate(won.length, l.length),
      target: impliedTarget(sum(won.map((x) => x.value))),
      perActivity: acts.length ? Math.round(sum(won.map((x) => x.value)) / acts.length) : 0,
    };
  });

  if (id === "performance-trend-by-user") {
    const trend = deals.filter((d) => d.won);
    return {
      kpis: [kpi("won", "Won deals", trend.length), moneyKpi("value", "Won value", sum(trend.map((d) => d.value)))],
      rows: trend.map((d) =>
        row(`${d.id}`, {
          period: monthKey(d.closeAt),
          owner: d.owner,
          won: 1,
          value: d.value,
        }),
      ),
    };
  }

  return {
    kpis: [
      kpi("owners", "Team members", rows.length),
      kpi("leads", "Leads", leads.length),
      kpi("won", "Settlements", sum(rows.map((r) => r.won))),
      moneyKpi("value", "Won value", sum(rows.map((r) => r.value))),
    ],
    rows: rows.map((r) =>
      row(r.owner, {
        ...r,
        actual: r.value,
        progress: rate(r.value, r.target),
      }),
    ),
  };
}

export function runContactReport(id: string, filters: LibraryFilters, now: Date): ReportResult {
  const contacts = applyCommonFilters(
    loadContacts().filter((c) => inDateRange(c.createdAt, filters.dateRange, now) || filters.dateRange === "all"),
    filters,
  );
  const companies = applyCommonFilters(loadCompanies(), filters);
  const deals = loadDeals(now);
  const activities = loadActivities();

  if (id === "company-register") {
    return {
      kpis: [kpi("companies", "Companies", companies.length)],
      rows: companies.map((c) =>
        row(c.id, {
          name: c.name,
          industry: c.industry,
          owner: c.owner,
          status: c.status,
          city: c.city ?? "—",
        }),
      ),
    };
  }

  if (id === "companies-with-active-deals") {
    const rows = companies
      .map((c) => {
        const open = deals.filter((d) => !d.won && !d.lost && d.account.toLowerCase() === c.name.toLowerCase());
        return { c, open };
      })
      .filter((r) => r.open.length);
    return {
      kpis: [kpi("active", "Companies with pipeline", rows.length), moneyKpi("value", "Pipeline", sum(rows.flatMap((r) => r.open.map((d) => d.value))))],
      rows: rows.map(({ c, open }) =>
        row(c.id, {
          name: c.name,
          owner: c.owner,
          deals: open.length,
          value: sum(open.map((d) => d.value)),
        }),
      ),
    };
  }

  if (id === "customer-activity-history") {
    const rows = activities.filter((a) => inDateRange(a.at, filters.dateRange, now));
    return {
      kpis: [kpi("acts", "Activities", rows.length)],
      rows: rows.map((a) =>
        row(a.id, {
          kind: a.kind,
          title: a.title,
          related: a.related,
          owner: a.owner,
          when: a.rawDate,
        }),
      ),
    };
  }

  if (id === "contacts-by-owner") {
    const groups = groupBy(contacts, (c) => c.owner);
    return {
      kpis: [kpi("contacts", "Contacts", contacts.length), kpi("owners", "Owners", groups.length)],
      rows: groups.map(([owner, items]) =>
        row(owner, {
          owner,
          contacts: items.length,
          active: items.filter((c) => c.status === "Active").length,
        }),
      ),
    };
  }

  if (id === "contacts-with-active-deals") {
    const rows = contacts
      .map((c) => ({
        c,
        deals: (c.dealIds?.length ?? 0) || deals.filter((d) => !d.won && !d.lost && d.contact.toLowerCase() === c.name.toLowerCase()).length,
      }))
      .filter((r) => r.deals > 0);
    return {
      kpis: [kpi("linked", "Contacts with deals", rows.length)],
      rows: rows.map(({ c, deals: n }) => row(c.id, { name: c.name, company: c.company, owner: c.owner, deals: n })),
    };
  }

  if (id === "contacts-with-no-activity") {
    const idle = contacts.filter((c) => {
      const key = c.name.toLowerCase();
      return !activities.some((a) => a.related.toLowerCase().includes(key));
    });
    return {
      kpis: [kpi("idle", "No recorded activity", idle.length)],
      rows: idle.map((c) =>
        row(c.id, {
          name: c.name,
          company: c.company,
          owner: c.owner,
          created: c.createdDate,
        }),
      ),
    };
  }

  if (id === "contact-engagement") {
    return {
      kpis: [kpi("contacts", "Contacts", contacts.length)],
      rows: contacts.map((c) => {
        const key = c.name.toLowerCase();
        return row(c.id, {
          name: c.name,
          owner: c.owner,
          activities: activities.filter((a) => a.related.toLowerCase().includes(key)).length,
          deals: deals.filter((d) => d.contact.toLowerCase() === key).length,
        });
      }),
    };
  }

  if (id === "duplicate-contact") {
    const seen = new Map<string, typeof contacts>();
    for (const c of contacts) {
      const email = c.email.trim().toLowerCase();
      const name = c.name.trim().toLowerCase();
      const key = email || name;
      const list = seen.get(key) ?? [];
      list.push(c);
      seen.set(key, list);
    }
    const dups = [...seen.entries()].filter(([, list]) => list.length > 1).flatMap(([key, list]) =>
      list.map((c) => ({ c, match: key.includes("@") ? "Email" : "Name" })),
    );
    return {
      kpis: [kpi("dups", "Possible duplicates", dups.length)],
      rows: dups.map(({ c, match }) =>
        row(c.id, {
          name: c.name,
          email: c.email,
          company: c.company,
          owner: c.owner,
          match,
        }),
      ),
    };
  }

  const shown = id === "new-contacts" ? contacts : contacts;
  return {
    kpis: [kpi("contacts", "Contacts", shown.length), kpi("active", "Active", shown.filter((c) => c.status === "Active").length)],
    rows: shown.map((c) =>
      row(c.id, {
        name: c.name,
        company: c.company,
        owner: c.owner,
        source: c.source,
        status: c.status,
        created: c.createdDate,
      }),
    ),
  };
}

export function runExecutiveReport(id: string, filters: LibraryFilters, now: Date): ReportResult {
  const leads = applyCommonFilters(loadLeads(now).filter((l) => inDateRange(l.createdAt, filters.dateRange, now)), filters);
  const deals = applyCommonFilters(loadDeals(now), filters);
  const invoices = applyCommonFilters(loadInvoices(), filters);
  const won = deals.filter((d) => d.won);
  const open = deals.filter((d) => !d.won && !d.lost);
  const settledValue = sum(won.map((d) => d.value));
  const target = impliedTarget(settledValue);
  const billed = sum(invoices.map((i) => i.total));
  const collected = sum(invoices.map((i) => i.amountPaid));

  if (id === "executive-business-overview") {
    const metrics = [
      { metric: "New / total leads", value: String(leads.length), note: "Demand created in the selected window." },
      { metric: "Open pipeline", value: money(open), note: "Deals still expected to settle." },
      { metric: "Settlements", value: `${won.length} / ${moneyStr(settledValue)}`, note: "Won deals and their value." },
      { metric: "Billed revenue", value: moneyStr(billed), note: "Invoice value raised." },
      { metric: "Collected", value: moneyStr(collected), note: "Cash received against invoices." },
      { metric: "Lead → won", value: `${rate(won.length, leads.length)}%`, note: "End-to-end commercial conversion." },
    ];
    return {
      kpis: [
        kpi("leads", "Leads", leads.length),
        moneyKpi("pipe", "Pipeline", sum(open.map((d) => d.value))),
        moneyKpi("won", "Settled", settledValue),
        kpi("conv", "Lead → won", `${rate(won.length, leads.length)}%`),
      ],
      rows: metrics.map((m) => row(m.metric, m)),
    };
  }

  if (id === "sales-pipeline-performance") {
    const groups = groupBy(open, (d) => d.stage);
    return {
      kpis: [kpi("open", "Open deals", open.length), moneyKpi("value", "Pipeline", sum(open.map((d) => d.value)))],
      rows: groups.map(([stage, items]) =>
        row(stage, { stage, records: items.length, value: sum(items.map((d) => d.value)) }),
      ),
      chart: barChart(
        "Pipeline value",
        groups.map(([stage, items]) => ({ name: stage, value: sum(items.map((d) => d.value)) })),
      ),
    };
  }

  if (id === "revenue-performance") {
    const trend = groupBy(invoices, (i) => monthKey(parseDate(i.createdAt)));
    return {
      kpis: [moneyKpi("billed", "Billed", billed), moneyKpi("collected", "Collected", collected)],
      rows: trend.map(([period, items]) =>
        row(period, {
          period,
          revenue: sum(items.map((i) => i.total)),
          collected: sum(items.map((i) => i.amountPaid)),
        }),
      ),
    };
  }

  if (id === "settlement-performance" || id === "executive-team-performance") {
    const groups = groupBy(won, (d) => d.owner);
    return {
      kpis: [kpi("settled", "Settlements", won.length), moneyKpi("value", "Settled value", settledValue)],
      rows: groups.map(([owner, items]) =>
        row(owner, {
          owner,
          leads: leads.filter((l) => l.owner === owner).length,
          settled: items.length,
          won: items.length,
          value: sum(items.map((d) => d.value)),
          conversion: rate(items.length, leads.filter((l) => l.owner === owner).length),
        }),
      ),
    };
  }

  if (id === "lead-to-settlement-funnel") {
    const stages = [
      { label: "Leads", count: leads.length, value: sum(leads.map((l) => l.value)) },
      { label: "Qualified", count: leads.filter(qualifiedLead).length, value: sum(leads.filter(qualifiedLead).map((l) => l.value)) },
      { label: "Open deals", count: open.length, value: sum(open.map((d) => d.value)) },
      { label: "Settled", count: won.length, value: settledValue },
    ];
    return {
      kpis: [kpi("leads", "Leads", leads.length), kpi("settled", "Settled", won.length), kpi("rate", "Conversion", `${rate(won.length, leads.length)}%`)],
      rows: stages.map((s, i) =>
        row(s.label, {
          stage: s.label,
          count: s.count,
          value: s.value,
          conversion: rate(s.count, i === 0 ? leads.length : stages[i - 1]!.count),
        }),
      ),
      chart: funnelChart("Lead to settlement", stages.map((s) => ({ name: s.label, value: s.count }))),
    };
  }

  if (id === "executive-target-vs-actual") {
    return {
      kpis: [moneyKpi("actual", "Actual settlements", settledValue), moneyKpi("target", "Implied target", target)],
      rows: [
        row("settlements", {
          metric: "Settlements",
          actual: settledValue,
          target,
          progress: rate(settledValue, target),
        }),
        row("revenue", {
          metric: "Billed revenue",
          actual: billed,
          target: impliedTarget(billed),
          progress: rate(billed, impliedTarget(billed)),
        }),
      ],
    };
  }

  if (id === "business-kpi-scorecard") {
    const cards = [
      { kpi: "Lead volume", value: String(leads.length), health: leads.length ? "On track" : "Watch", note: "Enough inbound demand to feed the funnel." },
      { kpi: "Open pipeline", value: moneyStr(sum(open.map((d) => d.value))), health: open.length ? "On track" : "Watch", note: "Future settlements still in play." },
      { kpi: "Settlement value", value: moneyStr(settledValue), health: settledValue ? "On track" : "Watch", note: "Won deals in the selected window." },
      { kpi: "Collection rate", value: `${rate(collected, billed)}%`, health: billed && collected / billed >= 0.7 ? "On track" : "Watch", note: "Cash collected versus billed." },
      { kpi: "Lead → won", value: `${rate(won.length, leads.length)}%`, health: rate(won.length, leads.length) >= 10 ? "On track" : "Watch", note: "End-to-end conversion." },
    ];
    return {
      kpis: cards.map((c) => kpi(c.kpi, c.kpi, c.value)),
      rows: cards.map((c) => row(c.kpi, c)),
    };
  }

  const leadTrend = groupBy(leads, (l) => monthKey(l.createdAt));
  return {
    kpis: [kpi("periods", "Periods", leadTrend.length), moneyKpi("settled", "Settled", settledValue)],
    rows: leadTrend.map(([period, items], index) => {
      const prev = leadTrend[index - 1]?.[1].length ?? items.length;
      const periodWon = won.filter((d) => monthKey(d.closeAt) === period);
      const periodInv = invoices.filter((i) => monthKey(parseDate(i.createdAt)) === period);
      return row(period, {
        period,
        leads: items.length,
        won: periodWon.length,
        revenue: sum(periodInv.map((i) => i.total)),
        pipeline: sum(open.filter((d) => monthKey(d.closeAt) === period).map((d) => d.value)),
        settled: sum(periodWon.map((d) => d.value)),
        collected: sum(periodInv.map((i) => i.amountPaid)),
        leadGrowth: rate(items.length - prev, prev),
      });
    }),
    chart: lineChart(
      "Lead growth",
      leadTrend.map(([period, items]) => ({ name: period, value: items.length })),
    ),
  };
}

function money(deals: { value: number }[]) {
  return moneyStr(sum(deals.map((d) => d.value)));
}

function moneyStr(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}
