/** SRS §23 Time Tracking: billable hours for professional services */

import {
  FINANCE_CLIENTS,
  formatFinanceAt,
  formatFinanceDate,
  newLineItem,
  type FinanceLineItem,
} from "@/lib/finance/shared";
import {
  appendInvoiceAudit,
  nextInvoiceIds,
  upsertInvoice,
  type Invoice,
} from "@/lib/finance/invoices/types";

export type RelatedKind = "Matter" | "Deal" | "Ticket" | "Project";

export type TimeEntryStatus =
  | "Draft"
  | "Running"
  | "Logged"
  | "Submitted"
  | "Approved"
  | "Invoiced"
  | "Rejected";

export interface TimeRelatedTo {
  kind: RelatedKind;
  name: string;
  /** Optional client for invoice generation */
  clientId?: string;
}

export interface TimeAuditEvent {
  id: string;
  at: string;
  action: string;
  actor: string;
}

export interface TimeEntry {
  id: string;
  entryId: string;
  relatedTo: TimeRelatedTo;
  user: string;
  date: string;
  /** Stored as decimal hours (e.g. 1.5 = 90 minutes) */
  durationHours: number;
  billable: boolean;
  rate: number;
  description: string;
  status: TimeEntryStatus;
  timerStartedAt?: string;
  invoiceId?: string;
  invoiceRef?: string;
  createdBy: string;
  createdAt: string;
  modifiedAt: string;
  audit: TimeAuditEvent[];
}

export const RELATED_KINDS: RelatedKind[] = [
  "Matter",
  "Deal",
  "Ticket",
  "Project",
];

export const TIME_STATUSES: TimeEntryStatus[] = [
  "Draft",
  "Running",
  "Logged",
  "Submitted",
  "Approved",
  "Invoiced",
  "Rejected",
];

export const TIME_USERS = [
  "John Smith",
  "Tejas Gokhe",
  "Roshna Abraham",
  "Shiva Kadhka",
] as const;

export const RELATED_RECORD_OPTIONS: TimeRelatedTo[] = [
  {
    kind: "Matter",
    name: "Anderson: refinance matter",
    clientId: "c1",
  },
  {
    kind: "Matter",
    name: "Harbour: first-home matter",
    clientId: "c2",
  },
  {
    kind: "Deal",
    name: "Greystone refinance package",
    clientId: "c1",
  },
  {
    kind: "Deal",
    name: "Harbour first-home buyer",
    clientId: "c2",
  },
  {
    kind: "Ticket",
    name: "TKT-5001: Portal login issue",
    clientId: "c1",
  },
  {
    kind: "Ticket",
    name: "TKT-5003: Document upload failed",
    clientId: "c3",
  },
  {
    kind: "Project",
    name: "Q3 broker enablement",
    clientId: "c4",
  },
  {
    kind: "Project",
    name: "Agency retainer: Apex",
    clientId: "c4",
  },
];

export const DEFAULT_RATES: Record<string, number> = {
  "John Smith": 280,
  "Tejas Gokhe": 250,
  "Roshna Abraham": 220,
  "Shiva Kadhka": 200,
};

export const TIME_STATUS_STYLE: Record<TimeEntryStatus, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Running: "bg-emerald-100 text-emerald-800",
  Logged: "bg-sky-100 text-sky-800",
  Submitted: "bg-amber-100 text-amber-900",
  Approved: "bg-violet-100 text-violet-800",
  Invoiced: "bg-indigo-100 text-indigo-800",
  Rejected: "bg-rose-100 text-rose-800",
};

const STORE_KEY = "time-tracking:entries:v1";

export function formatTimeAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeDate(d = new Date()) {
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDuration(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function amountFor(entry: TimeEntry) {
  if (!entry.billable) return 0;
  return Math.round(entry.durationHours * entry.rate * 100) / 100;
}

export function relatedLabel(r: TimeRelatedTo) {
  return `${r.kind}: ${r.name}`;
}

export const timeEntries: TimeEntry[] = [
  {
    id: "te1",
    entryId: "TE-7001",
    relatedTo: RELATED_RECORD_OPTIONS[2],
    user: "John Smith",
    date: "18/07/2026",
    durationHours: 2.5,
    billable: true,
    rate: 280,
    description: "Client discovery call and file review",
    status: "Approved",
    createdBy: "John Smith",
    createdAt: "18/07/2026, 09:10",
    modifiedAt: "19/07/2026, 11:00",
    audit: [
      {
        id: "a1",
        at: "18/07/2026, 09:10",
        action: "Logged manually",
        actor: "John Smith",
      },
      {
        id: "a2",
        at: "19/07/2026, 11:00",
        action: "Approved",
        actor: "Tejas Gokhe",
      },
    ],
  },
  {
    id: "te2",
    entryId: "TE-7002",
    relatedTo: RELATED_RECORD_OPTIONS[0],
    user: "Roshna Abraham",
    date: "19/07/2026",
    durationHours: 1.25,
    billable: true,
    rate: 220,
    description: "Draft engagement letter and compliance checklist",
    status: "Submitted",
    createdBy: "Roshna Abraham",
    createdAt: "19/07/2026, 14:20",
    modifiedAt: "19/07/2026, 16:00",
    audit: [
      {
        id: "a1",
        at: "19/07/2026, 14:20",
        action: "Logged manually",
        actor: "Roshna Abraham",
      },
      {
        id: "a2",
        at: "19/07/2026, 16:00",
        action: "Submitted for approval",
        actor: "Roshna Abraham",
      },
    ],
  },
  {
    id: "te3",
    entryId: "TE-7003",
    relatedTo: RELATED_RECORD_OPTIONS[4],
    user: "Tejas Gokhe",
    date: "20/07/2026",
    durationHours: 0.75,
    billable: false,
    rate: 250,
    description: "Internal triage: non-billable support",
    status: "Logged",
    createdBy: "Tejas Gokhe",
    createdAt: "20/07/2026, 10:05",
    modifiedAt: "20/07/2026, 10:50",
    audit: [
      {
        id: "a1",
        at: "20/07/2026, 10:05",
        action: "Timer started",
        actor: "Tejas Gokhe",
      },
      {
        id: "a2",
        at: "20/07/2026, 10:50",
        action: "Timer stopped · 0.75h",
        actor: "Tejas Gokhe",
      },
    ],
  },
  {
    id: "te4",
    entryId: "TE-7004",
    relatedTo: RELATED_RECORD_OPTIONS[7],
    user: "Shiva Kadhka",
    date: "21/07/2026",
    durationHours: 3,
    billable: true,
    rate: 200,
    description: "Agency retainer: weekly creative standup + revisions",
    status: "Approved",
    createdBy: "Shiva Kadhka",
    createdAt: "21/07/2026, 08:30",
    modifiedAt: "22/07/2026, 09:15",
    audit: [
      {
        id: "a1",
        at: "21/07/2026, 08:30",
        action: "Logged manually",
        actor: "Shiva Kadhka",
      },
      {
        id: "a2",
        at: "22/07/2026, 09:15",
        action: "Approved",
        actor: "John Smith",
      },
    ],
  },
  {
    id: "te5",
    entryId: "TE-7005",
    relatedTo: RELATED_RECORD_OPTIONS[3],
    user: "John Smith",
    date: "22/07/2026",
    durationHours: 1,
    billable: true,
    rate: 280,
    description: "Lender application packaging",
    status: "Invoiced",
    invoiceId: "inv1",
    invoiceRef: "INV-3201",
    createdBy: "John Smith",
    createdAt: "22/07/2026, 11:00",
    modifiedAt: "22/07/2026, 15:40",
    audit: [
      {
        id: "a1",
        at: "22/07/2026, 11:00",
        action: "Logged manually",
        actor: "John Smith",
      },
      {
        id: "a2",
        at: "22/07/2026, 15:40",
        action: "Invoiced → INV-3201",
        actor: "John Smith",
      },
    ],
  },
  {
    id: "te6",
    entryId: "TE-7006",
    relatedTo: RELATED_RECORD_OPTIONS[6],
    user: "Tejas Gokhe",
    date: formatTimeDate(),
    durationHours: 0,
    billable: true,
    rate: 250,
    description: "Enablement workshop prep",
    status: "Draft",
    createdBy: "Tejas Gokhe",
    createdAt: formatTimeAt(),
    modifiedAt: formatTimeAt(),
    audit: [
      {
        id: "a1",
        at: formatTimeAt(),
        action: "Draft created",
        actor: "Tejas Gokhe",
      },
    ],
  },
];

function readStore(): TimeEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TimeEntry[];
  } catch {
    return null;
  }
}

function writeStore(list: TimeEntry[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listTimeEntries(): TimeEntry[] {
  return (
    readStore() ??
    timeEntries.map((e) => ({
      ...e,
      relatedTo: { ...e.relatedTo },
      audit: e.audit.map((a) => ({ ...a })),
    }))
  );
}

export function upsertTimeEntry(entry: TimeEntry) {
  const list = listTimeEntries();
  const i = list.findIndex((x) => x.id === entry.id);
  if (i >= 0) list[i] = entry;
  else list.unshift(entry);
  writeStore(list);
  return entry;
}

export function deleteTimeEntry(id: string) {
  writeStore(listTimeEntries().filter((e) => e.id !== id));
}

export function getTimeEntryById(id: string) {
  return listTimeEntries().find((e) => e.id === id);
}

export function nextTimeEntryIds() {
  const list = listTimeEntries();
  const nums = list
    .map((e) => Number(e.entryId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 7000) + 1;
  return { id: `te-${Date.now()}`, entryId: `TE-${n}` };
}

export function appendTimeAudit(
  entry: TimeEntry,
  action: string,
  actor = entry.user,
): TimeEntry {
  return {
    ...entry,
    modifiedAt: formatTimeAt(),
    audit: [
      ...entry.audit,
      { id: `a-${Date.now()}`, at: formatTimeAt(), action, actor },
    ],
  };
}

export function findRunningEntry(user?: string) {
  return listTimeEntries().find(
    (e) => e.status === "Running" && (!user || e.user === user),
  );
}

/** Start a new running timer (stops any existing running entry for same user). */
export function startTimer(partial: {
  user: string;
  relatedTo: TimeRelatedTo;
  description?: string;
  billable?: boolean;
  rate?: number;
}): TimeEntry {
  const existing = findRunningEntry(partial.user);
  if (existing) stopTimer(existing.id, partial.user);

  const ids = nextTimeEntryIds();
  const now = formatTimeAt();
  const entry = appendTimeAudit(
    {
      id: ids.id,
      entryId: ids.entryId,
      relatedTo: partial.relatedTo,
      user: partial.user,
      date: formatTimeDate(),
      durationHours: 0,
      billable: partial.billable ?? true,
      rate: partial.rate ?? DEFAULT_RATES[partial.user] ?? 200,
      description: partial.description?.trim() || "Timer session",
      status: "Running",
      timerStartedAt: new Date().toISOString(),
      createdBy: partial.user,
      createdAt: now,
      modifiedAt: now,
      audit: [],
    },
    "Timer started",
    partial.user,
  );
  return upsertTimeEntry(entry);
}

export function stopTimer(id: string, actor?: string) {
  const entry = getTimeEntryById(id);
  if (!entry || entry.status !== "Running" || !entry.timerStartedAt) {
    return entry ?? null;
  }
  const started = new Date(entry.timerStartedAt).getTime();
  const elapsedMs = Math.max(0, Date.now() - started);
  const added = Math.round((elapsedMs / 3_600_000) * 100) / 100;
  const durationHours =
    Math.round((entry.durationHours + Math.max(added, 0.01)) * 100) / 100;
  const next = appendTimeAudit(
    {
      ...entry,
      durationHours,
      status: "Logged",
      timerStartedAt: undefined,
    },
    `Timer stopped · ${formatDuration(added)}`,
    actor ?? entry.user,
  );
  return upsertTimeEntry(next);
}

export function setBillable(id: string, billable: boolean, actor?: string) {
  const entry = getTimeEntryById(id);
  if (!entry) return null;
  if (entry.status === "Invoiced") return entry;
  const next = appendTimeAudit(
    { ...entry, billable },
    billable ? "Marked billable" : "Marked non-billable",
    actor ?? entry.user,
  );
  return upsertTimeEntry(next);
}

export function submitTimeEntry(id: string, actor?: string) {
  const entry = getTimeEntryById(id);
  if (!entry) return null;
  if (!["Logged", "Draft", "Rejected"].includes(entry.status)) return entry;
  if (entry.durationHours <= 0) return entry;
  const next = appendTimeAudit(
    { ...entry, status: "Submitted" },
    "Submitted for approval",
    actor ?? entry.user,
  );
  return upsertTimeEntry(next);
}

export function approveTimeEntry(id: string, actor: string) {
  const entry = getTimeEntryById(id);
  if (!entry) return null;
  if (entry.status !== "Submitted" && entry.status !== "Logged") return entry;
  const next = appendTimeAudit(
    { ...entry, status: "Approved" },
    "Approved",
    actor,
  );
  return upsertTimeEntry(next);
}

export function rejectTimeEntry(id: string, actor: string) {
  const entry = getTimeEntryById(id);
  if (!entry) return null;
  if (entry.status !== "Submitted") return entry;
  const next = appendTimeAudit(
    { ...entry, status: "Rejected" },
    "Rejected",
    actor,
  );
  return upsertTimeEntry(next);
}

export function invoiceableEntries(ids?: string[]) {
  return listTimeEntries().filter(
    (e) =>
      e.status === "Approved" &&
      e.billable &&
      e.durationHours > 0 &&
      (!ids || ids.includes(e.id)),
  );
}

/**
 * Generate a draft invoice from approved billable entries.
 * Groups by clientId; returns null if no invoiceable rows or mixed clients without a forced client.
 */
export function generateInvoiceFromTime(
  entryIds: string[],
  actor: string,
): { invoice: Invoice; entries: TimeEntry[] } | { error: string } {
  const rows = invoiceableEntries(entryIds);
  if (!rows.length) {
    return { error: "Select approved billable entries that are not yet invoiced." };
  }

  const clientIds = [
    ...new Set(rows.map((r) => r.relatedTo.clientId).filter(Boolean)),
  ] as string[];
  const clientId = clientIds[0] ?? "c1";
  if (clientIds.length > 1) {
    return {
      error: "Selected entries span multiple clients. Invoice one client at a time.",
    };
  }

  const client =
    FINANCE_CLIENTS.find((c) => c.id === clientId) ?? FINANCE_CLIENTS[0];

  const lineItems: FinanceLineItem[] = rows.map((e) =>
    newLineItem({
      name: `${e.entryId} · ${e.relatedTo.name}`,
      description: e.description,
      quantity: e.durationHours,
      unitPrice: e.rate,
      taxRate: 10,
    }),
  );

  const ids = nextInvoiceIds();
  const issue = formatFinanceDate();
  const due = formatFinanceDate(new Date(Date.now() + 14 * 86_400_000));
  const dealName =
    rows.find((r) => r.relatedTo.kind === "Deal")?.relatedTo.name ??
    rows[0]?.relatedTo.name;

  let invoice = appendInvoiceAudit(
    {
      id: ids.id,
      invoiceId: ids.invoiceId,
      title: `Time-based invoice · ${client.name}`,
      status: "Draft",
      clientId: client.id,
      clientName: client.name,
      contactName: client.contact,
      contactEmail: client.email,
      dealName,
      owner: actor,
      issueDate: issue,
      dueDate: due,
      notes: `Generated from logged time: ${rows.map((r) => r.entryId).join(", ")}`,
      lineItems,
      subtotal: 0,
      tax: 0,
      total: 0,
      amountPaid: 0,
      amountDue: 0,
      createdBy: actor,
      createdAt: formatFinanceAt(),
      audit: [],
    },
    "Created from logged time",
    actor,
  );
  invoice = upsertInvoice(invoice);

  const updated = rows.map((e) =>
    upsertTimeEntry(
      appendTimeAudit(
        {
          ...e,
          status: "Invoiced",
          invoiceId: invoice.id,
          invoiceRef: invoice.invoiceId,
        },
        `Invoiced → ${invoice.invoiceId}`,
        actor,
      ),
    ),
  );

  return { invoice, entries: updated };
}

export function exportTimesheetCsv(rows: TimeEntry[]) {
  const header = [
    "Time Entry ID",
    "Related Kind",
    "Related To",
    "User",
    "Date",
    "Duration (h)",
    "Duration",
    "Billable",
    "Rate",
    "Amount",
    "Status",
    "Description",
    "Invoice",
  ];
  const body = rows.map((r) =>
    [
      r.entryId,
      r.relatedTo.kind,
      r.relatedTo.name,
      r.user,
      r.date,
      r.durationHours,
      formatDuration(r.durationHours),
      r.billable ? "Yes" : "No",
      r.rate,
      amountFor(r),
      r.status,
      r.description,
      r.invoiceRef ?? "",
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `timesheet-${formatTimeDate().replace(/\//g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function timesheetTotals(rows: TimeEntry[]) {
  const hours = rows.reduce((s, r) => s + r.durationHours, 0);
  const billableHours = rows
    .filter((r) => r.billable)
    .reduce((s, r) => s + r.durationHours, 0);
  const amount = rows.reduce((s, r) => s + amountFor(r), 0);
  return {
    hours: Math.round(hours * 100) / 100,
    billableHours: Math.round(billableHours * 100) / 100,
    amount: Math.round(amount * 100) / 100,
  };
}
