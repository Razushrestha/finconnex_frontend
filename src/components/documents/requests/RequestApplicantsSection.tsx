"use client";

import { useEffect, useRef, useState } from "react";
import {
  AddApplicantContactModal,
  AddClientButton,
} from "@/components/documents/requests/AddApplicantContactModal";
import { BodyPortal } from "@/components/shared/BodyPortal";
import {
  searchSignatureCrmEntities,
  type SignatureCrmEntityOption,
} from "@/lib/documents/signature/search-crm-entities";

export type ApplicantSource = "contact" | "lead" | "deal" | "organization";

export type ApplicantDeliverVia = "email" | "sms";

export interface RequestApplicant {
  id: string;
  source: ApplicantSource;
  email: string;
  name: string;
  deliverVia: ApplicantDeliverVia;
  recordId?: string;
}

/** Matches the list's max-h-52. */
const MENU_MAX_PX = 208;

type MenuPlacement = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
};

/**
 * Where the suggestions list goes for an input. The list is drawn at the end
 * of <body> so a card that clips its overflow cannot cut it off; it opens
 * upwards when there is not room below.
 */
function placeMenu(input: HTMLElement): MenuPlacement {
  const rect = input.getBoundingClientRect();
  const gap = 4;
  const below = window.innerHeight - rect.bottom - gap;
  if (below >= MENU_MAX_PX || below >= rect.top) {
    return { left: rect.left, width: rect.width, top: rect.bottom + gap };
  }
  return {
    left: rect.left,
    width: rect.width,
    bottom: window.innerHeight - rect.top + gap,
  };
}

const SOURCE_LABEL: Record<ApplicantSource, string> = {
  contact: "contact",
  lead: "lead",
  deal: "deal",
  organization: "organization",
};

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [results, setResults] = useState<SignatureCrmEntityOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>(
    {},
  );
  const [addingForId, setAddingForId] = useState<string | null>(null);
  const [menuAt, setMenuAt] = useState<MenuPlacement | null>(null);
  const anchorRef = useRef<HTMLInputElement | null>(null);
  const searchSeq = useRef(0);

  function anchorMenu(input: HTMLInputElement) {
    anchorRef.current = input;
    setMenuAt(placeMenu(input));
  }

  // Keep the list on its input while the page or a scroll container moves.
  useEffect(() => {
    if (!activeId) return;
    const follow = () => {
      if (anchorRef.current) setMenuAt(placeMenu(anchorRef.current));
    };
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [activeId]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-applicant-suggest]")) return;
      setActiveId(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function update(id: string, patch: Partial<RequestApplicant>) {
    onChange(applicants.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  async function searchCrm(id: string, source: ApplicantSource, query: string) {
    const seq = ++searchSeq.current;
    setActiveId(id);
    setSearching(true);
    try {
      const next = await searchSignatureCrmEntities(source, query);
      if (seq !== searchSeq.current) return;
      setResults(next);
    } catch {
      if (seq !== searchSeq.current) return;
      setResults([]);
    } finally {
      if (seq === searchSeq.current) setSearching(false);
    }
  }

  function displayName(row: RequestApplicant) {
    if (row.recordId) return row.name;
    return searchQueries[row.id] ?? row.name;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[15px] font-bold text-slate-900">Applicants</h3>

      <div className="space-y-3">
        {applicants.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5"
          >
            <div className="w-36 space-y-1">
              <label className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                Recipient Source
              </label>
              <select
                value={row.source}
                onChange={(e) => {
                  const source = e.target.value as ApplicantSource;
                  update(row.id, {
                    source,
                    email: "",
                    name: "",
                    recordId: undefined,
                  });
                  setSearchQueries((prev) => ({ ...prev, [row.id]: "" }));
                  void searchCrm(row.id, source, "");
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="contact">Contact</option>
                <option value="lead">Lead</option>
                <option value="deal">Deal</option>
                <option value="organization">Organization</option>
              </select>
            </div>

            <div
              className="relative min-w-0 flex-1 space-y-1"
              data-applicant-suggest
            >
              <label className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                Name
              </label>
              <input
                type="text"
                value={displayName(row)}
                onChange={(e) => {
                  const query = e.target.value;
                  anchorMenu(e.currentTarget);
                  setSearchQueries((prev) => ({ ...prev, [row.id]: query }));
                  update(row.id, {
                    name: "",
                    email: "",
                    recordId: undefined,
                  });
                  void searchCrm(row.id, row.source, query);
                }}
                onFocus={(e) => {
                  anchorMenu(e.currentTarget);
                  const query = row.recordId
                    ? row.name
                    : (searchQueries[row.id] ?? row.name ?? "");
                  void searchCrm(row.id, row.source, query);
                }}
                autoComplete="off"
                placeholder={`Search existing ${SOURCE_LABEL[row.source]}s by name or email`}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
              {activeId === row.id && menuAt ? (
                <BodyPortal>
                  <div
                    data-applicant-suggest
                    style={{
                      position: "fixed",
                      left: menuAt.left,
                      width: menuAt.width,
                      top: menuAt.top,
                      bottom: menuAt.bottom,
                    }}
                    className="z-[1000] max-h-52 divide-y divide-gray-50 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white shadow-lg"
                  >
                    <div className="bg-gray-50 px-3 py-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                      Existing {SOURCE_LABEL[row.source]}s
                    </div>
                    {searching ? (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        Loading…
                      </div>
                    ) : results.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        No existing {SOURCE_LABEL[row.source]}s found
                      </div>
                    ) : (
                      results.map((item) => (
                        <button
                          key={`${item.type}-${item.id}`}
                          type="button"
                          onClick={() => {
                            update(row.id, {
                              name: item.name,
                              email: item.email,
                              recordId: item.id,
                            });
                            setSearchQueries((prev) => ({
                              ...prev,
                              [row.id]: item.name,
                            }));
                            setActiveId(null);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-violet-50"
                        >
                          <span>
                            <span className="block text-xs font-semibold text-gray-800">
                              {item.name}
                            </span>
                            <span className="block text-[11px] text-gray-500">
                              {item.email ||
                                item.subtitle ||
                                "No email on file"}
                            </span>
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {item.subtitle || item.type}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </BodyPortal>
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
              recordId: contact.id,
            });
            setSearchQueries((prev) => ({
              ...prev,
              [addingForId]: contact.name,
            }));
            setAddingForId(null);
          }}
        />
      ) : null}
    </div>
  );
}
