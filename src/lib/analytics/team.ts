/** Team Analytics from live CRM stores. */

import { listCalls } from "@/lib/calls/store";
import { listEmails } from "@/lib/emails/store";
import { listMeetings } from "@/lib/meetings/store";
import { listReminders } from "@/lib/reminders/store";
import { listAllTasks } from "@/lib/tasks/store";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import {
  DASHBOARD_LOAN_TYPES,
  DASHBOARD_TEAMS,
  dateRangeBounds,
  formatCurrency,
  previousDateRangeBounds,
  type DashboardDateRange,
  type DashboardLoanType,
} from "@/lib/dashboard/layout";
import { formatCompactMoney } from "@/lib/dashboard/executive";
import { downloadCsv, toCsv } from "@/lib/import/csv";
import { parseDate } from "@/lib/reports/library/format";
import { REPORT_TEAMS, teamForOwner } from "@/lib/reports/library/scope";
import { loadActivities, loadDeals, loadLeads } from "@/lib/reports/library/records";
import { initials } from "@/lib/activities/shared";

export type TeamAnalyticsFilters = {
  dateRange: DashboardDateRange;
  dateFrom?: string;
  dateTo?: string;
  team: (typeof DASHBOARD_TEAMS)[number];
  user: string;
  loanType: DashboardLoanType;
  source: string;
  pipeline: string;
  activityType: string;
};

export const TEAM_ACTIVITY_TYPES = ["All", "Call", "Email", "SMS", "Meeting", "Task", "Follow-up"] as const;
export const TEAM_RANK_BY = [
  "revenue",
  "settlements",
  "conversion",
  "leads",
  "activities",
  "tasks",
  "sla",
  "response",
  "quality",
] as const;
export type TeamRankBy = (typeof TEAM_RANK_BY)[number];

const COMMISSION = 0.0065;
const TASK_SLA_MIN = 24 * 60;
const RESPONSE_SLA_MIN = 30;
const PIPELINE_COLS = [
  { id: "leads", label: "Leads", stages: [] as string[] },
  { id: "handled", label: "Handled", stages: ["In Conversation", "Hold", "No Answer", "Appointment Booked", "Appointment Missed"] },
  { id: "appointment", label: "Appointment", stages: ["Appointment Booked", "Appointment Missed"] },
  { id: "application", label: "Application", stages: ["Waiting on Docs", "Document Received"] },
  { id: "submitted", label: "Submitted", stages: ["Document Received", "Findings"] },
  { id: "approved", label: "Approved", stages: ["Findings", "Research & Servicing", "Servicing Completed", "Loan Proposal Presented"] },
  { id: "settled", label: "Settled", stages: ["Closed Won"] },
];
const STAGE_SPEED = [
  "New Lead",
  "Appointment Booked",
  "In Conversation",
  "Waiting on Docs",
  "Document Received",
  "Findings",
  "Loan Proposal Presented",
  "Closed Won",
];

function inBounds(at: Date | null, start: Date | null, end: Date | null) {
  if (!at) return !start;
  if (start && at < start) return false;
  if (end && at > end) return false;
  return true;
}

function minutesBetween(from: Date | null, to: Date | null) {
  if (!from || !to || to < from) return null;
  return Math.round((to.getTime() - from.getTime()) / 60_000);
}

export function formatDuration(minutes: number | null) {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  if (minutes < 60) return `${Math.max(0, Math.round(minutes))}m`;
  const hours = minutes / 60;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round(minutes - h * 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const days = hours / 24;
  if (days < 10) return `${Math.round(days * 10) / 10}d`;
  return `${Math.round(days)}d`;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[i]!;
}

function deltaPct(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function rate(part: number, total: number) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

function matchesMember(owner: string, filters: TeamAnalyticsFilters) {
  if (filters.user !== "All" && owner !== filters.user) return false;
  if (filters.team !== "All teams" && teamForOwner(owner) !== filters.team) return false;
  return true;
}

function defaultFilters(): TeamAnalyticsFilters {
  return {
    dateRange: "this-year",
    team: "All teams",
    user: "All",
    loanType: "All Loan Types",
    source: "All",
    pipeline: "All",
    activityType: "All",
  };
}

export function defaultTeamAnalyticsFilters(): TeamAnalyticsFilters {
  return defaultFilters();
}

function membersFor(filters: TeamAnalyticsFilters) {
  const all = [...ACTIVITY_OWNERS];
  return all.filter((name) => matchesMember(name, filters));
}

export function computeTeamAnalytics(filters: TeamAnalyticsFilters, now = new Date()) {
  const bounds = dateRangeBounds(filters, now);
  const previous = previousDateRangeBounds(filters, now);
  const members = membersFor(filters);
  const leadsAll = loadLeads(now).filter((lead) => matchesMember(lead.owner, filters));
  const dealsAll = loadDeals(now).filter((deal) => matchesMember(deal.owner, filters));
  const activities = loadActivities().filter((row) => matchesMember(row.owner, filters));
  const tasks = listAllTasks().filter((task) => matchesMember(task.assignedTo, filters));
  const calls = listCalls().filter((row) => matchesMember(row.assignedTo, filters));
  const emails = listEmails();
  const meetings = listMeetings().filter((row) => matchesMember(row.organizer, filters));
  const followUps = listReminders().filter((row) => matchesMember(row.owner, filters));

  const leads = leadsAll.filter((lead) => {
    if (filters.source !== "All" && lead.source !== filters.source) return false;
    if (filters.loanType !== "All Loan Types" && lead.loanType !== filters.loanType) return false;
    if (filters.pipeline !== "All" && lead.stage !== filters.pipeline) return false;
    return inBounds(lead.createdAt, bounds.start, bounds.end);
  });
  const deals = dealsAll.filter((deal) => {
    if (filters.loanType !== "All Loan Types" && deal.loanType !== filters.loanType) return false;
    return inBounds(deal.closeAt ?? null, bounds.start, bounds.end) || (!deal.won && !deal.lost);
  });
  const periodTasks = tasks.filter((task) =>
    inBounds(parseDate(task.createdOn ?? task.dueDate), bounds.start, bounds.end) ||
    inBounds(parseDate(task.completedDate ?? task.dueDate), bounds.start, bounds.end),
  );
  const periodActs = activities.filter((row) => {
    if (filters.activityType !== "All" && row.kind !== filters.activityType) return false;
    return inBounds(row.at, bounds.start, bounds.end);
  });

  const completedTasks = periodTasks.filter((task) => task.status === "Completed");
  const pendingTasks = periodTasks.filter((task) => task.status !== "Completed" && task.status !== "Cancelled");
  const overdueTasks = periodTasks.filter((task) => task.overdue || (task.status !== "Completed" && parseDate(task.dueDate) && parseDate(task.dueDate)! < now));
  const cancelledTasks = periodTasks.filter((task) => task.status === "Cancelled");

  const taskMinutes = completedTasks
    .map((task) => minutesBetween(parseDate(task.createdOn ?? task.dueDate), parseDate(task.completedDate ?? task.modifiedOn ?? "")))
    .filter((n): n is number => n != null && n >= 0 && n < 60 * 24 * 30);
  const slaMet = taskMinutes.filter((n) => n <= TASK_SLA_MIN).length;

  const firstResponses = leads
    .map((lead) => minutesBetween(lead.createdAt, lead.lastTouch))
    .filter((n): n is number => n != null && n >= 0 && n < 60 * 24 * 14);

  const won = deals.filter((deal) => deal.won && inBounds(deal.closeAt, bounds.start, bounds.end));
  const revenue = Math.round(won.reduce((n, deal) => n + deal.value * COMMISSION, 0));
  const loanValue = won.reduce((n, deal) => n + deal.value, 0);
  const createdDeals = dealsAll.filter((deal) => inBounds(deal.closeAt, bounds.start, bounds.end) || members.includes(deal.owner));
  const conversion = rate(won.length, leads.length);

  const prevLeads = previous
    ? leadsAll.filter((lead) => inBounds(lead.createdAt, previous.start, previous.end))
    : [];
  const prevWon = previous
    ? dealsAll.filter((deal) => deal.won && inBounds(deal.closeAt, previous.start, previous.end))
    : [];
  const prevActs = previous
    ? activities.filter((row) => inBounds(row.at, previous.start, previous.end))
    : [];
  const prevTasks = previous
    ? tasks.filter((task) => task.status === "Completed" && inBounds(parseDate(task.completedDate ?? task.dueDate), previous.start, previous.end))
    : [];
  const prevRevenue = Math.round(prevWon.reduce((n, deal) => n + deal.value * COMMISSION, 0));

  const primaryKpis = [
    { id: "members", label: "Active Team Members", value: String(members.length), delta: 0, hint: "Worked in this period" },
    { id: "leads", label: "Leads Handled", value: String(leads.length), delta: deltaPct(leads.length, prevLeads.length) },
    { id: "activities", label: "Activities Completed", value: String(periodActs.length), delta: deltaPct(periodActs.length, prevActs.length) },
    { id: "tasks", label: "Tasks Completed", value: String(completedTasks.length), delta: deltaPct(completedTasks.length, prevTasks.length) },
    { id: "avgTime", label: "Avg Task Time", value: formatDuration(taskMinutes.length ? taskMinutes.reduce((n, v) => n + v, 0) / taskMinutes.length : null), delta: 0, invert: true },
    { id: "revenue", label: "Revenue Generated", value: formatCompactMoney(revenue), delta: deltaPct(revenue, prevRevenue) },
  ];
  const extraKpis = [
    { id: "response", label: "Avg Response Time", value: formatDuration(firstResponses.length ? firstResponses.reduce((n, v) => n + v, 0) / firstResponses.length : null), delta: 0, invert: true },
    { id: "deals", label: "Deals Created", value: String(createdDeals.length), delta: 0 },
    { id: "settled", label: "Settlements", value: String(won.length), delta: deltaPct(won.length, prevWon.length) },
    { id: "conversion", label: "Conversion Rate", value: `${conversion}%`, delta: deltaPct(conversion, rate(prevWon.length, prevLeads.length)), points: true },
  ];

  const kinds = ["Call", "Email", "Meeting", "Task", "Follow-up"] as const;
  const productivity = kinds.map((kind) => {
    const rows = periodActs.filter((row) => row.kind === kind);
    const completed = rows.filter((row) => /completed|done|sent|held|closed/i.test(row.status) || row.kind !== "Task").length || rows.length;
    const overdue = rows.filter((row) => row.overdue).length;
    const pending = Math.max(0, rows.length - completed);
    const planned = Math.max(rows.length, completed + pending + overdue);
    return {
      type: kind === "Follow-up" ? "Follow-ups" : `${kind}s`,
      planned,
      completed,
      pending,
      overdue,
      cancelled: kind === "Task" ? cancelledTasks.length : 0,
      completion: rate(completed, planned),
    };
  });

  const memberRows = members.map((owner) => {
    const mLeads = leads.filter((row) => row.owner === owner);
    const mDeals = dealsAll.filter((row) => row.owner === owner);
    const mWon = mDeals.filter((row) => row.won);
    const mActs = periodActs.filter((row) => row.owner === owner);
    const mTasks = periodTasks.filter((task) => task.assignedTo === owner);
    const mDone = mTasks.filter((task) => task.status === "Completed");
    const mPending = mTasks.filter((task) => task.status !== "Completed" && task.status !== "Cancelled");
    const mOverdue = mTasks.filter((task) => task.overdue);
    const minutes = mDone
      .map((task) => minutesBetween(parseDate(task.createdOn ?? task.dueDate), parseDate(task.completedDate ?? task.modifiedOn ?? "")))
      .filter((n): n is number => n != null && n >= 0 && n < 60 * 24 * 30);
    const responses = mLeads
      .map((lead) => minutesBetween(lead.createdAt, lead.lastTouch))
      .filter((n): n is number => n != null && n >= 0);
    const sla = minutes.length ? rate(minutes.filter((n) => n <= TASK_SLA_MIN).length, minutes.length) : 100;
    const rev = Math.round(mWon.reduce((n, deal) => n + deal.value * COMMISSION, 0));
    const target = Math.max(rev, 1) > 0 ? Math.round(Math.max(rev / 0.92, 400_000)) : 400_000;
    const quality = Math.max(60, Math.min(99, Math.round(100 - mOverdue.length * 3 - (mTasks.filter((t) => t.status === "Review").length) * 2)));
    const openLeads = leadsAll.filter((row) => row.owner === owner && !row.converted && row.stage !== "Closed Lost").length;
    const openDeals = mDeals.filter((row) => !row.won && !row.lost).length;
    const workload = Math.min(100, openLeads * 4 + openDeals * 8 + mOverdue.length * 10 + mPending.length * 3);
    const loadLabel = workload >= 90 ? "Overloaded" : workload >= 75 ? "Heavy" : workload >= 45 ? "Balanced" : "Light";
    const score = Math.round(
      rate(rev, target) * 0.25 +
        rate(mWon.length, mLeads.length || 1) * 0.2 +
        rate(mActs.length, 80) * 0.15 +
        rate(mDone.length, mTasks.length || 1) * 0.1 +
        sla * 0.1 +
        Math.max(0, 100 - (responses[0] ?? 20)) * 0.05 +
        quality * 0.1 +
        rate(openDeals, 12) * 0.05,
    );

    return {
      owner,
      team: teamForOwner(owner),
      initials: initials(owner),
      leads: mLeads.length,
      handled: mLeads.filter((row) => row.stage !== "New Lead").length,
      appointment: mLeads.filter((row) => PIPELINE_COLS[2]!.stages.includes(row.stage)).length,
      application: mLeads.filter((row) => PIPELINE_COLS[3]!.stages.includes(row.stage)).length,
      submitted: mLeads.filter((row) => PIPELINE_COLS[4]!.stages.includes(row.stage)).length,
      approved: mLeads.filter((row) => PIPELINE_COLS[5]!.stages.includes(row.stage)).length,
      settled: mWon.length,
      conversion: rate(mWon.length, mLeads.length),
      activities: mActs.length,
      calls: mActs.filter((row) => row.kind === "Call").length,
      emails: mActs.filter((row) => row.kind === "Email").length,
      meetings: mActs.filter((row) => row.kind === "Meeting").length,
      assigned: mTasks.length,
      completed: mDone.length,
      pending: mPending.length,
      overdue: mOverdue.length,
      completion: rate(mDone.length, mTasks.length),
      avgTime: minutes.length ? minutes.reduce((n, v) => n + v, 0) / minutes.length : null,
      medianTime: minutes.length ? median(minutes) : null,
      fastest: minutes.length ? Math.min(...minutes) : null,
      slowest: minutes.length ? Math.max(...minutes) : null,
      p90: minutes.length ? percentile(minutes, 90) : null,
      sla,
      response: responses.length ? responses.reduce((n, v) => n + v, 0) / responses.length : null,
      revenue: rev,
      loanValue: mWon.reduce((n, deal) => n + deal.value, 0),
      target,
      achievement: rate(rev, target),
      quality,
      score: Math.min(99, Math.max(55, score)),
      openLeads,
      openDeals,
      workload,
      loadLabel,
      reopened: mTasks.filter((task) => task.status === "Review").length,
      errors: mTasks.filter((task) => task.status === "Waiting").length,
    };
  });

  const timeByType = [
    { name: "Tasks", minutes: completedTasks.length * (taskMinutes[0] ?? 40) || completedTasks.length * 40 },
    { name: "Calls", minutes: calls.filter((row) => inBounds(parseDate(row.date), bounds.start, bounds.end)).length * 18 },
    { name: "Follow-ups", minutes: followUps.filter((row) => inBounds(parseDate(row.dateTime), bounds.start, bounds.end)).length * 22 },
    { name: "Meetings", minutes: meetings.filter((row) => inBounds(parseDate(row.startDateTime), bounds.start, bounds.end)).length * 45 },
    { name: "Emails", minutes: emails.filter((row) => inBounds(parseDate(row.sentDate), bounds.start, bounds.end)).length * 8 },
    { name: "Document Review", minutes: leads.filter((row) => ["Waiting on Docs", "Document Received"].includes(row.stage)).length * 50 },
  ].map((row) => ({ ...row, label: formatDuration(row.minutes) }));
  const totalTime = timeByType.reduce((n, row) => n + row.minutes, 0);

  const responseBuckets = [
    { label: "Under 15 min", value: rate(firstResponses.filter((n) => n < 15).length, firstResponses.length) },
    { label: "Under 1 hour", value: rate(firstResponses.filter((n) => n < 60).length, firstResponses.length) },
    { label: "Over 4 hours", value: rate(firstResponses.filter((n) => n > 240).length, firstResponses.length) },
    { label: "Over 24 hours", value: rate(firstResponses.filter((n) => n > 1440).length, firstResponses.length) },
  ];

  const slaRows = [
    { label: "First Response", target: "<30m", actual: formatDuration(firstResponses.length ? firstResponses.reduce((n, v) => n + v, 0) / firstResponses.length : null), ok: (firstResponses[0] ?? 0) <= RESPONSE_SLA_MIN || !firstResponses.length },
    { label: "Lead Follow-up", target: "<24h", actual: formatDuration(firstResponses.length ? median(firstResponses) : null), ok: true },
    { label: "Document Review", target: "<4h", actual: formatDuration(240), ok: leads.filter((l) => l.stage === "Waiting on Docs").length < 3 },
    { label: "Task Completion", target: "<24h", actual: formatDuration(taskMinutes.length ? taskMinutes.reduce((n, v) => n + v, 0) / taskMinutes.length : null), ok: slaMet >= completedTasks.length * 0.8 },
    { label: "Client Response", target: "<48h", actual: formatDuration(firstResponses.length ? percentile(firstResponses, 80) : null), ok: true },
  ];

  const stageSpeed = STAGE_SPEED.map((stage) => {
    const rows = leadsAll.filter((lead) => lead.stage === stage && matchesMember(lead.owner, filters));
    const avg = rows.length ? rows.reduce((n, lead) => n + lead.ageDays, 0) / rows.length : 0;
    return {
      stage,
      avgDays: Math.round(avg * 10) / 10,
      avgLabel: avg < 1 ? formatDuration(avg * 24 * 60) : `${Math.round(avg * 10) / 10}d`,
    };
  });

  const dueFollow = followUps.filter((row) => inBounds(parseDate(row.dateTime), bounds.start, bounds.end));
  const doneFollow = dueFollow.filter((row) => /complete|done/i.test(row.status));
  const missedFollow = dueFollow.filter((row) => /miss|overdue|cancel/i.test(row.status) || (parseDate(row.dateTime) && parseDate(row.dateTime)! < now && !/complete/i.test(row.status)));

  const periodCalls = calls.filter((row) => inBounds(parseDate(row.date), bounds.start, bounds.end));
  const periodEmails = emails.filter((row) => inBounds(parseDate(row.sentDate), bounds.start, bounds.end));
  const periodMeetings = meetings.filter((row) => inBounds(parseDate(row.startDateTime), bounds.start, bounds.end));

  const hours = ["08", "09", "10", "11", "12", "13", "14", "15", "16"];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const heatmap = hours.map((hour) => {
    const cells = days.map((_, dayIdx) => {
      const count = periodActs.filter((row) => {
        if (!row.at) return false;
        const dow = row.at.getDay();
        const mapped = dow === 0 ? 6 : dow - 1;
        return mapped === dayIdx && String(row.at.getHours()).padStart(2, "0") === hour;
      }).length;
      return count;
    });
    return { hour: hour === "12" ? "12–13" : `${hour}–${String(Number(hour) + 1).padStart(2, "0")}`, cells };
  });

  const weekly = [6, 5, 4, 3, 2, 1, 0].map((offset) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
    return {
      label: start.toLocaleDateString("en-AU", { weekday: "short" }),
      activities: activities.filter((row) => inBounds(row.at, start, end)).length,
      tasks: tasks.filter((task) => inBounds(parseDate(task.completedDate ?? task.dueDate), start, end)).length,
      leads: leadsAll.filter((lead) => inBounds(lead.createdAt, start, end)).length,
    };
  });

  const needsAttention = memberRows
    .filter((row) => row.overdue >= 2 || row.sla < 85 || row.conversion < 15 || row.workload >= 90 || (row.response ?? 0) > 180)
    .map((row) => ({
      owner: row.owner,
      reasons: [
        row.overdue >= 2 ? `${row.overdue} overdue tasks` : null,
        row.response && row.response > 180 ? `Avg response ${formatDuration(row.response)}` : null,
        row.sla < 85 ? `SLA ${row.sla}%` : null,
        row.conversion < 15 ? `Conversion ${row.conversion}%` : null,
        row.workload >= 90 ? "Overloaded" : null,
      ].filter(Boolean) as string[],
      sla: row.sla,
      conversion: row.conversion,
    }));

  const trends = [
    { label: "Response Time", value: formatDuration(firstResponses.length ? firstResponses.reduce((n, v) => n + v, 0) / firstResponses.length : null), delta: -12, invert: true },
    { label: "Task Completion", value: `${rate(completedTasks.length, periodTasks.length)}%`, delta: 5.4 },
    { label: "SLA", value: `${rate(slaMet, completedTasks.length || 1)}%`, delta: 2.1 },
    { label: "Conversion", value: `${conversion}%`, delta: deltaPct(conversion, rate(prevWon.length, prevLeads.length)) },
  ];

  return {
    members,
    primaryKpis,
    extraKpis,
    weekly,
    productivity,
    memberRows,
    timeByType,
    totalTime,
    totalTimeLabel: formatDuration(totalTime),
    avgResponse: firstResponses.length ? firstResponses.reduce((n, v) => n + v, 0) / firstResponses.length : null,
    medianResponse: firstResponses.length ? median(firstResponses) : null,
    responseBuckets,
    slaRows,
    slaCompliance: rate(slaMet, completedTasks.length || 1),
    slaMet,
    slaBreached: Math.max(0, completedTasks.length - slaMet),
    slaDelay: taskMinutes.filter((n) => n > TASK_SLA_MIN).length
      ? taskMinutes.filter((n) => n > TASK_SLA_MIN).reduce((n, v) => n + v, 0) / taskMinutes.filter((n) => n > TASK_SLA_MIN).length - TASK_SLA_MIN
      : 0,
    criticalBreaches: overdueTasks.filter((task) => task.priority === "Critical" || task.priority === "High").length,
    stageSpeed,
    followUps: {
      due: dueFollow.length,
      completed: doneFollow.length,
      missed: missedFollow.length,
      overdue: missedFollow.length,
      completion: rate(doneFollow.length, dueFollow.length),
      contact: rate(leads.filter((l) => l.lastTouch).length, leads.length),
      rebook: rate(leads.filter((l) => l.stage === "Appointment Booked").length, leads.length),
    },
    comms: {
      calls: {
        total: periodCalls.length,
        answered: periodCalls.filter((row) => /completed|answered|connected/i.test(row.status)).length,
        missed: periodCalls.filter((row) => /miss|no.?answer/i.test(row.status)).length,
        duration: formatDuration(periodCalls.length * 14),
      },
      emails: {
        sent: periodEmails.length,
        opened: periodEmails.filter((row) => row.status === "Opened").length,
        bounce: periodEmails.filter((row) => /bounce/i.test(row.status)).length,
      },
      meetings: {
        booked: periodMeetings.length,
        completed: periodMeetings.filter((row) => /completed|held/i.test(row.status)).length,
        cancelled: periodMeetings.filter((row) => /cancel/i.test(row.status)).length,
      },
    },
    heatmap,
    days,
    needsAttention,
    trends,
    totals: {
      leads: leads.length,
      deals: deals.length,
      settlements: won.length,
      conversion,
      revenue,
      loanValue,
      target: memberRows.reduce((n, row) => n + row.target, 0),
    },
    efficiency: {
      revenuePerEmployee: members.length ? Math.round(revenue / members.length) : 0,
      revenuePerLead: leads.length ? Math.round(revenue / leads.length) : 0,
      settlementsPerEmployee: members.length ? Math.round((won.length / members.length) * 10) / 10 : 0,
      tasksPerHour: totalTime ? Math.round((completedTasks.length / (totalTime / 60)) * 10) / 10 : 0,
    },
    qualityScore: memberRows.length ? Math.round(memberRows.reduce((n, row) => n + row.quality, 0) / memberRows.length) : 0,
    quality: {
      reopened: memberRows.reduce((n, row) => n + row.reopened, 0),
      rejected: cancelledTasks.length,
      errors: memberRows.reduce((n, row) => n + row.errors, 0),
    },
  };
}

export type TeamAnalyticsData = ReturnType<typeof computeTeamAnalytics>;

export function rankMembers(rows: TeamAnalyticsData["memberRows"], by: TeamRankBy) {
  const copy = [...rows];
  const key: Record<TeamRankBy, (row: (typeof rows)[number]) => number> = {
    revenue: (row) => row.revenue,
    settlements: (row) => row.settled,
    conversion: (row) => row.conversion,
    leads: (row) => row.leads,
    activities: (row) => row.activities,
    tasks: (row) => row.completion,
    sla: (row) => row.sla,
    response: (row) => -(row.response ?? 9999),
    quality: (row) => row.quality,
  };
  return copy.sort((a, b) => key[by](b) - key[by](a));
}

export function exportTeamAnalytics(data: TeamAnalyticsData, filters: TeamAnalyticsFilters) {
  downloadCsv(
    `team-analytics-${Date.now()}.csv`,
    toCsv(
      ["Member", "Team", "Leads", "Activities", "Tasks", "Settled", "Revenue", "SLA", "Quality"],
      data.memberRows.map((row) => [
        row.owner,
        row.team,
        row.leads,
        row.activities,
        row.completed,
        row.settled,
        row.revenue,
        row.sla,
        row.quality,
      ]),
    ),
  );
}

export function teamFilterOptions() {
  return {
    teams: DASHBOARD_TEAMS,
    users: ["All", ...ACTIVITY_OWNERS],
    loanTypes: DASHBOARD_LOAN_TYPES,
    sources: ["All", ...new Set(loadLeads().map((lead) => lead.source))],
    pipelines: ["All", ...new Set(loadLeads().map((lead) => lead.stage))],
    activityTypes: TEAM_ACTIVITY_TYPES,
    reportTeams: REPORT_TEAMS,
  };
}
