/** SRS §13.4 / §20.3 Sales Invoices */

import {
  readJsonArrayStore,
  writeJsonArrayStore,
} from "@/lib/browser-json-store";
import {
  type FinanceAuditEvent,
  type FinanceLineItem,
  formatFinanceAt,
  formatFinanceDate,
  totalsFromLines,
} from "@/lib/finance/shared";

export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Cancelled"
  | "Void";

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "Draft",
  "Sent",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Cancelled",
  "Void",
];

export interface InvoiceAttachment {
  id: string;
  name: string;
  sizeLabel?: string;
  url?: string;
}

export interface Invoice {
  id: string;
  invoiceId: string;
  title: string;
  status: InvoiceStatus;
  clientId: string;
  clientName: string;
  contactName: string;
  contactEmail: string;
  dealName?: string;
  relatedTo?: string;
  owner: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
  lineItems: FinanceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  quotationId?: string;
  quotationRef?: string;
  publicLink?: string;
  attachments?: InvoiceAttachment[];
  createdBy: string;
  createdAt: string;
  sentAt?: string;
  audit: FinanceAuditEvent[];
}

const STORE_KEY = "finance:invoices:v1";

export const invoices: Invoice[] = [];

function readStore(): Invoice[] | null {
  return readJsonArrayStore<Invoice>(STORE_KEY);
}

function writeStore(list: Invoice[]) {
  writeJsonArrayStore(STORE_KEY, list);
}

export function listInvoices(): Invoice[] {
  return (
    readStore() ??
    invoices.map((inv) => ({
      ...inv,
      lineItems: inv.lineItems.map((l) => ({ ...l })),
    }))
  );
}

export function upsertInvoice(inv: Invoice) {
  const t = totalsFromLines(inv.lineItems);
  const next: Invoice = {
    ...inv,
    ...t,
    amountDue: Math.max(0, t.total - inv.amountPaid),
  };
  const list = listInvoices();
  const i = list.findIndex((x) => x.id === next.id);
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  writeStore(list);
  return next;
}

export function deleteInvoice(id: string) {
  writeStore(listInvoices().filter((inv) => inv.id !== id));
}

export function getInvoiceById(id: string) {
  return listInvoices().find((inv) => inv.id === id);
}

export function nextInvoiceIds() {
  const list = listInvoices();
  const nums = list
    .map((inv) => Number(inv.invoiceId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 3200) + 1;
  return { id: `inv-${Date.now()}`, invoiceId: `INV-${n}` };
}

function cloneInvoice(row: Invoice): Invoice {
  return {
    ...row,
    lineItems: row.lineItems.map((l) => ({ ...l })),
    attachments: [...(row.attachments ?? [])],
    audit: [...(row.audit ?? [])],
  };
}

/** Replace the session store with live CRM rows (empty list is a valid live result). */
export function replaceCrmInvoices(remote: Invoice[]) {
  writeStore(remote.map(cloneInvoice));
}

export function appendInvoiceAudit(
  inv: Invoice,
  action: string,
  actor = inv.owner,
): Invoice {
  return {
    ...inv,
    audit: [
      ...inv.audit,
      { id: `a-${Date.now()}`, at: formatFinanceAt(), action, actor },
    ],
  };
}

export function applyPaymentToInvoice(inv: Invoice, amount: number): Invoice {
  const amountPaid = Math.min(inv.total, inv.amountPaid + amount);
  const amountDue = Math.max(0, inv.total - amountPaid);
  let status: InvoiceStatus = inv.status;
  if (amountDue <= 0) status = "Paid";
  else if (amountPaid > 0) status = "Partially Paid";
  return { ...inv, amountPaid, amountDue, status };
}

export { formatFinanceAt, formatFinanceDate, totalsFromLines };
