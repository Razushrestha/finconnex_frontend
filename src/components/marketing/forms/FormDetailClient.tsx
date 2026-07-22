"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  ExternalLink,
  Copy,
  ClipboardList,
} from "lucide-react";
import {
  FORM_STATUSES,
  getFormById,
  upsertMarketingForm,
  type FormStatus,
  type MarketingForm,
} from "@/lib/marketing/forms/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<FormStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Published: "bg-emerald-50 text-emerald-700",
  Paused: "bg-amber-50 text-amber-800",
  Archived: "bg-slate-100 text-slate-500",
};

export function FormDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [form, setForm] = useState<MarketingForm | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setForm(getFormById(id) ?? null);
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function setStatus(status: FormStatus) {
    if (!form) return;
    const next = {
      ...form,
      status,
      updatedAt: new Date().toLocaleDateString("en-AU"),
    };
    upsertMarketingForm(next);
    setForm(next);
    flash(`Status → ${status}`);
  }

  function copyEmbed() {
    if (!form) return;
    void navigator.clipboard?.writeText(
      `${window.location.origin}/f/${form.embedSlug}`,
    );
    flash("Public link copied");
  }

  if (!form) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 p-8">
        <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-bold text-slate-900">Form not found</p>
        <Link
          href="/marketing/forms"
          className="mt-3 text-[12px] font-semibold text-violet-700"
        >
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.09),_transparent_60%)]"
      />
      <div className="relative flex flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/marketing/forms")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
            aria-label="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <nav className="flex items-center gap-1 text-[10px] text-slate-400">
            <Link href="/" className="flex items-center gap-0.5 hover:text-slate-600">
              <Home className="h-3 w-3" />
              Home
            </Link>
            <span>/</span>
            <Link href="/marketing/forms" className="hover:text-slate-600">
              Forms
            </Link>
            <span>/</span>
          </nav>
          <h1 className="text-[15px] font-bold text-slate-900">{form.formId}</h1>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              STATUS_STYLE[form.status],
            )}
          >
            {form.status}
          </span>
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={copyEmbed}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </button>
            <Link
              href={`/f/${form.embedSlug}`}
              target="_blank"
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open public
            </Link>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
            <h2 className="text-xl font-bold text-slate-900">{form.name}</h2>
            {form.description ? (
              <p className="mt-1 text-[13px] text-slate-500">{form.description}</p>
            ) : null}
            <p className="mt-2 font-mono text-[11px] text-violet-700">
              /f/{form.embedSlug}
            </p>
          </div>

          <div className="grid flex-1 lg:grid-cols-[1fr_260px]">
            <div className="border-b border-slate-100 p-4 lg:border-r lg:border-b-0 sm:p-5">
              <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Fields ({form.fieldDefs.length})
              </p>
              <ul className="space-y-2">
                {form.fieldDefs.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-slate-800">
                        {f.label}
                        {f.required ? (
                          <span className="text-rose-500"> *</span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-slate-400">{f.type}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <aside className="bg-slate-50/70 p-4 sm:p-5">
              <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Status
              </p>
              <div className="flex flex-wrap gap-1">
                {FORM_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-semibold",
                      form.status === s
                        ? "bg-violet-600 text-white"
                        : "bg-white text-slate-500 ring-1 ring-slate-200",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <dl className="mt-5 space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Submissions</dt>
                  <dd className="font-semibold">{form.submissions}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Created by</dt>
                  <dd className="font-medium">{form.createdBy}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Updated</dt>
                  <dd className="font-medium">{form.updatedAt}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </div>
      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
