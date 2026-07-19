"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

interface FilterSection {
  id: string;
  title: string;
  fields: string[];
}

const filterSections: FilterSection[] = [
  {
    id: "system-defined",
    title: "System Defined Filters",
    fields: [
      "Record Action",
      "Related Records Action",
      "Touched Records",
      "Untouched Records",
    ],
  },
  {
    id: "by-fields",
    title: "Filter By Fields",
    fields: [
      "Created By",
      "Created Time",
      "Is Pinned",
      "Is Private",
      "Modified By",
      "Modified Time",
      "Note Type",
      "Owner",
      "Related To",
      "Title",
    ],
  },
];

interface NotesFilterPanelProps {
  onClose?: () => void;
}

export function NotesFilterPanel({ onClose }: NotesFilterPanelProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function toggleSection(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleField(field: string) {
    setChecked((prev) => ({ ...prev, [field]: !prev[field] }));
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

  return (
    <div className="flex h-full w-64 shrink-0 flex-col rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Filter Notes by
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

      {/* Search */}
      <div className="border-b border-slate-100 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-2 [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
        {filteredSections.map((section) => {
          const isCollapsed = collapsed[section.id];
          return (
            <div key={section.id} className="mb-3">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="mb-1.5 flex w-full items-center justify-between py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
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
                        checked={!!checked[field]}
                        onChange={() => toggleField(field)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-300"
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
