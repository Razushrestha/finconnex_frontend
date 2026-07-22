/** SRS §13.1 / §20.1 Estimates */

import {
  type FinanceAuditEvent,
  type FinanceLineItem,
  formatFinanceAt,
  formatFinanceDate,
  totalsFromLines,
} from "@/lib/finance/shared";

export type EstimateStatus =
  | "Draft"
  | "Sent"
  | "Accepted"
  | "Rejected"
  | "Expired"
  | "Converted";

export const ESTIMATE_STATUSES: EstimateStatus[] = [
  "Draft",
  "Sent",
  "Accepted",
  "Rejected",
  "Expired",
  "Converted",
];

export interface Estimate {
  id: string;
  estimateId: string;
  title: string;
  status: EstimateStatus;
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
  quotationId?: string;
  createdBy: string;
  createdAt: string;
  sentAt?: string;
  audit: FinanceAuditEvent[];
}

const STORE_KEY = "finance:estimates:v1";

const seedLines = (): FinanceLineItem[] => [
  {
    id: "eli1",
    productId: "fp1",
    name: "Home loan packaging",
    description: "Full packaging & submission",
    quantity: 1,
    unitPrice: 2200,
    taxRate: 10,
  },
  {
    id: "eli2",
    productId: "fp4",
    name: "Property valuation coordination",
    quantity: 1,
    unitPrice: 450,
    taxRate: 10,
  },
];

function withTotals(
  partial: Omit<Estimate, "subtotal" | "tax" | "total"> & {
    subtotal?: number;
    tax?: number;
    total?: number;
  },
): Estimate {
  const t = totalsFromLines(partial.lineItems);
  return { ...partial, ...t };
}

export const estimates: Estimate[] = [
  withTotals({
    id: "est1",
    estimateId: "EST-3001",
    title: "Greystone refinance estimate",
    status: "Accepted",
    clientId: "c1",
    clientName: "Greystone Realty",
    contactName: "Priya Mehta",
    contactEmail: "priya@greystone.example",
    dealName: "Greystone refinance package",
    owner: "John Smith",
    validUntil: "31/07/2026",
    notes: "Includes packaging + valuation coordination.",
    lineItems: seedLines(),
    quotationId: "quo1",
    createdBy: "John Smith",
    createdAt: "10/07/2026",
    sentAt: "11/07/2026 09:30",
    audit: [
      { id: "a1", at: "10/07/2026 10:00", action: "Created", actor: "John Smith" },
      { id: "a2", at: "11/07/2026 09:30", action: "Sent", actor: "John Smith" },
      { id: "a3", at: "14/07/2026 11:00", action: "Accepted", actor: "Priya Mehta" },
      { id: "a4", at: "14/07/2026 11:15", action: "Converted to quotation", actor: "John Smith" },
    ],
  }),
  withTotals({
    id: "est2",
    estimateId: "EST-3002",
    title: "Harbour FHB estimate",
    status: "Sent",
    clientId: "c2",
    clientName: "Harbour Loans",
    contactName: "Marcus Chen",
    contactEmail: "marcus@harbour.example",
    dealName: "Harbour first-home buyer",
    owner: "Tejas Gokhe",
    validUntil: "05/08/2026",
    lineItems: [
      {
        id: "eli3",
        productId: "fp1",
        name: "Home loan packaging",
        quantity: 1,
        unitPrice: 2200,
        taxRate: 10,
      },
      {
        id: "eli4",
        productId: "fp3",
        name: "Brokerage fee",
        quantity: 1,
        unitPrice: 1500,
        taxRate: 10,
      },
    ],
    createdBy: "Tejas Gokhe",
    createdAt: "18/07/2026",
    sentAt: "18/07/2026 15:00",
    audit: [
      { id: "a1", at: "18/07/2026 14:00", action: "Created", actor: "Tejas Gokhe" },
      { id: "a2", at: "18/07/2026 15:00", action: "Sent", actor: "Tejas Gokhe" },
    ],
  }),
  withTotals({
    id: "est3",
    estimateId: "EST-3003",
    title: "Northside investment estimate",
    status: "Draft",
    clientId: "c3",
    clientName: "Northside Mortgage",
    contactName: "Aisha Khan",
    contactEmail: "aisha@northside.example",
    dealName: "Northside investment loan",
    owner: "Roshna Abraham",
    validUntil: "15/08/2026",
    lineItems: [
      {
        id: "eli5",
        productId: "fp2",
        name: "Refinance review",
        quantity: 1,
        unitPrice: 850,
        taxRate: 10,
      },
    ],
    createdBy: "Roshna Abraham",
    createdAt: "20/07/2026",
    audit: [
      { id: "a1", at: "20/07/2026 09:00", action: "Created", actor: "Roshna Abraham" },
    ],
  }),
  withTotals({
    id: "est4",
    estimateId: "EST-3004",
    title: "Apex commercial estimate",
    status: "Rejected",
    clientId: "c4",
    clientName: "Apex Property Group",
    contactName: "Daniel Rossi",
    contactEmail: "daniel@apex.example",
    dealName: "Apex commercial facility",
    owner: "Shiva Kadhka",
    validUntil: "20/07/2026",
    lineItems: [
      {
        id: "eli6",
        productId: "fp3",
        name: "Brokerage fee",
        quantity: 2,
        unitPrice: 1500,
        taxRate: 10,
      },
    ],
    createdBy: "Shiva Kadhka",
    createdAt: "01/07/2026",
    sentAt: "02/07/2026 10:00",
    audit: [
      { id: "a1", at: "01/07/2026 11:00", action: "Created", actor: "Shiva Kadhka" },
      { id: "a2", at: "02/07/2026 10:00", action: "Sent", actor: "Shiva Kadhka" },
      { id: "a3", at: "08/07/2026 16:00", action: "Rejected", actor: "Daniel Rossi" },
    ],
  }),
];

function readStore(): Estimate[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Estimate[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: Estimate[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listEstimates(): Estimate[] {
  return readStore() ?? estimates.map((e) => ({ ...e, lineItems: e.lineItems.map((l) => ({ ...l })) }));
}

export function upsertEstimate(e: Estimate) {
  const t = totalsFromLines(e.lineItems);
  const next = { ...e, ...t };
  const list = listEstimates();
  const i = list.findIndex((x) => x.id === next.id);
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  writeStore(list);
  return next;
}

export function deleteEstimate(id: string) {
  writeStore(listEstimates().filter((e) => e.id !== id));
}

export function getEstimateById(id: string) {
  return listEstimates().find((e) => e.id === id);
}

export function nextEstimateIds() {
  const list = listEstimates();
  const nums = list
    .map((e) => Number(e.estimateId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 3000) + 1;
  return { id: `est-${Date.now()}`, estimateId: `EST-${n}` };
}

export function appendEstimateAudit(
  e: Estimate,
  action: string,
  actor = e.owner,
): Estimate {
  return {
    ...e,
    audit: [
      ...e.audit,
      { id: `a-${Date.now()}`, at: formatFinanceAt(), action, actor },
    ],
  };
}

export { formatFinanceAt, formatFinanceDate, totalsFromLines };
