"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CurrencyInput } from "@/components/portals/public/mortgage/CurrencyInput";
import { useMortgagePortal } from "@/components/portals/public/mortgage/useMortgagePortal";
import {
  formatAud,
  formatAudExact,
  loanLvr,
  moneyNumber,
  monthlyRepayment,
} from "@/lib/portals/mortgage";

export function PortalLoanClient({ slug }: { slug: string }) {
  const { mortgage } = useMortgagePortal(slug);
  const [amount, setAmount] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [years, setYears] = useState<number | null>(null);

  const loan = mortgage?.loan;
  const principal = amount ?? loan?.loanAmount ?? 0;
  const annual = rate ?? loan?.rate ?? 0;
  const term = years ?? loan?.termYears ?? 30;

  const repayment = useMemo(
    () => monthlyRepayment(principal, annual, term),
    [principal, annual, term],
  );

  if (!mortgage || !loan) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <Link
        href={`/p/${slug}`}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to home
      </Link>
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-slate-900">
          Loan recommendation
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Indicative structure from {mortgage.broker.name}. Not a formal offer.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5">
        <h2 className="text-[14px] font-bold text-slate-900">Proposed loan</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["Lender", loan.lender],
            ["Loan amount", formatAud(loan.loanAmount)],
            ["Purchase price", formatAud(loan.purchasePrice)],
            ["Deposit", formatAud(loan.deposit)],
            ["LVR", `${loanLvr(loan).toFixed(2)}%`],
            ["Loan type", loan.loanType],
            ["Interest rate", `${loan.rate.toFixed(2)}% p.a.`],
            ["Term", `${loan.termYears} years`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-[#F7F6F9] px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                {k}
              </dt>
              <dd className="mt-0.5 text-[14px] font-bold text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 rounded-xl bg-[#5A32A3] px-4 py-4 text-white">
          <div className="text-[11px] font-semibold tracking-wide uppercase opacity-80">
            Estimated repayment
          </div>
          <div className="text-[26px] font-bold">
            {formatAud(Math.round(monthlyRepayment(loan.loanAmount, loan.rate, loan.termYears)))}
            <span className="text-[13px] font-semibold opacity-80"> / month</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5">
        <h2 className="text-[14px] font-bold text-slate-900">Try the numbers</h2>
        <p className="mt-1 text-[12px] text-slate-500">
          Adjust amount, rate, or term to see how the monthly repayment changes.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block text-[11px] font-semibold text-slate-500">
            Loan amount
            <div className="mt-1">
              <CurrencyInput
                value={principal ? String(principal) : ""}
                onChange={(next) => setAmount(next ? moneyNumber(next) : 0)}
                className="h-10 rounded-xl"
              />
            </div>
          </label>
          <label className="block text-[11px] font-semibold text-slate-500">
            Rate (% p.a.)
            <input
              type="number"
              step="0.01"
              value={annual}
              onChange={(e) => setRate(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] font-medium text-slate-900 outline-none focus:border-[#5A32A3]"
            />
          </label>
          <label className="block text-[11px] font-semibold text-slate-500">
            Term (years)
            <input
              type="number"
              value={term}
              onChange={(e) => setYears(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] font-medium text-slate-900 outline-none focus:border-[#5A32A3]"
            />
          </label>
        </div>
        <div className="mt-4 text-[15px] font-bold text-[#5A32A3]">
          {formatAudExact(repayment)} / month
        </div>
      </section>
    </div>
  );
}
