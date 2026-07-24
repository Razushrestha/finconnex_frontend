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
  Route,
} from "lucide-react";
import {
  FORM_DESTINATIONS,
  FORM_STATUS_STYLE,
  FORM_STATUSES,
  embedSnippet,
  getFormById,
  journeyOptionsForForms,
  listFormSubmissions,
  upsertMarketingForm,
  type FormDestination,
  type FormStatus,
  type FormSubmission,
  type MarketingForm,
} from "@/lib/marketing/forms/types";
import { cn } from "@/lib/utils";

export function FormDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [form, setForm] = useState<MarketingForm | null>(null);
  const [subs, setSubs] = useState<FormSubmission[]>([]);
  const [tab, setTab] = useState<"overview" | "submissions" | "embed">(
    "overview",
  );
  const [journeys, setJourneys] = useState<
    ReturnType<typeof journeyOptionsForForms>
  >([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setForm(getFormById(id) ?? null);
    setSubs(listFormSubmissions(id));
    setJourneys(journeyOptionsForForms());
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function persist(next: MarketingForm, msg?: string) {
    upsertMarketingForm(next);
    setForm(next);
    if (msg) flash(msg);
  }

  function setStatus(status: FormStatus) {
    if (!form) return;
    persist(
      {
        ...form,
        status,
        updatedAt: new Date().toLocaleDateString("en-AU"),
      },
      `Status → ${status}`,
    );
  }

  function copyEmbed() {
    if (!form) return;
    void navigator.clipboard?.writeText(
      `${window.location.origin}/f/${form.embedSlug}`,
    );
    flash("Public link copied");
  }

  function copyIframe() {
    if (!form) return;
    void navigator.clipboard?.writeText(
      embedSnippet(window.location.origin, form.embedSlug),
    );
    flash("Embed snippet copied");
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
            <Link
              href="/"
              className="flex items-center gap-0.5 hover:text-slate-600"
            >
              <Home className="h-3 w-3" />
              Home
            </Link>
            <span>/</span>
            <Link href="/marketing/forms" className="hover:text-slate-600">
              Forms
            </Link>
            <span>/</span>
          </nav>
          <h1 className="text-[15px] font-bold text-slate-900">
            {form.formId}
          </h1>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              FORM_STATUS_STYLE[form.status],
            )}
          >
            {form.status}
          </span>
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-700">
            → {form.destination}
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

        <div className="mb-2.5 flex gap-1 border-b border-slate-200">
          {(
            [
              ["overview", "Overview"],
              ["submissions", `Submissions (${subs.length})`],
              ["embed", "Embed"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                if (key === "submissions") setSubs(listFormSubmissions(id));
              }}
              className={cn(
                "border-b-2 px-3 py-2 text-[11px] font-semibold",
                tab === key
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <h2 className="text-xl font-bold text-slate-900">{form.name}</h2>
              {form.description ? (
                <p className="mt-1 text-[13px] text-slate-500">
                  {form.description}
                </p>
              ) : null}
              <p className="mt-2 font-mono text-[11px] text-violet-700">
                /f/{form.embedSlug}
              </p>
            </div>

            <div className="grid flex-1 lg:grid-cols-[1fr_280px]">
              <div className="border-b border-slate-100 p-4 lg:border-r lg:border-b-0 sm:p-5">
                <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Fields ({form.fieldDefs.length})
                </p>
                <ul className="space-y-2">
                  {form.fieldDefs.map((f) => (
                    <li
                      key={f.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[13px] font-semibold text-slate-800">
                            {f.label}
                            {f.required ? (
                              <span className="text-rose-500"> *</span>
                            ) : null}
                          </p>
                          <p className="text-[11px] text-slate-400">{f.type}</p>
                        </div>
                      </div>
                      {f.showWhen ? (
                        <p className="mt-1 text-[10px] font-medium text-violet-700">
                          Show when{" "}
                          {form.fieldDefs.find(
                            (x) => x.id === f.showWhen!.fieldId,
                          )?.label ?? f.showWhen.fieldId}{" "}
                          = “{f.showWhen.equals}”
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
              <aside className="space-y-4 bg-slate-50/70 p-4 sm:p-5">
                <div>
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
                </div>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Route to
                  </span>
                  <select
                    value={form.destination}
                    onChange={(e) =>
                      persist({
                        ...form,
                        destination: e.target.value as FormDestination,
                        updatedAt: new Date().toLocaleDateString("en-AU"),
                      })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none"
                  >
                    {FORM_DESTINATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    <Route className="h-3 w-3" />
                    Journey on submit
                  </span>
                  <select
                    value={form.journeyId ?? ""}
                    onChange={(e) => {
                      const j = journeys.find((x) => x.id === e.target.value);
                      persist({
                        ...form,
                        journeyId: e.target.value || undefined,
                        journeyName: j?.label,
                        updatedAt: new Date().toLocaleDateString("en-AU"),
                      });
                    }}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none"
                  >
                    <option value="">None</option>
                    {journeys.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.label}
                      </option>
                    ))}
                  </select>
                </label>
                <dl className="space-y-2 text-[12px]">
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
        ) : null}

        {tab === "submissions" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Contact</th>
                  <th className="px-3 py-2.5">Routed</th>
                  <th className="px-3 py-2.5">Journey</th>
                  <th className="px-4 py-2.5">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-t border-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {s.contactName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {s.contactEmail}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={s.createdRecordHref}
                        className="font-semibold text-violet-600 hover:underline"
                      >
                        {s.destination} · {s.createdRecordRef}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {s.journeyEnrollmentId ? (
                        <Link
                          href={
                            s.journeyId
                              ? `/journeys/${s.journeyId}`
                              : "/journeys"
                          }
                          className="font-semibold text-violet-600 hover:underline"
                        >
                          Enrolled
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.submittedAt}</td>
                  </tr>
                ))}
                {subs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      No submissions yet — open the public form to test
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "embed" ? (
          <div className="max-w-2xl space-y-3 rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm sm:p-5">
            <div>
              <div className="mb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Public URL
              </div>
              <code className="block rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-800">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/f/${form.embedSlug}`
                  : `/f/${form.embedSlug}`}
              </code>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                iframe snippet
              </div>
              <pre className="overflow-x-auto rounded-lg bg-slate-900 px-3 py-3 text-[11px] leading-relaxed text-slate-100">
                {typeof window !== "undefined"
                  ? embedSnippet(window.location.origin, form.embedSlug)
                  : embedSnippet("https://app.finconnex.example", form.embedSlug)}
              </pre>
            </div>
            <button
              type="button"
              onClick={copyIframe}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy iframe
            </button>
          </div>
        ) : null}
      </div>
      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
