"use client";

import { LayoutTemplate, Plus } from "lucide-react";

export default function SignatureTemplatesPage() {
  return (
    <div className="relative mx-auto flex w-full flex-col p-4">
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Signature Templates
          </h1>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all">
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      <div className="flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-950">
        <div className="p-12 text-center">
          <LayoutTemplate className="mx-auto h-12 w-12 text-slate-300 dark:text-zinc-700" />
          <h3 className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
            No Templates Available
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Create templates to automate standard workflow agreements.
          </p>
        </div>
      </div>
    </div>
  );
}
