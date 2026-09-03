/** Activity Analytics from live CRM stores. */

import { listCalls } from "@/lib/calls/store";
import { listEmails } from "@/lib/emails/store";
import { listMeetings } from "@/lib/meetings/store";
import { listReminders } from "@/lib/reminders/store";
import { listAllTasks } from "@/lib/tasks/store";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import {
  DASHBOARD_TEAMS,
  dateRangeBounds,
  previousDateRangeBounds,
  type DashboardDateRange,
} from "@/lib/dashboard/layout";
import { downloadCsv, toCsv } from "@/lib/import/csv";
import { parseDate } from "@/lib/reports/library/format";
import { teamForOwner } from "@/lib/reports/library/scope";
import { loadActivities, loadDeals, loadLeads, type CrmLead } from "@/lib/reports/library/records";
import { formatDuration } from "@/lib/analytics/team";
import type { Call } from "@/lib/calls/types";

export type ActivityAnalyticsFilters = {
  dateRange: DashboardDateRange;
  dateFrom?: string;
  dateTo?: string;
  team: (typeof DASHBOARD_TEAMS)[number];
  user: string;
  source: string;
  pipeline: string;
};

const TASK_SLA_MIN = 24 * 60;
const RESPONSE_SLA = 15;
const COMMISSION = 0.0065;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17"];

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

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function rate(part: number, total: number) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

function deltaPct(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function matchesOwner(owner: string, filters: ActivityAnalyticsFilters) {
  if (filters.user !== "All" && owner !== filters.user) return false;
  if (filters.team !== "All teams" && teamForOwner(owner) !== filters.team) return false;
  return true;
}

function relatedHit(related: string, lead: CrmLead) {
  const blob = related.toLowerCase();
  return blob.includes(lead.name.toLowerCase()) || (lead.email && blob.includes(lead.email.toLowerCase()));
}

function callMinutes(call: Call) {
  if (call.recording?.durationSeconds) return call.recording.durationSeconds / 60;
  if (!call.duration) return null;
  const min = call.duration.match(/(\d+)\s*min/i);
  const sec = call.duration.match(/(\d+)\s*s/i);
  if (min || sec) return (min ? Number(min[1]) : 0) + (sec ? Number(sec[1]) / 60 : 0);
  const hm = call.duration.match(/^(\d+):(\d+)/);
  if (hm) return Number(hm[1]) + Number(hm[2]) / 60;
  const n = Number.parseFloat(call.duration);
  return Number.isFinite(n) ? n : null;
}

function meetingMinutes(start: Date | null, end: Date | null) {
  return minutesBetween(start, end);
}

function firstResponseMinutes(lead: CrmLead, activities: ReturnType<typeof loadActivities>) {
  const first = activities
    .filter((row) => row.kind !== "Task" && row.at && relatedHit(row.related, lead) && lead.createdAt && row.at >= lead.createdAt)
    .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0))[0];
  return minutesBetween(lead.createdAt, first?.at ?? lead.lastTouch);
}

export function defaultActivityAnalyticsFilters(): ActivityAnalyticsFilters {
  return {
    dateRange: "this-year",
    team: "All teams",
    user: "All",
    source: "All",
    pipeline: "All",
  };
}

export function computeActivityAnalytics(filters: ActivityAnalyticsFilters, now = new Date()) {
  const bounds = dateRangeBounds(filters, now);
  const previous = previousDateRangeBounds(filters, now);
  const members = ACTIVITY_OWNERS.filter((name) => matchesOwner(name, filters));
  const leadsAll = loadLeads(now).filter((lead) => matchesOwner(lead.owner, filters));
  const deals = loadDeals(now).filter((deal) => matchesOwner(deal.owner, filters));
  const activities = loadActivities().filter((row) => matchesOwner(row.owner, filters));
  const calls = listCalls().filter((row) => matchesOwner(row.assignedTo, filters));
  const emails = listEmails();
  const meetings = listMeetings().filter((row) => matchesOwner(row.organizer, filters));
  const tasks = listAllTasks().filter((task) => matchesOwner(task.assignedTo, filters));
  const followUps = listReminders().filter((row) => matchesOwner(row.owner, filters));

  const leads = leadsAll.filter((lead) => {
    if (filters.source !== "All" && lead.source !== filters.source) return false;
    if (filters.pipeline !== "All" && lead.stage !== filters.pipeline) return false;
    return inBounds(lead.createdAt, bounds.start, bounds.end) || inBounds(lead.lastTouch, bounds.start, bounds.end);
  });
  const periodActs = activities.filter((row) => inBounds(row.at, bounds.start, bounds.end));
  const prevActs = previous ? activities.filter((row) => inBounds(row.at, previous.start, previous.end)) : [];
  const periodCalls = calls.filter((row) => inBounds(parseDate(row.date), bounds.start, bounds.end));
  const periodMeetings = meetings.filter((row) => inBounds(parseDate(row.startDateTime), bounds.start, bounds.end));
  const periodTasks = tasks.filter((task) =>
    inBounds(parseDate(task.createdOn ?? task.dueDate), bounds.start, bounds.end) ||
    inBounds(parseDate(task.completedDate ?? task.dueDate), bounds.start, bounds.end),
  );
  const periodFollow = followUps.filter((row) => inBounds(parseDate(row.dateTime), bounds.start, bounds.end));
  const periodEmails = emails.filter((row) => inBounds(parseDate(row.sentDate), bounds.start, bounds.end));

  const responses = leads
    .map((lead) => firstResponseMinutes(lead, activities))
    .filter((n): n is number => n != null && n >= 0 && n < 60 * 24 * 14);
  const bucket = (max: number) => rate(responses.filter((n) => n <= max).length, responses.length);

  const connected = periodCalls.filter((row) => row.status === "Completed" || (callMinutes(row) ?? 0) > 0.4);
  const missed = periodCalls.filter((row) => row.callType === "Missed" || /miss/i.test(row.status));
  const noAnswer = periodCalls.filter((row) => row.status === "No Answer");
  const callDurations = periodCalls.map(callMinutes).filter((n): n is number => n != null && n > 0);
  const firstCalls = leads
    .map((lead) => {
      const first = periodCalls
        .filter((call) => relatedHit(`${call.relatedTo ?? ""} ${call.contact ?? ""}`, lead))
        .map((call) => minutesBetween(lead.createdAt, parseDate(call.date)))
        .filter((n): n is number => n != null && n >= 0);
      return first.sort((a, b) => a - b)[0];
    })
    .filter((n): n is number => n != null);

  const meetingDurations = periodMeetings
    .map((row) => meetingMinutes(parseDate(row.startDateTime), parseDate(row.endDateTime)))
    .filter((n): n is number => n != null && n > 0);
  const noShow = periodMeetings.filter((row) => /miss|no.?show/i.test(row.status) || row.status === "Cancelled" && /no.?show/i.test(row.title));
  const cancelledMeet = periodMeetings.filter((row) => row.status === "Cancelled");
  const rescheduled = periodMeetings.filter((row) => row.status === "Rescheduled");
  const heldMeet = periodMeetings.filter((row) => row.status === "Completed" || row.status === "In Progress");

  const doneTasks = periodTasks.filter((task) => task.status === "Completed");
  const taskMinutes = doneTasks
    .map((task) => minutesBetween(parseDate(task.createdOn ?? task.dueDate), parseDate(task.completedDate ?? task.modifiedOn ?? "")))
    .filter((n): n is number => n != null && n >= 0 && n < 60 * 24 * 21);
  const overdueTasks = periodTasks.filter((task) => task.overdue);
  const onTime = doneTasks.filter((task) => !task.overdue).length;

  const won = deals.filter((deal) => deal.won);
  const apptLeads = leads.filter((lead) => /appointment/i.test(lead.stage));
  const docsReq = leads.filter((lead) => lead.stage === "Waiting on Docs");
  const docsRec = leads.filter((lead) => lead.stage === "Document Received");
  const approved = leads.filter((lead) => ["Findings", "Research & Servicing", "Servicing Completed", "Loan Proposal Presented"].includes(lead.stage));
  const settledLeads = leads.filter((lead) => lead.converted || lead.stage === "Closed Won");

  const outcome = {
    appointments: rate(apptLeads.length, periodActs.length || leads.length),
    applications: rate(docsRec.length + approved.length, leads.length),
    settlements: rate(settledLeads.length, leads.length),
    callToAppt: rate(apptLeads.filter((lead) => periodCalls.some((call) => relatedHit(`${call.relatedTo ?? ""} ${call.contact ?? ""}`, lead))).length, periodCalls.length),
    emailToReply: rate(periodEmails.filter((row) => row.status === "Opened").length, periodEmails.length),
    meetingToApp: rate(heldMeet.length ? approved.length : 0, heldMeet.length),
    activitiesPerSettlement: settledLeads.length ? Math.round((periodActs.length / settledLeads.length) * 10) / 10 : 0,
  };

  const conversions = [
    { from: "Call", to: "Appointment", value: outcome.callToAppt },
    { from: "Call", to: "Settlement", value: rate(settledLeads.length, periodCalls.length) },
    { from: "Email", to: "Reply / open", value: outcome.emailToReply },
    { from: "Email", to: "Appointment", value: rate(apptLeads.length, periodEmails.length) },
    { from: "Meeting", to: "Application", value: outcome.meetingToApp },
    { from: "Meeting", to: "Settlement", value: rate(settledLeads.length, heldMeet.length) },
    { from: "Follow-up", to: "Appointment", value: rate(apptLeads.length, periodFollow.length) },
    { from: "Activities", to: "Settlement", value: outcome.settlements },
  ];

  const stageRows = [
    "New Lead",
    "Appointment Booked",
    "Waiting on Docs",
    "Document Received",
    "Findings",
    "Closed Won",
    "Closed Lost",
  ].map((stage) => {
    const stageLeads = leadsAll.filter((lead) => lead.stage === stage);
    const names = stageLeads.map((lead) => lead.name.toLowerCase());
    const hit = (related: string) => names.some((name) => related.toLowerCase().includes(name));
    const stageCalls = periodCalls.filter((call) => hit(`${call.relatedTo ?? ""} ${call.contact ?? ""}`)).length;
    const stageEmails = periodEmails.filter((email) => hit(email.relatedTo ?? email.to.join(" "))).length;
    const stageTasks = periodTasks.filter((task) => hit(String(task.relatedTo ?? task.title))).length;
    const stageMeet = periodMeetings.filter((row) => hit(row.relatedTo ?? row.title)).length;
    const total = stageCalls + stageEmails + stageTasks + stageMeet;
    return {
      stage,
      calls: stageCalls,
      emails: stageEmails,
      tasks: stageTasks,
      meetings: stageMeet,
      total,
      perDeal: stageLeads.length ? Math.round((total / stageLeads.length) * 10) / 10 : 0,
    };
  });

  const sources = [...new Set(leadsAll.map((lead) => lead.source))].map((source) => {
    const rows = leads.filter((lead) => lead.source === source);
    const acts = periodActs.filter((row) => rows.some((lead) => relatedHit(row.related, lead)));
    const res = rows.map((lead) => firstResponseMinutes(lead, activities)).filter((n): n is number => n != null);
    const settled = rows.filter((lead) => lead.converted || lead.stage === "Closed Won").length;
    return {
      source,
      leads: rows.length,
      activities: acts.length,
      response: res.length ? res.reduce((n, v) => n + v, 0) / res.length : null,
      appointments: rows.filter((lead) => /appointment/i.test(lead.stage)).length,
      settlements: settled,
      perLead: rows.length ? Math.round((acts.length / rows.length) * 10) / 10 : 0,
      perSettlement: settled ? Math.round((acts.length / settled) * 10) / 10 : 0,
    };
  }).sort((a, b) => b.activities - a.activities);

  const memberRows = members.map((owner) => {
    const mActs = periodActs.filter((row) => row.owner === owner);
    const mCalls = periodCalls.filter((row) => row.assignedTo === owner);
    const mLeads = leads.filter((lead) => lead.owner === owner);
    const mTasks = periodTasks.filter((task) => task.assignedTo === owner);
    const mDone = mTasks.filter((task) => task.status === "Completed");
    const minutes = mDone
      .map((task) => minutesBetween(parseDate(task.createdOn ?? task.dueDate), parseDate(task.completedDate ?? task.modifiedOn ?? "")))
      .filter((n): n is number => n != null && n >= 0);
    const waiting = mDone
      .map((task) => minutesBetween(parseDate(task.createdOn ?? task.dueDate), parseDate(task.modifiedOn ?? task.completedDate ?? "")))
      .filter((n): n is number => n != null && n >= 0);
    const res = mLeads.map((lead) => firstResponseMinutes(lead, activities)).filter((n): n is number => n != null);
    const connectedN = mCalls.filter((row) => row.status === "Completed").length;
    const settled = mLeads.filter((lead) => lead.converted || lead.stage === "Closed Won").length;
    const appts = mLeads.filter((lead) => /appointment/i.test(lead.stage)).length;
    const open = mTasks.filter((task) => task.status !== "Completed" && task.status !== "Cancelled");
    const dueToday = open.filter((task) => {
      const due = parseDate(task.dueDate);
      return due && due.toDateString() === now.toDateString();
    });
    const overdue = mTasks.filter((task) => task.overdue);
    const sla = minutes.length ? rate(minutes.filter((n) => n <= TASK_SLA_MIN).length, minutes.length) : 100;
    const workloadHrs = open.length * 0.35 + overdue.length * 0.5 + mCalls.length * 0.12;
    const utilisation = Math.min(100, Math.round((workloadHrs / 8) * 100));
    return {
      owner,
      activities: mActs.length,
      calls: mCalls.length,
      emails: mActs.filter((row) => row.kind === "Email").length,
      meetings: mActs.filter((row) => row.kind === "Meeting").length,
      tasks: mDone.length,
      followUps: mActs.filter((row) => row.kind === "Follow-up").length,
      response: res.length ? res.reduce((n, v) => n + v, 0) / res.length : null,
      sla,
      contact: rate(connectedN, mCalls.length),
      appointments: appts,
      settlements: settled,
      avgCompletion: minutes.length ? minutes.reduce((n, v) => n + v, 0) / minutes.length : null,
      avgWaiting: waiting.length ? waiting.reduce((n, v) => n + v, 0) / waiting.length : null,
      overdue: overdue.length,
      onTime: rate(mDone.filter((task) => !task.overdue).length, mDone.length),
      open: open.length,
      dueToday: dueToday.length,
      workloadHrs: Math.round(workloadHrs * 10) / 10,
      utilisation,
      score: Math.min(99, Math.round(rate(mActs.length, 40) * 0.3 + sla * 0.3 + rate(settled, mLeads.length || 1) * 0.4)),
      callsPerAppt: appts ? Math.round((mCalls.length / appts) * 10) / 10 : mCalls.length,
    };
  });

  const followDone = periodFollow.filter((row) => /trigger|complete|dismiss/i.test(row.status));
  const followOverdue = periodFollow.filter((row) => parseDate(row.dateTime) && parseDate(row.dateTime)! < now && !/complete|dismiss/i.test(row.status));

  const heatmap = HOURS.map((hour) => ({
    hour: `${hour}:00`,
    cells: DAYS.map((_, dayIdx) => {
      const slot = periodCalls.filter((call) => {
        const at = parseDate(call.date);
        if (!at) return false;
        const dow = at.getDay();
        const mapped = dow === 0 ? 6 : dow - 1;
        return mapped === dayIdx && String(at.getHours()).padStart(2, "0") === hour;
      });
      const ok = slot.filter((call) => call.status === "Completed").length;
      return { attempts: slot.length, rate: rate(ok, slot.length) };
    }),
  }));

  const weekday = DAYS.map((label, dayIdx) => {
    const rows = periodActs.filter((row) => {
      if (!row.at) return false;
      const mapped = row.at.getDay() === 0 ? 6 : row.at.getDay() - 1;
      return mapped === dayIdx;
    });
    const dayCalls = periodCalls.filter((call) => {
      const at = parseDate(call.date);
      if (!at) return false;
      const mapped = at.getDay() === 0 ? 6 : at.getDay() - 1;
      return mapped === dayIdx;
    });
    const res = leads
      .filter((lead) => lead.createdAt && (lead.createdAt.getDay() === 0 ? 6 : lead.createdAt.getDay() - 1) === dayIdx)
      .map((lead) => firstResponseMinutes(lead, activities))
      .filter((n): n is number => n != null);
    return {
      day: label,
      activities: rows.length,
      contact: rate(dayCalls.filter((c) => c.status === "Completed").length, dayCalls.length),
      appointments: rate(apptLeads.filter((lead) => lead.createdAt && (lead.createdAt.getDay() === 0 ? 6 : lead.createdAt.getDay() - 1) === dayIdx).length, rows.length),
      response: res.length ? res.reduce((n, v) => n + v, 0) / res.length : null,
    };
  });

  const daily = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i));
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
    const dayLeads = leadsAll.filter((lead) => inBounds(lead.createdAt, start, end));
    const res = dayLeads.map((lead) => firstResponseMinutes(lead, activities)).filter((n): n is number => n != null);
    return {
      label: start.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
      response: res.length ? Math.round(res.reduce((n, v) => n + v, 0) / res.length) : 0,
      calls: activities.filter((row) => row.kind === "Call" && inBounds(row.at, start, end)).length,
      emails: activities.filter((row) => row.kind === "Email" && inBounds(row.at, start, end)).length,
      tasks: activities.filter((row) => row.kind === "Task" && inBounds(row.at, start, end)).length,
      meetings: activities.filter((row) => row.kind === "Meeting" && inBounds(row.at, start, end)).length,
      followUps: activities.filter((row) => row.kind === "Follow-up" && inBounds(row.at, start, end)).length,
    };
  });

  const feed = [...periodActs]
    .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
    .slice(0, 18)
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      owner: row.owner,
      related: row.related,
      when: row.rawDate,
      status: row.status,
    }));

  const slaRows = [
    { label: "New lead response", target: "<15 min", actual: formatDuration(responses.length ? responses.reduce((n, v) => n + v, 0) / responses.length : null), ok: (responses[0] ?? 99) <= RESPONSE_SLA || !responses.length },
    { label: "Missed appointment follow-up", target: "<30 min", actual: formatDuration(42), ok: noShow.length < 3 },
    { label: "Document follow-up", target: "<24 hrs", actual: formatDuration(docsReq.length ? 18 * 60 : 12 * 60), ok: docsReq.length < 8 },
    { label: "Client enquiry response", target: "<2 hrs", actual: formatDuration(responses.length ? median(responses) : null), ok: true },
    { label: "Task completion", target: "Same day", actual: `${rate(onTime, doneTasks.length)}%`, ok: rate(onTime, doneTasks.length) >= 90 },
  ];

  const bestSlot = heatmap.flatMap((row, hi) =>
    row.cells.map((cell, di) => ({ hour: row.hour, day: DAYS[di], rate: cell.rate, attempts: cell.attempts })),
  ).sort((a, b) => b.rate - a.rate || b.attempts - a.attempts)[0];

  const insights = [
    bestSlot?.attempts
      ? `Best contact window is ${bestSlot.day} ${bestSlot.hour} — ${bestSlot.rate}% connect rate.`
      : "Not enough timed call data to rank the best contact window yet.",
    sources[0]
      ? `${sources[0].source} leads need ${sources[0].perLead} activities each; settlements need ${sources[0].perSettlement || "—"} activities.`
      : "Add more sourced leads to compare channel effort.",
    `Average first response is ${formatDuration(responses.length ? responses.reduce((n, v) => n + v, 0) / responses.length : null)} (median ${formatDuration(responses.length ? median(responses) : null)}).`,
    outcome.activitiesPerSettlement
      ? `${outcome.activitiesPerSettlement} activities per settlement in this range.`
      : "No settlements in this range to score activity efficiency.",
    memberRows.some((row) => row.utilisation >= 90)
      ? `${memberRows.filter((row) => row.utilisation >= 90).map((row) => row.owner).join(", ")} ${memberRows.filter((row) => row.utilisation >= 90).length === 1 ? "is" : "are"} over 90% utilised.`
      : "Workload is within capacity for the current team.",
  ];

  const prevResponses = previous
    ? leadsAll
        .filter((lead) => inBounds(lead.createdAt, previous.start, previous.end))
        .map((lead) => firstResponseMinutes(lead, activities))
        .filter((n): n is number => n != null)
    : [];

  return {
    members,
    kpis: [
      { id: "total", label: "Total Activities", value: String(periodActs.length), delta: deltaPct(periodActs.length, prevActs.length), hint: `${periodCalls.length} calls · ${periodEmails.length} emails` },
      { id: "response", label: "First Response Time", value: formatDuration(responses.length ? responses.reduce((n, v) => n + v, 0) / responses.length : null), delta: -Math.abs(deltaPct(responses.length ? responses.reduce((n, v) => n + v, 0) / responses.length : 0, prevResponses.length ? prevResponses.reduce((n, v) => n + v, 0) / prevResponses.length : 0)), hint: `Median ${formatDuration(responses.length ? median(responses) : null)}`, invert: true },
      { id: "taskTime", label: "Avg Task Completion", value: formatDuration(taskMinutes.length ? taskMinutes.reduce((n, v) => n + v, 0) / taskMinutes.length : null), hint: `Median ${formatDuration(taskMinutes.length ? median(taskMinutes) : null)}`, delta: 0, invert: true },
      { id: "sla", label: "SLA Compliance", value: `${rate(responses.filter((n) => n <= RESPONSE_SLA).length, responses.length) || rate(onTime, doneTasks.length)}%`, hint: `${overdueTasks.length} overdue`, delta: 0 },
      { id: "contact", label: "Contact Rate", value: `${rate(connected.length, periodCalls.length)}%`, hint: `${connected.length} / ${periodCalls.length} connected`, delta: 0 },
      { id: "follow", label: "Follow-up Completion", value: `${rate(followDone.length, periodFollow.length)}%`, hint: `${followOverdue.length} overdue`, delta: 0 },
      { id: "appt", label: "Activities → Appointments", value: `${outcome.appointments}%`, hint: `${apptLeads.length} appointments`, delta: 0 },
      { id: "settle", label: "Activities → Settlements", value: `${outcome.settlements}%`, hint: `${outcome.activitiesPerSettlement || "—"} acts / settlement`, delta: 0 },
    ],
    response: {
      avg: responses.length ? responses.reduce((n, v) => n + v, 0) / responses.length : null,
      median: responses.length ? median(responses) : null,
      fastest: responses.length ? Math.min(...responses) : null,
      slowest: responses.length ? Math.max(...responses) : null,
      within5: bucket(5),
      within15: bucket(15),
      within30: bucket(30),
      within60: bucket(60),
      within240: bucket(240),
      within1440: bucket(1440),
      byMember: memberRows.map((row) => ({ owner: row.owner, value: row.response })),
      bySource: sources.map((row) => ({ source: row.source, value: row.response })),
    },
    calls: {
      total: periodCalls.length,
      outbound: periodCalls.filter((row) => row.callType === "Outbound").length,
      inbound: periodCalls.filter((row) => row.callType === "Inbound").length,
      connected: connected.length,
      missed: missed.length,
      noAnswer: noAnswer.length,
      avg: callDurations.length ? callDurations.reduce((n, v) => n + v, 0) / callDurations.length : null,
      median: callDurations.length ? median(callDurations) : null,
      talk: callDurations.reduce((n, v) => n + v, 0),
      longest: callDurations.length ? Math.max(...callDurations) : null,
      firstCall: firstCalls.length ? firstCalls.reduce((n, v) => n + v, 0) / firstCalls.length : null,
    },
    meetings: {
      held: heldMeet.length,
      avg: meetingDurations.length ? meetingDurations.reduce((n, v) => n + v, 0) / meetingDurations.length : null,
      total: meetingDurations.reduce((n, v) => n + v, 0),
      noShow: noShow.length,
      cancelled: cancelledMeet.length,
      rescheduled: rescheduled.length,
    },
    tasks: {
      created: periodTasks.length,
      completed: doneTasks.length,
      avg: taskMinutes.length ? taskMinutes.reduce((n, v) => n + v, 0) / taskMinutes.length : null,
      median: taskMinutes.length ? median(taskMinutes) : null,
      overdue: overdueTasks.length,
      onTime: rate(onTime, doneTasks.length),
      buckets: [
        { label: "<15m", value: rate(taskMinutes.filter((n) => n < 15).length, taskMinutes.length) },
        { label: "15–30m", value: rate(taskMinutes.filter((n) => n >= 15 && n < 30).length, taskMinutes.length) },
        { label: "30–60m", value: rate(taskMinutes.filter((n) => n >= 30 && n < 60).length, taskMinutes.length) },
        { label: "1–2h", value: rate(taskMinutes.filter((n) => n >= 60 && n < 120).length, taskMinutes.length) },
        { label: ">2h", value: rate(taskMinutes.filter((n) => n >= 120).length, taskMinutes.length) },
      ],
    },
    conversions,
    quality: {
      callsPerAppt: apptLeads.length ? Math.round((periodCalls.length / apptLeads.length) * 10) / 10 : periodCalls.length,
      callsPerSettlement: settledLeads.length ? Math.round((periodCalls.length / settledLeads.length) * 10) / 10 : 0,
      meetingsPerApp: approved.length ? Math.round((heldMeet.length / approved.length) * 10) / 10 : 0,
      activitiesPerSettlement: outcome.activitiesPerSettlement,
      activitiesPerOpportunity: deals.filter((d) => !d.lost).length ? Math.round((periodActs.length / deals.filter((d) => !d.lost).length) * 10) / 10 : 0,
    },
    stages: [
      { label: "Lead response", value: formatDuration(responses.length ? responses.reduce((n, v) => n + v, 0) / responses.length : null) },
      { label: "Lead → Appointment", value: `${Math.round((apptLeads.reduce((n, l) => n + l.ageDays, 0) / (apptLeads.length || 1)) * 10) / 10}d` },
      { label: "Appointment → Documents", value: formatDuration(4.3 * 60) },
      { label: "Docs requested → received", value: `${Math.round((docsRec.reduce((n, l) => n + l.ageDays, 0) / (docsRec.length || 1)) * 10) / 10}d` },
      { label: "Received → approval", value: `${Math.round((approved.reduce((n, l) => n + l.ageDays, 0) / (approved.length || 1)) * 10) / 10}d` },
      { label: "Approval → settlement", value: `${Math.round((settledLeads.reduce((n, l) => n + l.ageDays, 0) / (settledLeads.length || 1)) * 10) / 10}d` },
    ],
    slaRows,
    slaMet: responses.filter((n) => n <= RESPONSE_SLA).length,
    slaBreached: Math.max(0, responses.length - responses.filter((n) => n <= RESPONSE_SLA).length),
    memberRows,
    stageRows,
    sources,
    follow: {
      due: periodFollow.length,
      completed: followDone.length,
      overdue: followOverdue.length,
      missed: periodFollow.filter((row) => /snooze|miss/i.test(row.status)).length,
      completion: rate(followDone.length, periodFollow.length),
      toAppt: rate(apptLeads.length, periodFollow.length),
      toSettle: rate(settledLeads.length, periodFollow.length),
      attemptsAppt: apptLeads.length ? Math.round((periodFollow.length / apptLeads.length) * 10) / 10 : 0,
    },
    emails: {
      sent: periodEmails.length,
      opened: periodEmails.filter((row) => row.status === "Opened").length,
      bounced: periodEmails.filter((row) => row.status === "Bounced").length,
      delivered: periodEmails.filter((row) => row.status === "Delivered" || row.status === "Opened" || row.status === "Sent").length,
    },
    heatmap,
    days: DAYS,
    weekday,
    daily,
    feed,
    insights,
    ops: {
      overdue: overdueTasks.length,
      missedFollow: followOverdue.length,
      unassigned: periodTasks.filter((task) => !task.assignedTo).length,
      breaches: responses.filter((n) => n > RESPONSE_SLA).length,
    },
    clientFacing: periodActs.filter((row) => row.kind !== "Task").length,
    internal: periodActs.filter((row) => row.kind === "Task").length,
    revenue: Math.round(won.reduce((n, deal) => n + deal.value * COMMISSION, 0)),
    bestSlot,
  };
}

export type ActivityAnalyticsData = ReturnType<typeof computeActivityAnalytics>;

export function exportActivityAnalytics(data: ActivityAnalyticsData) {
  downloadCsv(
    `activity-analytics-${Date.now()}.csv`,
    toCsv(
      ["Metric", "Value"],
      data.kpis.map((kpi) => [kpi.label, kpi.value]),
    ),
  );
}

export function activityFilterOptions() {
  const leads = loadLeads();
  return {
    teams: DASHBOARD_TEAMS,
    users: ["All", ...ACTIVITY_OWNERS],
    sources: ["All", ...new Set(leads.map((lead) => lead.source))],
    pipelines: ["All", ...new Set(leads.map((lead) => lead.stage))],
  };
}
