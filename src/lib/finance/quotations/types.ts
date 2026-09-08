/** SRS §13.2 / §20.2 Quotations */

import {
  readJsonArrayStore,
  writeJsonArrayStore,
} from "@/lib/browser-json-store";
import {
  type FinanceAuditEvent,
  type FinanceLineItem,
  formatFinanceAt,
  totalsFromLines,
} from "@/lib/finance/shared";

export type QuotationStatus =
  | "Draft"
  | "Sent"
  | "Accepted"
  | "Rejected"
  | "Expired"
  | "Invoiced";

export const QUOTATION_STATUSES: QuotationStatus[] = [
  "Draft",
  "Sent",
  "Accepted",
  "Rejected",
  "Expired",
  "Invoiced",
];

export interface QuotationAttachment {
  id: string;
  name: string;
  sizeLabel?: string;
  url?: string;
}

export interface Quotation {
  id: string;
  quotationId: string;
  title: string;
  status: QuotationStatus;
  clientId: string;
  clientName: string;
  contactName: string;
  contactEmail: string;
  dealName?: string;
  relatedTo?: string;
  owner: string;
  validUntil: string;
  notes?: string;
  lineItems: FinanceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  estimateId?: string;
  estimateRef?: string;
  invoiceId?: string;
  publicLink?: string;
  attachments?: QuotationAttachment[];
  signatureStatus?: "Not sent" | "Pending" | "Signed";
  /** Linked §9.3 SignatureRequest id */
  signatureRequestId?: string;
  /** Public /sign/[token] manage token */
  signatureToken?: string;
  createdBy: string;
  createdAt: string;
  sentAt?: string;
  audit: FinanceAuditEvent[];
}

const STORE_KEY = "finance:quotations:v2";

function withTotals(
  partial: Omit<Quotation, "subtotal" | "tax" | "total">,
): Quotation {
  return { ...partial, ...totalsFromLines(partial.lineItems) };
}

export const quotations: Quotation[] = [];

function readStore(): Quotation[] | null {
  return readJsonArrayStore<Quotation>(STORE_KEY);
}

function writeStore(list: Quotation[]) {
  writeJsonArrayStore(STORE_KEY, list);
}

export function listQuotations(): Quotation[] {
  return (
    readStore() ??
    quotations.map((q) => ({
      ...q,
      lineItems: q.lineItems.map((l) => ({ ...l })),
    }))
  );
}

export function upsertQuotation(q: Quotation) {
  const next = { ...q, ...totalsFromLines(q.lineItems) };
  const list = listQuotations();
  const i = list.findIndex((x) => x.id === next.id);
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  writeStore(list);
  return next;
}

export function deleteQuotation(id: string) {
  writeStore(listQuotations().filter((q) => q.id !== id));
}

export function getQuotationById(id: string) {
  return listQuotations().find((q) => q.id === id);
}

function cloneQuotation(row: Quotation): Quotation {
  return {
    ...row,
    lineItems: row.lineItems.map((l) => ({ ...l })),
    attachments: [...(row.attachments ?? [])],
    audit: [...(row.audit ?? [])],
  };
}

/** Replace the session store with live CRM rows (empty list is a valid live result). */
export function replaceCrmQuotations(remote: Quotation[]) {
  writeStore(remote.map(cloneQuotation));
}

export function nextQuotationIds() {
  const list = listQuotations();
  const nums = list
    .map((q) => Number(q.quotationId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 3100) + 1;
  return { id: `quo-${Date.now()}`, quotationId: `QUO-${n}` };
}

export function appendQuotationAudit(
  q: Quotation,
  action: string,
  actor = q.owner,
): Quotation {
  return {
    ...q,
    audit: [
      ...q.audit,
      { id: `a-${Date.now()}`, at: formatFinanceAt(), action, actor },
    ],
  };
}
