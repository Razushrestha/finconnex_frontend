"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  dependantCount,
  factFindFieldById,
  type FactFindField,
} from "@/lib/portals/mortgage";
import { cn } from "@/lib/utils";

const fieldShell =
  "h-12 w-full rounded-lg bg-white px-3.5 text-[14px] text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.07)] outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-[#5A32A3] disabled:bg-slate-50";

export function LeadApplicantDetailsFields({
  valueOf,
  disabled,
  onChange,
  email,
  onEmailChange,
}: {
  valueOf: (id: string) => string;
  disabled: boolean;
  onChange: (id: string, value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
}) {
  const [cardHelp, setCardHelp] = useState(false);
  const count = dependantCount({ dependants: valueOf("dependants") });
  const titleField = factFindFieldById("title")!;
  const genderField = factFindFieldById("gender")!;
  const maritalField = factFindFieldById("marital")!;
  const dependantsField = factFindFieldById("dependants")!;
  const residencyOptions = factFindFieldById("residency")?.options ?? [];

  return (
    <div className="space-y-6">
      <ChoiceField
        field={titleField}
        value={valueOf("title")}
        disabled={disabled}
        onChange={(next) => onChange("title", next)}
      />
      {valueOf("title") === "Other" ? (
        <TextField
          label="Your title"
          value={valueOf("titleOther")}
          disabled={disabled}
          onChange={(next) => onChange("titleOther", next)}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="First name"
          required
          value={valueOf("firstName")}
          disabled={disabled}
          onChange={(next) => onChange("firstName", next)}
        />
        <TextField
          label="Middle name"
          value={valueOf("middleName")}
          disabled={disabled}
          onChange={(next) => onChange("middleName", next)}
        />
        <TextField
          label="Last name"
          required
          value={valueOf("lastName")}
          disabled={disabled}
          onChange={(next) => onChange("lastName", next)}
        />
      </div>

      <TextField
        label="Preferred name"
        optional
        value={valueOf("preferredName")}
        disabled={disabled}
        onChange={(next) => onChange("preferredName", next)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Email address"
          required
          type="email"
          value={email}
          disabled={disabled}
          placeholder="name@email.com"
          onChange={onEmailChange}
        />
        <PhoneField
          label="Phone number"
          required
          value={valueOf("mobile")}
          disabled={disabled}
          onChange={(next) => onChange("mobile", next)}
        />
      </div>

      <ChoiceField
        field={genderField}
        value={valueOf("gender")}
        disabled={disabled}
        onChange={(next) => onChange("gender", next)}
      />
      <SelectField
        field={maritalField}
        value={valueOf("marital")}
        disabled={disabled}
        onChange={(next) => onChange("marital", next)}
      />
      <SelectField
        field={dependantsField}
        value={valueOf("dependants")}
        disabled={disabled}
        onChange={(next) => onChange("dependants", next)}
      />
      {Array.from({ length: count }, (_, i) => (
        <label key={i} className="block">
          <span className="mb-2 block text-[13px] font-semibold text-slate-900">
            Dependant {i + 1}
          </span>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={120}
              inputMode="numeric"
              value={valueOf(`dependantAge${i + 1}`)}
              disabled={disabled}
              onChange={(e) => onChange(`dependantAge${i + 1}`, e.target.value)}
              placeholder="Enter age"
              className={cn(fieldShell, "pr-24")}
            />
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[13px] text-slate-400">
              years old
            </span>
          </div>
        </label>
      ))}

      <DateField
        label="Date of birth"
        value={valueOf("dob")}
        disabled={disabled}
        onChange={(next) => onChange("dob", next)}
      />

      <div>
        <span className="mb-2 block text-[13px] font-semibold text-slate-900">
          Legal name has ever changed?
        </span>
        <div className="flex gap-2">
          {["Yes", "No"].map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange("nameChanged", opt)}
              className={cn(
                "h-11 min-w-[72px] rounded-lg px-5 text-[13px] font-semibold",
                valueOf("nameChanged") === opt
                  ? "bg-[#EDE4F7] text-[#5A32A3]"
                  : "bg-white text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.07)] ring-1 ring-black/5",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      {valueOf("nameChanged") === "Yes" ? (
        <TextField
          label="Previous legal name"
          value={valueOf("previousLegalName")}
          disabled={disabled}
          onChange={(next) => onChange("previousLegalName", next)}
        />
      ) : null}

      <div>
        <span className="mb-2 block text-[13px] font-semibold text-slate-900">
          Residency status
        </span>
        <div className="grid grid-cols-4 gap-2 rounded-xl p-1">
          {residencyOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange("residency", opt);
                if (opt !== "Temporary resident") onChange("visaType", "");
              }}
              className={cn(
                "h-11 rounded-lg px-2 text-center text-[12px] font-semibold leading-tight sm:text-[13px]",
                valueOf("residency") === opt
                  ? "bg-[#EDE4F7] text-[#5A32A3]"
                  : "bg-white text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.07)] ring-1 ring-black/5",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        {valueOf("residency") === "Temporary resident" ? (
          <div className="mt-3">
            <TextField
              label="Visa type"
              value={valueOf("visaType")}
              disabled={disabled}
              placeholder="e.g. 482, 500, 485"
              onChange={(next) => onChange("visaType", next)}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-6 border-t border-slate-100 pt-6">
        <div className="text-[15px] font-bold text-slate-900">
          Australian Driver Licence
        </div>
        <FancySelect
          label="State issued in"
          value={valueOf("licenceState")}
          options={factFindFieldById("licenceState")?.options ?? []}
          disabled={disabled}
          placeholder="Select a state"
          onChange={(next) => onChange("licenceState", next)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Driver licence number"
            value={valueOf("licenceNumber")}
            disabled={disabled}
            placeholder="e.g. 102 553 856"
            onChange={(next) => onChange("licenceNumber", next)}
          />
          <div>
            <TextField
              label="Card number"
              value={valueOf("licenceCardNumber")}
              disabled={disabled}
              placeholder="e.g. 665B 55CE 77"
              onChange={(next) => onChange("licenceCardNumber", next)}
            />
            <button
              type="button"
              onClick={() => setCardHelp((value) => !value)}
              className="mt-1.5 text-[12px] font-semibold text-[#5A32A3] hover:underline"
            >
              Where can I find this?
            </button>
            {cardHelp ? (
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                The card number is usually on the front or back of your licence, separate from
                the driver licence number.
              </p>
            ) : null}
          </div>
        </div>
        <DateField
          label="Expiry date"
          value={valueOf("licenceExpiry")}
          disabled={disabled}
          onChange={(next) => onChange("licenceExpiry", next)}
        />
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  disabled,
  onChange,
  required,
  optional,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  required?: boolean;
  optional?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold text-slate-900">
        {label}
        {optional ? " (optional)" : null}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={fieldShell}
      />
    </label>
  );
}

function PhoneField({
  label,
  value,
  disabled,
  onChange,
  required,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold text-slate-900">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <div className="flex overflow-hidden rounded-lg bg-white shadow-[0_2px_10px_rgba(15,23,42,0.07)] ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#5A32A3]">
        <span className="flex items-center gap-1.5 border-r border-slate-100 bg-white px-3 text-[13px] font-semibold text-slate-700">
          <span aria-hidden>🇦🇺</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </span>
        <input
          type="tel"
          inputMode="tel"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[14px] outline-none disabled:bg-slate-50"
          placeholder="+61 412 345 678"
        />
      </div>
    </label>
  );
}

function ChoiceField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FactFindField;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-[13px] font-semibold text-slate-900">
        {field.label}
      </span>
      <div className="flex flex-wrap gap-2.5">
        {field.options?.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-lg px-5 text-[13px] font-semibold",
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

function SelectField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FactFindField;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold text-slate-900">
        {field.label}
      </span>
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldShell, "fc-select-caret appearance-none pr-10")}
        >
          {field.id === "dependants" ? null : <option value="">Select…</option>}
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {field.id === "dependants" && opt === "0" ? "None" : opt}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

function DateField({
  label,
  value,
  disabled,
  onChange,
  required,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold text-slate-900">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={fieldShell}
      />
    </label>
  );
}

function FancySelect({
  label,
  value,
  options,
  disabled,
  onChange,
  placeholder = "Select…",
  required,
}: {
  label: string;
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <span className="mb-2 block text-[13px] font-semibold text-slate-900">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-lg bg-white px-3.5 text-left text-[14px] text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.07)] outline-none ring-1 ring-black/5",
          open && "ring-2 ring-[#5A32A3]",
        )}
      >
        <span className={value ? "" : "text-slate-400"}>{value || placeholder}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-50 text-[#5A32A3]">
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open ? (
        <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 overflow-hidden rounded-xl bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-3.5 py-2.5 text-left text-[13px]",
                opt === value
                  ? "bg-violet-50 text-slate-900"
                  : "text-slate-700 hover:bg-violet-50/70",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
