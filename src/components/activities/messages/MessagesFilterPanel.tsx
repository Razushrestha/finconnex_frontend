"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { MESSAGE_STATUSES, MESSAGE_TYPES } from "@/lib/messages/types";
import { cn } from "@/lib/utils";
import { filterEnter } from "@/lib/motion";

interface FilterSection {
  id: string;
  title: string;
  fields: readonly string[];
}

const filterSections: FilterSection[] = [
  { id: "type", title: "Type", fields: MESSAGE_TYPES },
  { id: "status", title: "Status", fields: MESSAGE_STATUSES },
];

interface MessagesFilterPanelProps {
  onClose?: () => void;
}

export function MessagesFilterPanel({ onClose }: MessagesFilterPanelProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

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
    <div
      className={cn(
        "flex h-full w-56 shrink-0 flex-col rounded-2xl border border-slate-100 bg-white shadow-sm",
        filterEnter,
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Filter Messages
        </h3>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        ) : null}
      </div>
      <div className="border-b border-slate-100 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-8 text-xs outline-none focus:border-violet-300"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {filteredSections.map((section) => {
          const isCollapsed = collapsed[section.id];
          return (
            <div key={section.id} className="mb-3">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((p) => ({ ...p, [section.id]: !p[section.id] }))
                }
                className="mb-1.5 flex w-full items-center justify-between py-1 text-xs font-semibold tracking-wide text-slate-500 uppercase"
              >
                {section.title}
                {isCollapsed ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5" />
                )}
              </button>
              {!isCollapsed &&
                section.fields.map((field) => (
                  <label
                    key={field}
                    className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={!!checked[field]}
                      onChange={() =>
                        setChecked((p) => ({ ...p, [field]: !p[field] }))
                      }
                      className="h-3.5 w-3.5 rounded border-slate-300 text-violet-500"
                    />
                    {field}
                  </label>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
