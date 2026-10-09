"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, Info, PencilLine, Trash2, X } from "lucide-react";

import { WorkspacePortal } from "@/components/shared/WorkspacePortal";
import {
  currentDialog,
  settleDialog,
  subscribeDialogs,
  type DialogRequest,
} from "@/lib/notify/dialog";
import { cn } from "@/lib/utils";

/**
 * Shows the app's confirm / alert / prompt dialogs (see `@/lib/notify/dialog`)
 * one at a time, over the working area beside the sidebar.
 */
export function AppDialogHost() {
  const request = useSyncExternalStore(
    subscribeDialogs,
    currentDialog,
    () => null,
  );
  if (!request) return null;
  // Keyed so each dialog starts with its own input and focus.
  return <DialogCard key={request.id} request={request} />;
}

const DANGER_WORDS =
  /\b(delete|remove|discard|clear|leave|soft-delete|revoke|cancel|deactivate)\b/i;

function inferTone(request: DialogRequest) {
  if (request.kind === "prompt") return "default";
  if (request.options.tone) return request.options.tone;
  if (request.kind !== "confirm") return "default";
  const text = [request.options.title, request.options.confirmText]
    .concat(typeof request.options.message === "string" ? [request.options.message] : [])
    .filter(Boolean)
    .join(" ");
  return DANGER_WORDS.test(text) ? "danger" : "default";
}

function DialogCard({ request }: { request: DialogRequest }) {
  const tone = inferTone(request);
  const danger = tone === "danger";
  const [value, setValue] = useState(
    request.kind === "prompt" ? (request.options.defaultValue ?? "") : "",
  );
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<Element | null>(null);

  function finish(result: "ok" | "cancel") {
    if (request.kind === "confirm") request.resolve(result === "ok");
    else if (request.kind === "alert") request.resolve();
    else request.resolve(result === "ok" ? value : null);
    settleDialog(request.id);
    const target = returnFocus.current;
    if (target instanceof HTMLElement) {
      window.setTimeout(() => target.focus?.(), 0);
    }
  }

  useEffect(() => {
    returnFocus.current = document.activeElement;
    if (request.kind === "prompt") {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      confirmRef.current?.focus();
    }
  }, [request.kind]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish("cancel");
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
    // finish reads the latest value through this render's closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const options = request.options;
  const title =
    options.title ||
    (request.kind === "alert"
      ? "Notice"
      : request.kind === "prompt"
        ? "Enter a value"
        : "Are you sure?");
  const confirmText =
    request.kind === "alert"
      ? request.options.okText || "OK"
      : request.options.confirmText || (request.kind === "prompt" ? "Save" : "Confirm");
  const cancelText =
    request.kind === "alert" ? "" : request.options.cancelText || "Cancel";
  const promptBlocked =
    request.kind === "prompt" &&
    !request.options.allowEmpty &&
    !value.trim();

  const Icon =
    request.kind === "prompt"
      ? PencilLine
      : danger
        ? request.kind === "confirm" && /\b(delete|remove|discard)\b/i.test(`${title} ${confirmText}`)
          ? Trash2
          : AlertTriangle
        : Info;

  return (
    <WorkspacePortal zIndex={10000}>
      <div
        className="fixed inset-0 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) finish("cancel");
        }}
      >
        <form
          role={request.kind === "confirm" ? "alertdialog" : "dialog"}
          aria-modal="true"
          aria-labelledby="app-dialog-title"
          aria-describedby={options.message ? "app-dialog-message" : undefined}
          className="w-full max-w-[440px] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-900"
          onSubmit={(event) => {
            event.preventDefault();
            if (promptBlocked) return;
            finish("ok");
          }}
        >
          <div className="h-1 w-full bg-[var(--brand-primary)]" aria-hidden />
          <div className="flex items-start gap-3.5 px-6 pt-5 pb-2">
            <span
              className={cn(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                danger
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/15"
                  : "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1 pt-1.5">
              <h2
                id="app-dialog-title"
                className="text-[16px] leading-snug font-bold text-slate-900 dark:text-slate-100"
              >
                {title}
              </h2>
              {options.message ? (
                <div
                  id="app-dialog-message"
                  className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300"
                >
                  {options.message}
                </div>
              ) : null}
              {request.kind === "prompt" ? (
                <label className="mt-3 block">
                  {request.options.label ? (
                    <span className="mb-1.5 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
                      {request.options.label}
                    </span>
                  ) : null}
                  <input
                    ref={inputRef}
                    type={request.options.inputType ?? "text"}
                    value={value}
                    placeholder={request.options.placeholder}
                    onChange={(event) => setValue(event.target.value)}
                    className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => finish("cancel")}
              aria-label="Close"
              className="-mt-1 -mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex justify-end gap-2.5 px-6 pt-3 pb-5">
            {cancelText ? (
              <button
                type="button"
                onClick={() => finish("cancel")}
                className="h-9 min-w-[88px] rounded-lg border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {cancelText}
              </button>
            ) : null}
            <button
              ref={confirmRef}
              type="submit"
              disabled={promptBlocked}
              className={cn(
                "h-9 min-w-[88px] rounded-lg px-4 text-[13px] font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50",
                danger ? "bg-rose-600" : "bg-[var(--brand-primary)]",
              )}
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </WorkspacePortal>
  );
}
