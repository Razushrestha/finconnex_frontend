"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export function RecentTabsHeader({
  onTabChange,
  onSearch,
}: {
  onTabChange?: (tab: "documents" | "templates") => void;
  onSearch?: (query: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"documents" | "templates">(
    "documents",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const handleTabClick = (tab: "documents" | "templates") => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-6 dark:border-zinc-800">
      {/* Switcher Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1 dark:bg-zinc-900">
        <button
          onClick={() => handleTabClick("documents")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "documents"
              ? "bg-violet-600 text-white shadow-sm dark:bg-violet-500"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          Recent Documents
        </button>
        <button
          onClick={() => handleTabClick("templates")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "templates"
              ? "bg-violet-600 text-white shadow-sm dark:bg-violet-500"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          Recent Templates
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-violet-400"
        />
      </div>
    </div>
  );
}
