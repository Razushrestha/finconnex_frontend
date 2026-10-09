"use client";

import type { ReactNode } from "react";

export function RecentTabsHeader({ actions }: { actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 sm:px-6 dark:border-zinc-800">
      <h2 className="py-3.5 text-sm font-medium text-slate-900 dark:text-white">
        Documents
      </h2>
      <div className="py-2">{actions}</div>
    </div>
  );
}

export default RecentTabsHeader;
