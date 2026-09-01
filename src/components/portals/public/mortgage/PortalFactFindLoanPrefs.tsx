"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { CurrencyInput } from "@/components/portals/public/mortgage/CurrencyInput";
import {
  LOAN_FEATURES,
  LOAN_FREQUENCIES,
  LOAN_RATE_TYPES,
  LOAN_REPAYMENT_TYPES,
  LOAN_TERMS,
  parseLoanFeatures,
} from "@/lib/portals/mortgage";
import { cn } from "@/lib/utils";

const inputClass =
  "h-12 w-full rounded-lg bg-white px-3.5 text-[14px] text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.07)] outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-[#5A32A3] disabled:bg-slate-50";

const RATE_HELP: Record<string, string> = {
  Variable:
    "The interest rate can go up or down with the market, so your repayment can change over time.",
  Fixed:
    "The interest rate stays the same for a set period, so your repayment stays predictable.",
  Both: "Split the loan so part is variable and part is fixed. You can decide the split with your broker.",
  Unsure: "No problem. Your broker will walk you through the options later.",
};

const REPAY_HELP: Record<string, string> = {
  "Principal & interest":
    "Each repayment reduces the loan balance and covers the interest. This is the most common way to pay down a home loan.",
  "Interest only":
    "You only pay the interest for a period, so the loan balance stays the same. Repayments are lower for now, then usually switch to principal and interest.",
  Unsure: "No problem. Your broker will recommend a repayment type that fits your goals.",
};

const FEATURE_HELP: Record<string, string> = {
  "Additional repayments":
    "Pay extra whenever you can, usually without a fee, so you can reduce the loan and interest faster.",
  "Offset account":
    "A transaction account linked to your loan. Money sitting there reduces the balance you pay interest on.",
  "Redraw facility":
    "Withdraw extra repayments you have already made if you need that money later.",
  "Transaction account":
    "An everyday account with the same lender for salary, bills, and spending.",
};

export function PortalFactFindLoanPrefs({
  valueOf,
  disabled,
  onChange,
}: {
  valueOf: (id: string) => string;
  disabled: boolean;
  onChange: (id: string, value: string) => void;
}) {
  const unsure = valueOf("loanAmountUnsure") === "1";
  const features = parseLoanFeatures(valueOf("loanFeatures"));
  const notes = valueOf("otherLoanRequirements");

  useEffect(() => {
    if (!valueOf("loanTerm")) onChange("loanTerm", "30 years");
    if (!valueOf("repaymentFrequency")) onChange("repaymentFrequency", "Monthly");
  }, [onChange, valueOf]);

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
        If you&apos;re not sure about your loan preferences for now, just click Save & next to discuss them with your broker later.
      </div>

      <div>
        <FieldLabel
          label="Desired loan amount"
          sections={[
            {
              title: "Desired loan amount",
              text: "How much you want to borrow for this property.",
            },
            {
              title: "Unsure",
              text: "Tick this if you have not decided yet. Your broker will help work out a suitable amount.",
            },
          ]}
        />
        <CurrencyInput
          value={unsure ? "" : valueOf("desiredLoanAmount")}
          disabled={disabled || unsure}
          onChange={(next) => {
            onChange("desiredLoanAmount", next);
            if (next) onChange("loanAmountUnsure", "");
          }}
          className="h-12"
        />
        <label className="mt-2.5 flex items-center gap-2 text-[13px] font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={unsure}
            disabled={disabled}
            onChange={(e) => onChange("loanAmountUnsure", e.target.checked ? "1" : "")}
            className="h-4 w-4 accent-[#5A32A3]"
          />
          Unsure
        </label>
      </div>

      <ChoiceRow
        label="What rate type are you interested in?"
        sections={Object.entries(RATE_HELP).map(([title, text]) => ({ title, text }))}
        hint="By selecting both you can apportion a part of your loan to each rate type."
        value={valueOf("rateType")}
        options={LOAN_RATE_TYPES}
        disabled={disabled}
        onChange={(next) => onChange("rateType", next)}
      />

      <ChoiceRow
        label="Repayment type"
        sections={Object.entries(REPAY_HELP).map(([title, text]) => ({ title, text }))}
        value={valueOf("repaymentTypePref")}
        options={LOAN_REPAYMENT_TYPES}
        disabled={disabled}
        onChange={(next) => onChange("repaymentTypePref", next)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <FieldLabel
            label="Loan term"
            sections={[
              {
                title: "Loan term",
                text: "How many years you want to take to repay the loan. A longer term usually means lower repayments, but more interest over time.",
              },
            ]}
          />
          <select
            value={valueOf("loanTerm") || "30 years"}
            disabled={disabled}
            onChange={(e) => onChange("loanTerm", e.target.value)}
            className={inputClass}
          >
            {LOAN_TERMS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <FieldLabel
            label="Repayment frequency"
            sections={[
              {
                title: "Weekly / fortnightly",
                text: "More frequent repayments can reduce interest a little compared with monthly.",
              },
              {
                title: "Monthly",
                text: "The most common option. You make one repayment each month.",
              },
            ]}
          />
          <select
            value={valueOf("repaymentFrequency") || "Monthly"}
            disabled={disabled}
            onChange={(e) => onChange("repaymentFrequency", e.target.value)}
            className={inputClass}
          >
            {LOAN_FREQUENCIES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <FieldLabel
          label="Loan features"
          sections={Object.entries(FEATURE_HELP).map(([title, text]) => ({ title, text }))}
        />
        <p className="mb-2.5 text-[12px] text-slate-400">
          You can select multiple or leave blank if you have no preference.
        </p>
        <div className="space-y-2">
          {LOAN_FEATURES.map((feature) => {
            const checked = features.includes(feature);
            return (
              <button
                key={feature}
                type="button"
                disabled={disabled}
                onClick={() => {
                  const next = checked
                    ? features.filter((item) => item !== feature)
                    : [...features, feature];
                  onChange("loanFeatures", JSON.stringify(next));
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl bg-white px-3.5 py-3 text-left text-[13px] font-semibold ring-1 transition-colors",
                  checked
                    ? "bg-[#EDE4F7] text-[#5A32A3] ring-[#5A32A3]/30"
                    : "text-slate-700 ring-black/5 hover:bg-violet-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-md ring-1",
                    checked ? "bg-[#5A32A3] text-white ring-[#5A32A3]" : "bg-white ring-slate-300",
                  )}
                >
                  {checked ? <Check className="h-3 w-3" /> : null}
                </span>
                {feature}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <FieldLabel
          label="Other loan requirements"
          sections={[
            {
              title: "Other loan requirements",
              text: "Anything else your broker should know, such as a preferred lender or a specific settlement date. Leave blank if you have nothing to add.",
            },
          ]}
        />
        <p className="mb-2.5 text-[12px] text-slate-400">
          Tell your broker about any other loan requirements not covered above, or leave blank.
        </p>
        <div className="relative">
          <textarea
            value={notes}
            disabled={disabled}
            maxLength={100}
            rows={4}
            placeholder="e.g. Prefer a local lender"
            onChange={(e) => onChange("otherLoanRequirements", e.target.value.slice(0, 100))}
            className="w-full resize-none rounded-xl bg-white px-3.5 py-3 text-[14px] text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.07)] outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-[#5A32A3] disabled:bg-slate-50"
          />
          <span className="pointer-events-none absolute right-3 bottom-3 text-[11px] font-semibold text-slate-400">
            {notes.length} / 100
          </span>
        </div>
      </label>
    </div>
  );
}

function FieldLabel({
  label,
  sections,
}: {
  label: string;
  sections: { title: string; text: string }[];
}) {
  return (
    <span className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
      {label}
      <InfoTip title={label} sections={sections} />
    </span>
  );
}

function ChoiceRow({
  label,
  sections,
  hint,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  sections: { title: string; text: string }[];
  hint?: string;
  value: string;
  options: readonly string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel label={label} sections={sections} />
      {hint ? <p className="-mt-1 mb-2.5 text-[12px] text-slate-400">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-lg px-4 text-[13px] font-semibold transition-colors",
                active
                  ? "bg-[#EDE4F7] text-[#5A32A3]"
                  : "bg-white text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.07)] ring-1 ring-black/5 hover:bg-slate-50",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InfoTip({
  title,
  sections,
}: {
  title: string;
  sections: { title: string; text: string }[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={`About ${title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold leading-none",
          open ? "bg-[#5A32A3] text-white" : "bg-slate-200 text-slate-600 hover:bg-[#EDE4F7] hover:text-[#5A32A3]",
        )}
      >
        i
      </button>
      {open && sections.length > 0 ? (
        <span className="absolute top-[calc(100%+8px)] left-0 z-30 w-80 max-w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-slate-900 px-3.5 py-3 text-left shadow-[0_12px_32px_rgba(15,23,42,0.2)]">
          <span className="space-y-2.5">
            {sections.map((item) => (
              <span key={item.title} className="block">
                <span className="block text-[12px] font-semibold text-white">{item.title}</span>
                <span className="mt-0.5 block text-[12px] font-medium leading-relaxed text-slate-200">
                  {item.text}
                </span>
              </span>
            ))}
          </span>
        </span>
      ) : null}
    </span>
  );
}
