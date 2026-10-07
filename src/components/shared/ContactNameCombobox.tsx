"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, User, X } from "lucide-react";
import { listAllContacts } from "@/lib/contacts/store";
import type { ContactCardData } from "@/lib/contacts/types";
import { QuickAddContactForm } from "@/components/shared/QuickAddContactForm";
import {
  elevatedInputClass,
  InputShell,
} from "@/components/sales/CreateEntityForm";
import { cn } from "@/lib/utils";

export function ContactNameCombobox({
  value,
  onChange,
  onCreated,
  placeholder = "Add contact",
  addLabel = "Add contact",
  disabled = false,
  error = false,
}: {
  value: string;
  onChange: (name: string) => void;
  onCreated?: (contact: ContactCardData) => void;
  placeholder?: string;
  /** Bottom action label — never use “primary” outside leads. */
  addLabel?: string;
  disabled?: boolean;
  error?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);

  const directory = useMemo(() => listAllContacts(), [tick, open, adding]);

  const selected = useMemo(() => {
    const needle = value.trim().toLowerCase();
    if (!needle) return null;
    return (
      directory.find((contact) => contact.name.toLowerCase() === needle) ?? null
    );
  }, [directory, value]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...directory].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter((contact) =>
      [contact.name, contact.email, contact.phone, contact.company].some(
        (part) => part?.toLowerCase().includes(q),
      ),
    );
  }, [directory, query]);

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

  function pick(contact: ContactCardData) {
    onChange(contact.name);
    onCreated?.(contact);
    setQuery("");
    setOpen(false);
    setAdding(false);
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(false);
  }

  function startAdd(prefill = "") {
    setAddQuery(prefill);
    setAdding(true);
    setOpen(false);
  }

  if (adding) {
    return (
      <QuickAddContactForm
        initialQuery={addQuery}
        onCancel={() => setAdding(false)}
        onCreated={(contact) => {
          setTick((n) => n + 1);
          pick(contact);
        }}
      />
    );
  }

  return (
    <div className="relative min-w-0" ref={wrapRef}>
      <InputShell icon={User} error={error}>
          <input
          className={cn(elevatedInputClass(true), value && !open ? "pr-9" : undefined)}
          value={open ? query : value}
          disabled={disabled}
          onFocus={() => {
            if (disabled) return;
            setQuery("");
            setOpen(true);
          }}
          onClick={() => {
            if (disabled) return;
            if (!open) {
              setQuery("");
              setOpen(true);
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
        />
        {value && !disabled ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              clear();
            }}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear contact"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </InputShell>

      {open && !disabled ? (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-full overflow-hidden rounded-xl bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
          <div className="px-2 pt-2 pb-1">
            <label className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-50 px-2 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#5A32A3]">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search contacts"
                className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {matches.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-slate-400">
                No matching contacts
              </p>
            ) : (
              matches.map((contact) => {
                const isSelected =
                  selected?.id === contact.id ||
                  contact.name.toLowerCase() === value.trim().toLowerCase();
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      pick(contact);
                    }}
                    className={cn(
                      "flex w-full flex-col px-3 py-2 text-left hover:bg-violet-50",
                      isSelected && "bg-violet-50",
                    )}
                  >
                    <span className="truncate text-[13px] font-medium text-slate-800">
                      {contact.name}
                    </span>
                    <span className="truncate text-[11px] text-slate-400">
                      {[contact.email, contact.phone]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              startAdd(query.trim());
            }}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-[12px] font-semibold text-[#5A32A3] hover:bg-violet-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {query.trim() ? `Add “${query.trim()}” as a contact` : addLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
