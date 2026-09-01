"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Trash2, X } from "lucide-react";
import {
  ADDITIONAL_INCOME,
  BUSINESS_STRUCTURES,
  INCOME_FREQUENCIES,
  INCOME_TYPES,
  WORK_ARRANGEMENTS,
  emptyIncome,
  formatMoney,
  incomeRowAnnualTotal,
  incomesAnnualTotal,
  isOtherIncome,
  isPaygIncome,
  isSelfIncome,
  parseAdditionalItems,
  parseEmployments,
  parseIncomes,
  parseStringIds,
  syncEmploymentsFromIncome,
  type FactFindAdditionalIncome,
  type FactFindIncome,
} from "@/lib/portals/mortgage";
import { CurrencyInput } from "@/components/portals/public/mortgage/CurrencyInput";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-lg bg-white px-3 text-[13px] text-slate-800 outline-none ring-1 ring-black/5 placeholder:text-slate-400 focus:ring-2 focus:ring-[#5A32A3] disabled:bg-slate-50";

function formatIncomeAmount(value: number) {
  const cents = Math.round(value * 100) % 100 !== 0;
  return value.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}

export function PortalFactFindIncome({
  valueOf,
  disabled,
  showErrors,
  onChange,
  paygLabel = "PAYG/Employee",
  showPeriodHint = true,
  showCombinedTotal = true,
  showTopTotal = false,
}: {
  valueOf: (id: string) => string;
  disabled: boolean;
  showErrors?: boolean;
  onChange: (id: string, value: string) => void;
  paygLabel?: string;
  showPeriodHint?: boolean;
  showCombinedTotal?: boolean;
  showTopTotal?: boolean;
}) {
  const rows = parseIncomes(valueOf("incomesJson"));
  const [draft] = useState(emptyIncome);
  const working = rows.length > 0 ? rows : [draft];
  const [editingId, setEditingId] = useState<string | null>(working[0]?.id ?? draft.id);
  const combined = incomesAnnualTotal(rows);

  function save(next: FactFindIncome[]) {
    onChange("incomesJson", JSON.stringify(next));
    onChange("annualIncome", String(incomesAnnualTotal(next)));
    const payg = next.find((row) => isPaygIncome(row.type));
    const self = next.find((row) => isSelfIncome(row.type));
    const job = payg ?? self;
    if (job) {
      onChange("employmentType", payg ? "Employee" : "Self employed");
      onChange("employer", payg ? job.employer : job.businessName);
      onChange("occupation", job.occupation);
      onChange("startDate", job.startDate);
    }
    const jobs = syncEmploymentsFromIncome(
      next,
      parseEmployments(valueOf("employmentsJson")),
      parseStringIds(valueOf("droppedEmploymentIncomeIds")),
    );
    onChange("employmentsJson", JSON.stringify(jobs));
  }

  function update(id: string, patch: Partial<FactFindIncome>) {
    const list = working.map((row) => (row.id === id ? { ...row, ...patch } : row));
    save(list);
  }

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold text-slate-900">Add your income</h2>
        {showTopTotal ? (
          <span className="text-[15px] font-bold tabular-nums text-slate-900">
            {formatIncomeAmount(combined)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {working.map((row) => {
          const extras = parseAdditionalItems(row);
          const annual = incomeRowAnnualTotal(row);
          const open = editingId === row.id;
          const isPayg = isPaygIncome(row.type);
          const isSelf = isSelfIncome(row.type);
          const isOther = isOtherIncome(row.type);
          const typeMissing = Boolean(showErrors && !row.type.trim());
          const specifyMissing = Boolean(showErrors && isOther && !(row.otherSpecify ?? "").trim());
          const amountMissing = Boolean(showErrors && !row.amount.trim());
          const title =
            isOther && (row.otherSpecify ?? "").trim()
              ? `Other — ${row.otherSpecify.trim()}`
              : isPayg
                ? paygLabel
                : row.type || "Income";
          return (
            <div
              key={row.id}
              className="rounded-2xl bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)] ring-1 ring-black/5"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setEditingId(open ? null : row.id)}
                  className="min-w-0 text-left text-[14px] font-bold text-slate-900"
                >
                  {title}
                  {row.employer || row.businessName
                    ? ` - ${row.employer || row.businessName}`
                    : ""}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-slate-500">
                    {formatMoney(annual)} /year
                  </span>
                  {!disabled ? (
                    <button
                      type="button"
                      onClick={() => setEditingId(open ? null : row.id)}
                      className="h-9 rounded-lg px-3 text-[12px] font-semibold text-[#5A32A3] hover:bg-violet-50"
                    >
                      {open ? "Done" : "Edit"}
                    </button>
                  ) : null}
                  {!disabled ? (
                    <button
                      type="button"
                      onClick={() => {
                        const next = working.filter((item) => item.id !== row.id);
                        save(next);
                        setEditingId(next[0]?.id ?? null);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-rose-600"
                      aria-label="Remove income"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              {open ? (
                <div className="space-y-4 border-t border-slate-100 px-4 py-4 sm:px-5">
                  <div data-invalid={typeMissing || undefined}>
                    <span className={cn("mb-1.5 block text-[13px] font-semibold", typeMissing ? "text-rose-700" : "text-slate-900")}>
                      Income type
                      <span className="text-rose-500"> *</span>
                    </span>
                    <div
                      role="radiogroup"
                      aria-label="Income type"
                      className={cn(
                        "grid gap-2 sm:grid-cols-3",
                        typeMissing && "rounded-xl p-1 ring-2 ring-rose-400",
                      )}
                    >
                      {INCOME_TYPES.map((type) => {
                        const active =
                          row.type === type || (type === "PAYG/Employee" && isPaygIncome(row.type));
                        return (
                          <button
                            key={type}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={disabled}
                            onClick={() =>
                              update(row.id, {
                                type,
                                otherSpecify: type === "Other" ? row.otherSpecify : "",
                              })
                            }
                            className={cn(
                              "flex h-11 items-center gap-2.5 rounded-lg px-3.5 text-left text-[13px] font-semibold transition-colors",
                              active
                                ? "bg-[#EDE4F7] text-[#5A32A3] ring-1 ring-[#5A32A3]/30"
                                : "bg-white text-slate-700 ring-1 ring-black/5 hover:bg-violet-50",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                                active ? "border-[#5A32A3]" : "border-slate-300",
                              )}
                            >
                              {active ? <span className="h-2 w-2 rounded-full bg-[#5A32A3]" /> : null}
                            </span>
                            {type === "PAYG/Employee" ? paygLabel : type}
                          </button>
                        );
                      })}
                    </div>
                    {typeMissing ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">Required</p> : null}
                  </div>

                  {isOther ? (
                    <Field label="Please specify" required invalid={specifyMissing}>
                      <input
                        value={row.otherSpecify ?? ""}
                        disabled={disabled}
                        onChange={(e) => update(row.id, { otherSpecify: e.target.value })}
                        placeholder="e.g. Dividends, Centrelink, casual work"
                        className={cn(inputClass, specifyMissing && "ring-2 ring-rose-400")}
                      />
                    </Field>
                  ) : null}

                  <div data-invalid={amountMissing || undefined}>
                    <span className={cn("mb-1.5 block text-[13px] font-semibold", amountMissing ? "text-rose-700" : "text-slate-900")}>
                      {isPayg ? "Salary (Before Tax)" : "Amount (Before Tax)"}
                    </span>
                    <div className="grid grid-cols-[1fr_150px] gap-2">
                      <CurrencyInput
                        value={row.amount}
                        disabled={disabled}
                        invalid={amountMissing}
                        onChange={(next) => update(row.id, { amount: next })}
                      />
                      <select
                        value={row.frequency}
                        disabled={disabled}
                        onChange={(e) => update(row.id, { frequency: e.target.value })}
                        className={inputClass}
                      >
                        {INCOME_FREQUENCIES.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    {isPayg ? (
                      <p className="mt-1.5 text-[12px] text-slate-500">
                        Exclude superannuation, bonus, commission, overtime & allowances
                      </p>
                    ) : null}
                    {amountMissing ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">Required</p> : null}
                  </div>

                  {isPayg ? (
                    <>
                      <AdditionalIncomeFields
                        items={extras}
                        disabled={disabled}
                        showErrors={Boolean(showErrors)}
                        showPeriodHint={showPeriodHint}
                        onChange={(next) =>
                          update(row.id, {
                            additionalItems: next,
                            additional: next.map((item) => item.type).join(", "),
                          })
                        }
                      />

                      <div className="space-y-4 border-t border-slate-100 pt-4">
                        <h3 className="text-[14px] font-bold text-slate-900">Employment details</h3>
                        <Field
                          label="Employer name"
                          invalid={Boolean(showErrors && !row.employer.trim())}
                        >
                          <input
                            value={row.employer}
                            disabled={disabled}
                            onChange={(e) => update(row.id, { employer: e.target.value })}
                            placeholder="Enter the field"
                            className={cn(inputClass, showErrors && !row.employer.trim() && "ring-2 ring-rose-400")}
                          />
                        </Field>
                        <div data-invalid={Boolean(showErrors && !row.workArrangement.trim()) || undefined}>
                          <span
                            className={cn(
                              "mb-1.5 block text-[13px] font-semibold",
                              showErrors && !row.workArrangement.trim() ? "text-rose-700" : "text-slate-900",
                            )}
                          >
                            Work arrangements
                            <span className="text-rose-500"> *</span>
                          </span>
                          <div
                            className={cn(
                              "flex flex-wrap gap-2 rounded-xl p-1",
                              showErrors && !row.workArrangement.trim() && "bg-rose-50 ring-2 ring-rose-400",
                            )}
                          >
                            {WORK_ARRANGEMENTS.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                disabled={disabled}
                                onClick={() => update(row.id, { workArrangement: opt })}
                                className={cn(
                                  "h-10 rounded-lg px-3 text-[12px] font-semibold",
                                  row.workArrangement === opt
                                    ? "bg-[#EDE4F7] text-[#5A32A3]"
                                    : "bg-white text-slate-600 ring-1 ring-black/5 hover:bg-violet-50",
                                )}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                        <Field
                          label="Occupation"
                          required
                          invalid={Boolean(showErrors && !row.occupation.trim())}
                        >
                          <input
                            value={row.occupation}
                            disabled={disabled}
                            onChange={(e) => update(row.id, { occupation: e.target.value })}
                            placeholder="Enter occupation"
                            className={cn(
                              inputClass,
                              showErrors && !row.occupation.trim() && "ring-2 ring-rose-400",
                            )}
                          />
                        </Field>
                        <DatePair
                          row={row}
                          disabled={disabled}
                          showErrors={Boolean(showErrors)}
                          onChange={(patch) => update(row.id, patch)}
                        />
                      </div>
                    </>
                  ) : null}

                  {isSelf ? (
                    <div className="space-y-4">
                      <Field
                        label="Name of business"
                        invalid={Boolean(showErrors && !row.businessName.trim())}
                      >
                        <input
                          value={row.businessName}
                          disabled={disabled}
                          onChange={(e) => update(row.id, { businessName: e.target.value })}
                          placeholder="Enter the field"
                          className={cn(inputClass, showErrors && !row.businessName.trim() && "ring-2 ring-rose-400")}
                        />
                      </Field>
                      <Field label="Structure of your business">
                        <select
                          value={row.businessStructure}
                          disabled={disabled}
                          onChange={(e) => update(row.id, { businessStructure: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">Select an option</option>
                          {BUSINESS_STRUCTURES.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="ABN">
                        <input
                          value={row.abn}
                          disabled={disabled}
                          onChange={(e) => update(row.id, { abn: e.target.value })}
                          placeholder="Enter ABN"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Occupation">
                        <input
                          value={row.occupation}
                          disabled={disabled}
                          onChange={(e) => update(row.id, { occupation: e.target.value })}
                          placeholder="Enter occupation"
                          className={inputClass}
                        />
                      </Field>
                      <DatePair
                        row={row}
                        disabled={disabled}
                        showErrors={Boolean(showErrors)}
                        onChange={(patch) => update(row.id, patch)}
                      />
                    </div>
                  ) : null}

                  {!disabled ? (
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="h-10 rounded-lg px-4 text-[13px] font-semibold text-slate-600 ring-1 ring-black/10 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="h-10 rounded-lg bg-[#2B2140] px-5 text-[13px] font-semibold text-white hover:bg-[#1f1830]"
                      >
                        Update
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!disabled ? (
        <button
          type="button"
          onClick={() => {
            const next = emptyIncome();
            save([...working, next]);
            setEditingId(next.id);
          }}
          className="mt-3 text-[13px] font-semibold text-[#5A32A3] hover:underline"
        >
          + Add another income
        </button>
      ) : null}

      {showCombinedTotal ? (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.04)] ring-1 ring-black/5">
          <span className="text-[13px] font-semibold text-slate-700">
            Annual combined total (Before Tax)
          </span>
          <span className="text-[15px] font-bold text-slate-900">{formatMoney(combined)}</span>
        </div>
      ) : null}
    </div>
  );
}

function AdditionalIncomeFields({
  items,
  disabled,
  showErrors,
  showPeriodHint = true,
  onChange,
}: {
  items: FactFindAdditionalIncome[];
  disabled: boolean;
  showErrors: boolean;
  showPeriodHint?: boolean;
  onChange: (next: FactFindAdditionalIncome[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function toggle(type: string) {
    if (items.some((item) => item.type === type)) {
      onChange(items.filter((item) => item.type !== type));
      return;
    }
    onChange([...items, { type, amount: "", frequency: "Per year" }]);
  }

  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-semibold text-slate-900">Additional income</span>
      {showPeriodHint ? (
        <p className="mb-2.5 text-[12px] text-slate-400">
          For each income selected, enter the average income received for the time period.
        </p>
      ) : null}
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-left ring-1 ring-black/5 focus:ring-2 focus:ring-[#5A32A3] disabled:bg-slate-50"
        >
          {items.length === 0 ? (
            <span className="text-[13px] text-slate-400">Select any that apply</span>
          ) : (
            items.map((item) => (
              <span
                key={item.type}
                className="inline-flex items-center gap-1 rounded-full bg-[#EDE4F7] px-2.5 py-1 text-[12px] font-semibold text-[#5A32A3]"
              >
                {item.type}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(item.type);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(item.type);
                    }
                  }}
                  className="text-[#5A32A3]/70 hover:text-rose-600"
                  aria-label={`Remove ${item.type}`}
                >
                  <X className="h-3 w-3" />
                </span>
              </span>
            ))
          )}
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
        </button>
        {open ? (
          <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 overflow-hidden rounded-xl bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
            {ADDITIONAL_INCOME.map((type) => {
              const selected = items.some((item) => item.type === type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggle(type)}
                  className={cn(
                    "block w-full px-3.5 py-2.5 text-left text-[13px]",
                    selected ? "bg-violet-50 font-semibold text-[#5A32A3]" : "text-slate-700 hover:bg-violet-50/70",
                  )}
                >
                  {type}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const missing = Boolean(showErrors && !item.amount.trim());
            return (
              <div key={item.type} data-invalid={missing || undefined}>
                <span className={cn("mb-1.5 block text-[13px] font-semibold", missing ? "text-rose-700" : "text-slate-900")}>
                  {item.type} income (Before Tax)
                </span>
                <div className="grid grid-cols-[1fr_150px] gap-2">
                  <CurrencyInput
                    value={item.amount}
                    disabled={disabled}
                    invalid={missing}
                    onChange={(next) =>
                      onChange(items.map((row) => (row.type === item.type ? { ...row, amount: next } : row)))
                    }
                  />
                  <select
                    value={item.frequency}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange(
                        items.map((row) =>
                          row.type === item.type ? { ...row, frequency: e.target.value } : row,
                        ),
                      )
                    }
                    className={inputClass}
                  >
                    {INCOME_FREQUENCIES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                {missing ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">Required</p> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
  invalid,
  required,
}: {
  label: string;
  children: React.ReactNode;
  invalid?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block" data-invalid={invalid || undefined}>
      <span className={cn("mb-1.5 block text-[13px] font-semibold", invalid ? "text-rose-700" : "text-slate-900")}>
        {label}
        {required || invalid ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
      {invalid ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">Required</p> : null}
    </label>
  );
}

function DatePair({
  row,
  disabled,
  showErrors,
  onChange,
}: {
  row: FactFindIncome;
  disabled: boolean;
  showErrors: boolean;
  onChange: (patch: Partial<FactFindIncome>) => void;
}) {
  const startMissing = showErrors && !row.startDate.trim();
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <Field label="Date started" invalid={startMissing}>
        <input
          type="date"
          value={row.startDate}
          disabled={disabled}
          onChange={(e) => onChange({ startDate: e.target.value })}
          className={cn(inputClass, startMissing && "ring-2 ring-rose-400")}
        />
      </Field>
      <label className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-slate-600">
        <input
          type="checkbox"
          checked={row.current}
          disabled={disabled}
          onChange={(e) =>
            onChange({ current: e.target.checked, endDate: e.target.checked ? "" : row.endDate })
          }
          className="h-4 w-4 accent-[#5A32A3]"
        />
        I currently work here
      </label>
      {!row.current ? (
        <Field label="Date ended">
          <input
            type="date"
            value={row.endDate}
            disabled={disabled}
            onChange={(e) => onChange({ endDate: e.target.value })}
            className={inputClass}
          />
        </Field>
      ) : null}
    </div>
  );
}
