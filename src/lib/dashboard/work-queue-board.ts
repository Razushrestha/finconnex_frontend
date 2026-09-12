/** Work Queue Dashboard widgets from live CRM stores. */

import { formatRelatedTo } from "@/lib/activities/shared";
import { listLeadColumns } from "@/lib/leads/store";
import { listDealPipelines } from "@/lib/deals/store";
import { listTaskColumns } from "@/lib/tasks/store";
import { listMeetings } from "@/lib/meetings/store";
import { listReminders } from "@/lib/reminders/store";
import { listDocumentRequests } from "@/lib/documents/requests/types";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import { parseTaskDueDate, type DashboardFilters } from "@/lib/dashboard/layout";
import { loadPipelineSlaConfig } from "@/lib/pipeline-sla/settings";
import type { SlaDuration } from "@/lib/pipeline-sla/types";
import { listSlaAttentionLeads } from "@/lib/pipeline-sla/work-queue";

const TEAM_OWNERS: Record<string, string[]> = {
  Sales: ["John Smith", "Shiva Kadhka"],
  Operations: ["Tejas Gokhe"],
  Support: ["Roshna Abraham"],
};

export type QueueLine = {
  id: string;
  title: string;
  related: string;
  owner: string;
  when: string;
  extra: string;
  tone?: "rose" | "amber" | "emerald";
};

export type WorkQueueDashboard = {
  overdueTasks: number;
  tasksDueToday: number;
  followUpsDue: number;
  documentsPending: number;
  appointmentsToday: number;
  slaBreaches: number;
  overdueDelta: number;
  todayDelta: number;
  followDelta: number;
  docsDelta: number;
  apptDelta: number;
  slaDelta: number;
  tasksToday: QueueLine[];
  followUps: QueueLine[];
  documents: QueueLine[];
  appointments: QueueLine[];
  missed: QueueLine[];
  stale: QueueLine[];
  approvals: Array<{ label: string; value: number }>;
  lenders: Array<{ name: string; value: number }>;
  urgent: QueueLine[];
};

function ownerAllowed(owner: string, filters: DashboardFilters) {
  if (filters.owner !== "All" && owner !== filters.owner) return false;
  if (filters.team !== "All teams") {
    const names = TEAM_OWNERS[filters.team];
    if (names && !names.includes(owner)) return false;
  }
  return true;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function slaMs(duration: SlaDuration | null) {
  if (!duration) return null;
  if (duration.unit === "minutes") return duration.amount * 60_000;
  if (duration.unit === "hours") return duration.amount * 3_600_000;
  return duration.amount * 86_400_000;
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

function timeLabel(raw?: string) {
  const at = parseFlexibleDate(raw) ?? parseTaskDueDate(raw ?? "");
  if (!at) return raw || "—";
  return at.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function dateLabel(raw?: string) {
  const at = parseFlexibleDate(raw) ?? parseTaskDueDate(raw ?? "");
  if (!at) return raw || "—";
  return at.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function computeWorkQueueDashboard(
  filters: DashboardFilters,
  now = new Date(),
  query = "",
): WorkQueueDashboard {
  const sla = loadPipelineSlaConfig();
  const q = query.trim().toLowerCase();
  const match = (...parts: string[]) =>
    !q || parts.some((p) => p.toLowerCase().includes(q));

  const tasks = listTaskColumns()
    .flatMap((c) => c.tasks)
    .filter((t) => ownerAllowed(t.assignedTo, filters));
  const reminders = listReminders().filter((r) => ownerAllowed(r.owner, filters));
  const meetings = listMeetings();
  const docs = listDocumentRequests();
  const leads = listLeadColumns().flatMap((col) =>
    col.cards.map((card) => ({ card, stage: card.pipelineStage || col.title })),
  );
  const deals = Object.values(listDealPipelines()).flatMap((stages) =>
    stages.flatMap((s) => s.deals.map((d) => ({ ...d, stage: s.title }))),
  );

  const openTasks = tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
  const overdueTasks = openTasks.filter((t) => t.overdue);
  const tasksDueToday = openTasks.filter((t) => {
    const due = parseTaskDueDate(t.dueDate);
    return due ? sameDay(due, now) : false;
  });
  const followUps = reminders.filter((r) => {
    if (r.status === "Dismissed") return false;
    const at = parseFlexibleDate(r.dateTime);
    return at ? at <= now : false;
  });
  const documents = docs.filter(
    (req) =>
      req.status === "Requested" ||
      req.status === "Pending" ||
      req.items?.some((line) => line.status === "Awaiting"),
  );
  const appointments = meetings.filter((m) => {
    if (m.status === "Cancelled") return false;
    const at = parseFlexibleDate(m.startDateTime);
    return at ? sameDay(at, now) : false;
  });
  const missed = [
    ...meetings
      .filter((m) => {
        const at = parseFlexibleDate(m.startDateTime);
        return m.status === "Cancelled" || (at ? at < now && m.status === "Scheduled" && !sameDay(at, now) : false);
      })
      .map((m) => ({
        id: m.id,
        title: m.title,
        related: m.relatedTo || m.organizer,
        owner: m.organizer,
        when: `${dateLabel(m.startDateTime)} ${timeLabel(m.startDateTime)}`,
        extra: m.type,
        tone: "rose" as const,
      })),
    ...leads
      .filter((row) => row.stage === "Appointment Missed")
      .map((row) => ({
        id: row.card.id,
        title: row.card.name,
        related: row.card.company,
        owner: row.card.owner,
        when: dateLabel(row.card.stageEnteredAt || row.card.createdDate),
        extra: "Appointment",
        tone: "rose" as const,
      })),
  ];

  const slaBreaches = leads.filter((row) => {
    const rowSla = sla.stageSlas.find((s) => s.stage === row.stage);
    const limit = slaMs(rowSla?.duration ?? null);
    if (limit == null) return false;
    const entered = parseFlexibleDate(row.card.stageEnteredAt || row.card.createdDate) ?? now;
    return now.getTime() - entered.getTime() > limit;
  });

  const stale = [
    ...leads
      .filter((row) => {
        if (row.stage === "Closed Won" || row.stage === "Closed Lost") return false;
        const entered = parseFlexibleDate(row.card.stageEnteredAt || row.card.createdDate) ?? now;
        return daysBetween(entered, now) > 15;
      })
      .map((row) => ({
        id: row.card.id,
        title: row.card.name,
        related: row.card.company,
        owner: row.card.owner,
        when: dateLabel(row.card.stageEnteredAt),
        extra: `${daysBetween(parseFlexibleDate(row.card.stageEnteredAt || row.card.createdDate) ?? now, now)} days`,
        tone: "rose" as const,
      })),
    ...deals
      .filter((d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost")
      .filter((d) => {
        const close = parseFlexibleDate(d.closeDate);
        return close ? daysBetween(close, now) > 15 : true;
      })
      .map((d) => ({
        id: d.id,
        title: d.name,
        related: d.account || d.contact || "—",
        owner: d.owner,
        when: dateLabel(d.closeDate),
        extra: `${d.stage}`,
        tone: "rose" as const,
      })),
  ];

  const slaRows = listSlaAttentionLeads().filter((row) => ownerAllowed(row.owner, filters));

  const urgent: QueueLine[] = [
    ...slaBreaches.slice(0, 4).map((row) => ({
      id: `sla-${row.card.id}`,
      title: `SLA breach: ${row.card.name} in ${row.stage}`,
      related: row.card.company,
      owner: row.card.owner,
      when: "now",
      extra: row.stage,
      tone: "rose" as const,
    })),
    ...overdueTasks.slice(0, 3).map((t) => ({
      id: `od-${t.taskId}`,
      title: `Overdue task: ${t.title}`,
      related: formatRelatedTo(t.relatedTo) || t.assignedTo,
      owner: t.assignedTo,
      when: dateLabel(t.dueDate),
      extra: t.priority,
      tone: "rose" as const,
    })),
    ...slaRows.slice(0, 3).map((row) => ({
      id: `attn-${row.leadId}`,
      title: `${row.badgeLabel}: ${row.name}`,
      related: row.stage,
      owner: row.owner,
      when: row.detail,
      extra: row.badgeLabel,
      tone: "amber" as const,
    })),
  ].slice(0, 7);

  const approvals = [
    { label: "Lender Approvals", value: documents.filter((d) => d.documentType === "Financial").length },
    { label: "Credit Approvals", value: documents.filter((d) => d.documentType === "ID Proof").length },
    { label: "Condition Approvals", value: documents.filter((d) => d.documentType === "Legal").length },
    { label: "Final Approvals", value: documents.filter((d) => d.status === "Pending").length },
  ];

  const lenderMap = new Map<string, number>();
  for (const req of documents) {
    const name = (req.relatedTo || req.requestedFrom || "Unassigned").split(":")[0]?.trim() || "Unassigned";
    lenderMap.set(name, (lenderMap.get(name) ?? 0) + 1);
  }
  const lenders = [...lenderMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const pick = (rows: QueueLine[]) =>
    rows.filter((row) => match(row.title, row.related, row.owner, row.extra)).slice(0, 5);

  return {
    overdueTasks: overdueTasks.length,
    tasksDueToday: tasksDueToday.length,
    followUpsDue: followUps.length,
    documentsPending: documents.length,
    appointmentsToday: appointments.length,
    slaBreaches: slaBreaches.length || slaRows.length,
    overdueDelta: overdueTasks.length,
    todayDelta: tasksDueToday.length,
    followDelta: followUps.length,
    docsDelta: documents.length,
    apptDelta: appointments.length,
    slaDelta: slaBreaches.length,
    tasksToday: pick(
      tasksDueToday.map((t) => ({
        id: t.taskId,
        title: t.title,
        related: formatRelatedTo(t.relatedTo) || "—",
        owner: t.assignedTo,
        when: timeLabel(t.dueDate),
        extra: t.priority,
        tone: t.priority === "High" ? "rose" : t.priority === "Medium" ? "amber" : "emerald",
      })),
    ),
    followUps: pick(
      followUps.map((r) => ({
        id: r.id,
        title: r.title,
        related: r.relatedTo || "—",
        owner: r.owner,
        when: dateLabel(r.dateTime),
        extra: r.type,
      })),
    ),
    documents: pick(
      documents.map((d) => ({
        id: d.id,
        title: d.title || d.documentType,
        related: d.requestedFrom || d.relatedTo || "—",
        owner: d.requestedBy,
        when: dateLabel(d.requestedDate),
        extra: d.dueDate ? `Due ${d.dueDate}` : d.status,
        tone: "rose",
      })),
    ),
    appointments: pick(
      appointments.map((m) => ({
        id: m.id,
        title: m.title,
        related: m.relatedTo || m.attendees[0]?.name || "—",
        owner: m.organizer,
        when: timeLabel(m.startDateTime),
        extra: m.type,
      })),
    ),
    missed: pick(missed),
    stale: pick(stale),
    approvals,
    lenders,
    urgent: pick(urgent),
  };
}
