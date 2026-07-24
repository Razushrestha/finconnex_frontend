"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getFormBySlug,
  processFormSubmission,
  visibleFields,
  type MarketingForm,
} from "@/lib/marketing/forms/types";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

export function PublicFormClient({ slug }: { slug: string }) {
  const [form, setForm] = useState<MarketingForm | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [thankYou, setThankYou] = useState<string | null>(null);
  const [recordRef, setRecordRef] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(getFormBySlug(slug) ?? null);
    setHydrated(true);
  }, [slug]);

  const shown = useMemo(
    () => (form ? visibleFields(form.fieldDefs, values) : []),
    [form, values],
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[13px] text-slate-400">
        Loading…
      </div>
    );
  }

  if (!form || form.status === "Archived") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
        <h1 className="text-lg font-bold text-slate-900">Form unavailable</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          This form link is invalid or no longer active.
        </p>
      </div>
    );
  }

  if (form.status === "Draft" || form.status === "Paused") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-lg font-bold text-slate-900">Form not published</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          {form.name} is currently {form.status.toLowerCase()}.
        </p>
      </div>
    );
  }

  if (thankYou) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500" />
        <h1 className="text-xl font-bold text-slate-900">Thanks</h1>
        <p className="mt-1 text-[13px] text-slate-500">{thankYou}</p>
        {recordRef ? (
          <p className="mt-2 text-[11px] font-semibold text-violet-700">
            Routed as {form.destination}: {recordRef}
          </p>
        ) : null}
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const out = processFormSubmission(slug, values);
    if (!out.ok) {
      setErrors(out.errors);
      return;
    }
    setErrors({});
    setThankYou(out.result.thankYou);
    setRecordRef(out.result.submission.createdRecordRef);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">
          FinConnex
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">{form.name}</h1>
        {form.description ? (
          <p className="mt-1 text-[13px] text-slate-500">{form.description}</p>
        ) : null}
      </div>

      <form
        onSubmit={submit}
        className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
      >
        {shown.map((f) => (
          <label key={f.id} className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-600">
              {f.label}
              {f.required ? <span className="text-rose-500"> *</span> : null}
            </span>
            {f.type === "Textarea" ? (
              <textarea
                value={values[f.id] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.id]: e.target.value }))
                }
                rows={3}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-[13px] outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]",
                  errors[f.id] ? "border-rose-300" : "border-slate-200",
                )}
              />
            ) : f.type === "Select" ? (
              <select
                value={values[f.id] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.id]: e.target.value }))
                }
                className={cn(
                  "h-10 w-full rounded-xl border px-3 text-[13px] outline-none focus:border-violet-500",
                  errors[f.id] ? "border-rose-300" : "border-slate-200",
                )}
              >
                <option value="">Select…</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : f.type === "File" ? (
              <input
                type="file"
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [f.id]: e.target.files?.[0]?.name ?? "",
                  }))
                }
                className="block w-full text-[12px] text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-violet-700"
              />
            ) : (
              <input
                type={
                  f.type === "Email"
                    ? "email"
                    : f.type === "Phone"
                      ? "tel"
                      : "text"
                }
                value={values[f.id] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.id]: e.target.value }))
                }
                className={cn(
                  "h-10 w-full rounded-xl border px-3 text-[13px] outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]",
                  errors[f.id] ? "border-rose-300" : "border-slate-200",
                )}
              />
            )}
            {errors[f.id] ? (
              <span className="mt-0.5 text-[10px] text-rose-600">
                {errors[f.id]}
              </span>
            ) : null}
          </label>
        ))}
        {errors._form ? (
          <p className="text-[11px] font-medium text-rose-600">{errors._form}</p>
        ) : null}
        <button
          type="submit"
          className="mt-2 h-10 w-full rounded-xl bg-violet-600 text-[13px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
