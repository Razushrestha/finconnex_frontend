"use client";

import { useMemo, useState } from "react";
import { RELATED_RECORD_OPTIONS } from "@/lib/activities/shared";
import { listContactGroups } from "@/lib/contacts/store";
import { cn } from "@/lib/utils";
import {
  AddApplicantContactModal,
  AddClientButton,
} from "@/components/documents/requests/AddApplicantContactModal";

export type ApplicantSource = "contact" | "lead" | "deal" | "organization";

export type ApplicantDeliverVia = "email" | "sms";

export interface RequestApplicant {
  id: string;
  source: ApplicantSource;
  email: string;
  name: string;
  deliverVia: ApplicantDeliverVia;
}

interface CrmOption {
  id: string;
  name: string;
  email: string;
  type: ApplicantSource;
  subtitle?: string;
}

const SOURCE_TO_KIND: Record<
  ApplicantSource,
  "Contact" | "Lead" | "Deal" | "Company"
> = {
  contact: "Contact",
  lead: "Lead",
  deal: "Deal",
  organization: "Company",
};

function emailFromName(name: string) {
  const local = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
  return `${local || "client"}@gmail.com`;
}

function relatedOptions(): CrmOption[] {
  return RELATED_RECORD_OPTIONS.map((r, i) => ({
    id: `${r.kind}-${i}`,
    name: r.name,
    email: emailFromName(r.name),
    type:
      r.kind === "Contact"
        ? "contact"
        : r.kind === "Lead"
          ? "lead"
          : r.kind === "Deal"
            ? "deal"
            : "organization",
    subtitle: r.kind,
  }));
}

function storedContactOptions(): CrmOption[] {
  return listContactGroups().flatMap((group) =>
    group.contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      type: "contact" as const,
      subtitle: "Contact",
    })),
  );
}

export function emptyApplicant(): RequestApplicant {
  return {
    id: `ap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source: "contact",
    email: "",
    name: "",
    deliverVia: "email",
  };
}

export function RequestApplicantsSection({
  applicants,
  onChange,
  error,
}: {
  applicants: RequestApplicant[];
  onChange: (next: RequestApplicant[]) => void;
  error?: string;
}) {
  const [count, setCount] = useState<1 | 2>(
    applicants.length === 2 ? 2 : 1,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [results, setResults] = useState<CrmOption[]>([]);
  const [addingForId, setAddingForId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const allOptions = useMemo(() => {
    const merged = [...relatedOptions(), ...storedContactOptions()];
    const seen = new Set<string>();
    return merged.filter((item) => {
      const key = `${item.type}:${item.name}:${item.email}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [tick]);

  function update(id: string, patch: Partial<RequestApplicant>) {
    onChange(applicants.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function chooseCount(next: 1 | 2) {
    setCount(next);
    if (next === 1) {
      onChange(applicants.length ? [applicants[0]!] : [emptyApplicant()]);
      return;
    }
    if (applicants.length >= 2) {
      onChange(applicants.slice(0, 2));
      return;
    }
    const first = applicants[0] ?? emptyApplicant();
    onChange([first, emptyApplicant()]);
  }

  function searchCrm(id: string, source: ApplicantSource, query: string) {
    if (!query.trim()) {
      setResults([]);
      setActiveId(null);
      return;
    }
    const kind = SOURCE_TO_KIND[source];
    const q = query.toLowerCase();
    setResults(
      allOptions
        .filter(
          (item) =>
            item.type === source &&
            (item.name.toLowerCase().includes(q) ||
              item.email.toLowerCase().includes(q) ||
              item.subtitle?.toLowerCase() === kind.toLowerCase()),
        )
        .slice(0, 6),
    );
    setActiveId(id);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[15px] font-bold text-slate-900">Applicants</h3>

      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
          Number of applicants
        </label>
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {([1, 2] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => chooseCount(value)}
              className={cn(
                "h-11 text-[14px] font-semibold",
                count === value
                  ? "bg-[#F3ECFB] text-[#5A32A3]"
                  : "bg-transparent text-slate-600 hover:bg-white",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
          {applicants.map((row, index) => (
            <div
              key={row.id}
              className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5"
            >
              <div className="flex items-center text-gray-400">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EDE4FB] text-[12px] font-bold text-[#5A32A3]">
                  {index + 1}
                </span>
              </div>

              <div className="w-36 space-y-1">
                <label className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  Recipient Source
                </label>
                <select
                  value={row.source}
                  onChange={(e) => {
                    update(row.id, {
                      source: e.target.value as ApplicantSource,
                      email: "",
                      name: "",
                    });
                    setActiveId(null);
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="contact">Contact</option>
                  <option value="lead">Lead</option>
                  <option value="deal">Deal</option>
                  <option value="organization">Organization</option>
                </select>
              </div>

              <div className="relative min-w-0 flex-1 space-y-1">
                <label className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  Name
                </label>
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    update(row.id, {
                      name,
                      email: name ? emailFromName(name) : "",
                    });
                    searchCrm(row.id, row.source, name);
                  }}
                  placeholder="Search from existing client"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
                {activeId === row.id && results.length > 0 ? (
                  <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-52 divide-y divide-gray-50 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    {results.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          update(row.id, {
                            name: item.name,
                            email: item.email,
                          });
                          setActiveId(null);
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-violet-50"
                      >
                        <span>
                          <span className="block text-xs font-semibold text-gray-800">
                            {item.name}
                          </span>
                          <span className="block text-[11px] text-gray-500">
                            {item.email}
                          </span>
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {item.subtitle}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {row.source === "contact" ? (
                <div className="pt-5">
                  <AddClientButton onClick={() => setAddingForId(row.id)} />
                </div>
              ) : null}
            </div>
          ))}
        </div>

      {error ? (
        <p className="text-[12px] font-medium text-rose-500">{error}</p>
      ) : null}

      {addingForId ? (
        <AddApplicantContactModal
          onClose={() => setAddingForId(null)}
          onCreated={(contact) => {
            update(addingForId, {
              source: "contact",
              name: contact.name,
              email: contact.email,
            });
            setTick((n) => n + 1);
            setAddingForId(null);
          }}
        />
      ) : null}
    </div>
  );
}
