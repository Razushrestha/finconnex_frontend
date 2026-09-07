/** SRS §11 Support Ticketing */

export type TicketPriority = "Critical" | "High" | "Medium" | "Low";

export type TicketStatus =
  | "New"
  | "Open"
  | "In Progress"
  | "Pending"
  | "Resolved"
  | "Closed"
  | "Reopened";

export type TicketCategory =
  | "Bug"
  | "Feature Request"
  | "Billing"
  | "Technical"
  | "General";

export type TicketNoteKind = "internal" | "public";

export interface TicketNote {
  id: string;
  kind: TicketNoteKind;
  body: string;
  at: string;
  actor: string;
}

export interface TicketAuditEvent {
  id: string;
  at: string;
  action: string;
  actor: string;
}

export interface SupportTicket {
  id: string;
  ticketId: string;
  subject: string;
  requester: string;
  relatedAccount?: string;
  priority: TicketPriority;
  status: TicketStatus;
  category?: TicketCategory;
  assignedTo?: string;
  description: string;
  resolvedAt?: string;
  closedAt?: string;
  satisfactionRating?: number;
  satisfactionComment?: string;
  surveySentAt?: string;
  mergedIntoId?: string;
  mergedIntoRef?: string;
  escalatedAt?: string;
  createdBy: string;
  createdAt: string;
  modifiedAt: string;
  notes: TicketNote[];
  audit: TicketAuditEvent[];
}

export const TICKET_PRIORITIES: TicketPriority[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
];

export const TICKET_STATUSES: TicketStatus[] = [
  "New",
  "Open",
  "In Progress",
  "Pending",
  "Resolved",
  "Closed",
  "Reopened",
];

export const TICKET_CATEGORIES: TicketCategory[] = [
  "Bug",
  "Feature Request",
  "Billing",
  "Technical",
  "General",
];

export const SUPPORT_AGENTS = [
  "John Smith",
  "Tejas Gokhe",
  "Roshna Abraham",
  "Shiva Kadhka",
] as const;

export const SUPPORT_REQUESTERS: string[] = [];

export const SUPPORT_ACCOUNTS: string[] = [];

const STORE_KEY = "support:tickets:v2";

export function formatTicketAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTicketDate(d = new Date()) {
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const supportTickets: SupportTicket[] = [];

function readStore(): SupportTicket[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as SupportTicket[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: SupportTicket[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listTickets(): SupportTicket[] {
  return (
    readStore() ??
    supportTickets.map((t) => ({
      ...t,
      notes: t.notes.map((n) => ({ ...n })),
      audit: t.audit.map((a) => ({ ...a })),
    }))
  );
}

function cloneTicket(t: SupportTicket): SupportTicket {
  return {
    ...t,
    notes: t.notes.map((n) => ({ ...n })),
    audit: t.audit.map((a) => ({ ...a })),
  };
}

export function upsertTicket(t: SupportTicket) {
  const list = listTickets();
  const i = list.findIndex((x) => x.id === t.id);
  if (i >= 0) list[i] = t;
  else list.unshift(t);
  writeStore(list);
  return t;
}

/** Replace the session store with live CRM rows (empty list is a valid live result). */
export function replaceCrmTickets(remote: SupportTicket[]) {
  writeStore(remote.map(cloneTicket));
}

export function deleteTicket(id: string) {
  writeStore(listTickets().filter((t) => t.id !== id));
}

export function getTicketById(id: string) {
  return listTickets().find((t) => t.id === id);
}

export function nextTicketIds() {
  const list = listTickets();
  const nums = list
    .map((t) => Number(t.ticketId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 5000) + 1;
  return { id: `tk-${Date.now()}`, ticketId: `TKT-${n}` };
}

export function appendTicketAudit(
  t: SupportTicket,
  action: string,
  actor: string,
): SupportTicket {
  return {
    ...t,
    modifiedAt: formatTicketAt(),
    audit: [
      ...t.audit,
      { id: `a-${Date.now()}`, at: formatTicketAt(), action, actor },
    ],
  };
}

export function csatAverage(tickets: SupportTicket[] = listTickets()) {
  const rated = tickets.filter((t) => typeof t.satisfactionRating === "number");
  if (!rated.length) return null;
  const sum = rated.reduce((s, t) => s + (t.satisfactionRating ?? 0), 0);
  return Math.round((sum / rated.length) * 10) / 10;
}

export const TICKET_STATUS_STYLE: Record<TicketStatus, string> = {
  New: "bg-slate-100 text-slate-600",
  Open: "bg-sky-50 text-sky-700",
  "In Progress": "bg-violet-50 text-violet-700",
  Pending: "bg-amber-50 text-amber-800",
  Resolved: "bg-emerald-50 text-emerald-700",
  Closed: "bg-slate-200 text-slate-600",
  Reopened: "bg-rose-50 text-rose-700",
};

export const TICKET_PRIORITY_STYLE: Record<TicketPriority, string> = {
  Critical: "bg-rose-100 text-rose-800",
  High: "bg-orange-50 text-orange-700",
  Medium: "bg-amber-50 text-amber-800",
  Low: "bg-slate-100 text-slate-600",
};
