"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function RecentTabsHeader({
  onTabChange,
}: {
  onTabChange?: (tab: "documents" | "templates") => void;
}) {
  const [activeTab, setActiveTab] = useState<"documents" | "templates">(
    "documents",
  );

  const handleTabClick = (tab: "documents" | "templates") => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-4 sm:px-6 dark:border-zinc-800">
      <div className="flex items-center gap-6">
        <button
          onClick={() => handleTabClick("documents")}
          className={`relative py-3.5 text-sm font-medium transition-colors ${
            activeTab === "documents"
              ? "text-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          Recent Documents
          {activeTab === "documents" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 transition-all duration-300 dark:bg-violet-500" />
          )}
        </button>
        <button
          onClick={() => handleTabClick("templates")}
          className={`relative py-3.5 text-sm font-medium transition-colors ${
            activeTab === "templates"
              ? "text-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          Recent Templates
          {activeTab === "templates" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 transition-all duration-300 dark:bg-violet-500" />
          )}
        </button>
      </div>

      {/* Dynamic Action Link based on active tab */}
      <div>
        {activeTab === "documents" ? (
          <Link
            href="/documents/signature/documents"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <Link
            href="/documents/signature/templates"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
          >
            View templates
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default RecentTabsHeader;
