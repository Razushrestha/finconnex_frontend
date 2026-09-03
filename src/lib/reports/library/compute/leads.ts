import { daysBetween } from "@/lib/reports/library/format";
import {
  applyCommonFilters,
  appointmentLead,
  inDateRange,
  loadActivities,
  loadDeals,
  loadLeads,
  openLead,
  qualifiedLead,
  type CrmLead,
} from "@/lib/reports/library/records";
import {
  barChart,
  funnelChart,
  groupBy,
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

function leadsInScope(filters: LibraryFilters, now: Date) {
  return applyCommonFilters(
    loadLeads(now).filter((lead) => inDateRange(lead.createdAt, filters.dateRange, now)),
    filters,
  );
}

function firstTouchHours(lead: CrmLead, now: Date) {
  const activities = loadActivities().filter((a) => {
    const blob = `${a.related} ${a.title}`.toLowerCase();
    return blob.includes(lead.name.toLowerCase()) && a.at && lead.createdAt && a.at >= lead.createdAt;
  });
  const first = activities
    .map((a) => a.at)
    .filter((at): at is Date => Boolean(at))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  if (!first || !lead.createdAt) return { first, hours: null as number | null };
  return { first, hours: Math.max(0, Math.round((first.getTime() - lead.createdAt.getTime()) / 3_600_000)) };
}

export function runLeadsReport(id: string, filters: LibraryFilters, now: Date): ReportResult {
  const leads = leadsInScope(filters, now);
  const deals = loadDeals(now);
  const dealsFor = (lead: CrmLead) =>
    deals.filter(
      (d) =>
        d.contact.toLowerCase() === lead.name.toLowerCase() ||
        d.account.toLowerCase() === lead.company.toLowerCase(),
    );

  if (id === "lead-register") {
    return {
      kpis: [
        kpi("total", "Total leads", leads.length),
        kpi("open", "Open", leads.filter(openLead).length),
        kpi("converted", "Converted", leads.filter((l) => l.converted).length),
        moneyKpi("value", "Pipeline value", sum(leads.map((l) => l.value))),
      ],
      rows: leads.map((l) =>
        row(l.id, {
          name: l.name,
          company: l.company,
          owner: l.owner,
          source: l.source,
          status: l.status,
          stage: l.stage,
          value: l.value,
          created: l.createdRaw,
        }),
      ),
    };
  }

  if (id === "lead-source-performance" || id === "lead-owner-performance") {
    const key = filters.groupBy === "owner" || id === "lead-owner-performance" ? "owner" : "source";
    const groups = groupBy(leads, (l) => (key === "owner" ? l.owner : l.source));
    const rows = groups.map(([name, items]) => {
      const qualified = items.filter(qualifiedLead).length;
      const appointments = items.filter(appointmentLead).length;
      const converted = items.filter((l) => l.converted || dealsFor(l).length > 0);
      return {
        name,
        items,
        qualified,
        appointments,
        deals: converted.length,
        conversion: rate(converted.length, items.length),
        value: sum(items.map((l) => l.value)),
      };
    });
    const dealCount = rows.reduce((n, r) => n + r.deals, 0);
    const pipeline = sum(rows.map((r) => r.value));
    return {
      kpis: [
        kpi("leads", "Total leads", leads.length),
        kpi("qualified", "Qualified leads", leads.filter(qualifiedLead).length),
        kpi("appts", "Appointments", leads.filter(appointmentLead).length),
        kpi("deals", "Deals created", dealCount),
        kpi("conv", "Conversion rate", `${rate(dealCount, leads.length)}%`),
        moneyKpi("pipeline", "Pipeline value", pipeline),
      ],
      rows: rows.map((r) =>
        row(r.name, {
          source: r.name,
          owner: r.name,
          leads: r.items.length,
          qualified: r.qualified,
          appointments: r.appointments,
          converted: r.deals,
          deals: r.deals,
          conversion: r.conversion,
          pipeline: r.value,
          value: r.value,
          avgDeal: r.deals ? Math.round(r.value / r.deals) : 0,
        }),
      ),
      chart: (id === "lead-source-performance" ? pieChart : barChart)(
        key === "owner" ? "Leads by owner" : "Leads by Source",
        rows.map((r) => ({ name: r.name, value: r.items.length })),
      ),
    };
  }

  if (id === "lead-conversion-funnel") {
    const stages = [
      { label: "New Lead", match: (l: CrmLead) => true },
      { label: "Qualified", match: qualifiedLead },
      { label: "Appointment", match: appointmentLead },
      { label: "Deal", match: (l: CrmLead) => l.converted || dealsFor(l).length > 0 },
    ];
    const counts = stages.map((s, i) => {
      const items = leads.filter(s.match);
      const prev = i === 0 ? leads.length : leads.filter(stages[i - 1]!.match).length;
      return { label: s.label, items, conversion: rate(items.length, prev) };
    });
    return {
      kpis: [
        kpi("new", "New leads", counts[0]?.items.length ?? 0),
        kpi("qual", "Qualified", counts[1]?.items.length ?? 0),
        kpi("appt", "Appointments", counts[2]?.items.length ?? 0),
        kpi("deal", "Deals", counts[3]?.items.length ?? 0),
      ],
      rows: counts.map((c) =>
        row(c.label, {
          stage: c.label,
          leads: c.items.length,
          value: sum(c.items.map((l) => l.value)),
          conversion: c.conversion,
        }),
      ),
      chart: funnelChart("Lead funnel", counts.map((c) => ({ name: c.label, value: c.items.length }))),
    };
  }

  if (id === "lead-response-performance") {
    const rows = leads.map((l) => {
      const touch = firstTouchHours(l, now);
      return { l, ...touch };
    });
    const timed = rows.filter((r) => r.hours != null);
    const avg = timed.length ? Math.round(sum(timed.map((r) => r.hours ?? 0)) / timed.length) : 0;
    return {
      kpis: [
        kpi("leads", "Leads", leads.length),
        kpi("touched", "Contacted", timed.length),
        kpi("avg", "Avg response (hrs)", avg),
        kpi("fast", "Under 4 hours", timed.filter((r) => (r.hours ?? 99) <= 4).length),
      ],
      rows: rows.map(({ l, first, hours }) =>
        row(l.id, {
          name: l.name,
          owner: l.owner,
          source: l.source,
          created: l.createdRaw,
          firstTouch: first ? first.toISOString() : "—",
          hours: hours ?? "—",
        }),
      ),
    };
  }

  if (id === "lead-ageing") {
    const open = leads.filter(openLead);
    return {
      kpis: [
        kpi("open", "Open leads", open.length),
        kpi("old", "Older than 14 days", open.filter((l) => l.ageDays > 14).length),
        kpi("avg", "Avg age (days)", open.length ? Math.round(sum(open.map((l) => l.ageDays)) / open.length) : 0),
        moneyKpi("value", "Open value", sum(open.map((l) => l.value))),
      ],
      rows: open
        .sort((a, b) => b.ageDays - a.ageDays)
        .map((l) =>
          row(l.id, {
            name: l.name,
            owner: l.owner,
            stage: l.stage,
            created: l.createdRaw,
            age: l.ageDays,
            value: l.value,
          }),
        ),
    };
  }

  if (id === "lead-quality") {
    const buckets = [
      { label: "Qualified", items: leads.filter((l) => qualifiedLead(l) && !l.lostReason.includes("Unqualified") && l.stage !== "Closed Lost") },
      { label: "Unqualified", items: leads.filter((l) => l.status === "Unqualified" || l.stage === "Closed Lost") },
      { label: "Untouched / new", items: leads.filter((l) => l.status === "New" || l.stage === "New Lead") },
    ];
    return {
      kpis: [
        kpi("total", "Total leads", leads.length),
        kpi("q", "Qualified", buckets[0]!.items.length),
        kpi("u", "Unqualified / lost", buckets[1]!.items.length),
        kpi("n", "Still new", buckets[2]!.items.length),
      ],
      rows: buckets.map((b) =>
        row(b.label, {
          quality: b.label,
          leads: b.items.length,
          share: rate(b.items.length, leads.length),
          value: sum(b.items.map((l) => l.value)),
        }),
      ),
      chart: pieChart("Lead quality mix", buckets.map((b) => ({ name: b.label, value: b.items.length }))),
    };
  }

  if (id === "lost-lead-analysis") {
    const lost = leads.filter((l) => l.stage === "Closed Lost" || l.status === "Unqualified");
    const top = groupBy(lost, (l) => l.lostReason).sort((a, b) => b[1].length - a[1].length)[0];
    return {
      kpis: [
        kpi("lost", "Total lost leads", lost.length),
        kpi("rate", "Lost rate", `${rate(lost.length, leads.length)}%`),
        kpi("reason", "Top lost reason", top?.[0] ?? "—"),
        moneyKpi("value", "Lost value", sum(lost.map((l) => l.value))),
      ],
      rows: lost.map((l) =>
        row(l.id, {
          name: l.name,
          owner: l.owner,
          source: l.source,
          reason: l.lostReason,
          created: l.createdRaw,
          value: l.value,
        }),
      ),
    };
  }

  if (id === "inactive-lead") {
    const idle = leads.filter((l) => {
      if (!openLead(l)) return false;
      const last = l.lastTouch ?? l.createdAt;
      return !last || daysBetween(last, now) >= 14;
    });
    return {
      kpis: [
        kpi("idle", "Inactive leads", idle.length),
        kpi("open", "Open leads", leads.filter(openLead).length),
        moneyKpi("value", "At-risk value", sum(idle.map((l) => l.value))),
      ],
      rows: idle.map((l) =>
        row(l.id, {
          name: l.name,
          owner: l.owner,
          stage: l.stage,
          lastTouch: l.lastTouch?.toISOString() ?? l.createdRaw,
          idle: l.lastTouch ? daysBetween(l.lastTouch, now) : l.ageDays,
          value: l.value,
        }),
      ),
    };
  }

  const byMonth = groupBy(leads, (l) => monthKey(l.createdAt));
  const trend = byMonth.map(([period, items]) => {
    const converted = items.filter((l) => l.converted).length;
    return { period, items, converted, conversion: rate(converted, items.length), value: sum(items.map((l) => l.value)) };
  });
  return {
    kpis: [
      kpi("leads", "Leads", leads.length),
      kpi("converted", "Converted", leads.filter((l) => l.converted).length),
      kpi("conv", "Conversion", `${rate(leads.filter((l) => l.converted).length, leads.length)}%`),
    ],
    rows: trend.map((t) =>
      row(t.period, {
        period: t.period,
        leads: t.items.length,
        converted: t.converted,
        conversion: t.conversion,
        value: t.value,
      }),
    ),
    chart: lineChart("Lead volume over time", trend.map((t) => ({ name: t.period, value: t.items.length }))),
  };
}
