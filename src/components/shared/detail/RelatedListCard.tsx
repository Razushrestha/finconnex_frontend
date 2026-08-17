"use client";

import { useState } from "react";
import { MentionTextarea } from "@/components/shared/MentionTextarea";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export interface RelatedListAction {
  label: string;
  onClick?: () => void;
  onSubmit?: (value: string) => void;
  variant?: "field" | "button";
  icon?: ReactNode;
}

interface RelatedListCardProps {
  title: string;
  sortLabel?: string;
  action?: RelatedListAction;
  children?: ReactNode;
}

export function RelatedListCard({
  title,
  sortLabel = "Recent Last",
  action,
  children,
}: RelatedListCardProps) {
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");

  const isField = action && (action.variant ?? "field") === "field";
  const isButton = action && action.variant === "button";

  function save() {
    if (!draft.trim()) return;
    action?.onSubmit?.(draft.trim());
    setDraft("");
    setComposing(false);
  }

  function cancel() {
    setDraft("");
    setComposing(false);
  }

  return (
    <div className="rounded-lg border border-slate-200/80 bg-white">
      <div className="flex items-center justify-between px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center gap-2">
          {isButton ? (
            <button
              type="button"
              onClick={action.onClick}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              {action.icon}
              {action.label}
            </button>
          ) : (
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {sortLabel}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-3">
        {isField && !composing && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-left text-[13px] text-slate-400 hover:border-slate-300"
          >
            {action.label}
          </button>
        )}

        {isField && composing && (
          <div className="rounded-md border border-indigo-200 focus-within:ring-2 focus-within:ring-indigo-100">
            <MentionTextarea
              autoFocus
              value={draft}
              onChange={setDraft}
              placeholder={`${action.label} — type @ to assign someone`}
              rows={3}
              className="w-full resize-none rounded-t-md px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
            />
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-3 py-2">
              <button
                type="button"
                onClick={cancel}
                className="rounded-md px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!draft.trim()}
                className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {children ?? (
          <p
            className={
              isField
                ? "pt-3 text-center text-xs text-slate-400"
                : "py-4 text-center text-xs text-slate-400"
            }
          >
            No records found
          </p>
        )}
      </div>
    </div>
  );
}
