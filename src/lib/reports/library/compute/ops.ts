import { daysBetween } from "@/lib/reports/library/format";
import {
  applyCommonFilters,
  inDateRange,
  loadActivities,
  loadDeals,
  loadDocuments,
  loadLeads,
  type CrmActivity,
} from "@/lib/reports/library/records";
import {
  barChart,
  groupBy,
  kpi,
  lineChart,
  monthKey,
  rate,
  row,
  sum,
} from "@/lib/reports/library/compute/helpers";
import type { LibraryFilters, ReportResult } from "@/lib/reports/library/types";

function acts(filters: LibraryFilters, now: Date, kind?: CrmActivity["kind"]) {
  return applyCommonFilters(
    loadActivities().filter((a) => {
      if (kind && a.kind !== kind) return false;
      return inDateRange(a.at, filters.dateRange, now);
    }),
    filters,
  );
}

export function runActivityReport(id: string, filters: LibraryFilters, now: Date): ReportResult {
  const all = acts(filters, now);
  const tasks = all.filter((a) => a.kind === "Task");
  const calls = all.filter((a) => a.kind === "Call");
  const emails = all.filter((a) => a.kind === "Email");
  const meetings = all.filter((a) => a.kind === "Meeting");
  const follow = all.filter((a) => a.kind === "Follow-up");

  if (id === "activity-register") {
    return {
      kpis: [
        kpi("total", "Activities", all.length),
        kpi("tasks", "Tasks", tasks.length),
        kpi("calls", "Calls", calls.length),
        kpi("meetings", "Meetings", meetings.length),
      ],
      rows: all.map((a) =>
        row(a.id, {
          kind: a.kind,
          title: a.title,
          owner: a.owner,
          related: a.related,
          status: a.status,
          when: a.rawDate,
        }),
      ),
    };
  }

  if (id === "task-completion") {
    const groups = groupBy(tasks, (t) => t.owner);
    return {
      kpis: [
        kpi("tasks", "Tasks", tasks.length),
        kpi("done", "Completed", tasks.filter((t) => t.status === "Completed").length),
        kpi("rate", "Completion", `${rate(tasks.filter((t) => t.status === "Completed").length, tasks.length)}%`),
      ],
      rows: groups.map(([owner, items]) => {
        const completed = items.filter((t) => t.status === "Completed").length;
        return row(owner, {
          owner,
          total: items.length,
          completed,
          open: items.length - completed,
          rate: rate(completed, items.length),
        });
      }),
    };
  }

  if (id === "overdue-task") {
    const overdue = tasks.filter((t) => t.overdue || (t.at && t.at < now && t.status !== "Completed" && t.status !== "Cancelled"));
    return {
      kpis: [kpi("overdue", "Overdue tasks", overdue.length), kpi("owners", "Owners affected", new Set(overdue.map((t) => t.owner)).size)],
      rows: overdue.map((a) =>
        row(a.id, {
          title: a.title,
          owner: a.owner,
          related: a.related,
          when: a.rawDate,
          extra: a.extra,
          status: a.status,
        }),
      ),
    };
  }

  if (id === "call-activity" || id === "email-activity" || id === "appointment-activity") {
    const rows = id === "call-activity" ? calls : id === "email-activity" ? emails : meetings;
    return {
      kpis: [
        kpi("total", "Records", rows.length),
        kpi("owners", "Owners", new Set(rows.map((r) => r.owner)).size),
      ],
      rows: rows.map((a) =>
        row(a.id, {
          title: a.title,
          owner: a.owner,
          related: a.related,
          extra: a.extra,
          status: a.status,
          when: a.rawDate,
        }),
      ),
    };
  }

  if (id === "follow-up-performance") {
    const groups = groupBy(follow, (f) => f.owner);
    return {
      kpis: [
        kpi("total", "Follow-ups", follow.length),
        kpi("open", "Still open", follow.filter((f) => f.status === "Pending" || f.status === "Snoozed").length),
      ],
      rows: groups.map(([owner, items]) => {
        const done = items.filter((f) => f.status === "Triggered" || f.status === "Dismissed").length;
        return row(owner, {
          owner,
          total: items.length,
          open: items.length - done,
          done,
          rate: rate(done, items.length),
        });
      }),
    };
  }

  if (id === "activity-by-team-member" || id === "team-productivity") {
    const groups = groupBy(all, (a) => a.owner);
    return {
      kpis: [kpi("people", "Team members", groups.length), kpi("total", "Activities", all.length)],
      rows: groups.map(([owner, items]) => {
        const completed = items.filter((i) => i.status === "Completed" || i.status === "Triggered").length;
        const overdue = items.filter((i) => i.overdue).length;
        return row(owner, {
          owner,
          tasks: items.filter((i) => i.kind === "Task").length,
          calls: items.filter((i) => i.kind === "Call").length,
          emails: items.filter((i) => i.kind === "Email").length,
          meetings: items.filter((i) => i.kind === "Meeting").length,
          total: items.length,
          completed,
          overdue,
          score: rate(completed, items.length),
        });
      }),
      chart: barChart(
        "Activity volume",
        groups.map(([owner, items]) => ({ name: owner, value: items.length })),
      ),
    };
  }

  const leads = applyCommonFilters(loadLeads(now), filters);
  const deals = applyCommonFilters(loadDeals(now), filters);
  const groups = groupBy(all, (a) => a.owner);
  return {
    kpis: [
      kpi("acts", "Activities", all.length),
      kpi("leads", "Leads", leads.length),
      kpi("deals", "Deals", deals.length),
    ],
    rows: groups.map(([owner, items]) => {
      const ownerLeads = leads.filter((l) => l.owner === owner).length;
      return row(owner, {
        owner,
        activities: items.length,
        leads: ownerLeads,
        deals: deals.filter((d) => d.owner === owner).length,
        perLead: ownerLeads ? Math.round((items.length / ownerLeads) * 10) / 10 : items.length,
      });
    }),
  };
}

export function runDocumentReport(id: string, filters: LibraryFilters, now: Date): ReportResult {
  const docs = applyCommonFilters(
    loadDocuments().filter((d) => inDateRange(d.requestedAt, filters.dateRange, now)),
    filters,
  );
  const pending = docs.filter((d) => d.status === "Requested" || d.status === "Pending");
  const complete = docs.filter((d) => d.status === "Received" || d.status === "Approved");
  const overdue = docs.filter((d) => d.dueAt && d.dueAt < now && !complete.includes(d));

  if (id === "document-register") {
    return {
      kpis: [kpi("total", "Requests", docs.length), kpi("pending", "Pending", pending.length), kpi("done", "Complete", complete.length)],
      rows: docs.map((d) =>
        row(d.id, {
          title: d.title,
          related: d.related,
          owner: d.owner,
          type: d.type,
          status: d.status,
          due: d.dueRaw,
        }),
      ),
    };
  }

  if (id === "documents-requested-vs-received") {
    return {
      kpis: [
        kpi("awaiting", "Items awaiting", sum(docs.map((d) => d.awaiting))),
        kpi("received", "Items received", sum(docs.map((d) => d.received))),
      ],
      rows: docs.map((d) =>
        row(d.id, {
          title: d.title,
          owner: d.owner,
          awaiting: d.awaiting,
          received: d.received,
          progress: d.progress,
        }),
      ),
    };
  }

  if (id === "pending-documents" || id === "deals-waiting-on-documents") {
    return {
      kpis: [kpi("pending", "Pending packs", pending.length), kpi("overdue", "Overdue", overdue.length)],
      rows: pending.map((d) =>
        row(d.id, {
          title: d.title,
          related: d.related,
          owner: d.owner,
          status: d.status,
          due: d.dueRaw,
          progress: d.progress,
        }),
      ),
    };
  }

  if (id === "overdue-document") {
    return {
      kpis: [kpi("overdue", "Overdue packs", overdue.length)],
      rows: overdue.map((d) =>
        row(d.id, {
          title: d.title,
          related: d.related,
          owner: d.owner,
          due: d.dueRaw,
          status: d.status,
        }),
      ),
    };
  }

  if (id === "missing-documents-by-deal") {
    const groups = groupBy(pending, (d) => d.related || "Unassigned");
    return {
      kpis: [kpi("records", "Records waiting", groups.length), kpi("missing", "Missing items", sum(pending.map((d) => d.awaiting)))],
      rows: groups.map(([related, items]) =>
        row(related, {
          related,
          requests: items.length,
          awaiting: sum(items.map((d) => d.awaiting)),
          progress: items.length ? Math.round(sum(items.map((d) => d.progress)) / items.length) : 0,
        }),
      ),
    };
  }

  if (id === "document-completion-rate" || id === "document-activity-by-member") {
    const groups = groupBy(docs, (d) => d.owner);
    return {
      kpis: [
        kpi("rate", "Completion rate", `${rate(complete.length, docs.length)}%`),
        kpi("total", "Requests", docs.length),
      ],
      rows: groups.map(([owner, items]) => {
        const done = items.filter((d) => d.status === "Received" || d.status === "Approved").length;
        return row(owner, {
          owner,
          total: items.length,
          complete: done,
          pending: items.length - done,
          rate: rate(done, items.length),
        });
      }),
    };
  }

  if (id === "document-turnaround") {
    const timed = docs.filter((d) => d.requestedAt && d.receivedAt);
    return {
      kpis: [
        kpi("measured", "Measured packs", timed.length),
        kpi("avg", "Avg days", timed.length ? Math.round(sum(timed.map((d) => daysBetween(d.requestedAt!, d.receivedAt!))) / timed.length) : 0),
      ],
      rows: docs.map((d) =>
        row(d.id, {
          title: d.title,
          owner: d.owner,
          requested: d.requestedRaw,
          received: d.receivedAt ? d.receivedAt.toISOString() : "—",
          days: d.requestedAt && d.receivedAt ? daysBetween(d.requestedAt, d.receivedAt) : "—",
        }),
      ),
    };
  }

  const trend = groupBy(docs, (d) => monthKey(d.requestedAt));
  return {
    kpis: [kpi("requests", "Requests", docs.length), kpi("approved", "Approved", docs.filter((d) => d.status === "Approved").length)],
    rows: trend.map(([period, items]) =>
      row(period, {
        period,
        requested: items.length,
        received: items.filter((d) => d.status === "Received").length,
        approved: items.filter((d) => d.status === "Approved").length,
      }),
    ),
    chart: lineChart(
      "Document volume",
      trend.map(([period, items]) => ({ name: period, value: items.length })),
    ),
  };
}
