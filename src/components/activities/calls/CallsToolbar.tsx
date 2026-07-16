"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Filter,
  ArrowUpDown,
  X,
  List,
  LayoutGrid,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";

export type CallView = "list" | "kanban";

interface CallsToolbarProps {
  view: CallView;
  onViewChange: (view: CallView) => void;
  filterOpen: boolean;
  onToggleFilter: () => void;
  sortActive: boolean;
  onClearSort: () => void;
}

const tabs = ["All Calls"] as const;

const DEFAULT_LAYOUT_ID = "standard";

export function CallsToolbar({
  view,
  onViewChange,
  filterOpen,
  onToggleFilter,
  sortActive,
  onClearSort,
}: CallsToolbarProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]>("All Calls");

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1 border-b border-slate-200 px-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`-mb-px rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-indigo-600 bg-indigo-50 text-indigo-700"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
        <button
          type="button"
          aria-label="More tabs"
          className="px-2 py-2 text-slate-400 hover:text-slate-600"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Toolbar row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-1 py-2.5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onToggleFilter}
            aria-pressed={filterOpen}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors ${
              filterOpen
                ? "bg-indigo-50 text-indigo-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowUpDown className="h-4 w-4" />
              Sort
            </button>
            {sortActive && (
              <button
                type="button"
                onClick={onClearSort}
                aria-label="Clear sort"
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <span className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onViewChange("list")}
              aria-label="List view"
              title="List view"
              className={`flex h-8 w-8 items-center justify-center rounded-md ${
                view === "list"
                  ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewChange("kanban")}
              aria-label="Kanban view"
              title="Kanban view"
              className={`flex h-8 w-8 items-center justify-center rounded-md ${
                view === "kanban"
                  ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg bg-indigo-600">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/activities/calls/create?layoutid=${DEFAULT_LAYOUT_ID}&redirect=false`,
                )
              }
              className="px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Create Call
            </button>
            <button
              type="button"
              aria-label="More create options"
              className="flex items-center border-l border-indigo-500 px-2 text-white hover:bg-indigo-700"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            aria-label="More options"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
