"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, X } from "lucide-react";
import {
  LIABILITY_LENDERS,
  LIABILITY_TYPES,
  MORTGAGE_LOAN_TYPES,
  MORTGAGE_RATE_TYPES,
  emptyLiability,
  isMortgageLiabilityComplete,
  moneyNumber,
  parseLiabilities,
  type FactFindLiability,
} from "@/lib/portals/mortgage";
import { CurrencyInput } from "@/components/portals/public/mortgage/CurrencyInput";
import { cn } from "@/lib/utils";

export function PortalFactFindLiabilities({
  valueOf,
  disabled,
  showErrors,
  onChange,
}: {
  valueOf: (id: string) => string;
  disabled: boolean;
  showErrors?: boolean;
  onChange: (id: string, value: string) => void;
}) {
  const rows = parseLiabilities(valueOf("liabilitiesJson"));
  const [tipOpen, setTipOpen] = useState(true);
  const ownsHome = /own my home/i.test(valueOf("livingArrangement"));
  const hasProperty = moneyNumber(valueOf("assetPropertyValue")) > 0;
  const hasMortgage = rows.some((row) => row.type === "Existing Mortgage");
  const showHomeTip = tipOpen && (ownsHome || hasProperty) && !hasMortgage;

  function save(next: FactFindLiability[]) {
    onChange("liabilitiesJson", JSON.stringify(next));
    const cardLimit = next
      .filter((row) => row.included && row.type === "Credit Card")
      .reduce((sum, row) => sum + Number(row.limit || 0), 0);
    if (cardLimit > 0) onChange("creditCards", String(cardLimit));
  }

  function update(id: string, patch: Partial<FactFindLiability>) {
    save(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-slate-900">Add your liabilities</h2>
        {rows.length > 0 && !disabled ? (
          <button
            type="button"
            onClick={() => save([...rows, emptyLiability()])}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#EDE4F7] px-3 text-[12px] font-semibold text-[#5A32A3] hover:bg-[#e4d6f4]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add liabilities
          </button>
        ) : null}
      </div>

      {showHomeTip ? (
        <div className="relative mb-4 rounded-xl bg-violet-50 px-4 py-3 pr-10 text-[13px] leading-relaxed text-slate-700">
          <button
            type="button"
            onClick={() => setTipOpen(false)}
            className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-700"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          Don&apos;t forget to add a home loan if you have one.
        </div>
      ) : null}

      {rows.length === 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => save([emptyLiability()])}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#EDE4F7] text-[14px] font-semibold text-[#5A32A3] hover:bg-[#e4d6f4] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add liabilities
        </button>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => {
            const repaymentMissing =
              Boolean(row.type.trim()) && !row.repayment.trim() && Boolean(showErrors);
            const isMortgage = row.type === "Existing Mortgage";
            const mortgageIncomplete = isMortgage && Boolean(showErrors) && !isMortgageLiabilityComplete(row);
            const balanceMissing = mortgageIncomplete && !(row.currentBalance ?? "").trim();
            const rateTypeMissing = mortgageIncomplete && !(row.interestRateType ?? "").trim();
            const loanEndMissing = mortgageIncomplete && !(row.loanEnd ?? "").trim();
            return (
              <div
                key={row.id}
                className={cn(
                  "rounded-2xl bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] ring-1 ring-black/5 sm:p-5",
                  !row.included && "opacity-50",
                )}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-[14px] font-bold text-slate-900">Liability {index + 1}</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => update(row.id, { included: !row.included })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50"
                      aria-label={row.included ? "Hide from assessment" : "Include in assessment"}
                    >
                      {row.included ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => save(rows.filter((item) => item.id !== row.id))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-rose-600"
                      aria-label="Remove liability"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Type">
                    <select
                      value={row.type}
                      disabled={disabled}
                      onChange={(e) => update(row.id, { type: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Select type</option>
                      {LIABILITY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Lender">
                    <select
                      value={row.lender}
                      disabled={disabled}
                      onChange={(e) => update(row.id, { lender: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Select lender</option>
                      {LIABILITY_LENDERS.map((lender) => (
                        <option key={lender} value={lender}>
                          {lender}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Limit">
                    <MoneyInput
                      value={row.limit}
                      disabled={disabled}
                      onChange={(next) => update(row.id, { limit: next })}
                    />
                  </Field>
                  <Field
                    label="Monthly repayment"
                    required={Boolean(row.type.trim())}
                    invalid={repaymentMissing}
                  >
                    <MoneyInput
                      value={row.repayment}
                      disabled={disabled}
                      invalid={repaymentMissing}
                      onChange={(next) => update(row.id, { repayment: next })}
                    />
                    {repaymentMissing ? (
                      <p className="mt-1 text-[11px] font-medium text-rose-600">Required</p>
                    ) : null}
                  </Field>
                  <Field label="Rate">
                    <SuffixInput
                      suffix="%"
                      value={row.rate}
                      disabled={disabled}
                      onChange={(next) => update(row.id, { rate: next })}
                    />
                  </Field>
                  <Field label="Term">
                    <SuffixInput
                      suffix="mths"
                      value={row.term}
                      disabled={disabled}
                      onChange={(next) => update(row.id, { term: next })}
                    />
                  </Field>
                </div>

                {isMortgage ? (
                  <div className="mt-4 grid gap-4 rounded-xl bg-[#F7F6F9] p-4 sm:grid-cols-2">
                    <div data-invalid={undefined}>
                      <span className="mb-1.5 block text-[13px] font-semibold text-slate-900">
                        Loan type
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {MORTGAGE_LOAN_TYPES.map((opt) => {
                          const active = row.loanType === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={disabled}
                              onClick={() => update(row.id, { loanType: opt })}
                              className={cn(
                                "h-10 rounded-lg px-3 text-[12px] font-semibold",
                                active
                                  ? "bg-[#EDE4F7] text-[#5A32A3] ring-1 ring-[#5A32A3]/30"
                                  : "bg-white text-slate-600 ring-1 ring-black/5 hover:bg-violet-50",
                              )}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div data-invalid={rateTypeMissing || undefined}>
                      <span
                        className={cn(
                          "mb-1.5 block text-[13px] font-semibold",
                          rateTypeMissing ? "text-rose-700" : "text-slate-900",
                        )}
                      >
                        Interest rate type
                        <span className="text-rose-500"> *</span>
                      </span>
                      <div
                        className={cn(
                          "flex flex-wrap gap-2 rounded-xl p-1",
                          rateTypeMissing && "bg-rose-50 ring-2 ring-rose-400",
                        )}
                      >
                        {MORTGAGE_RATE_TYPES.map((opt) => {
                          const active = row.interestRateType === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={disabled}
                              onClick={() => update(row.id, { interestRateType: opt })}
                              className={cn(
                                "h-10 rounded-lg px-3 text-[12px] font-semibold",
                                active
                                  ? "bg-[#EDE4F7] text-[#5A32A3] ring-1 ring-[#5A32A3]/30"
                                  : "bg-white text-slate-600 ring-1 ring-black/5 hover:bg-violet-50",
                              )}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {rateTypeMissing ? (
                        <p className="mt-1.5 text-[12px] font-medium text-rose-600">Required</p>
                      ) : null}
                    </div>
                    <Field label="Repayment type">
                      <select
                        value={row.repaymentType || "P&I"}
                        disabled={disabled}
                        onChange={(e) => update(row.id, { repaymentType: e.target.value })}
                        className={inputClass}
                      >
                        <option value="P&I">Principal & interest</option>
                        <option value="IO">Interest only</option>
                      </select>
                    </Field>
                    <Field label="Current balance" required invalid={balanceMissing}>
                      <MoneyInput
                        value={row.currentBalance ?? ""}
                        disabled={disabled}
                        invalid={balanceMissing}
                        onChange={(next) => update(row.id, { currentBalance: next })}
                      />
                      {balanceMissing ? (
                        <p className="mt-1 text-[11px] font-medium text-rose-600">Required</p>
                      ) : null}
                    </Field>
                    <LoanTermMonthYear
                      value={row.loanEnd ?? ""}
                      disabled={disabled}
                      invalid={loanEndMissing}
                      onChange={(next) => update(row.id, { loanEnd: next })}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-lg bg-white px-3 text-[13px] text-slate-900 outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-[#5A32A3] disabled:bg-slate-50";

function Field({
  label,
  children,
  required,
  invalid,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  invalid?: boolean;
}) {
  return (
    <label className="block min-w-0" data-invalid={invalid || undefined}>
      <span className={cn("mb-1.5 block text-[13px] font-semibold", invalid ? "text-rose-700" : "text-slate-900")}>
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function MoneyInput({
  value,
  disabled,
  invalid,
  onChange,
}: {
  value: string;
  disabled: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  return <CurrencyInput value={value} disabled={disabled} invalid={invalid} onChange={onChange} />;
}

function SuffixInput({
  suffix,
  value,
  disabled,
  onChange,
}: {
  suffix: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, "pr-12")}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-slate-400">
        {suffix}
      </span>
    </div>
  );
}

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

function loanEndParts(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return { year: "", month: "" };
  return { year: match[1], month: match[2] };
}

function LoanTermMonthYear({
  value,
  disabled,
  invalid,
  onChange,
}: {
  value: string;
  disabled: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const parsed = loanEndParts(value);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);
  const nowYear = new Date().getFullYear();
  const years = Array.from({ length: 41 }, (_, i) => String(nowYear + i));

  useEffect(() => {
    const next = loanEndParts(value);
    if (next.month) setMonth(next.month);
    if (next.year) setYear(next.year);
  }, [value]);

  function commit(nextMonth: string, nextYear: string) {
    setMonth(nextMonth);
    setYear(nextYear);
    onChange(nextMonth && nextYear ? `${nextYear}-${nextMonth}` : "");
  }

  return (
    <div className="sm:col-span-2" data-invalid={invalid || undefined}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className={cn("text-[13px] font-semibold", invalid ? "text-rose-700" : "text-slate-900")}>
          End of loan term
          <span className="text-rose-500"> *</span>
        </span>
        <div className="flex gap-2">
          <select
            value={month}
            disabled={disabled}
            onChange={(e) => commit(e.target.value, year)}
            className={cn(inputClass, "w-[92px]", invalid && "ring-2 ring-rose-400")}
          >
            <option value="">MM</option>
            {MONTHS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={year}
            disabled={disabled}
            onChange={(e) => commit(month, e.target.value)}
            className={cn(inputClass, "w-[110px]", invalid && "ring-2 ring-rose-400")}
          >
            <option value="">YYYY</option>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
      {invalid ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">Required</p> : null}
    </div>
  );
}
