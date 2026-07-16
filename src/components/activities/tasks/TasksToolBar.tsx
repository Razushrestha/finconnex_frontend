"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Filter,
  ArrowUpDown,
  List,
  LayoutGrid,
  Clock,
  Workflow,
  Table2,
  ChevronDown,
  ChevronRight,
  RotateCw,
  MoreHorizontal,
  Pencil,
  ArrowRightLeft,
  Trash2,
  RefreshCw,
  Tags,
  ShieldCheck,
  Download,
  Printer,
  Sparkles,
} from "lucide-react";

export type TaskView = "kanban" | "list";

interface TasksToolbarProps {
  view: TaskView;
  onViewChange: (view: TaskView) => void;
  filterOpen: boolean;
  onToggleFilter: () => void;
}

const tabs = ["All Tasks", "My Overdue Tasks"] as const;

const moreOptionsItems = [
  { key: "mass-transfer", icon: ArrowRightLeft, label: "Mass Transfer" },
  { key: "mass-delete", icon: Trash2, label: "Mass Delete" },
  { key: "mass-update", icon: RefreshCw, label: "Mass Update" },
  { key: "manage-tags", icon: Tags, label: "Manage Tags" },
  { key: "assignment-rules", icon: ShieldCheck, label: "Assignment Rules" },
  { key: "export-tasks", icon: Download, label: "Export Tasks" },
] as const;

const printViewItems = [
  { key: "print-default", label: "Print Default view", premium: false },
  { key: "print-canvas", label: "Print Using Canvas", premium: true },
] as const;

const DEFAULT_LAYOUT_ID = "standard";

export function TasksToolbar({
  view,
  onViewChange,
  filterOpen,
  onToggleFilter,
}: TasksToolbarProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]>("All Tasks");
  const [savedViewMenuOpen, setSavedViewMenuOpen] = useState(false);
  const [savedView, setSavedView] = useState("Tasks by Status");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  return (
    <div className="mb-2">
      {/* Tabs */}
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
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowUpDown className="h-4 w-4" />
            Sort
          </button>

          <span className="h-5 w-px bg-slate-200" />

          {/* View switcher */}
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

          <button
            type="button"
            aria-label="Refresh"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Create Task split button */}
          <div className="flex overflow-hidden rounded-lg bg-indigo-600">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/activities/tasks/create?layoutid=${DEFAULT_LAYOUT_ID}&redirect=false`,
                )
              }
              className="px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Create Task
            </button>
            <button
              type="button"
              aria-label="More create options"
              className="flex items-center border-l border-indigo-500 px-2 text-white hover:bg-indigo-700"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreMenuOpen((v) => !v)}
              aria-label="More options"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {moreMenuOpen && (
              <>
                {/* Click-away backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMoreMenuOpen(false)}
                />

                <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
                  {moreOptionsItems.map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMoreMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Icon className="h-4 w-4 text-slate-400" />
                      {label}
                    </button>
                  ))}

                  {/* Print View — hover to reveal the flyout submenu */}
                  <div className="group/printview relative">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Printer className="h-4 w-4 text-slate-400" />
                      <span className="flex-1">Print View</span>
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    </button>

                    <div className="invisible absolute right-full top-0 z-20 mr-1 w-52 rounded-lg border border-slate-100 bg-white py-1 opacity-0 shadow-lg transition-opacity group-hover/printview:visible group-hover/printview:opacity-100">
                      {printViewItems.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setMoreMenuOpen(false)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <span className="flex-1">{item.label}</span>
                          {item.premium && (
                            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Saved view selector */}
      <div className="flex items-center gap-2 px-1 py-2.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => setSavedViewMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            {savedView}
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {savedViewMenuOpen && (
            <div className="absolute left-0 z-10 mt-1 w-44 rounded-lg border border-slate-100 bg-white py-1 shadow-md">
              {[
                "Tasks by Status",
                "Tasks by Assignee",
                "Tasks by Priority",
              ].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setSavedView(opt);
                    setSavedViewMenuOpen(false);
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
                    opt === savedView
                      ? "font-medium text-indigo-600"
                      : "text-slate-600"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Edit view"
          className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
