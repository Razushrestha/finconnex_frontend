/** SRS §13.2 / §20.2 Quotations */

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
  signatureStatus?: "Not sent" | "Pending" | "Signed";
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
    quotationId: "QUO-3101",
    title: "Greystone refinance quotation",
    status: "Accepted",
    clientId: "c1",
    clientName: "Greystone Realty",
    contactName: "Priya Mehta",
    contactEmail: "priya@greystone.example",
    dealName: "Greystone refinance package",
    owner: "John Smith",
    validUntil: "31/07/2026",
    notes: "Converted from EST-3001.",
    lineItems: [
      {
        id: "qli1",
        productId: "fp1",
        name: "Home loan packaging",
        quantity: 1,
        unitPrice: 2200,
        taxRate: 10,
      },
      {
        id: "qli2",
        productId: "fp4",
        name: "Property valuation coordination",
        quantity: 1,
        unitPrice: 450,
        taxRate: 10,
      },
    ],
    estimateId: "est1",
    estimateRef: "EST-3001",
    invoiceId: "inv1",
    signatureStatus: "Signed",
    createdBy: "John Smith",
    createdAt: "14/07/2026",
    sentAt: "14/07/2026 12:00",
    audit: [
      { id: "a1", at: "14/07/2026 11:15", action: "Created from estimate", actor: "John Smith" },
      { id: "a2", at: "14/07/2026 12:00", action: "Sent", actor: "John Smith" },
      { id: "a3", at: "15/07/2026 10:00", action: "Contract signed", actor: "Priya Mehta" },
      { id: "a4", at: "15/07/2026 10:05", action: "Accepted", actor: "Priya Mehta" },
      { id: "a5", at: "15/07/2026 10:20", action: "Converted to invoice", actor: "John Smith" },
    ],
  }),
  withTotals({
    id: "quo2",
    quotationId: "QUO-3102",
    title: "Harbour packaging quotation",
    status: "Sent",
    clientId: "c2",
    clientName: "Harbour Loans",
    contactName: "Marcus Chen",
    contactEmail: "marcus@harbour.example",
    dealName: "Harbour first-home buyer",
    owner: "Tejas Gokhe",
    validUntil: "10/08/2026",
    lineItems: [
      {
        id: "qli3",
        productId: "fp1",
        name: "Home loan packaging",
        quantity: 1,
        unitPrice: 2200,
        taxRate: 10,
      },
      {
        id: "qli4",
        productId: "fp3",
        name: "Brokerage fee",
        quantity: 1,
        unitPrice: 1500,
        taxRate: 10,
      },
    ],
    signatureStatus: "Pending",
    createdBy: "Tejas Gokhe",
    createdAt: "19/07/2026",
    sentAt: "19/07/2026 11:00",
    audit: [
      { id: "a1", at: "19/07/2026 10:30", action: "Created", actor: "Tejas Gokhe" },
      { id: "a2", at: "19/07/2026 11:00", action: "Sent", actor: "Tejas Gokhe" },
      { id: "a3", at: "19/07/2026 11:05", action: "Contract sent for signature", actor: "Tejas Gokhe" },
    ],
  }),
  withTotals({
    id: "quo3",
    quotationId: "QUO-3103",
    title: "Northside review quotation",
    status: "Draft",
    clientId: "c3",
    clientName: "Northside Mortgage",
    contactName: "Aisha Khan",
    contactEmail: "aisha@northside.example",
    owner: "Roshna Abraham",
    validUntil: "20/08/2026",
    lineItems: [
      {
        id: "qli5",
        productId: "fp2",
        name: "Refinance review",
        quantity: 1,
        unitPrice: 850,
        taxRate: 10,
      },
    ],
    signatureStatus: "Not sent",
    createdBy: "Roshna Abraham",
    createdAt: "21/07/2026",
    audit: [
      { id: "a1", at: "21/07/2026 09:30", action: "Created", actor: "Roshna Abraham" },
    ],
  }),
];

function readStore(): Quotation[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Quotation[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: Quotation[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
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
