/** SRS §13.4 / §20.3 Sales Invoices */

import {
  type FinanceAuditEvent,
  type FinanceLineItem,
  formatFinanceAt,
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
  createdBy: string;
  createdAt: string;
  sentAt?: string;
  audit: FinanceAuditEvent[];
}

const STORE_KEY = "finance:invoices:v1";

function withMoney(
  partial: Omit<Invoice, "subtotal" | "tax" | "total" | "amountDue"> & {
    amountPaid: number;
  },
): Invoice {
  const t = totalsFromLines(partial.lineItems);
  return {
    ...partial,
    ...t,
    amountDue: Math.max(0, t.total - partial.amountPaid),
  };
}

export const invoices: Invoice[] = [
  withMoney({
    id: "inv1",
    invoiceId: "INV-3201",
    title: "Greystone refinance invoice",
    status: "Partially Paid",
    clientId: "c1",
    clientName: "Greystone Realty",
    contactName: "Priya Mehta",
    contactEmail: "priya@greystone.example",
    dealName: "Greystone refinance package",
    owner: "John Smith",
    issueDate: "15/07/2026",
    dueDate: "29/07/2026",
    notes: "Generated from QUO-3101.",
    lineItems: [
      {
        id: "ili1",
        productId: "fp1",
        name: "Home loan packaging",
        quantity: 1,
        unitPrice: 2200,
        taxRate: 10,
      },
      {
        id: "ili2",
        productId: "fp4",
        name: "Property valuation coordination",
        quantity: 1,
        unitPrice: 450,
        taxRate: 10,
      },
    ],
    amountPaid: 1500,
    quotationId: "quo1",
    quotationRef: "QUO-3101",
    createdBy: "John Smith",
    createdAt: "15/07/2026",
    sentAt: "15/07/2026 11:00",
    audit: [
      { id: "a1", at: "15/07/2026 10:20", action: "Created from quotation", actor: "John Smith" },
      { id: "a2", at: "15/07/2026 11:00", action: "Sent", actor: "John Smith" },
      { id: "a3", at: "18/07/2026 09:00", action: "Payment recorded $1,500.00", actor: "System" },
    ],
  }),
  withMoney({
    id: "inv2",
    invoiceId: "INV-3202",
    title: "Harbour deposit invoice",
    status: "Sent",
    clientId: "c2",
    clientName: "Harbour Loans",
    contactName: "Marcus Chen",
    contactEmail: "marcus@harbour.example",
    dealName: "Harbour first-home buyer",
    owner: "Tejas Gokhe",
    issueDate: "20/07/2026",
    dueDate: "03/08/2026",
    lineItems: [
      {
        id: "ili3",
        productId: "fp3",
        name: "Brokerage fee",
        quantity: 1,
        unitPrice: 1500,
        taxRate: 10,
      },
    ],
    amountPaid: 0,
    createdBy: "Tejas Gokhe",
    createdAt: "20/07/2026",
    sentAt: "20/07/2026 14:00",
    audit: [
      { id: "a1", at: "20/07/2026 13:30", action: "Created", actor: "Tejas Gokhe" },
      { id: "a2", at: "20/07/2026 14:00", action: "Sent", actor: "Tejas Gokhe" },
    ],
  }),
  withMoney({
    id: "inv3",
    invoiceId: "INV-3203",
    title: "Northside review invoice",
    status: "Draft",
    clientId: "c3",
    clientName: "Northside Mortgage",
    contactName: "Aisha Khan",
    contactEmail: "aisha@northside.example",
    owner: "Roshna Abraham",
    issueDate: "21/07/2026",
    dueDate: "04/08/2026",
    lineItems: [
      {
        id: "ili4",
        productId: "fp2",
        name: "Refinance review",
        quantity: 1,
        unitPrice: 850,
        taxRate: 10,
      },
    ],
    amountPaid: 0,
    createdBy: "Roshna Abraham",
    createdAt: "21/07/2026",
    audit: [
      { id: "a1", at: "21/07/2026 16:00", action: "Created", actor: "Roshna Abraham" },
    ],
  }),
  withMoney({
    id: "inv4",
    invoiceId: "INV-3204",
    title: "Apex overdue invoice",
    status: "Overdue",
    clientId: "c4",
    clientName: "Apex Property Group",
    contactName: "Daniel Rossi",
    contactEmail: "daniel@apex.example",
    dealName: "Apex commercial facility",
    owner: "Shiva Kadhka",
    issueDate: "01/06/2026",
    dueDate: "15/06/2026",
    lineItems: [
      {
        id: "ili5",
        productId: "fp3",
        name: "Brokerage fee",
        quantity: 1,
        unitPrice: 1500,
        taxRate: 10,
      },
    ],
    amountPaid: 0,
    createdBy: "Shiva Kadhka",
    createdAt: "01/06/2026",
    sentAt: "01/06/2026 10:00",
    audit: [
      { id: "a1", at: "01/06/2026 09:00", action: "Created", actor: "Shiva Kadhka" },
      { id: "a2", at: "01/06/2026 10:00", action: "Sent", actor: "Shiva Kadhka" },
      { id: "a3", at: "16/06/2026 00:00", action: "Marked overdue", actor: "System" },
    ],
  }),
];

function readStore(): Invoice[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Invoice[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: Invoice[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
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
