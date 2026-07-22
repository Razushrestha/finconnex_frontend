"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[12px] font-semibold text-slate-700">
          {label}
        </label>
        {required ? (
          <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-rose-500 uppercase">
            Required
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-[11px] font-medium text-rose-500">{error}</p>
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
  return (
    <div
      className={cn(
        "group relative flex items-center rounded-xl border bg-white transition-all",
        error
          ? "border-rose-300 shadow-[0_0_0_3px_rgba(244,63,94,0.08)]"
          : "border-slate-200/90 shadow-sm hover:border-violet-300 focus-within:border-violet-500 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]",
      )}
    >
      {Icon ? (
        <Icon className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400 transition-colors group-focus-within:text-violet-500" />
      ) : null}
      {children}
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
        "rounded-xl border bg-white transition-all",
        error
          ? "border-rose-300 shadow-[0_0_0_3px_rgba(244,63,94,0.08)]"
          : "border-slate-200/90 shadow-sm focus-within:border-violet-500 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]",
      )}
    >
      {children}
    </div>
  );
}

export const elevatedInputClass = (hasIcon?: boolean) =>
  cn(
    "h-10 w-full rounded-xl bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400",
    hasIcon ? "pr-3 pl-9" : "px-3",
  );

export const elevatedSelectClass = (hasIcon?: boolean) =>
  cn(elevatedInputClass(hasIcon), "cursor-pointer appearance-none");

export const elevatedTextareaClass =
  "min-h-[100px] w-full resize-y rounded-xl bg-transparent px-3.5 py-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400";

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
  onSave: (createAnother: boolean) => void;
  children: React.ReactNode;
}

export function CreateEntityFormShell({
  breadcrumbParent,
  badge,
  title,
  subtitle,
  tip,
  cardIcon: CardIcon,
  cardTitle,
  cardDescription,
  listHref,
  saveLabel,
  onSave,
  children,
}: CreateEntityFormShellProps) {
  const router = useRouter();

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.12),_transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-size-[24px_24px]"
      />

      <div className="relative mx-auto max-w-5xl p-3 sm:p-5 lg:p-6">
        <nav className="mb-4 flex items-center gap-1.5 text-[11px] text-slate-400">
          <Link
            href="/"
            className="flex items-center gap-1 transition-colors hover:text-slate-600"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <span>/</span>
          <Link
            href={breadcrumbParent.href}
            className="transition-colors hover:text-slate-600"
          >
            {breadcrumbParent.label}
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-600">Create</span>
        </nav>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-sm transition-all hover:border-violet-200 hover:text-violet-600 hover:shadow-md"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-violet-100/80 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-violet-700 uppercase">
                <Sparkles className="h-3 w-3" />
                {badge}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {title}
              </h1>
              <p className="mt-1 max-w-md text-[13px] text-slate-500">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3.5 py-2.5 text-[12px] text-emerald-700 sm:flex">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{tip}</span>
          </div>
        </div>

        <div className="mb-24 overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 via-white to-fuchsia-50/40 px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/25">
              <CardIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-slate-900">
                {cardTitle}
              </h2>
              <p className="mt-0.5 text-[12px] text-slate-500">
                {cardDescription}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {children}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-slate-200/80 bg-white/85 px-3 py-3 backdrop-blur-md sm:px-5 lg:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <p className="hidden text-[12px] text-slate-400 sm:block">
            Your progress is local until you save.
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(listHref)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(true)}
              className="h-10 rounded-xl border border-violet-200 bg-violet-50 px-4 text-[13px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
            >
              Save &amp; New
            </button>
            <button
              type="button"
              onClick={() => onSave(false)}
              className="h-10 rounded-xl bg-violet-600 px-5 text-[13px] font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:bg-violet-700 hover:shadow-violet-600/35 active:scale-[0.98]"
            >
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
