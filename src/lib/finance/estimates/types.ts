/** SRS §13.1 / §20.1 Estimates */

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

export interface EstimateAttachment {
  id: string;
  name: string;
  sizeLabel?: string;
  url?: string;
}

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
  relatedTo?: string;
  owner: string;
  validUntil: string;
  notes?: string;
  lineItems: FinanceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  quotationId?: string;
  publicLink?: string;
  attachments?: EstimateAttachment[];
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
    estimateId: "EST-2025-0004",
    title: "Website Redesign",
    status: "Accepted",
    clientId: "c1",
    clientName: "Greystone Realty",
    contactName: "Priya Mehta",
    contactEmail: "priya@greystone.example",
    dealName: "Greystone Website Redesign",
    owner: "John Smith",
    validUntil: "30/06/2025",
    notes: "Website Redesign package",
    lineItems: [
      {
        id: "eli1",
        productId: "fp1",
        name: "Website Redesign",
        quantity: 1,
        unitPrice: 1995.45,
        taxRate: 10,
      },
    ],
    createdBy: "John Smith",
    createdAt: "31/05/2025",
    sentAt: "31/05/2025 09:30",
    audit: [
      { id: "a1", at: "31/05/2025 10:00", action: "Created", actor: "John Smith" },
      { id: "a2", at: "31/05/2025 11:00", action: "Sent", actor: "John Smith" },
      { id: "a3", at: "31/05/2025 14:00", action: "Accepted", actor: "Greystone Realty" },
    ],
  }),
  withTotals({
    id: "est2",
    estimateId: "EST-2025-0003",
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
        id: "eli2",
        productId: "fp2",
        name: "Mobile App Development",
        quantity: 1,
        unitPrice: 5790.91,
        taxRate: 10,
      },
    ],
    createdBy: "Tejas Gokhe",
    createdAt: "25/05/2025",
    sentAt: "25/05/2025 15:00",
    audit: [
      { id: "a1", at: "25/05/2025 14:00", action: "Created", actor: "Tejas Gokhe" },
      { id: "a2", at: "25/05/2025 15:00", action: "Sent", actor: "Tejas Gokhe" },
    ],
  }),
  withTotals({
    id: "est3",
    estimateId: "EST-2025-0002",
    title: "Brand Identity Design",
    status: "Draft",
    clientId: "c3",
    clientName: "Northside Mortgage",
    contactName: "Aisha Khan",
    contactEmail: "aisha@northside.example",
    dealName: "Northside Branding",
    owner: "Deepak Shrestha",
    validUntil: "14/06/2025",
    lineItems: [
      {
        id: "eli3",
        productId: "fp3",
        name: "Brand Identity Design",
        quantity: 1,
        unitPrice: 850,
        taxRate: 10,
      },
    ],
    createdBy: "Deepak Shrestha",
    createdAt: "15/05/2025",
    audit: [
      { id: "a1", at: "15/05/2025 09:00", action: "Created", actor: "Deepak Shrestha" },
    ],
  }),
  withTotals({
    id: "est4",
    estimateId: "EST-2025-0001",
    title: "Market Research Analysis",
    status: "Rejected",
    clientId: "c4",
    clientName: "Apex Property Group",
    contactName: "Daniel Rossi",
    contactEmail: "daniel@apex.example",
    dealName: "Apex Market Research",
    owner: "Shiva Kadhka",
    validUntil: "20/05/2025",
    lineItems: [
      {
        id: "eli4",
        productId: "fp4",
        name: "Market Research Analysis",
        quantity: 1,
        unitPrice: 3018.18,
        taxRate: 10,
      },
    ],
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

function readStore(): Estimate[] | null {
  return readJsonArrayStore<Estimate>(STORE_KEY);
}

function writeStore(list: Estimate[]) {
  writeJsonArrayStore(STORE_KEY, list);
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

function cloneEstimate(row: Estimate): Estimate {
  return {
    ...row,
    lineItems: row.lineItems.map((l) => ({ ...l })),
    attachments: [...(row.attachments ?? [])],
    audit: [...(row.audit ?? [])],
  };
}

/** Replace the session store with live CRM rows (empty list is a valid live result). */
export function replaceCrmEstimates(remote: Estimate[]) {
  writeStore(remote.map(cloneEstimate));
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
