"use client";

import { useState } from "react";
import {
  changePlanDemo,
  formatAUD,
  listBillingPlans,
  loadOrgBilling,
  payOrgInvoiceDemo,
  type BillingPlanId,
  type OrgBillingState,
} from "@/lib/billing/store";

/** Settings → Subscription & Billing */
export function BillingSettingsClient() {
  const [state, setState] = useState<OrgBillingState>(() => loadOrgBilling());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const plans = listBillingPlans();

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2800);
  }

  async function onPlan(planId: BillingPlanId) {
    setBusy(true);
    const result = await changePlanDemo(planId);
    setBusy(false);
    if (!result.ok) {
      flash(result.message);
      return;
    }
    setState(result.state);
    flash(`Plan → ${result.state.planName}`);
  }

  async function onPay(id: string) {
    setBusy(true);
    const result = await payOrgInvoiceDemo(id);
    setBusy(false);
    if (!result.ok) {
      flash(result.message);
      return;
    }
    setState(result.state);
    flash("Invoice paid (demo)");
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <h2 className="text-[16px] font-bold text-slate-900">
            Subscription & billing
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Tenant plan seats and subscription invoices (not CRM AR).
          </p>
          {message ? (
            <p className="mt-2 text-[12px] font-medium text-violet-700">
              {message}
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Plan
            </p>
            <p className="mt-1 text-[18px] font-bold text-slate-900">
              {state.planName}
            </p>
            <p className="text-[11px] text-slate-500">Renews {state.renewsAt}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Seats
            </p>
            <p className="mt-1 text-[18px] font-bold text-slate-900">
              {state.seatsUsed}/{state.seatsIncluded}
            </p>
            <p className="text-[11px] text-slate-500">{state.paymentMethod}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Storage
            </p>
            <p className="mt-1 text-[18px] font-bold text-slate-900">
              {state.storageUsedGb}/{state.storageGb} GB
            </p>
          </div>
        </div>
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="mb-2 text-[12px] font-semibold text-slate-700">
            Change plan
          </p>
          <div className="flex flex-wrap gap-2">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy || p.id === state.planId}
                onClick={() => void onPlan(p.id)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 disabled:opacity-50 hover:bg-slate-50"
              >
                {p.label}
                {p.id === state.planId ? " · current" : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-[13px] font-bold text-slate-900">
            Subscription invoices
          </h3>
        </div>
        <ul className="divide-y divide-slate-50">
          {state.invoices.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[12px]"
            >
              <div>
                <p className="font-semibold text-slate-800">
                  {inv.invoiceNumber} · {inv.period}
                </p>
                <p className="text-[11px] text-slate-400">
                  {inv.issuedAt} · {inv.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">
                  {formatAUD(inv.amount)}
                </span>
                {inv.status !== "Paid" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onPay(inv.id)}
                    className="h-7 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white disabled:opacity-60"
                  >
                    Pay
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
