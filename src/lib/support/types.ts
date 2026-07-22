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

export const SUPPORT_REQUESTERS = [
  "Priya Mehta",
  "Marcus Chen",
  "Aisha Khan",
  "Daniel Rossi",
  "Olivia Bennett",
] as const;

export const SUPPORT_ACCOUNTS = [
  "Greystone Realty",
  "Harbour Loans",
  "Northside Mortgage",
  "Apex Property Group",
  "Northwind Traders",
] as const;

const STORE_KEY = "support:tickets:v1";

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

export const supportTickets: SupportTicket[] = [
  {
    id: "tk1",
    ticketId: "TKT-5001",
    subject: "Portal login fails after refinance close",
    requester: "Priya Mehta",
    relatedAccount: "Greystone Realty",
    priority: "High",
    status: "In Progress",
    category: "Technical",
    assignedTo: "John Smith",
    description:
      "Client cannot sign into the client portal after their refinance deal was marked Closed Won. Error: session expired loop.",
    createdBy: "John Smith",
    createdAt: "18/07/2026",
    modifiedAt: "20/07/2026 11:20",
    notes: [
      {
        id: "n1",
        kind: "internal",
        body: "Looks like SSO cookie not cleared on deal close. Checking auth middleware.",
        at: "18/07/2026 14:30",
        actor: "John Smith",
      },
      {
        id: "n2",
        kind: "public",
        body: "Thanks for reporting — we're investigating the portal session issue and will update you shortly.",
        at: "18/07/2026 15:00",
        actor: "John Smith",
      },
    ],
    audit: [
      { id: "a1", at: "18/07/2026 10:00", action: "Created", actor: "John Smith" },
      { id: "a2", at: "18/07/2026 10:15", action: "Assigned to John Smith", actor: "John Smith" },
      { id: "a3", at: "18/07/2026 10:16", action: "Status → Open", actor: "John Smith" },
      { id: "a4", at: "18/07/2026 14:00", action: "Status → In Progress", actor: "John Smith" },
    ],
  },
  {
    id: "tk2",
    ticketId: "TKT-5002",
    subject: "Invoice PDF missing line-item tax",
    requester: "Marcus Chen",
    relatedAccount: "Harbour Loans",
    priority: "Medium",
    status: "Pending",
    category: "Billing",
    assignedTo: "Tejas Gokhe",
    description:
      "Downloaded INV-3202 PDF shows subtotal but GST column is blank. Client needs corrected copy for accounting.",
    createdBy: "Tejas Gokhe",
    createdAt: "19/07/2026",
    modifiedAt: "20/07/2026 09:00",
    notes: [
      {
        id: "n3",
        kind: "public",
        body: "We've raised this with finance ops. Can you confirm whether the online invoice view shows tax correctly?",
        at: "19/07/2026 16:00",
        actor: "Tejas Gokhe",
      },
    ],
    audit: [
      { id: "a1", at: "19/07/2026 11:00", action: "Created", actor: "Tejas Gokhe" },
      { id: "a2", at: "19/07/2026 11:05", action: "Assigned to Tejas Gokhe", actor: "Tejas Gokhe" },
      { id: "a3", at: "19/07/2026 16:05", action: "Status → Pending", actor: "Tejas Gokhe" },
    ],
  },
  {
    id: "tk3",
    ticketId: "TKT-5003",
    subject: "Request: WhatsApp template for settlement day",
    requester: "Aisha Khan",
    relatedAccount: "Northside Mortgage",
    priority: "Low",
    status: "New",
    category: "Feature Request",
    description:
      "Please add a settlement-day WhatsApp template to the library for brokers to send clients.",
    createdBy: "Roshna Abraham",
    createdAt: "21/07/2026",
    modifiedAt: "21/07/2026 09:30",
    notes: [],
    audit: [
      { id: "a1", at: "21/07/2026 09:30", action: "Created", actor: "Roshna Abraham" },
    ],
  },
  {
    id: "tk4",
    ticketId: "TKT-5004",
    subject: "E-signature link expired for engagement letter",
    requester: "Daniel Rossi",
    relatedAccount: "Apex Property Group",
    priority: "Critical",
    status: "Resolved",
    category: "Bug",
    assignedTo: "Shiva Kadhka",
    description:
      "Client received e-sign link that expired within 1 hour. Need new link and longer validity.",
    resolvedAt: "17/07/2026 14:00",
    surveySentAt: "17/07/2026 14:05",
    satisfactionRating: 4,
    satisfactionComment: "Quick fix once escalated. Would like longer link TTL.",
    createdBy: "Shiva Kadhka",
    createdAt: "16/07/2026",
    modifiedAt: "17/07/2026 14:05",
    escalatedAt: "16/07/2026 12:00",
    notes: [
      {
        id: "n4",
        kind: "internal",
        body: "Escalated — TTL was 60m in staging config. Bumped to 7 days.",
        at: "16/07/2026 12:05",
        actor: "Shiva Kadhka",
      },
      {
        id: "n5",
        kind: "public",
        body: "New signing link sent. Validity is now 7 days — please confirm once signed.",
        at: "16/07/2026 13:00",
        actor: "Shiva Kadhka",
      },
    ],
    audit: [
      { id: "a1", at: "16/07/2026 10:00", action: "Created", actor: "Shiva Kadhka" },
      { id: "a2", at: "16/07/2026 12:00", action: "Escalated → Critical", actor: "Shiva Kadhka" },
      { id: "a3", at: "17/07/2026 14:00", action: "Status → Resolved", actor: "Shiva Kadhka" },
      { id: "a4", at: "17/07/2026 14:05", action: "Satisfaction survey sent", actor: "System" },
      { id: "a5", at: "17/07/2026 16:20", action: "Satisfaction rating 4/5", actor: "Daniel Rossi" },
    ],
  },
  {
    id: "tk5",
    ticketId: "TKT-5005",
    subject: "Document request reminder emails bouncing",
    requester: "Olivia Bennett",
    relatedAccount: "Northwind Traders",
    priority: "High",
    status: "Closed",
    category: "Technical",
    assignedTo: "Roshna Abraham",
    description:
      "Automated document-request reminders bounce for two contacts. Bounce code 550.",
    resolvedAt: "12/07/2026 10:00",
    closedAt: "14/07/2026 09:00",
    surveySentAt: "12/07/2026 10:05",
    satisfactionRating: 5,
    satisfactionComment: "Resolved cleanly. Thanks!",
    createdBy: "Roshna Abraham",
    createdAt: "10/07/2026",
    modifiedAt: "14/07/2026 09:00",
    notes: [
      {
        id: "n6",
        kind: "public",
        body: "Invalid mailbox on contact record — updated email and re-sent request. Please confirm receipt.",
        at: "11/07/2026 15:00",
        actor: "Roshna Abraham",
      },
    ],
    audit: [
      { id: "a1", at: "10/07/2026 11:00", action: "Created", actor: "Roshna Abraham" },
      { id: "a2", at: "12/07/2026 10:00", action: "Status → Resolved", actor: "Roshna Abraham" },
      { id: "a3", at: "14/07/2026 09:00", action: "Status → Closed", actor: "Roshna Abraham" },
    ],
  },
  {
    id: "tk6",
    ticketId: "TKT-5006",
    subject: "General: how to export campaign report",
    requester: "Marcus Chen",
    relatedAccount: "Harbour Loans",
    priority: "Low",
    status: "Open",
    category: "General",
    assignedTo: "John Smith",
    description: "Where do I export open/click rates for last week's email campaign?",
    createdBy: "John Smith",
    createdAt: "20/07/2026",
    modifiedAt: "20/07/2026 16:00",
    notes: [],
    audit: [
      { id: "a1", at: "20/07/2026 15:30", action: "Created", actor: "John Smith" },
      { id: "a2", at: "20/07/2026 16:00", action: "Assigned to John Smith", actor: "John Smith" },
      { id: "a3", at: "20/07/2026 16:00", action: "Status → Open", actor: "John Smith" },
    ],
  },
];

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

export function upsertTicket(t: SupportTicket) {
  const list = listTickets();
  const i = list.findIndex((x) => x.id === t.id);
  if (i >= 0) list[i] = t;
  else list.unshift(t);
  writeStore(list);
  return t;
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
