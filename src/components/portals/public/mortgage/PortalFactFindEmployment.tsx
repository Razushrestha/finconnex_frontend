"use client";

import { useEffect, useRef, useState } from "react";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import {
  BUSINESS_STRUCTURES,
  EMPLOYMENT_TYPES,
  WORK_ARRANGEMENTS,
  currentEmploymentGapMessage,
  emptyEmployment,
  employmentIncomeKey,
  employmentMonthsCovered,
  isEmployeeType,
  isEmploymentRowComplete,
  isPaygIncome,
  isSelfEmploymentType,
  isSituationEmployment,
  parseIncomes,
  parseStringIds,
  resolveEmployments,
  type FactFindEmployment,
  type FactFindIncome,
} from "@/lib/portals/mortgage";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-lg bg-white px-3 text-[13px] text-slate-800 outline-none ring-1 ring-black/5 placeholder:text-slate-400 focus:ring-2 focus:ring-[#5A32A3] disabled:bg-slate-50";

export function PortalFactFindEmployment({
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
  const answers = {
    employmentType: valueOf("employmentType"),
    employer: valueOf("employer"),
    occupation: valueOf("occupation"),
    startDate: valueOf("startDate"),
    employmentsJson: valueOf("employmentsJson"),
    incomesJson: valueOf("incomesJson"),
    droppedEmploymentIncomeIds: valueOf("droppedEmploymentIncomeIds"),
  };
  const jobs = resolveEmployments(answers);
  const covered = employmentMonthsCovered(jobs);
  const gapMessage = currentEmploymentGapMessage(jobs);
  const coveredEnough = covered != null && covered >= 36;
  const [editingId, setEditingId] = useState<string | null>(null);

  function persist(next: FactFindEmployment[]) {
    onChange("employmentsJson", JSON.stringify(next));
    const current = next.find((job) => job.current) ?? next[0];
    if (current) {
      if (current.type) onChange("employmentType", current.type);
      onChange("employer", current.employer);
      onChange("occupation", current.occupation);
      onChange("startDate", current.startDate);
    }
    const incomes = parseIncomes(valueOf("incomesJson"));
    if (incomes.length === 0) return;
    const patched = incomes.map((row) => {
      const job = next.find((item) => item.incomeId === row.id || item.id === `emp-${row.id}`);
      return job ? applyJobToIncome(row, job) : row;
    });
    onChange("incomesJson", JSON.stringify(patched));
  }

  useEffect(() => {
    if (valueOf("employmentsJson").trim()) return;
    const initial = resolveEmployments({
      employmentType: valueOf("employmentType"),
      employer: valueOf("employer"),
      occupation: valueOf("occupation"),
      startDate: valueOf("startDate"),
      employmentsJson: valueOf("employmentsJson"),
      incomesJson: valueOf("incomesJson"),
    });
    if (initial.length > 0) persist(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateJob(id: string, patch: Partial<FactFindEmployment>) {
    persist(jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  }

  function addJob() {
    const next = emptyEmployment(jobs.length === 0);
    persist([...jobs, next]);
    setEditingId(next.id);
  }

  function removeJob(job: FactFindEmployment) {
    const key = employmentIncomeKey(job);
    if (key) {
      const dropped = parseStringIds(valueOf("droppedEmploymentIncomeIds"));
      if (!dropped.includes(key)) {
        onChange("droppedEmploymentIncomeIds", JSON.stringify([...dropped, key]));
      }
    }
    persist(jobs.filter((item) => item.id !== job.id));
    setEditingId(null);
  }

  return (
    <div className="mt-6 space-y-3">
      {jobs.map((job) => {
        const open = editingId === job.id;
        if (open) {
          return (
            <EmploymentForm
              key={job.id}
              job={job}
              disabled={disabled}
              showErrors={Boolean(showErrors)}
              onChange={(patch) => updateJob(job.id, patch)}
              onCancel={() => {
                if (!job.employer && !job.startDate && !job.type) {
                  persist(jobs.filter((item) => item.id !== job.id));
                }
                setEditingId(null);
              }}
              onSave={() => setEditingId(null)}
              onRemove={() => removeJob(job)}
            />
          );
        }
        return (
          <div
            key={job.id}
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_8px_28px_rgba(15,23,42,0.05)] ring-1 ring-black/5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4EDE4] text-[#8B5E34]">
              <Briefcase className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-bold text-slate-900">
                {jobTitle(job)}
              </div>
            </div>
            <div className="shrink-0 text-[13px] font-semibold text-slate-500">
              {formatRange(job)}
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setEditingId(job.id)}
              className="h-9 rounded-lg px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-slate-50"
            >
              Edit
            </button>
            {!disabled ? (
              <button
                type="button"
                onClick={() => removeJob(job)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-rose-600"
                aria-label="Delete employment"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        );
      })}

      {editingId == null && !disabled ? (
        <button
          type="button"
          onClick={addJob}
          className="flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#5A32A3]/35 text-[13px] font-semibold text-[#5A32A3] hover:bg-violet-50"
        >
          <Plus className="h-4 w-4" />
          Add employment
        </button>
      ) : null}

      {gapMessage ? (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
          {gapMessage}
        </div>
      ) : coveredEnough ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-800">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] text-white">
            ✓
          </span>
          3 years employment history provided. Proceed to the next step.
        </div>
      ) : null}
    </div>
  );
}

function EmploymentForm({
  job,
  disabled,
  showErrors,
  onChange,
  onCancel,
  onSave,
  onRemove,
}: {
  job: FactFindEmployment;
  disabled: boolean;
  showErrors: boolean;
  onChange: (patch: Partial<FactFindEmployment>) => void;
  onCancel: () => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const [attempted, setAttempted] = useState(false);
  const complete = isEmploymentRowComplete(job);
  const incomplete = (showErrors || attempted) && !complete;
  const employee = isEmployeeType(job.type);
  const self = isSelfEmploymentType(job.type);
  const situation = isSituationEmployment(job.type);
  const arrangementMissing = incomplete && employee && !job.workArrangement.trim();
  const occupationMissing = incomplete && (employee || self) && !job.occupation.trim();

  return (
    <section
      className="rounded-2xl bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)] ring-1 ring-black/5"
      data-invalid={incomplete || undefined}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-slate-900">Add employment details</h3>
        {!disabled ? (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-rose-600"
            aria-label="Remove employment"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-slate-900">Employment type</span>
          <select
            value={job.type}
            disabled={disabled}
            onChange={(e) => onChange({ type: e.target.value })}
            className={cn(inputClass, incomplete && !job.type && "ring-2 ring-rose-400")}
          >
            <option value="">Select an option</option>
            {EMPLOYMENT_TYPES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        {employee ? (
          <>
            <p className="text-[13px] font-bold text-slate-900">Employment details</p>
            <Field label="Employer name" required invalid={incomplete && !job.employer.trim()}>
              <input
                value={job.employer}
                disabled={disabled}
                placeholder="Enter the field"
                onChange={(e) => onChange({ employer: e.target.value })}
                className={cn(inputClass, incomplete && !job.employer.trim() && "ring-2 ring-rose-400")}
              />
            </Field>
            <div data-invalid={arrangementMissing || undefined}>
              <span
                className={cn(
                  "mb-1.5 block text-[13px] font-semibold",
                  arrangementMissing ? "text-rose-700" : "text-slate-900",
                )}
              >
                Work arrangements
                <span className="text-rose-500"> *</span>
              </span>
              <div
                className={cn(
                  "flex flex-wrap gap-2 rounded-xl p-1",
                  arrangementMissing && "bg-rose-50 ring-2 ring-rose-400",
                )}
              >
                {WORK_ARRANGEMENTS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ workArrangement: opt })}
                    className={cn(
                      "h-10 rounded-lg px-3 text-[12px] font-semibold",
                      job.workArrangement === opt
                        ? "bg-[#EDE4F7] text-[#5A32A3]"
                        : "bg-white text-slate-600 ring-1 ring-black/5 hover:bg-violet-50",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {arrangementMissing ? (
                <p className="mt-1.5 text-[12px] font-medium text-rose-600">Required</p>
              ) : null}
            </div>
            <Field label="Occupation" required invalid={occupationMissing}>
              <input
                value={job.occupation}
                disabled={disabled}
                placeholder="Enter occupation"
                onChange={(e) => onChange({ occupation: e.target.value })}
                className={cn(inputClass, occupationMissing && "ring-2 ring-rose-400")}
              />
            </Field>
          </>
        ) : null}

        {self ? (
          <>
            <Field label="Name of business" invalid={incomplete && !job.employer.trim()}>
              <input
                value={job.employer}
                disabled={disabled}
                placeholder="Enter the field"
                onChange={(e) => onChange({ employer: e.target.value })}
                className={cn(inputClass, incomplete && !job.employer.trim() && "ring-2 ring-rose-400")}
              />
            </Field>
            <Field label="Structure of your business">
              <select
                value={job.businessStructure}
                disabled={disabled}
                onChange={(e) => onChange({ businessStructure: e.target.value })}
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
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
                ABN
                <InfoTip text="Australian Business Number. Add it if you have one so your broker can verify the business." />
              </span>
              <input
                value={job.abn}
                disabled={disabled}
                placeholder="Enter ABN"
                onChange={(e) => onChange({ abn: e.target.value })}
                className={inputClass}
              />
            </label>
            <Field label="Occupation" required invalid={occupationMissing}>
              <input
                value={job.occupation}
                disabled={disabled}
                placeholder="Enter occupation"
                onChange={(e) => onChange({ occupation: e.target.value })}
                className={cn(inputClass, occupationMissing && "ring-2 ring-rose-400")}
              />
            </Field>
          </>
        ) : null}

        {job.type ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date started" required invalid={incomplete && !job.startDate.trim()}>
              <input
                type="date"
                value={job.startDate}
                disabled={disabled}
                onChange={(e) => onChange({ startDate: e.target.value })}
                className={cn(inputClass, incomplete && !job.startDate.trim() && "ring-2 ring-rose-400")}
              />
            </Field>
            <Field label="Date ended" required={!job.current} invalid={incomplete && !job.current && !job.endDate.trim()}>
              <input
                type="date"
                value={job.current ? "" : job.endDate}
                disabled={disabled || job.current}
                onChange={(e) => onChange({ endDate: e.target.value, current: false })}
                className={cn(
                  inputClass,
                  incomplete && !job.current && !job.endDate.trim() && "ring-2 ring-rose-400",
                )}
              />
            </Field>
          </div>
        ) : null}

        {job.type ? (
          <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={job.current}
              disabled={disabled}
              onChange={(e) =>
                onChange({ current: e.target.checked, endDate: e.target.checked ? "" : job.endDate })
              }
              className="h-4 w-4 accent-[#5A32A3]"
            />
            {situation ? "This is my current situation" : "I currently work here"}
          </label>
        ) : null}

        {!disabled ? (
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-lg px-4 text-[13px] font-semibold text-slate-600 ring-1 ring-black/10 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!complete) {
                  setAttempted(true);
                  return;
                }
                onSave();
              }}
              className={cn(
                "h-10 rounded-lg bg-[#2B2140] px-5 text-[13px] font-semibold text-white hover:bg-[#1f1830]",
                !complete && "cursor-not-allowed opacity-40 hover:bg-[#2B2140]",
              )}
            >
              Update
            </button>
          </div>
        ) : null}
      </div>
    </section>
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
    <label className="block">
      <span className={cn("mb-1.5 block text-[13px] font-semibold", invalid ? "text-rose-700" : "text-slate-900")}>
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-bold",
          open ? "bg-[#5A32A3] text-white" : "bg-slate-200 text-slate-600",
        )}
        aria-label="About ABN"
      >
        ?
      </button>
      {open ? (
        <span className="absolute top-[calc(100%+8px)] left-0 z-20 w-64 rounded-xl bg-slate-900 px-3 py-2 text-[12px] font-medium leading-relaxed text-white">
          {text}
        </span>
      ) : null}
    </span>
  );
}

function jobTitle(job: FactFindEmployment) {
  if (job.employer.trim()) return job.employer;
  if (isSituationEmployment(job.type)) return job.type || "Employment";
  return job.type || "Employment";
}

function formatRange(job: FactFindEmployment) {
  const start = formatJobDate(job.startDate);
  if (!start) return "";
  return `${start} - ${job.current || !job.endDate ? "Now" : formatJobDate(job.endDate)}`;
}

function formatJobDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function applyJobToIncome(row: FactFindIncome, job: FactFindEmployment): FactFindIncome {
  if (isSelfEmploymentType(job.type) || row.type === "Self employed") {
    return {
      ...row,
      businessName: job.employer,
      occupation: job.occupation,
      startDate: job.startDate,
      endDate: job.endDate,
      current: job.current,
      businessStructure: job.businessStructure || row.businessStructure,
      abn: job.abn || row.abn,
    };
  }
  if (isEmployeeType(job.type) || isEmployeeType(row.type) || isPaygIncome(row.type)) {
    return {
      ...row,
      employer: job.employer,
      occupation: job.occupation,
      workArrangement: job.workArrangement,
      startDate: job.startDate,
      endDate: job.endDate,
      current: job.current,
    };
  }
  return row;
}
