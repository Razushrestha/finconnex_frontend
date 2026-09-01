"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CurrencyInput } from "@/components/portals/public/mortgage/CurrencyInput";
import { useMortgagePortal } from "@/components/portals/public/mortgage/useMortgagePortal";
import {
  PORTAL_RESOURCES,
  formatAudExact,
  moneyNumber,
  monthlyRepayment,
} from "@/lib/portals/mortgage";

const ARTICLES: Record<string, { title: string; body: string[] }> = {
  "first-home-buyer": {
    title: "First Home Buyer Guide",
    body: [
      "Most first-home buyers in Australia combine a deposit, government concessions, and a home loan. Lenders typically look for a stable income, a clean credit file, and genuine savings.",
      "A 20% deposit avoids Lenders Mortgage Insurance, but many buyers proceed with 5–15% plus LMI. Your broker will confirm which schemes you may be eligible for, including the First Home Guarantee.",
      "Have ID, payslips, bank statements, and evidence of your deposit ready — that is the fastest way through assessment.",
    ],
  },
  "home-loan-process": {
    title: "Home Loan Process",
    body: [
      "1. Fact find — we capture your household, income, and property goals.",
      "2. Documents — you upload ID, income, and savings evidence.",
      "3. Assessment — we match lenders and structure the loan.",
      "4. Recommendation — you review the indicative offer and estimated repayment.",
      "5. Application, approval, and settlement follow once you are happy to proceed.",
    ],
  },
};

export function PortalResourcesIndex({ slug }: { slug: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <h1 className="text-[24px] font-bold tracking-tight text-slate-900">Helpful resources</h1>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {PORTAL_RESOURCES.map((r) => (
          <li key={r.id}>
            <Link href={`/p/${slug}/resources/${r.id}`} className="block px-4 py-4 hover:bg-slate-50">
              <div className="text-[14px] font-semibold text-slate-900">{r.title}</div>
              <div className="text-[12px] text-slate-500">{r.blurb}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PortalResourceDetailClient({
  slug,
  id,
}: {
  slug: string;
  id: string;
}) {
  const { mortgage } = useMortgagePortal(slug);
  const article = ARTICLES[id];
  const isCalc = id === "calculators";

  if (!article && !isCalc) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-slate-500">Resource not found.</p>
        <Link href={`/p/${slug}/resources`} className="mt-3 inline-block text-[12px] font-bold text-[#5A32A3]">
          All resources
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <Link
        href={`/p/${slug}`}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to home
      </Link>
      {article ? (
        <article className="rounded-2xl border border-slate-100 bg-white p-6">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{article.title}</h1>
          {article.body.map((p) => (
            <p key={p} className="mt-3 text-[14px] leading-relaxed text-slate-600">
              {p}
            </p>
          ))}
        </article>
      ) : null}
      {isCalc && mortgage ? <RepaymentCalc mortgageLoan={mortgage.loan} /> : null}
    </div>
  );
}

function RepaymentCalc({
  mortgageLoan,
}: {
  mortgageLoan: { loanAmount: number; rate: number; termYears: number };
}) {
  const [amount, setAmount] = useState(mortgageLoan.loanAmount);
  const [rate, setRate] = useState(mortgageLoan.rate);
  const [years, setYears] = useState(mortgageLoan.termYears);
  const repayment = useMemo(
    () => monthlyRepayment(amount, rate, years),
    [amount, rate, years],
  );

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-6">
      <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Repayment calculator</h1>
      <p className="mt-1 text-[13px] text-slate-500">
        Starts from your indicative proposed loan. Figures are estimates only.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-[11px] font-semibold text-slate-500">
          Amount
          <div className="mt-1">
            <CurrencyInput
              value={amount ? String(amount) : ""}
              onChange={(next) => setAmount(next ? moneyNumber(next) : 0)}
              className="h-10 rounded-xl"
            />
          </div>
        </label>
        <label className="text-[11px] font-semibold text-slate-500">
          Rate %
          <input
            type="number"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] text-slate-900 outline-none focus:border-[#5A32A3]"
          />
        </label>
        <label className="text-[11px] font-semibold text-slate-500">
          Years
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] text-slate-900 outline-none focus:border-[#5A32A3]"
          />
        </label>
      </div>
      <div className="mt-5 rounded-xl bg-[#5A32A3] px-4 py-4 text-white">
        <div className="text-[11px] font-semibold tracking-wide uppercase opacity-80">
          Estimated monthly repayment
        </div>
        <div className="text-[26px] font-bold">{formatAudExact(repayment)}</div>
      </div>
    </article>
  );
}
