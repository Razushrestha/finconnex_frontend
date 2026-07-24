/**
 * Live Work Queue: auto-prioritised today/overdue activities
 * matching the client Workqueue standalone layout.
 */

import {
  ACTIVITY_OWNERS,
  avatarColor,
  formatRelatedTo,
  initials,
} from "@/lib/activities/shared";
import { getRulesActor } from "@/lib/rules/actor";
import { listTaskColumns } from "@/lib/tasks/store";
import { listLeadColumns } from "@/lib/leads/store";
import { listContactGroups } from "@/lib/contacts/store";
import { listDealPipelines } from "@/lib/deals/store";
import { listCalls } from "@/lib/calls/store";
import { reminders } from "@/lib/reminders/types";
import { listMeetings } from "@/lib/meetings/store";
import { type Meeting } from "@/lib/meetings/types";
import { listEmails } from "@/lib/emails/store";
import { type Email } from "@/lib/emails/types";
import { listMessages } from "@/lib/messages/store";
import {
  listSlaAttentionLeads,
  type SlaAttentionLabel,
  type SlaWorkQueueEntry,
} from "@/lib/pipeline-sla/work-queue";
import {
  ACTIVITY_DEFAULT,
  USER_TAB_COLORS,
  type ActivityNavId,
  type WorkqueueCategoryDef,
  type WorkqueueItemId,
  type WorkQueueNavId,
} from "@/lib/work-queue/config";

export type WorkQueueTimeFilter =
  | "today-overdue"
  | "today"
  | "this-week"
  | "all";

export type WorkQueueScope = string;

export interface WorkQueueUserTab {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
}

export interface QueueRow {
  id: string;
  subject: string;
  dueLabel: string;
  dueColor: string;
  status: string;
  priority: string;
  related: string;
  sortKey: number;
  href: string;
}

export interface ActivityNavItem {
  id: ActivityNavId;
  label: string;
  icon: (typeof ACTIVITY_DEFAULT)[number]["icon"];
  count: number;
}

export interface WorkqueueSidebarCategory {
  id: string;
  label: string;
  items: {
    id: WorkqueueItemId;
    label: string;
    count: number;
    danger?: boolean;
  }[];
}

const HREF: Record<string, string> = {
  tasks: "/activities/tasks",
  calls: "/activities/calls",
  meetings: "/activities/meetings",
  emails: "/activities/emails",
  messages: "/activities/messages",
  reminders: "/activities/reminders",
  notes: "/activities/notes",
  attachments: "/activities/attachments",
  documents: "/documents/requests",
  leads: "/sales/leads",
  contacts: "/sales/contacts",
  deals: "/sales/deals",
};

function parseFlexibleDate(raw?: string | null): Date | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i,
  );
  if (m) {
    let hours = m[4] ? Number(m[4]) : 12;
    const mins = m[5] ? Number(m[5]) : 0;
    const ap = m[6]?.toUpperCase();
    if (ap === "PM" && hours < 12) hours += 12;
    if (ap === "AM" && hours === 12) hours = 0;
    if (!ap) {
      // Date-only: noon local so day math is stable
      hours = 12;
    }
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), hours, mins);
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function hasClockTime(raw?: string | null) {
  return !!raw && /\d{1,2}:\d{2}/.test(raw);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function formatDueLabel(due: Date | null, now = new Date()): string {
  if (!due) return "";
  const today = startOfDay(now).getTime();
  const day = startOfDay(due).getTime();
  const diff = Math.round((day - today) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  if (diff < -1) return `${Math.abs(diff)}d overdue`;
  return due.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

export function dueColorForLabel(label: string): string {
  if (!label) return "#6B7280";
  if (label === "Yesterday" || label.includes("overdue")) return "#DC2626";
  if (label === "Today") return "#111827";
  return "#6B7280";
}

function priorityRank(p?: string) {
  const v = (p ?? "").toLowerCase();
  if (v === "high") return 0;
  if (v === "medium") return 1;
  if (v === "low") return 2;
  return 3;
}

function buildSortKey(due: Date | null, priority: string, now = new Date()) {
  const today = startOfDay(now).getTime();
  const dueDay = due ? startOfDay(due).getTime() : Number.MAX_SAFE_INTEGER;
  const bucket =
    due && dueDay < today ? 0 : due && dueDay === today ? 1 : due ? 2 : 3;
  const time = due ? due.getTime() : Number.MAX_SAFE_INTEGER;
  return bucket * 1e13 + priorityRank(priority) * 1e11 + time;
}

function matchesTimeFilter(
  due: Date | null,
  filter: WorkQueueTimeFilter,
  now = new Date(),
): boolean {
  if (filter === "all") return true;
  if (!due) return false;
  const today0 = startOfDay(now);
  const today1 = endOfDay(now);
  const weekEnd = endOfDay(addDays(today0, 7));

  if (filter === "today") return due >= today0 && due <= today1;
  if (filter === "today-overdue") return due <= today1;
  if (filter === "this-week") return due <= weekEnd;
  return true;
}

function ownerMatches(ownerName: string, scope: WorkQueueScope): boolean {
  return ownerName === scope;
}

/** Recently assigned: true 3h window when time present; same calendar day when date-only. */
function isRecentlyAssigned(raw: string | undefined, now = new Date()) {
  const d = parseFlexibleDate(raw);
  if (!d) return false;
  if (hasClockTime(raw)) {
    return now.getTime() - d.getTime() <= 3 * 60 * 60 * 1000 && d <= now;
  }
  return startOfDay(d).getTime() === startOfDay(now).getTime();
}

/** Stale: still early-stage and older than 7 days. */
function isStaleLead(
  status: string,
  createdRaw: string | undefined,
  now = new Date(),
) {
  if (status !== "New" && status !== "Contacted") return false;
  const d = parseFlexibleDate(createdRaw);
  if (!d) return false;
  return now.getTime() - d.getTime() >= 7 * 86_400_000;
}

function closingThisMonth(closeRaw: string | undefined, now = new Date()) {
  const d = parseFlexibleDate(closeRaw);
  if (!d) return false;
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

function nameTokens(name: string) {
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/** First-name match + tolerant last-name (handles Kadhka / Khadka typos). */
function namesRoughlyMatch(a: string, b: string) {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return false;
  if (ta[0] !== tb[0]) return false;
  if (ta.length === 1 || tb.length === 1) return true;
  const la = ta[ta.length - 1];
  const lb = tb[tb.length - 1];
  if (la === lb) return true;
  const n = Math.min(4, la.length, lb.length);
  return la.slice(0, n) === lb.slice(0, n);
}

function meetingOwnedBy(m: Meeting, scope: WorkQueueScope) {
  if (m.attendees.some((a) => namesRoughlyMatch(a.name, scope))) return true;
  const org = m.organizer.toLowerCase();
  const first = scope.split(/\s+/)[0]?.toLowerCase() ?? "";
  return first.length > 2 && org.startsWith(first);
}

function emailOwnedBy(e: Email, scope: WorkQueueScope) {
  const related = e.relatedTo ?? "";
  if (related && namesRoughlyMatch(related, scope)) return true;
  const blob = `${related} ${e.to.join(" ")} ${e.from}`.toLowerCase();
  const first = scope.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (first.length > 2 && blob.includes(first)) return true;
  // Unassigned org drafts are visible to the active actor only
  return getRulesActor().name === scope && !e.relatedTo;
}

function hrefFor(module: keyof typeof HREF, id: string, q?: string) {
  const base = HREF[module];
  const params = new URLSearchParams();
  params.set("focus", id);
  if (q) params.set("q", q);
  return `${base}?${params.toString()}`;
}

function toRow(
  id: string,
  subject: string,
  dueRaw: string | null | undefined,
  status: string,
  priority: string,
  related: string,
  timeFilter: WorkQueueTimeFilter,
  now: Date,
  href: string,
  opts?: { requireDue?: boolean },
): QueueRow | null {
  const due = parseFlexibleDate(dueRaw);
  if (opts?.requireDue !== false && !matchesTimeFilter(due, timeFilter, now)) {
    return null;
  }
  if (opts?.requireDue === false && timeFilter !== "all" && due) {
    if (!matchesTimeFilter(due, timeFilter, now)) return null;
  }
  const dueLabel = due ? formatDueLabel(due, now) : "";
  return {
    id,
    subject,
    dueLabel,
    dueColor: dueColorForLabel(dueLabel),
    status,
    priority,
    related,
    sortKey: buildSortKey(due, priority, now),
    href,
  };
}

const OPEN_TASK = new Set(["Not Started", "In Progress", "Deferred"]);
const OPEN_CALL = new Set(["Scheduled", "No Answer", "Voicemail Left"]);
const OPEN_REMINDER = new Set(["Pending", "Snoozed"]);
const OPEN_MEETING = new Set(["Scheduled", "In Progress", "Rescheduled"]);
const OPEN_EMAIL = new Set(["Draft", "Scheduled", "Opened"]);
const OPEN_MESSAGE = new Set(["Draft", "Sent", "Delivered"]);

export function listActivityRows(
  kind: ActivityNavId,
  scope: WorkQueueScope,
  timeFilter: WorkQueueTimeFilter,
  now = new Date(),
): QueueRow[] {
  const rows: QueueRow[] = [];

  if (kind === "tasks") {
    for (const col of listTaskColumns()) {
      for (const t of col.tasks) {
        if (!OPEN_TASK.has(t.status)) continue;
        if (!ownerMatches(t.assignedTo, scope)) continue;
        const row = toRow(
          t.taskId,
          t.title,
          t.dueDate,
          t.status,
          t.priority,
          formatRelatedTo(t.relatedTo),
          timeFilter,
          now,
          hrefFor("tasks", t.taskId, t.title),
        );
        if (row) rows.push(row);
      }
    }
  }

  if (kind === "calls") {
    for (const c of listCalls()) {
      if (!OPEN_CALL.has(c.status)) continue;
      if (!ownerMatches(c.assignedTo, scope)) continue;
      const row = toRow(
        c.id,
        c.subject,
        c.date,
        c.status,
        "Medium",
        c.relatedTo || c.contact || "",
        timeFilter,
        now,
        hrefFor("calls", c.id, c.subject),
      );
      if (row) rows.push(row);
    }
  }

  if (kind === "reminders") {
    for (const r of reminders) {
      if (!OPEN_REMINDER.has(r.status)) continue;
      if (!ownerMatches(r.owner, scope)) continue;
      const row = toRow(
        r.id,
        r.title,
        r.dateTime,
        r.status,
        "High",
        r.relatedTo || "",
        timeFilter,
        now,
        hrefFor("reminders", r.id, r.title),
      );
      if (row) rows.push(row);
    }
  }

  if (kind === "meetings") {
    for (const m of listMeetings()) {
      if (!OPEN_MEETING.has(m.status)) continue;
      if (!meetingOwnedBy(m, scope)) continue;
      const row = toRow(
        m.id,
        m.title,
        m.startDateTime,
        m.status,
        "Medium",
        m.relatedTo || "",
        timeFilter,
        now,
        hrefFor("meetings", m.id, m.title),
      );
      if (row) rows.push(row);
    }
  }

  if (kind === "emails") {
    for (const e of listEmails()) {
      if (!OPEN_EMAIL.has(e.status)) continue;
      if (!emailOwnedBy(e, scope)) continue;
      const row = toRow(
        e.id,
        e.subject,
        e.sentDate || null,
        e.status,
        "Medium",
        e.relatedTo || e.to[0] || "",
        timeFilter,
        now,
        hrefFor("emails", e.id, e.subject),
        { requireDue: false },
      );
      if (row) {
        // Emails without dates still appear under "all" / when filter allows undated
        if (!e.sentDate && timeFilter !== "all") continue;
        rows.push(row);
      }
    }
  }

  if (kind === "messages") {
    for (const msg of listMessages()) {
      if (!OPEN_MESSAGE.has(msg.status)) continue;
      if (msg.from !== scope && msg.to !== scope) continue;
      const row = toRow(
        msg.id,
        msg.subject,
        msg.sentDate || null,
        msg.status,
        "Medium",
        msg.relatedTo || msg.to,
        timeFilter,
        now,
        hrefFor("messages", msg.id, msg.subject),
        { requireDue: false },
      );
      if (row) {
        if (!msg.sentDate && timeFilter !== "all") continue;
        rows.push(row);
      }
    }
  }

  return rows.sort((a, b) => a.sortKey - b.sortKey);
}

type LeadRow = {
  id: string;
  name: string;
  status: string;
  owner: string;
  company: string;
  createdDate: string;
  estimatedValue?: string;
  source: string;
};

type ContactRow = {
  id: string;
  name: string;
  status: string;
  company: string;
  createdDate: string;
  source: string;
};

type DealRow = {
  id: string;
  name: string;
  status: string;
  account: string;
  closeDate: string;
  contact?: string;
};

function scopedLeads(scope: WorkQueueScope): LeadRow[] {
  const out: LeadRow[] = [];
  for (const col of listLeadColumns()) {
    for (const card of col.cards) {
      if (!ownerMatches(card.owner, scope)) continue;
      out.push({
        id: card.id,
        name: card.name,
        status: col.title,
        owner: card.owner,
        company: card.company,
        createdDate: card.createdDate,
        estimatedValue: card.estimatedValue,
        source: card.source,
      });
    }
  }
  return out;
}

function scopedContacts(scope: WorkQueueScope): ContactRow[] {
  const out: ContactRow[] = [];
  for (const g of listContactGroups()) {
    for (const c of g.contacts) {
      if (!ownerMatches(c.owner, scope)) continue;
      out.push({
        id: c.id,
        name: c.name,
        status: g.title,
        company: c.company,
        createdDate: c.createdDate,
        source: c.source,
      });
    }
  }
  return out;
}

function scopedDeals(scope: WorkQueueScope): DealRow[] {
  const out: DealRow[] = [];
  for (const stages of Object.values(listDealPipelines())) {
    for (const stage of stages) {
      for (const d of stage.deals) {
        if (!ownerMatches(d.owner, scope)) continue;
        out.push({
          id: d.id,
          name: d.name,
          status: stage.title,
          account: d.account,
          closeDate: d.closeDate,
          contact: d.contact,
        });
      }
    }
  }
  return out;
}

function leadRows(items: LeadRow[], priority = "Medium"): QueueRow[] {
  return items.map((it, i) => {
    const due = parseFlexibleDate(it.createdDate);
    const dueLabel = formatDueLabel(due);
    return {
      id: it.id,
      subject: it.name,
      dueLabel,
      dueColor: dueColorForLabel(dueLabel),
      status: it.status,
      priority,
      related: it.company ? `Company: ${it.company}` : "",
      sortKey: due ? -due.getTime() : i,
      href: hrefFor("leads", it.id, it.name),
    };
  });
}

function slaDueColor(label: SlaAttentionLabel): string {
  if (label === "Overdue" || label === "Milestone Overdue") return "#DC2626";
  if (label === "Due Today") return "#111827";
  return "#D97706"; // At Risk
}

function slaPriority(label: SlaAttentionLabel): string {
  if (label === "Overdue" || label === "Milestone Overdue") return "High";
  if (label === "Due Today") return "Medium";
  return "Medium";
}

function slaQueueRows(entries: SlaWorkQueueEntry[]): QueueRow[] {
  return entries.map((it, i) => ({
    id: it.leadId,
    subject: it.name,
    dueLabel: it.detail,
    dueColor: slaDueColor(it.badgeLabel),
    status: it.badgeLabel,
    priority: slaPriority(it.badgeLabel),
    related: [
      it.stage,
      it.company ? `Company: ${it.company}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    sortKey: i,
    href: hrefFor("leads", it.leadId, it.name),
  }));
}

function slaBandForItem(
  itemId: WorkqueueItemId,
): SlaAttentionLabel | "all" | null {
  switch (itemId) {
    case "sla-attention":
      return "all";
    case "sla-overdue":
      return "Overdue";
    case "sla-milestone-overdue":
      return "Milestone Overdue";
    case "sla-due-today":
      return "Due Today";
    case "sla-at-risk":
      return "At Risk";
    default:
      return null;
  }
}

function contactRows(items: ContactRow[], priority = "Medium"): QueueRow[] {
  return items.map((it, i) => {
    const due = parseFlexibleDate(it.createdDate);
    const dueLabel = formatDueLabel(due);
    return {
      id: it.id,
      subject: it.name,
      dueLabel,
      dueColor: dueColorForLabel(dueLabel),
      status: it.status,
      priority,
      related: it.company ? `Company: ${it.company}` : "",
      sortKey: due ? -due.getTime() : i,
      href: hrefFor("contacts", it.id, it.name),
    };
  });
}

function dealRows(items: DealRow[], priority = "Medium"): QueueRow[] {
  return items.map((it) => {
    const due = parseFlexibleDate(it.closeDate);
    const dueLabel = formatDueLabel(due);
    return {
      id: it.id,
      subject: it.name,
      dueLabel,
      dueColor: dueColorForLabel(dueLabel),
      status: it.status,
      priority,
      related: it.contact
        ? `Contact: ${it.contact}`
        : it.account
          ? `Company: ${it.account}`
          : "",
      sortKey: buildSortKey(due, priority),
      href: hrefFor("deals", it.id, it.name),
    };
  });
}

export function listWorkqueueItemRows(
  itemId: WorkqueueItemId,
  scope: WorkQueueScope,
  timeFilter: WorkQueueTimeFilter,
  now = new Date(),
): QueueRow[] {
  const leads = scopedLeads(scope);
  const contacts = scopedContacts(scope);
  const deals = scopedDeals(scope);

  const slaBand = slaBandForItem(itemId);
  if (slaBand) {
    return slaQueueRows(
      listSlaAttentionLeads({
        now,
        owner: scope,
        band: slaBand,
      }),
    );
  }

  switch (itemId) {
    case "my-leads":
      return leadRows(leads);
    case "new-leads":
      return leadRows(
        leads.filter((l) => isRecentlyAssigned(l.createdDate, now)),
      );
    case "pending-tags":
      return leadRows(
        leads.filter((l) => !l.estimatedValue || l.source === "Other"),
      );
    case "stale-leads":
      return leadRows(
        leads.filter((l) => isStaleLead(l.status, l.createdDate, now)),
        "High",
      );
    case "my-contacts":
      return contactRows(contacts);
    case "contacts-3h":
      return contactRows(
        contacts.filter((c) => isRecentlyAssigned(c.createdDate, now)),
      );
    case "followup":
      return contactRows(
        contacts.filter((c) => c.status === "Active" && c.source === "Cold Call"),
      );
    case "my-deals":
      return dealRows(deals);
    case "closing-soon":
      return dealRows(
        deals.filter((d) => closingThisMonth(d.closeDate, now)),
      );
    case "pending-deal-tags":
      return dealRows(deals.filter((d) => !d.contact));
    case "stalled": {
      const today0 = startOfDay(now).getTime();
      return dealRows(
        deals.filter((d) => {
          const early =
            d.status === "Prospecting" ||
            d.status === "Qualification" ||
            d.status === "Discovery" ||
            d.status === "Application";
          const close = parseFlexibleDate(d.closeDate);
          return early && !!close && startOfDay(close).getTime() < today0;
        }),
        "High",
      );
    }
    case "pending-review":
      return leadRows(leads.filter((l) => l.status === "Contacted"));
    case "missing-info":
      return leadRows(
        leads.filter((l) => !l.estimatedValue || !l.company),
        "High",
      );
    case "awaiting-action":
      return [
        ...listActivityRows("tasks", scope, timeFilter, now).filter(
          (r) => r.status === "Not Started",
        ),
        ...listActivityRows("calls", scope, timeFilter, now),
      ].sort((a, b) => a.sortKey - b.sortKey);
    case "pending-approval":
      return dealRows(
        deals.filter(
          (d) => d.status === "Approval" || d.status === "Negotiation",
        ),
        "High",
      );
    case "waiting-approval":
      return dealRows(deals.filter((d) => d.status === "Proposal"));
    case "overdue":
      return (
        [
          ...listActivityRows("tasks", scope, "today-overdue", now),
          ...listActivityRows("calls", scope, "today-overdue", now),
          ...listActivityRows("reminders", scope, "today-overdue", now),
        ]
          .filter(
            (r) =>
              r.dueLabel === "Yesterday" || r.dueLabel.includes("overdue"),
          )
          .sort((a, b) => a.sortKey - b.sortKey)
      );
    case "high-priority":
      return listActivityRows("tasks", scope, timeFilter, now).filter(
        (r) => r.priority.toLowerCase() === "high",
      );
    case "escalated":
      return listActivityRows("tasks", scope, timeFilter, now).filter(
        (r) =>
          r.priority.toLowerCase() === "high" &&
          (r.dueLabel === "Yesterday" || r.dueLabel.includes("overdue")),
      );
    default:
      return [];
  }
}

export function getActivityNav(
  scope: WorkQueueScope,
  timeFilter: WorkQueueTimeFilter,
): ActivityNavItem[] {
  return ACTIVITY_DEFAULT.map((a) => ({
    ...a,
    count: listActivityRows(a.id, scope, timeFilter).length,
  }));
}

export function getWorkqueueSidebar(
  scope: WorkQueueScope,
  categories: WorkqueueCategoryDef[],
  timeFilter: WorkQueueTimeFilter,
): WorkqueueSidebarCategory[] {
  return categories
    .filter((c) => c.checked)
    .map((c) => ({
      id: c.id,
      label: c.label,
      items: c.items
        .filter((it) => it.checked)
        .map((it) => ({
          id: it.id,
          label: it.label,
          count: listWorkqueueItemRows(it.id, scope, timeFilter).length,
          danger: it.danger,
        })),
    }))
    .filter((c) => c.items.length > 0);
}

export function getUserTabs(): WorkQueueUserTab[] {
  const actor = getRulesActor();
  const names = [
    actor.name,
    ...ACTIVITY_OWNERS.filter((n) => n !== actor.name),
  ];
  const roles: Record<string, string> = {
    [actor.name]: actor.role || "User",
  };
  for (const n of ACTIVITY_OWNERS) {
    if (!roles[n]) roles[n] = "Broker";
  }
  return names.map((name, i) => ({
    id: name,
    name,
    role: roles[name] ?? "Broker",
    initials: initials(name),
    color: USER_TAB_COLORS[i % USER_TAB_COLORS.length],
  }));
}

export function listQueueRows(
  nav: WorkQueueNavId,
  scope: WorkQueueScope,
  timeFilter: WorkQueueTimeFilter,
): QueueRow[] {
  if (ACTIVITY_DEFAULT.some((a) => a.id === nav)) {
    return listActivityRows(nav as ActivityNavId, scope, timeFilter);
  }
  return listWorkqueueItemRows(nav as WorkqueueItemId, scope, timeFilter);
}

export function filterQueueRows(
  rows: QueueRow[],
  opts: {
    query?: string;
    priority?: string;
    status?: string;
    due?: "all" | "overdue" | "today" | "upcoming";
  },
): QueueRow[] {
  const q = opts.query?.trim().toLowerCase() ?? "";
  return rows.filter((r) => {
    if (q) {
      const hay =
        `${r.subject} ${r.status} ${r.priority} ${r.related} ${r.dueLabel}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (opts.priority && opts.priority !== "all") {
      if (r.priority.toLowerCase() !== opts.priority.toLowerCase()) return false;
    }
    if (opts.status && opts.status !== "all") {
      if (r.status.toLowerCase() !== opts.status.toLowerCase()) return false;
    }
    if (opts.due && opts.due !== "all") {
      if (opts.due === "overdue") {
        if (
          !(r.dueLabel === "Yesterday" || r.dueLabel.includes("overdue"))
        ) {
          return false;
        }
      } else if (opts.due === "today") {
        if (r.dueLabel !== "Today") return false;
      } else if (opts.due === "upcoming") {
        if (
          !r.dueLabel ||
          r.dueLabel === "Today" ||
          r.dueLabel === "Yesterday" ||
          r.dueLabel.includes("overdue")
        ) {
          return false;
        }
      }
    }
    return true;
  });
}

export { avatarColor };
export type { WorkQueueNavId };
