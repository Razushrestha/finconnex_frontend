"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { CONTACT_SOURCES, CONTACT_STATUSES } from "@/lib/contacts/types";

interface FilterSection {
  id: "source" | "status";
  title: string;
  fields: readonly string[];
}

const filterSections: FilterSection[] = [
  {
    id: "source",
    title: "Lead Source",
    fields: CONTACT_SOURCES,
  },
  {
    id: "status",
    title: "Status",
    fields: CONTACT_STATUSES,
  },
];

export interface ContactFilters {
  sources: string[];
  statuses: string[];
}

export const EMPTY_CONTACT_FILTERS: ContactFilters = {
  sources: [],
  statuses: [],
};

interface FilterContactsPanelProps {
  filters: ContactFilters;
  onToggleField: (sectionId: "source" | "status", field: string) => void;
  onClose?: () => void;
}

export function FilterContactsPanel({
  filters,
  onToggleField,
  onClose,
}: FilterContactsPanelProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleSection(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const filteredSections = useMemo(() => {
    if (!search.trim()) return filterSections;
    return filterSections
      .map((section) => ({
        ...section,
        fields: section.fields.filter((f) =>
          f.toLowerCase().includes(search.toLowerCase()),
        ),
      }))
      .filter((section) => section.fields.length > 0);
  }, [search]);

  function isChecked(sectionId: "source" | "status", field: string) {
    return sectionId === "source"
      ? filters.sources.includes(field)
      : filters.statuses.includes(field);
  }

  return (
    <div className="flex h-full w-48 shrink-0 flex-col rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Filter Contacts by
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filter panel"
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      <div className="border-b border-slate-100 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-8 text-xs text-slate-700 placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
        {filteredSections.map((section) => {
          const isCollapsed = collapsed[section.id];
          return (
            <div key={section.id} className="mb-3">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="mb-1.5 flex w-full items-center justify-between py-1 text-xs font-semibold tracking-wide text-slate-500 uppercase hover:text-slate-700"
              >
                {section.title}
                {isCollapsed ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5" />
                )}
              </button>

              {!isCollapsed && (
                <div className="space-y-2">
                  {section.fields.map((field) => (
                    <label
                      key={field}
                      className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked(section.id, field)}
                        onChange={() => onToggleField(section.id, field)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-violet-500 focus:ring-violet-300"
                      />
                      {field}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredSections.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-400">
            No fields match your search.
          </p>
        )}
      </div>
    </div>
  );
}
