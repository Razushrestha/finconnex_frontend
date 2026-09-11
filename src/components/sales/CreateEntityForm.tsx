"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import {
    ChevronLeft,
  CheckCircle2,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FORM_CANVAS } from "@/lib/layout";
import { formEnter } from "@/lib/motion";

/** Span the full form grid: use for notes, long text, section blocks. */
export const formFullSpan = "col-span-full";

/** Span two columns from sm up (titles, related-to, etc.). */
export const formWideSpan = "sm:col-span-2";

export function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
        {label}
        {required ? (
          <span className="ml-0.5 text-rose-500" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p data-field-error className="text-[11px] font-medium text-rose-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function InputShell({
  icon: Icon,
  children,
  error,
}: {
  icon?: React.ElementType;
  children: React.ReactNode;
  error?: boolean;
}) {
  const hasSelect = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === "select",
  );
  const content = hasSelect
    ? React.Children.map(children, (child) => {
        if (!React.isValidElement<{ className?: string }>(child)) return child;
        if (child.type !== "select") return child;
        return React.cloneElement(child, {
          className: cn(child.props.className, "fc-select-caret pr-9"),
        });
      })
    : children;

  return (
    <div
      className={cn(
        "group relative flex items-center rounded-lg border bg-white transition-all dark:bg-zinc-950",
        error
          ? "border-rose-300 shadow-[0_0_0_3px_rgba(244,63,94,0.08)]"
          : "border-slate-200 hover:border-violet-300 focus-within:border-violet-500 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] dark:border-zinc-700 dark:hover:border-violet-500",
      )}
    >
      {Icon ? (
        <Icon className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400 transition-colors group-focus-within:text-violet-500" />
      ) : null}
      {content}
      {hasSelect ? (
        <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-slate-400" />
      ) : null}
    </div>
  );
}

export function TextAreaShell({
  children,
  error,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white transition-all dark:bg-zinc-950",
        error
          ? "border-rose-300 shadow-[0_0_0_3px_rgba(244,63,94,0.08)]"
          : "border-slate-200 focus-within:border-violet-500 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] dark:border-zinc-700",
      )}
    >
      {children}
    </div>
  );
}

export const elevatedInputClass = (hasIcon?: boolean) =>
  cn(
    "h-10 w-full rounded-lg bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100",
    hasIcon ? "pr-3 pl-9" : "px-3",
  );

export const elevatedSelectClass = (hasIcon?: boolean) =>
  cn(elevatedInputClass(hasIcon), "cursor-pointer appearance-none pr-9");

export const elevatedTextareaClass =
  "min-h-[110px] w-full resize-y rounded-lg bg-transparent px-3 py-2.5 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100";

function CreateFormTip({
  text,
  testId,
}: {
  text: string;
  testId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative max-w-full shrink-0">
      <button
        type="button"
        data-testid={testId}
        aria-expanded={open}
        aria-label={text}
        title={text}
        onClick={() => setOpen((value) => !value)}
        className="flex max-w-full items-start gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-left text-[12px] leading-5 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950"
      >
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[min(100%,28rem)] whitespace-normal break-words">
          {text}
        </span>
      </button>
      {open ? (
        <p
          role="tooltip"
          className="absolute top-full right-0 z-50 mt-1 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[12px] leading-5 whitespace-normal break-words text-emerald-900 shadow-lg dark:border-emerald-800 dark:bg-zinc-900 dark:text-emerald-200"
        >
          {text}
        </p>
      ) : null}
    </div>
  );
}

interface CreateEntityFormShellProps {
  breadcrumbParent: { label: string; href: string };
  badge: string;
  title: string;
  subtitle: string;
  tip: string;
  cardIcon: React.ElementType;
  cardTitle: string;
  cardDescription: string;
  listHref: string;
  saveLabel: string;
  onSave: (createAnother: boolean) => void | Promise<void>;
  children: React.ReactNode;
}

export function CreateEntityFormShell({
  breadcrumbParent: _breadcrumbParent,
  badge: _badge,
  title,
  subtitle,
  tip,
  cardIcon: CardIcon,
  cardTitle: _cardTitle,
  cardDescription: _cardDescription,
  listHref,
  saveLabel,
  onSave,
  children,
}: CreateEntityFormShellProps) {
  const router = useRouter();
  void _breadcrumbParent;
  void _badge;
  void _cardTitle;
  void _cardDescription;
  const [saving, setSaving] = React.useState(false);

  async function handleSave(createAnother: boolean) {
    if (saving) return;
    setSaving(true);
    try {
      await Promise.resolve(onSave(createAnother));
    } finally {
      // If we navigated away this unmounts; otherwise reset for Save & New / validation.
      window.setTimeout(() => setSaving(false), 350);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] w-full flex-col bg-white dark:bg-zinc-950">
      <header className="flex shrink-0 flex-wrap items-start gap-x-3 gap-y-2 border-b border-slate-200/80 px-3 py-2 sm:px-4 lg:px-5 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-violet-200 hover:text-violet-600 dark:border-zinc-700 dark:bg-zinc-900"
          aria-label="Back"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white">
            <CardIcon className="h-3.5 w-3.5" />
          </div>
          <h1
            title={subtitle}
            className="truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-white"
          >
            {title}
          </h1>
        </div>

        <CreateFormTip text={tip} testId="create-entity-tip-header" />
      </header>

      {/* Form body: fills remaining viewport */}
      <div className="min-h-0 flex-1 overflow-auto bg-slate-50/70 dark:bg-zinc-900/40">
        <div className={cn(FORM_CANVAS, formEnter)}>
          <div className="col-span-full flex justify-end">
            <CreateFormTip text={tip} testId="create-entity-tip" />
          </div>
          {children}
        </div>
      </div>

      {/* Actions: compact sticky bar */}
      <div className="shrink-0 border-t border-slate-200/80 bg-slate-50/95 px-3 py-2 sm:px-4 lg:px-5 dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <p className="hidden text-[11px] text-slate-400 sm:block">
            {/* Local until you save */}
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(listHref)}
              disabled={saving}
              className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="h-8 rounded-md border border-violet-200 bg-violet-50 px-3 text-[12px] font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
            >
              Save &amp; New
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="inline-flex h-8 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-md bg-violet-600 px-4 text-[12px] font-semibold text-white transition-all hover:bg-violet-700 disabled:opacity-90 active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                saveLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
