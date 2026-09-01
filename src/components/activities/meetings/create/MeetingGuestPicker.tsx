"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { listAllContacts } from "@/lib/contacts/store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type MeetingGuest = {
  id: string;
  name: string;
  email: string;
};

export function MeetingGuestPicker({
  guests,
  onChange,
}: {
  guests: MeetingGuest[];
  onChange: (next: MeetingGuest[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contacts = useMemo(() => listAllContacts(), [adding, guests.length]);

  const taken = useMemo(
    () => new Set(guests.map((guest) => guest.email.trim().toLowerCase())),
    [guests],
  );

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const available = contacts.filter(
      (contact) => !taken.has(contact.email.trim().toLowerCase()),
    );
    if (!needle) return available.slice(0, 8);
    return available
      .filter(
        (contact) =>
          contact.name.toLowerCase().includes(needle) ||
          contact.email.toLowerCase().includes(needle),
      )
      .slice(0, 8);
  }, [contacts, query, taken]);

  const typedEmail = query.trim();
  const canAddEmail =
    EMAIL_RE.test(typedEmail) && !taken.has(typedEmail.toLowerCase());
  const emailAlreadyContact = contacts.some(
    (contact) => contact.email.trim().toLowerCase() === typedEmail.toLowerCase(),
  );

  useEffect(() => {
    if (!adding) return;
    inputRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function startAdding() {
    setAdding(true);
    setQuery("");
    setOpen(true);
  }

  function addGuest(guest: MeetingGuest) {
    if (taken.has(guest.email.trim().toLowerCase())) return;
    onChange([...guests, guest]);
    setQuery("");
    setOpen(false);
    setAdding(false);
  }

  function addTypedEmail() {
    if (!canAddEmail) return;
    addGuest({
      id: `email-${typedEmail.toLowerCase()}`,
      name: typedEmail,
      email: typedEmail,
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Guests
        </p>
        {guests.length > 0 ? (
          <span className="rounded-full bg-slate-100 px-1.5 text-[11px] text-slate-600">
            {guests.length}
          </span>
        ) : null}
      </div>

      {guests.length > 0 ? (
        <div className="space-y-1.5">
          {guests.map((guest) => (
            <div
              key={guest.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {guest.name}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {guest.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange(guests.filter((item) => item.id !== guest.id))
                }
                className="rounded p-0.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                aria-label={`Remove ${guest.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {adding ? (
        <div ref={rootRef} className="relative">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setAdding(false);
                  setQuery("");
                  setOpen(false);
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (matches[0]) {
                    addGuest({
                      id: matches[0].id,
                      name: matches[0].name,
                      email: matches[0].email,
                    });
                    return;
                  }
                  addTypedEmail();
                }
              }}
              placeholder="Search contact or enter email"
              className="h-10 w-full rounded-md border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#5A32A3] focus:ring-2 focus:ring-[#5A32A3]/20"
            />
          </div>
          {open ? (
            <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
              {matches.length === 0 && !canAddEmail ? (
                <p className="px-3 py-2 text-sm text-slate-400">
                  {query.trim()
                    ? "No contact found. Enter an email address."
                    : "Type a name or email"}
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto py-1">
                  {matches.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() =>
                        addGuest({
                          id: contact.id,
                          name: contact.name,
                          email: contact.email,
                        })
                      }
                      className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-slate-50"
                    >
                      <span className="text-sm text-slate-800">
                        {contact.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {contact.email}
                      </span>
                    </button>
                  ))}
                  {canAddEmail && !emailAlreadyContact ? (
                    <button
                      type="button"
                      onClick={addTypedEmail}
                      className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm font-medium text-[#5A32A3] hover:bg-[#F3ECFB]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add {typedEmail}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={startAdding}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#5A32A3] hover:text-[#4A2888]"
        >
          <Plus className="h-3.5 w-3.5" />
          {guests.length === 0 ? "Add guests" : "Add guest"}
        </button>
      )}
    </div>
  );
}
