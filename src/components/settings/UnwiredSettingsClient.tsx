"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function UnwiredSettingsClient({
  title,
  description,
  moduleHref,
  moduleLabel,
}: {
  title: string;
  description?: string;
  moduleHref?: string;
  moduleLabel?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="mt-0.5 max-w-2xl text-[12px] leading-relaxed text-slate-500">
              {description || "Listed in Settings, not yet connected to CRM."}
            </p>
            <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Not connected
            </span>
          </div>
          {moduleHref ? (
            <Link
              href={moduleHref}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {moduleLabel || "Open module"}
            </Link>
          ) : null}
        </div>
      </div>
      <div className="space-y-2 px-5 py-5 text-[13px] leading-6 text-slate-600 sm:px-6">
        <p>
          This page used a placeholder form (enabled, label, mode, notes). Those
          fields were not {title.toLowerCase()} configuration — saving them did
          not change CRM records.
        </p>
        <p>
          There is no Nest module for this screen yet, so there is nothing to
          edit here. Use the related module if one is linked, or a Settings page
          that is already wired (branding, users, SMTP, pipelines, and similar).
        </p>
      </div>
    </div>
  );
}
