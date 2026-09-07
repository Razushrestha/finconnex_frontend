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

export const estimates: Estimate[] = [];

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
