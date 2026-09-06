"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, User, X } from "lucide-react";
import {
  createContact,
  findContactByEmail,
  findContactById,
  listAllContacts,
  updateContact,
} from "@/lib/contacts/store";
import type { ContactCardData, ContactSource } from "@/lib/contacts/types";
import { cn } from "@/lib/utils";
import {
  elevatedInputClass,
  InputShell,
} from "@/components/sales/CreateEntityForm";

export type LinkedLeadContact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  firstName: string;
  middleName: string;
  lastName: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function splitNameParts(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", middleName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: "", lastName: "" };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], middleName: "", lastName: parts[1] };
  }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1] ?? "",
  };
}

function displayName(
  firstName: string,
  middleName: string,
  lastName: string,
) {
  return [firstName, middleName, lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

function toLinked(contact: ContactCardData): LinkedLeadContact {
  const parts = splitNameParts(contact.name);
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    firstName: parts.firstName,
    middleName: parts.middleName,
    lastName: parts.lastName,
  };
}

function toContactSource(leadSource: string): ContactSource {
  switch (leadSource) {
    case "Website":
      return "Website";
    case "Google Ads":
    case "Facebook":
    case "Instagram":
    case "TikTok":
    case "Google":
      return "Social Media";
    case "Existing Client Referral":
    case "Referral Partner":
    case "Employee Referral":
      return "Referral";
    case "Phone":
      return "Cold Call";
    default:
      return "Other";
  }
}

function contactSearchPlaceholder(count: number) {
  if (count === 0) return "Add primary contact";
  if (count === 1) return "Add secondary contact";
  return "Add another contact";
}

function roleLabel(index: number, total: number) {
  if (index === 0) return "Primary";
  if (total <= 2) return "Secondary";
  return `Secondary ${index}`;
}

function AddField({
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
      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
        {label}
        {required ? (
          <span className="ml-0.5 text-rose-500" aria-hidden>
            *
          </span>
        ) : null}
      </span>
      <div
        className={cn(
          "rounded-lg border bg-white dark:bg-zinc-950",
          error
            ? "border-rose-300"
            : "border-slate-200 focus-within:border-violet-500 dark:border-zinc-700",
        )}
      >
        {children}
      </div>
    </label>
  );
}

const addInputClass =
  "h-9 w-full rounded-lg bg-transparent px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100";

export function LeadContactPicker({
  contacts,
  owner,
  leadSource,
  error,
  onChange,
}: {
  contacts: LinkedLeadContact[];
  owner: string;
  leadSource: string;
  error?: boolean;
  onChange: (contacts: LinkedLeadContact[]) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [addFirstName, setAddFirstName] = useState("");
  const [addMiddleName, setAddMiddleName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addError, setAddError] = useState("");
  const [addFieldErrors, setAddFieldErrors] = useState<{
    firstName?: boolean;
    lastName?: boolean;
    email?: boolean;
  }>({});

  const selectedIds = useMemo(
    () => new Set(contacts.map((contact) => contact.id)),
    [contacts],
  );
  const directory = useMemo(() => listAllContacts(), [tick, open]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...directory]
      .filter((contact) => !selectedIds.has(contact.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter((contact) =>
      [contact.name, contact.email, contact.phone, contact.company].some(
        (value) => value?.toLowerCase().includes(q),
      ),
    );
  }, [directory, query, selectedIds]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  function resetAddForm(prefill = "") {
    const parts = splitNameParts(prefill);
    setAddFirstName(parts.firstName);
    setAddMiddleName(parts.middleName);
    setAddLastName(parts.lastName);
    setAddEmail("");
    setAddPhone("");
    setAddError("");
    setAddFieldErrors({});
  }

  function startAdd(prefill = "") {
    setAdding(true);
    setOpen(false);
    resetAddForm(prefill);
  }

  function pick(contact: ContactCardData) {
    if (selectedIds.has(contact.id)) {
      setQuery("");
      setOpen(false);
      setAdding(false);
      return;
    }
    onChange([...contacts, toLinked(contact)]);
    setQuery("");
    setOpen(false);
    setAdding(false);
  }

  function removeAt(index: number) {
    onChange(contacts.filter((_, i) => i !== index));
  }

  function makePrimary(index: number) {
    if (index <= 0) return;
    const next = [...contacts];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.unshift(item);
    onChange(next);
  }

  function saveNewContact() {
    const firstName = addFirstName.trim();
    const middleName = addMiddleName.trim();
    const lastName = addLastName.trim();
    const email = addEmail.trim();
    const fieldErrors = {
      firstName: !firstName,
      lastName: !lastName,
      email: !email || !isValidEmail(email),
    };
    setAddFieldErrors(fieldErrors);
    if (fieldErrors.firstName || fieldErrors.lastName) {
      setAddError("First name, last name and email are required");
      return;
    }
    if (!email) {
      setAddError("Email address is required");
      return;
    }
    if (!isValidEmail(email)) {
      setAddError("Enter a valid email address");
      return;
    }
    const existing = findContactByEmail(email);
    if (existing) {
      pick(existing);
      setTick((n) => n + 1);
      return;
    }
    const name = displayName(firstName, middleName, lastName);
    const created = createContact({
      firstName,
      lastName,
      email,
      phone: addPhone.trim(),
      status: "Active",
      owner: owner.trim() || "You",
      source: toContactSource(leadSource),
    });
    const saved =
      created.name !== name
        ? (updateContact(created.id, { name }) ?? created)
        : created;
    const linked: LinkedLeadContact = {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      phone: saved.phone,
      firstName,
      middleName,
      lastName,
    };
    onChange([...contacts, linked]);
    setTick((n) => n + 1);
    setQuery("");
    setOpen(false);
    setAdding(false);
  }

  const nextRole = contacts.length === 0 ? "Primary" : "Secondary";

  return (
    <div className="space-y-2" ref={wrapRef}>
      {contacts.length > 0 ? (
        <ul className="space-y-1.5">
          {contacts.map((contact, index) => (
            <li
              key={contact.id}
              className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      index === 0
                        ? "bg-[#5A32A3]/12 text-[#5A32A3]"
                        : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-300",
                    )}
                  >
                    {roleLabel(index, contacts.length)}
                  </span>
                  <span className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
                    {contact.name}
                  </span>
                </div>
                <p className="truncate text-[11px] text-slate-400">
                  {[contact.email, contact.phone].filter(Boolean).join(" · ")}
                </p>
                {index > 0 ? (
                  <button
                    type="button"
                    onClick={() => makePrimary(index)}
                    className="mt-0.5 text-[11px] font-medium text-[#5A32A3] hover:underline"
                  >
                    Make primary
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                aria-label={`Remove ${contact.name}`}
                onClick={() => removeAt(index)}
                className="mt-0.5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!adding ? (
        <div className="relative min-w-0">
          <InputShell icon={User} error={error && contacts.length === 0}>
            <input
              ref={searchRef}
              className={elevatedInputClass(true)}
              value={query}
              onFocus={() => {
                setOpen(true);
              }}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              placeholder={contactSearchPlaceholder(contacts.length)}
            />
          </InputShell>
          {open ? (
            <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-full overflow-hidden rounded-xl bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-black/5 dark:bg-zinc-950">
              <div className="px-2 pt-2 pb-1">
                <label className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-50 px-2 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#5A32A3] dark:bg-zinc-900">
                  <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search contacts"
                    className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
                  />
                </label>
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {matches.length === 0 ? (
                  <p className="px-3 py-3 text-[12px] text-slate-400">
                    No matching contacts
                  </p>
                ) : (
                  matches.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        pick(contact);
                      }}
                      className="flex w-full flex-col px-3 py-2 text-left hover:bg-violet-50 dark:hover:bg-violet-950/40"
                    >
                      <span className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
                        {contact.name}
                      </span>
                      <span className="truncate text-[11px] text-slate-400">
                        {[contact.email, contact.phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  startAdd(query.trim());
                }}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-[12px] font-semibold text-[#5A32A3] hover:bg-violet-50 dark:border-zinc-800"
              >
                <Plus className="h-3.5 w-3.5" />
                {query.trim()
                  ? `Add “${query.trim()}” as a contact`
                  : contactSearchPlaceholder(contacts.length)}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {adding ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
              New {nextRole.toLowerCase()} contact
            </p>
            <span
              className={cn(
                "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                contacts.length === 0
                  ? "bg-[#5A32A3]/12 text-[#5A32A3]"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {nextRole}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <AddField
              label="First name"
              required
              error={addFieldErrors.firstName}
            >
              <input
                value={addFirstName}
                onChange={(e) => setAddFirstName(e.target.value)}
                placeholder="Alex"
                className={addInputClass}
              />
            </AddField>
            <AddField label="Middle name">
              <input
                value={addMiddleName}
                onChange={(e) => setAddMiddleName(e.target.value)}
                placeholder="Optional"
                className={addInputClass}
              />
            </AddField>
            <AddField
              label="Last name"
              required
              error={addFieldErrors.lastName}
            >
              <input
                value={addLastName}
                onChange={(e) => setAddLastName(e.target.value)}
                placeholder="Morgan"
                className={addInputClass}
              />
            </AddField>
            <AddField
              label="Email address"
              required
              error={addFieldErrors.email}
            >
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="alex@email.com"
                className={addInputClass}
              />
            </AddField>
            <AddField label="Phone">
              <input
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="Optional"
                className={addInputClass}
              />
            </AddField>
          </div>
          {addError ? (
            <p className="mt-1.5 text-[11px] font-medium text-rose-500">
              {addError}
            </p>
          ) : null}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setOpen(false);
              }}
              className="h-8 rounded-md px-3 text-[12px] font-medium text-slate-500 hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveNewContact}
              className="h-8 rounded-md bg-[#5A32A3] px-3 text-[12px] font-semibold text-white hover:bg-[#4a2888]"
            >
              Save contact
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function findLinkedContact(id: string): LinkedLeadContact | null {
  const found = findContactById(id)?.contact;
  return found ? toLinked(found) : null;
}
