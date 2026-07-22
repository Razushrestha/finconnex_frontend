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

const STORE_KEY = "finance:payments:v1";

export const payments: Payment[] = [
  {
    id: "pay1",
    paymentId: "PAY-3301",
    invoiceId: "inv1",
    invoiceRef: "INV-3201",
    clientName: "Greystone Realty",
    amount: 1500,
    method: "Bank transfer",
    status: "Completed",
    reference: "EFT-88921",
    notes: "Deposit against Greystone invoice",
    receivedAt: "18/07/2026",
    recordedBy: "John Smith",
    createdAt: "18/07/2026",
    audit: [
      { id: "a1", at: "18/07/2026 09:00", action: "Recorded", actor: "John Smith" },
      { id: "a2", at: "18/07/2026 09:01", action: "Marked completed", actor: "System" },
    ],
  },
  {
    id: "pay2",
    paymentId: "PAY-3302",
    invoiceId: "inv2",
    invoiceRef: "INV-3202",
    clientName: "Harbour Loans",
    amount: 500,
    method: "Stripe",
    status: "Pending",
    reference: "pi_mock_harbour",
    receivedAt: "21/07/2026",
    recordedBy: "Tejas Gokhe",
    createdAt: "21/07/2026",
    audit: [
      { id: "a1", at: "21/07/2026 10:00", action: "Recorded (pending gateway)", actor: "Tejas Gokhe" },
    ],
  },
  {
    id: "pay3",
    paymentId: "PAY-3303",
    invoiceId: "inv4",
    invoiceRef: "INV-3204",
    clientName: "Apex Property Group",
    amount: 1650,
    method: "Card",
    status: "Failed",
    reference: "ch_mock_apex",
    notes: "Card declined — retry requested",
    receivedAt: "10/07/2026",
    recordedBy: "Shiva Kadhka",
    createdAt: "10/07/2026",
    audit: [
      { id: "a1", at: "10/07/2026 14:00", action: "Recorded", actor: "Shiva Kadhka" },
      { id: "a2", at: "10/07/2026 14:02", action: "Failed — card declined", actor: "System" },
    ],
  },
];

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
