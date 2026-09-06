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

const STORE_KEY = "finance:quotations:v1";

function withTotals(
  partial: Omit<Quotation, "subtotal" | "tax" | "total">,
): Quotation {
  return { ...partial, ...totalsFromLines(partial.lineItems) };
}

export const quotations: Quotation[] = [
  withTotals({
    id: "quo1",
    quotationId: "QUO-2025-0004",
    title: "Website Redesign Quote",
    status: "Accepted",
    clientId: "c1",
    clientName: "Greystone Realty",
    contactName: "Priya Mehta",
    contactEmail: "priya@greystone.example",
    dealName: "Greystone Website Redesign",
    owner: "John Smith",
    validUntil: "30/06/2025",
    notes: "Converted from EST-2025-0004.",
    lineItems: [
      {
        id: "qli1",
        productId: "fp1",
        name: "Website Redesign",
        quantity: 1,
        unitPrice: 1995.45,
        taxRate: 10,
      },
    ],
    estimateId: "est1",
    estimateRef: "EST-2025-0004",
    invoiceId: "inv1",
    signatureStatus: "Signed",
    signatureRequestId: "sr2",
    signatureToken: "sig-priya-1",
    createdBy: "John Smith",
    createdAt: "31/05/2025",
    sentAt: "31/05/2025 12:00",
    audit: [
      { id: "a1", at: "31/05/2025 11:15", action: "Created from estimate", actor: "John Smith" },
      { id: "a2", at: "31/05/2025 12:00", action: "Sent", actor: "John Smith" },
      { id: "a3", at: "01/06/2025 10:00", action: "Contract signed", actor: "Priya Mehta" },
      { id: "a4", at: "01/06/2025 10:05", action: "Accepted", actor: "Priya Mehta" },
    ],
  }),
  withTotals({
    id: "quo2",
    quotationId: "QUO-2025-0003",
    title: "Mobile App Development",
    status: "Sent",
    clientId: "c2",
    clientName: "Harbour Labs",
    contactName: "Marcus Chen",
    contactEmail: "marcus@harbour.example",
    dealName: "Harbour Mobile App",
    owner: "Tejas Gokhe",
    validUntil: "24/06/2025",
    lineItems: [
      {
        id: "qli2",
        productId: "fp2",
        name: "Mobile App Development",
        quantity: 1,
        unitPrice: 5790.91,
        taxRate: 10,
      },
    ],
    signatureStatus: "Pending",
    signatureRequestId: "sr-quo2",
    signatureToken: "sig-harbour-quo2",
    createdBy: "Tejas Gokhe",
    createdAt: "25/05/2025",
    sentAt: "25/05/2025 11:00",
    audit: [
      { id: "a1", at: "25/05/2025 10:30", action: "Created", actor: "Tejas Gokhe" },
      { id: "a2", at: "25/05/2025 11:00", action: "Sent", actor: "Tejas Gokhe" },
      { id: "a3", at: "25/05/2025 11:05", action: "Contract sent for signature", actor: "Tejas Gokhe" },
    ],
  }),
  withTotals({
    id: "quo3",
    quotationId: "QUO-2025-0002",
    title: "Brand Identity Design",
    status: "Draft",
    clientId: "c3",
    clientName: "Northside Mortgage",
    contactName: "Aisha Khan",
    contactEmail: "aisha@northside.example",
    owner: "Deepak Shrestha",
    validUntil: "14/06/2025",
    lineItems: [
      {
        id: "qli3",
        productId: "fp3",
        name: "Brand Identity Design",
        quantity: 1,
        unitPrice: 850,
        taxRate: 10,
      },
    ],
    signatureStatus: "Not sent",
    createdBy: "Deepak Shrestha",
    createdAt: "15/05/2025",
    audit: [
      { id: "a1", at: "15/05/2025 09:30", action: "Created", actor: "Deepak Shrestha" },
    ],
  }),
  withTotals({
    id: "quo4",
    quotationId: "QUO-2025-0001",
    title: "Market Research Analysis",
    status: "Rejected",
    clientId: "c4",
    clientName: "Apex Property Group",
    contactName: "Daniel Rossi",
    contactEmail: "daniel@apex.example",
    owner: "Shiva Kadhka",
    validUntil: "20/05/2025",
    lineItems: [
      {
        id: "qli4",
        productId: "fp4",
        name: "Market Research Analysis",
        quantity: 1,
        unitPrice: 3018.18,
        taxRate: 10,
      },
    ],
    signatureStatus: "Not sent",
    createdBy: "Shiva Kadhka",
    createdAt: "20/04/2025",
    sentAt: "20/04/2025 10:00",
    audit: [
      { id: "a1", at: "20/04/2025 11:00", action: "Created", actor: "Shiva Kadhka" },
      { id: "a2", at: "20/04/2025 12:00", action: "Sent", actor: "Shiva Kadhka" },
      { id: "a3", at: "10/05/2025 16:00", action: "Rejected", actor: "Daniel Rossi" },
    ],
  }),
];

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
