"use client";

import { useState } from "react";
import {
  createContact,
  findContactByEmail,
  updateContact,
} from "@/lib/contacts/store";
import type { ContactCardData } from "@/lib/contacts/types";
import { getRulesActor } from "@/lib/rules/actor";
import { splitNameParts } from "@/components/sales/leads/LeadContactPicker";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium text-slate-600">
        {label}
        {required ? (
          <span className="ml-0.5 text-rose-500" aria-hidden>
            *
          </span>
        ) : null}
      </span>
      <div
        className={cn(
          "rounded-lg border bg-white",
          error
            ? "border-rose-300"
            : "border-slate-200 focus-within:border-violet-500",
        )}
      >
        {children}
      </div>
    </label>
  );
}

const inputClass =
  "h-9 w-full rounded-lg bg-transparent px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400";

export function QuickAddContactForm({
  initialQuery = "",
  onCancel,
  onCreated,
}: {
  initialQuery?: string;
  onCancel: () => void;
  onCreated: (contact: ContactCardData) => void;
}) {
  const seed = initialQuery.trim();
  const fromEmail = EMAIL_RE.test(seed);
  const parts = fromEmail ? { firstName: "", middleName: "", lastName: "" } : splitNameParts(seed);
  const [firstName, setFirstName] = useState(parts.firstName);
  const [middleName, setMiddleName] = useState(parts.middleName);
  const [lastName, setLastName] = useState(parts.lastName);
  const [email, setEmail] = useState(fromEmail ? seed : "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    firstName: false,
    lastName: false,
    email: false,
  });

  async function save() {
    const first = firstName.trim();
    const middle = middleName.trim();
    const last = lastName.trim();
    const mail = email.trim();
    const nextErrors = {
      firstName: !first,
      lastName: !last,
      email: !mail || !EMAIL_RE.test(mail),
    };
    setFieldErrors(nextErrors);
    if (nextErrors.firstName || nextErrors.lastName || nextErrors.email) {
      setError("First name, last name and email are required");
      return;
    }
    const existing = findContactByEmail(mail);
    if (existing) {
      onCreated(existing);
      return;
    }
    const name = [first, middle, last].filter(Boolean).join(" ");
    // `createContact` is async: without the await, `created` is a Promise, so
    // `created.name` is undefined, the rename branch is always taken, and
    // `updateContact` is called with an undefined id.
    const created = await createContact({
      firstName: first,
      lastName: last,
      email: mail,
      phone: phone.trim() || undefined,
      status: "Active",
      owner: getRulesActor().name || "John Smith",
      source: "Other",
    });
    const saved =
      created.name !== name
        ? (updateContact(created.id, { name }) ?? created)
        : created;
    onCreated(saved);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Field label="First name" required error={fieldErrors.firstName}>
          <input
            autoFocus
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Alex"
            className={inputClass}
          />
        </Field>
        <Field label="Middle name">
          <input
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </Field>
        <Field label="Last name" required error={fieldErrors.lastName}>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Morgan"
            className={inputClass}
          />
        </Field>
        <Field label="Email address" required error={fieldErrors.email}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@email.com"
            className={inputClass}
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </Field>
      </div>
      {error ? (
        <p className="mt-1.5 text-[11px] font-medium text-rose-500">{error}</p>
      ) : null}
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 rounded-md px-3 text-[12px] font-medium text-slate-500 hover:bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void save()}
          className="h-8 rounded-md bg-[#5A32A3] px-3 text-[12px] font-semibold text-white hover:bg-[#4a2888]"
        >
          Save contact
        </button>
      </div>
    </div>
  );
}
