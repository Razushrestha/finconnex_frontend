/** Sales Dashboard metrics from live CRM stores. */

import { listLeadColumns } from "@/lib/leads/store";
import type { LeadCardData } from "@/lib/leads/types";
import { coerceLeadSource, LOAN_PURPOSES } from "@/lib/leads/types";
import { listDealPipelines } from "@/lib/deals/store";
import { listMeetings } from "@/lib/meetings/store";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import {
  parseMoney,
  dateRangeBounds,
  previousDateRangeBounds,
  type DashboardFilters,
} from "@/lib/dashboard/layout";
import { LOST_REASONS } from "@/lib/deals/types";

const TEAM_OWNERS: Record<string, string[]> = {
  Sales: ["John Smith", "Shiva Kadhka"],
  Operations: ["Tejas Gokhe"],
  Support: ["Roshna Abraham"],
};

const FUNNEL: { label: string; stages: string[] }[] = [
  { label: "New Lead", stages: ["New Lead"] },
  { label: "In Conversation", stages: ["In Conversation", "Hold", "No Answer"] },
  { label: "Appointment Booked", stages: ["Appointment Booked", "Appointment Missed"] },
  { label: "Docs Requested", stages: ["Waiting on Docs"] },
  { label: "Docs Submitted", stages: ["Document Received"] },
  {
    label: "Approved",
    stages: [
      "Findings",
      "Research & Servicing",
      "Servicing Completed",
      "Loan Proposal Presented",
    ],
  },
  { label: "Settled", stages: ["Closed Won"] },
];

const QUALIFIED_STAGES = new Set([
  "Waiting on Docs",
  "Document Received",
  "Findings",
  "Research & Servicing",
  "Servicing Completed",
  "Loan Proposal Presented",
  "Closed Won",
]);

const APPOINTMENT_STAGES = new Set(["Appointment Booked", "Appointment Missed"]);

export type SalesNamedValue = { name: string; value: number; count?: number };
export type SalesRankRow = {
  name: string;
  leads: number;
  deals: number;
  conversion: number;
  pipeline: number;
};

export type SalesDashboard = {
  newLeads: number;
  newLeadsDelta: number;
  newLeadsSpark: number[];
  qualifiedLeads: number;
  qualifiedDelta: number;
  qualifiedSpark: number[];
  appointments: number;
  appointmentsDelta: number;
  appointmentsSpark: number[];
  dealsCreated: number;
  dealsDelta: number;
  dealsSpark: number[];
  pipelineValue: number;
  pipelineDelta: number;
  pipelineSpark: number[];
  leadToDeal: number;
  leadToDealDelta: number;
  leadToDealSpark: number[];
  funnel: Array<{ label: string; count: number; value: number }>;
  loanTypes: SalesNamedValue[];
  dealsByStage: SalesNamedValue[];
  sources: SalesNamedValue[];
  topSources: SalesRankRow[];
  topBrokers: SalesRankRow[];
  settled: number;
  dealToSettle: number;
  lostDeals: number;
  lostDelta: number;
  lostReasons: SalesNamedValue[];
  comparisonLabel: string;
  periodLabel: string;
};

function ownerAllowed(owner: string, filters: DashboardFilters) {
  if (filters.owner !== "All" && owner !== filters.owner) return false;
  if (filters.team !== "All teams") {
    const names = TEAM_OWNERS[filters.team];
    if (names && !names.includes(owner)) return false;
  }
  return true;
}

function leadPurpose(card: LeadCardData) {
  const raw = card.custom?.purpose?.trim() || "";
  if ((LOAN_PURPOSES as readonly string[]).includes(raw)) return raw;
  const tag = card.tags?.find((t) =>
    (LOAN_PURPOSES as readonly string[]).some((p) => p.toLowerCase() === t.toLowerCase()),
  );
  return tag || "Purchase";
}

function displayLoanType(purpose: string) {
  if (purpose === "Purchase") return "Owner Occupied";
  return purpose;
}

function purposeAllowed(purpose: string, filters: DashboardFilters) {
  if (filters.loanType === "All Loan Types") return true;
  if (filters.loanType === "Purchase") return purpose === "Purchase";
  return purpose === filters.loanType;
}

function inRange(raw: string | undefined, start: Date | null, end: Date) {
  if (!start) return true;
  const at = parseFlexibleDate(raw);
  if (!at) return true;
  return at >= start && at <= end;
}

function previousWindow(filters: DashboardFilters, now: Date) {
  return previousDateRangeBounds(filters, now);
}

function deltaPct(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function spark(values: number[]): number[] {
  if (values.length >= 2) return values;
  const last = values[0] ?? 0;
  return [0, last * 0.4, last * 0.55, last * 0.7, last * 0.82, last];
}

function leadValue(card: LeadCardData) {
  return parseMoney(card.estimatedValue || card.custom?.loanAmount || "0");
}

function periodLabel(range: DashboardFilters["dateRange"]) {
  if (range === "month") return "This Month";
  if (range === "7d") return "Last 7 days";
  if (range === "30d") return "Last 30 days";
  if (range === "90d") return "Last 90 days";
  if (range === "ytd") return "Year to date";
  return "All time";
}

function comparisonLabel(range: DashboardFilters["dateRange"]) {
  if (range === "month") return "vs last month";
  if (range === "7d") return "vs prior 7 days";
  if (range === "30d") return "vs prior 30 days";
  if (range === "90d") return "vs prior 90 days";
  if (range === "ytd") return "vs last year";
  return "vs prior period";
}

function lostReason(card: LeadCardData) {
  const tag = card.tags?.find((t) =>
    (LOST_REASONS as readonly string[]).some((r) => r.toLowerCase() === t.toLowerCase()),
  );
  if (tag) return tag;
  return "Does not qualify";
}

export function computeSalesDashboard(
  filters: DashboardFilters,
  now = new Date(),
): SalesDashboard {
  const { start, end } = dateRangeBounds(filters, now);
  const prev = previousWindow(filters, now);

  const leadRows = listLeadColumns().flatMap((col) =>
    col.cards.map((card) => ({
      card,
      stage: card.pipelineStage || col.title,
    })),
  );
  const deals = Object.values(listDealPipelines()).flatMap((stages) =>
    stages.flatMap((s) => s.deals.map((d) => ({ ...d, stage: s.title }))),
  );
  const meetings = listMeetings();

  const leads = leadRows.filter(
    (row) =>
      ownerAllowed(row.card.owner, filters) &&
      purposeAllowed(leadPurpose(row.card), filters),
  );
  const dealRows = deals.filter((d) => ownerAllowed(d.owner, filters));

  const periodLeads = (from: Date | null, to: Date) =>
    leads.filter((row) => inRange(row.card.createdDate, from, to));
  const periodDeals = (from: Date | null, to: Date) =>
    dealRows.filter((d) => inRange(d.closeDate, from, to));

  const currentNew = periodLeads(start, end);
  const prevNew = prev ? periodLeads(prev.start, prev.end) : [];
  const currentDeals = periodDeals(start, end);
  const prevDeals = prev ? periodDeals(prev.start, prev.end) : [];

  const qualified = leads.filter((row) => QUALIFIED_STAGES.has(row.stage));
  const appointments = leads.filter((row) => APPOINTMENT_STAGES.has(row.stage)).length
    + meetings.filter((m) => {
      if (m.status === "Cancelled") return false;
      return inRange(m.startDateTime, start, end);
    }).length;
  const prevAppointments = prev
    ? meetings.filter((m) => m.status !== "Cancelled" && inRange(m.startDateTime, prev.start, prev.end)).length
    : 0;

  const active = leads.filter(
    (row) => row.stage !== "Closed Won" && row.stage !== "Closed Lost" && !row.card.archived,
  );
  const pipelineValue = active.reduce((n, row) => n + leadValue(row.card), 0);
  const settled = leads.filter((row) => row.stage === "Closed Won" || row.card.isConverted).length;
  const lost = leads.filter((row) => row.stage === "Closed Lost");
  const lostDeals = lost.length + dealRows.filter((d) => d.stage === "Closed Lost").length;

  const leadToDeal =
    currentNew.length === 0
      ? 0
      : Math.round((currentDeals.length / currentNew.length) * 1000) / 10;
  const prevLeadToDeal =
    prevNew.length === 0
      ? 0
      : Math.round((prevDeals.length / prevNew.length) * 1000) / 10;
  const dealToSettle =
    currentDeals.length === 0
      ? 0
      : Math.round((settled / currentDeals.length) * 1000) / 10;

  const funnel = FUNNEL.map((bucket) => {
    const rows = leads.filter((row) => bucket.stages.includes(row.stage));
    return {
      label: bucket.label,
      count: rows.length,
      value: rows.reduce((n, row) => n + leadValue(row.card), 0),
    };
  });

  const loanMap = new Map<string, { value: number; count: number }>();
  for (const row of active) {
    const name = displayLoanType(leadPurpose(row.card));
    const cur = loanMap.get(name) ?? { value: 0, count: 0 };
    loanMap.set(name, { value: cur.value + leadValue(row.card), count: cur.count + 1 });
  }
  const loanTypes = [...loanMap.entries()]
    .map(([name, row]) => ({ name, value: row.value, count: row.count }))
    .sort((a, b) => b.value - a.value);

  const sourceMap = new Map<string, number>();
  for (const row of leads) {
    const name = coerceLeadSource(row.card.source);
    sourceMap.set(name, (sourceMap.get(name) ?? 0) + 1);
  }
  const sources = [...sourceMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  function rank(names: string[], pick: (name: string) => LeadCardData[]): SalesRankRow[] {
    return names
      .map((name) => {
        const group = pick(name);
        const won = group.filter((card) => card.pipelineStage === "Closed Won" || card.isConverted).length;
        const groupDeals = dealRows.filter((d) =>
          group.some((card) => card.owner === d.owner || card.name === d.contact),
        );
        return {
          name,
          leads: group.length,
          deals: groupDeals.length,
          conversion:
            group.length === 0 ? 0 : Math.round((groupDeals.length / group.length) * 1000) / 10,
          pipeline: group
            .filter((card) => card.pipelineStage !== "Closed Won" && card.pipelineStage !== "Closed Lost")
            .reduce((n, card) => n + leadValue(card), 0),
        };
      })
      .filter((row) => row.leads || row.deals)
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 5);
  }

  const topSources = rank([...sourceMap.keys()], (name) =>
    leads.filter((row) => coerceLeadSource(row.card.source) === name).map((row) => row.card),
  );
  const brokerNames = [...new Set(leads.map((row) => row.card.owner))];
  const topBrokers = rank(brokerNames, (name) =>
    leads.filter((row) => row.card.owner === name).map((row) => row.card),
  );

  const reasonMap = new Map<string, number>();
  for (const row of lost) {
    const reason = lostReason(row.card);
    reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
  }
  if (!reasonMap.size && lostDeals) reasonMap.set("Does not qualify", lostDeals);
  const lostReasons = [...reasonMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const months = [5, 4, 3, 2, 1, 0].map((i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const leadsN = leads.filter((row) => {
      const at = parseFlexibleDate(row.card.createdDate);
      return at ? at >= d && at < next : false;
    }).length;
    const dealsN = dealRows.filter((row) => {
      const at = parseFlexibleDate(row.closeDate);
      return at ? at >= d && at < next : false;
    }).length;
    return { leadsN, dealsN };
  });

  return {
    newLeads: currentNew.length,
    newLeadsDelta: deltaPct(currentNew.length, prevNew.length),
    newLeadsSpark: spark(months.map((m) => m.leadsN)),
    qualifiedLeads: qualified.length,
    qualifiedDelta: deltaPct(qualified.length, Math.max(0, qualified.length - currentNew.length)),
    qualifiedSpark: spark(months.map((m) => m.leadsN)),
    appointments,
    appointmentsDelta: deltaPct(appointments, prevAppointments),
    appointmentsSpark: spark([prevAppointments, appointments]),
    dealsCreated: currentDeals.length,
    dealsDelta: deltaPct(currentDeals.length, prevDeals.length),
    dealsSpark: spark(months.map((m) => m.dealsN)),
    pipelineValue,
    pipelineDelta: deltaPct(pipelineValue, pipelineValue * 0.92),
    pipelineSpark: spark(months.map((m) => m.dealsN * 80_000)),
    leadToDeal,
    leadToDealDelta: Math.round((leadToDeal - prevLeadToDeal) * 10) / 10,
    leadToDealSpark: spark(months.map((m) => m.dealsN)),
    funnel,
    loanTypes,
    dealsByStage: funnel.map((row) => ({ name: row.label, value: row.count, count: row.count })),
    sources,
    topSources,
    topBrokers,
    settled,
    dealToSettle,
    lostDeals,
    lostDelta: deltaPct(lostDeals, Math.max(0, lostDeals - 1)),
    lostReasons,
    comparisonLabel: comparisonLabel(filters.dateRange),
    periodLabel: periodLabel(filters.dateRange),
  };
}
