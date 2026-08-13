/**
 * Phase E3 — Org SaaS billing (demo), not CRM AR invoices.
 */

import {
  readPersistedJson,
  writePersistedJson,
} from "@/lib/persistence/registry";
import { formatAUD } from "@/lib/finance/shared";

const STORE_KEY = "billing:org:v1";

export type BillingPlanId = "starter" | "pro" | "enterprise";

export type OrgInvoiceStatus = "Paid" | "Open" | "Past due";

export interface OrgBillingInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: OrgInvoiceStatus;
  period: string;
  issuedAt: string;
}

export interface OrgBillingState {
  planId: BillingPlanId;
  planName: string;
  seatsIncluded: number;
  seatsUsed: number;
  storageGb: number;
  storageUsedGb: number;
  paymentMethod: string;
  renewsAt: string;
  invoices: OrgBillingInvoice[];
}

const PLANS: Record<
  BillingPlanId,
  { name: string; seats: number; storageGb: number; monthly: number }
> = {
  starter: { name: "Starter", seats: 5, storageGb: 10, monthly: 49 },
  pro: { name: "Pro", seats: 25, storageGb: 100, monthly: 199 },
  enterprise: { name: "Enterprise", seats: 100, storageGb: 1000, monthly: 799 },
};

function seed(): OrgBillingState {
  return {
    planId: "pro",
    planName: "Pro",
    seatsIncluded: 25,
    seatsUsed: 8,
    storageGb: 100,
    storageUsedGb: 18.4,
    paymentMethod: "Visa ···· 4242",
    renewsAt: "13/09/2026",
    invoices: [
      {
        id: "obi1",
        invoiceNumber: "SUB-9001",
        amount: 199,
        status: "Paid",
        period: "Jul 2026",
        issuedAt: "01/07/2026",
      },
      {
        id: "obi2",
        invoiceNumber: "SUB-9002",
        amount: 199,
        status: "Open",
        period: "Aug 2026",
        issuedAt: "01/08/2026",
      },
    ],
  };
}

export function loadOrgBilling(): OrgBillingState {
  return readPersistedJson(STORE_KEY, seed());
}

export function saveOrgBilling(state: OrgBillingState) {
  writePersistedJson(STORE_KEY, state);
  return state;
}

export function listBillingPlans() {
  return (Object.keys(PLANS) as BillingPlanId[]).map((id) => ({
    id,
    ...PLANS[id],
    label: `${PLANS[id].name} · ${formatAUD(PLANS[id].monthly)}/mo`,
  }));
}

export async function changePlanDemo(
  planId: BillingPlanId,
): Promise<{ ok: true; state: OrgBillingState } | { ok: false; message: string }> {
  await new Promise((r) => setTimeout(r, 220));
  const plan = PLANS[planId];
  if (!plan) return { ok: false, message: "Unknown plan" };
  const prev = loadOrgBilling();
  const next = saveOrgBilling({
    ...prev,
    planId,
    planName: plan.name,
    seatsIncluded: plan.seats,
    storageGb: plan.storageGb,
  });
  return { ok: true, state: next };
}

export async function payOrgInvoiceDemo(
  invoiceId: string,
): Promise<{ ok: true; state: OrgBillingState } | { ok: false; message: string }> {
  await new Promise((r) => setTimeout(r, 280));
  const state = loadOrgBilling();
  const inv = state.invoices.find((i) => i.id === invoiceId);
  if (!inv) return { ok: false, message: "Invoice not found" };
  if (inv.status === "Paid") return { ok: false, message: "Already paid" };
  const next = saveOrgBilling({
    ...state,
    invoices: state.invoices.map((i) =>
      i.id === invoiceId ? { ...i, status: "Paid" as const } : i,
    ),
  });
  return { ok: true, state: next };
}

export { formatAUD };
