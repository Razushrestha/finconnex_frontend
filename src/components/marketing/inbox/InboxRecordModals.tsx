"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createContact,
  findContactByEmail,
  listAllContacts,
  updateContact,
} from "@/lib/contacts/store";
import {
  CONTACT_SOURCES,
  type ContactCardData,
  type ContactSource,
} from "@/lib/contacts/types";
import { createLead } from "@/lib/leads/store";
import { LEAD_PIPELINE_STAGES, LEAD_SOURCES, type LeadSource } from "@/lib/leads/types";
import { getRulesActor } from "@/lib/rules/actor";

const BRAND = "#5A32A3";

export function splitPersonName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") || firstName || "Unknown";
  return { firstName: firstName || lastName, lastName };
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value: string) {
  return value.replace(/\D/g, "").length >= 8;
}

function toContactSource(source: string): ContactSource {
  return (CONTACT_SOURCES as readonly string[]).includes(source)
    ? (source as ContactSource)
    : "Other";
}

function resolveOrCreateContact(input: {
  name: string;
  email: string;
  phone: string;
  owner: string;
  source: string;
}): ContactCardData {
  const existing = findContactByEmail(input.email);
  if (existing) {
    if (!existing.phone.trim() && input.phone.trim()) {
      return (
        updateContact(existing.id, { phone: input.phone.trim() }) ?? existing
      );
    }
    return existing;
  }
  const { firstName, lastName } = splitPersonName(input.name);
  return createContact({
    firstName,
    lastName,
    email: input.email.trim(),
    phone: input.phone.trim(),
    status: "Active",
    owner: input.owner,
    source: toContactSource(input.source),
  });
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-500">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] text-slate-800 outline-none focus:border-[#5A32A3] focus:ring-2 focus:ring-[#5A32A3]/15";

export function InboxLinkContactModal({
  open,
  name,
  email,
  phone,
  onClose,
  onLinked,
}: {
  open: boolean;
  name: string;
  email?: string;
  phone?: string;
  onClose: () => void;
  onLinked: (contact: ContactCardData) => void;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState(name);
  const [formEmail, setFormEmail] = useState(email ?? "");
  const [formPhone, setFormPhone] = useState(phone ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCreating(false);
    setFormName(name);
    setFormEmail(email ?? "");
    setFormPhone(phone ?? "");
    setError(null);
  }, [open, name, email, phone]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = listAllContacts();
    if (!q) {
      const suggested = all.filter(
        (c) =>
          c.name.trim().toLowerCase() === name.trim().toLowerCase() ||
          (email && c.email.trim().toLowerCase() === email.trim().toLowerCase()),
      );
      return suggested.length ? suggested : all.slice(0, 8);
    }
    return all.filter((c) => {
      const blob = `${c.name} ${c.email} ${c.phone} ${c.company}`.toLowerCase();
      return blob.includes(q);
    });
  }, [query, name, email]);

  if (!open) return null;

  function saveNew() {
    if (!formName.trim()) {
      setError("Name is required");
      return;
    }
    if (!isValidEmail(formEmail)) {
      setError("A valid email is required");
      return;
    }
    if (!isValidPhone(formPhone)) {
      setError("A valid phone number is required");
      return;
    }
    onLinked(
      resolveOrCreateContact({
        name: formName,
        email: formEmail,
        phone: formPhone,
        owner: getRulesActor().name || "You",
        source: "Other",
      }),
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-[13px] font-semibold text-slate-900">
            {creating ? "Create contact" : "Link contact"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {creating ? (
          <form
            id="inbox-create-contact-form"
            className="space-y-3 px-4 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveNew();
            }}
          >
            <Field label="Name" required>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="name@email.com"
                className={inputClass}
              />
            </Field>
            <Field label="Phone" required>
              <input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+61 …"
                className={inputClass}
              />
            </Field>
            {error ? (
              <p className="text-[12px] font-medium text-rose-600">{error}</p>
            ) : null}
          </form>
        ) : (
          <div className="px-4 py-3">
            <label className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#5A32A3]">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contacts by name, email, or phone"
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
              />
            </label>
            <div className="mt-2 max-h-56 overflow-y-auto">
              {matches.length === 0 ? (
                <div className="px-1 py-6 text-center">
                  <p className="text-[12px] text-slate-400">
                    No contacts match.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (query.trim() && !query.includes("@")) {
                        setFormName(query.trim());
                      }
                      setCreating(true);
                    }}
                    className="mt-2 text-[12px] font-semibold text-[#5A32A3] hover:underline"
                  >
                    Create a new contact
                  </button>
                </div>
              ) : (
                matches.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => onLinked(contact)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-[#F8F4FC]"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        contact.avatarBgClass,
                      )}
                    >
                      {contact.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-slate-800">
                        {contact.name}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">
                        {contact.email}
                        {contact.phone ? ` · ${contact.phone}` : ""}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          {creating ? (
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
              className="h-9 rounded-lg px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Back to search
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (query.trim() && !query.includes("@")) {
                  setFormName(query.trim());
                }
                setCreating(true);
              }}
              className="h-9 rounded-lg px-3 text-[12px] font-semibold text-[#5A32A3] hover:bg-[#F3ECFB]"
            >
              Create contact
            </button>
          )}
          {creating ? (
            <button
              type="submit"
              form="inbox-create-contact-form"
              className="h-9 rounded-lg px-3 text-[12px] font-semibold text-white"
              style={{ backgroundColor: BRAND }}
            >
              Save & link
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function InboxCreateLeadModal({
  open,
  name,
  email,
  phone,
  owner,
  onClose,
  onCreated,
}: {
  open: boolean;
  name: string;
  email?: string;
  phone?: string;
  owner?: string;
  onClose: () => void;
  onCreated: (result: {
    contact: ContactCardData;
    leadName: string;
    leadId: string;
  }) => void;
}) {
  const [formName, setFormName] = useState(name);
  const [formEmail, setFormEmail] = useState(email ?? "");
  const [formPhone, setFormPhone] = useState(phone ?? "");
  const [stage, setStage] = useState<string>("New Lead");
  const [source, setSource] = useState<LeadSource>("Website");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormName(name);
    setFormEmail(email ?? "");
    setFormPhone(phone ?? "");
    setStage("New Lead");
    setSource("Website");
    setError(null);
  }, [open, name, email, phone]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit() {
    if (!formName.trim()) {
      setError("Name is required");
      return;
    }
    if (!isValidEmail(formEmail)) {
      setError("A valid email is required");
      return;
    }
    if (!isValidPhone(formPhone)) {
      setError("A valid phone number is required");
      return;
    }
    if (!stage.trim()) {
      setError("Lead stage is required");
      return;
    }
    if (!source) {
      setError("Lead source is required");
      return;
    }
    const { firstName, lastName } = splitPersonName(formName);
    const actor = owner?.trim() || getRulesActor().name || "You";
    const contact = resolveOrCreateContact({
      name: formName,
      email: formEmail,
      phone: formPhone,
      owner: actor,
      source,
    });
    const lead = createLead({
      firstName,
      lastName,
      email: formEmail.trim(),
      phone: formPhone.trim(),
      source,
      status: "New",
      pipelineStage: stage,
      owner: actor,
    });
    onCreated({ contact, leadName: lead.name, leadId: lead.id });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-[13px] font-semibold text-slate-900">Create lead</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          id="inbox-create-lead-form"
          className="space-y-3 px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <p className="text-[12px] text-slate-500">
            This creates a contact first, then adds the lead to the pipeline.
          </p>
          <Field label="Name" required>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Phone" required>
            <input
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Lead stage" required>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className={cn(inputClass, "fc-select-caret appearance-none pr-8")}
            >
              {LEAD_PIPELINE_STAGES.filter(
                (item) => !item.startsWith("Closed"),
              ).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source" required>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              className={cn(inputClass, "fc-select-caret appearance-none pr-8")}
            >
              {LEAD_SOURCES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          {error ? (
            <p className="text-[12px] font-medium text-rose-600">{error}</p>
          ) : null}
        </form>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="inbox-create-lead-form"
            className="h-9 rounded-lg px-3 text-[12px] font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            Create lead
          </button>
        </div>
      </div>
    </div>
  );
}
