/** Credit notes — live CRM + local overlay */

import {
  type FinanceAuditEvent,
  type FinanceLineItem,
  formatFinanceAt,
  formatFinanceDate,
  totalsFromLines,
} from "@/lib/finance/shared";

export type CreditNoteStatus = "Draft" | "Sent" | "Applied" | "Void" | "Cancelled";

export const CREDIT_NOTE_STATUSES: CreditNoteStatus[] = [
  "Draft",
  "Sent",
  "Applied",
  "Void",
  "Cancelled",
];

export interface CreditNoteAttachment {
  id: string;
  name: string;
  sizeLabel?: string;
  url?: string;
}

export interface CreditNote {
  id: string;
  creditNoteId: string;
  title: string;
  status: CreditNoteStatus;
  clientId?: string;
  clientName: string;
  invoiceId?: string;
  invoiceRef?: string;
  owner: string;
  issueDate: string;
  reason?: string;
  notes?: string;
  lineItems: FinanceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  publicLink?: string;
  attachments: CreditNoteAttachment[];
  createdBy: string;
  createdAt: string;
  sentAt?: string;
  audit: FinanceAuditEvent[];
}

const STORE_KEY = "finance:credit-notes:v1";

function withMoney(
  partial: Omit<CreditNote, "subtotal" | "tax" | "total">,
): CreditNote {
  return { ...partial, ...totalsFromLines(partial.lineItems) };
}

export const creditNotes: CreditNote[] = [
  withMoney({
    id: "cn-demo-1",
    creditNoteId: "CN-4101",
    title: "Greystone packaging credit",
    status: "Draft",
    clientId: "c1",
    clientName: "Greystone Realty",
    invoiceRef: "INV-3201",
    owner: "John Smith",
    issueDate: formatFinanceDate(),
    reason: "Fee adjustment",
    notes: "Demo credit note until live CRM returns rows.",
    lineItems: [
      {
        id: "cnli1",
        name: "Home loan packaging credit",
        quantity: 1,
        unitPrice: 220,
        taxRate: 10,
      },
    ],
    attachments: [],
    createdBy: "John Smith",
    createdAt: formatFinanceAt(),
    audit: [
      {
        id: "cna1",
        at: formatFinanceAt(),
        action: "Created",
        actor: "John Smith",
      },
    ],
  }),
];

function readStore(): CreditNote[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as CreditNote[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: CreditNote[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listCreditNotes(): CreditNote[] {
  return (
    readStore() ??
    creditNotes.map((n) => ({
      ...n,
      lineItems: n.lineItems.map((l) => ({ ...l })),
      attachments: [...n.attachments],
    }))
  );
}

export function upsertCreditNote(note: CreditNote) {
  const next = withMoney({
    ...note,
    lineItems: note.lineItems.map((l) => ({ ...l })),
    attachments: [...(note.attachments ?? [])],
  });
  const list = listCreditNotes();
  const i = list.findIndex((x) => x.id === next.id);
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  writeStore(list);
  return next;
}

export function deleteCreditNote(id: string) {
  writeStore(listCreditNotes().filter((n) => n.id !== id));
}

export function getCreditNoteById(id: string) {
  return listCreditNotes().find((n) => n.id === id);
}

export function nextCreditNoteIds() {
  const list = listCreditNotes();
  const nums = list
    .map((n) => Number(n.creditNoteId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 4100) + 1;
  return { id: `cn-${Date.now()}`, creditNoteId: `CN-${n}` };
}

export function appendCreditNoteAudit(
  note: CreditNote,
  action: string,
  actor = note.owner,
): CreditNote {
  return {
    ...note,
    audit: [
      ...note.audit,
      { id: `cna-${Date.now()}`, at: formatFinanceAt(), action, actor },
    ],
  };
}

function cloneNote(note: CreditNote): CreditNote {
  return {
    ...note,
    lineItems: note.lineItems.map((l) => ({ ...l })),
    attachments: [...(note.attachments ?? [])],
    audit: [...(note.audit ?? [])],
  };
}

/** Replace the session store with live CRM rows (empty list is a valid live result). */
export function replaceCrmCreditNotes(remote: CreditNote[]) {
  writeStore(remote.map(cloneNote));
}

export function mergeCrmCreditNotes(remote: CreditNote[]) {
  const remoteIds = new Set(remote.map((n) => n.id));
  const local = listCreditNotes().filter(
    (n) => !remoteIds.has(n.id) && !n.id.startsWith("cn-demo-"),
  );
  writeStore([...remote.map(cloneNote), ...local]);
}
