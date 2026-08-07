"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { DealCurrency } from "@/lib/deals/types";

export interface EditDealFormValues {
  name: string;
  account: string;
  contact: string;
  value: string;
  currency: DealCurrency;
  probability: number;
  owner: string;
  closeDate: string;
  stageTitle: string;
}

export interface EditDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string; // e.g. "Edit Deal: Atlas CRM Rollout"
  initialValues: EditDealFormValues;
  stageOptions: readonly string[];
  currencyOptions: readonly DealCurrency[];
  ownerOptions: readonly string[];
  onSave: (values: EditDealFormValues) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-600">
      {children}
    </h3>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

export function EditDealModal({
  isOpen,
  onClose,
  title,
  initialValues,
  stageOptions,
  currencyOptions,
  ownerOptions,
  onSave,
}: EditDealModalProps) {
  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    if (isOpen) setValues(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function update<K extends keyof EditDealFormValues>(
    key: K,
    value: EditDealFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-deal-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2
            id="edit-deal-title"
            className="text-sm font-semibold text-slate-900"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            <SectionLabel>Deal Information</SectionLabel>
            <Field
              label="Deal Name"
              value={values.name}
              onChange={(v) => update("name", v)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Account"
                value={values.account}
                onChange={(v) => update("account", v)}
              />
              <Field
                label="Primary Contact"
                value={values.contact}
                onChange={(v) => update("contact", v)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <SectionLabel>Deal Value</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Amount"
                value={values.value}
                onChange={(v) => update("value", v)}
              />
              <SelectField
                label="Currency"
                value={values.currency}
                onChange={(v) => update("currency", v as DealCurrency)}
                options={currencyOptions}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Probability (%)"
                type="number"
                value={String(values.probability)}
                onChange={(v) => update("probability", Number(v) || 0)}
              />
              <Field
                label="Expected Close Date"
                value={values.closeDate}
                onChange={(v) => update("closeDate", v)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <SectionLabel>Ownership & Stage</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Owner"
                value={values.owner}
                onChange={(v) => update("owner", v)}
                options={ownerOptions}
              />
              <SelectField
                label="Stage"
                value={values.stageTitle}
                onChange={(v) => update("stageTitle", v)}
                options={stageOptions}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">
          <button
            onClick={onClose}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(values)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
