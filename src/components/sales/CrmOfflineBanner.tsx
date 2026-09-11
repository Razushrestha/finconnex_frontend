"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export function CrmOfflineBanner({
  entityLabel = "records",
  message,
  retrying,
  onRetry,
}: {
  entityLabel?: string;
  message?: string | null;
  retrying?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="mb-3 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-semibold">CRM is unavailable</p>
          <p className="mt-0.5 text-[13px] leading-5 text-amber-900">
            {message?.trim() ||
              `Showing a local copy of ${entityLabel}. Create, edit, import, and bulk changes are blocked so nothing is saved only on this device.`}
          </p>
        </div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-400 bg-white px-3 text-[12px] font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? "Retrying…" : "Retry connection"}
        </button>
      ) : null}
    </div>
  );
}
