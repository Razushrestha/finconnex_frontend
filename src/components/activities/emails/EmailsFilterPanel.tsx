"use client";

import { Search } from "lucide-react";
import type { EmailStatus } from "@/lib/emails/types";
import { cn } from "@/lib/utils";

export interface MailListFilters {
  unreadOnly: boolean;
  hasAttachment: boolean;
  statuses: EmailStatus[];
}

export const EMPTY_MAIL_FILTERS: MailListFilters = {
  unreadOnly: false,
  hasAttachment: false,
  statuses: [],
};

const STATUS_OPTIONS: EmailStatus[] = [
  "Draft",
  "Scheduled",
  "Sent",
  "Delivered",
  "Opened",
  "Failed",
];

interface EmailsFilterPanelProps {
  value: MailListFilters;
  onChange: (next: MailListFilters) => void;
  onClose?: () => void;
}

export function EmailsFilterPanel({
  value,
  onChange,
  onClose,
}: EmailsFilterPanelProps) {
  function toggleStatus(status: EmailStatus) {
    const next = value.statuses.includes(status)
      ? value.statuses.filter((item) => item !== status)
      : [...value.statuses, status];
    onChange({ ...value, statuses: next });
  }

  const activeCount =
    Number(value.unreadOnly) +
    Number(value.hasAttachment) +
    value.statuses.length;

  return (
    <div className="flex h-full w-64 shrink-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Filter Emails
          {activeCount ? (
            <span className="ml-1.5 text-[11px] font-semibold text-[#5A32A3]">
              {activeCount}
            </span>
          ) : null}
        </h3>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filter panel"
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
          <input
            type="checkbox"
            checked={value.unreadOnly}
            onChange={(e) => onChange({ ...value, unreadOnly: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-slate-300 accent-[#5A32A3]"
          />
          Unread only
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
          <input
            type="checkbox"
            checked={value.hasAttachment}
            onChange={(e) =>
              onChange({ ...value, hasAttachment: e.target.checked })
            }
            className="h-3.5 w-3.5 rounded border-slate-300 accent-[#5A32A3]"
          />
          Has attachment
        </label>

        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Status
          </p>
          <div className="space-y-2">
            {STATUS_OPTIONS.map((status) => (
              <label
                key={status}
                className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={value.statuses.includes(status)}
                  onChange={() => toggleStatus(status)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#5A32A3]"
                />
                {status}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={() => onChange(EMPTY_MAIL_FILTERS)}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50",
            activeCount === 0 && "opacity-50",
          )}
        >
          <Search className="h-3.5 w-3.5" />
          Clear filters
        </button>
      </div>
    </div>
  );
}
