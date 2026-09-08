/** SRS §13.5 / §20.4 Payments */

import { formatAUD, formatFinanceAt, type FinanceAuditEvent } from "@/lib/finance/shared";

export type PaymentMethod =
  | "Bank transfer"
  | "Card"
  | "PayPal"
  | "Stripe"
  | "Cash"
  | "Other";

export type PaymentStatus =
  | "Pending"
  | "Completed"
  | "Failed"
  | "Refunded";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "Bank transfer",
  "Card",
  "PayPal",
  "Stripe",
  "Cash",
  "Other",
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "Pending",
  "Completed",
  "Failed",
  "Refunded",
];

export interface Payment {
  id: string;
  paymentId: string;
  invoiceId: string;
  invoiceRef: string;
  clientName: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  notes?: string;
  receivedAt: string;
  recordedBy: string;
  createdAt: string;
  audit: FinanceAuditEvent[];
}

const STORE_KEY = "finance:payments:v2";

export const payments: Payment[] = [];

function readStore(): Payment[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Payment[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: Payment[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listPayments(): Payment[] {
  return readStore() ?? payments.map((p) => ({ ...p }));
}

export function upsertPayment(p: Payment) {
  const list = listPayments();
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) list[i] = p;
  else list.unshift(p);
  writeStore(list);
  return p;
}

export function writeAllPayments(list: Payment[]) {
  writeStore(list);
}

/** Replace the session store with live CRM rows (empty list is a valid live result). */
export function replaceCrmPayments(remote: Payment[]) {
  writeStore(remote.map((p) => ({ ...p })));
}

export function deletePayment(id: string) {
  writeStore(listPayments().filter((p) => p.id !== id));
}

export function getPaymentById(id: string) {
  return listPayments().find((p) => p.id === id);
}

export function nextPaymentIds() {
  const list = listPayments();
  const nums = list
    .map((p) => Number(p.paymentId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 3300) + 1;
  return { id: `pay-${Date.now()}`, paymentId: `PAY-${n}` };
}

export function appendPaymentAudit(
  p: Payment,
  action: string,
  actor = p.recordedBy,
): Payment {
  return {
    ...p,
    audit: [
      ...p.audit,
      { id: `a-${Date.now()}`, at: formatFinanceAt(), action, actor },
    ],
  };
}

export { formatAUD };
