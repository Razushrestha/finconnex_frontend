"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  Play,
  Pause,
  Copy,
  FlaskConical,
  Save,
  Users,
  BarChart3,
  Route,
  LayoutGrid,
} from "lucide-react";
import {
  EXIT_CONDITION_PRESETS,
  JOURNEY_STATUS_STYLE,
  JOURNEY_TRIGGERS,
  activeEnrollmentCount,
  cloneJourney,
  enrollmentsForStep,
  exitEnrollment,
  formatJourneyAt,
  getJourneyById,
  overallConversion,
  runTestJourney,
  stepConversionRate,
  upsertJourney,
  type JourneyStatus,
  type JourneyStep,
  type JourneyTrigger,
  type LifecycleJourney,
} from "@/lib/journeys/types";
import {
  JourneyCanvas,
  JourneyStepInspector,
} from "@/components/journeys/JourneyCanvas";
import { cn } from "@/lib/utils";

export function JourneyDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [row, setRow] = useState<LifecycleJourney | null>(null);
  const [tab, setTab] = useState<
    "canvas" | "enrollments" | "analytics" | "settings"
  >("canvas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stepFilter, setStepFilter] = useState<string>("all");

  useEffect(() => {
    const j = getJourneyById(id) ?? null;
    setRow(j);
    if (j?.steps[0]) setSelectedId(j.steps[0].id);
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  function persist(next: LifecycleJourney, msg?: string) {
    upsertJourney(next);
    setRow(next);
    if (msg) flash(msg);
  }

  const selected = row?.steps.find((s) => s.id === selectedId) ?? null;

  const enrollmentRows = useMemo(() => {
    if (!row) return [];
    if (stepFilter === "all") return row.enrollments;
    return enrollmentsForStep(row, stepFilter).concat(
      row.enrollments.filter(
        (e) => e.currentStepId === stepFilter && e.status !== "Active",
      ),
    );
  }, [row, stepFilter]);

  if (!row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">
            Journey not found
          </p>
          <Link
            href="/journeys"
            className="mt-2 inline-block text-[12px] font-semibold text-violet-600"
          >
            Back to journeys
          </Link>
        </div>
      </div>
    );
  }

  function setSteps(steps: JourneyStep[]) {
    setRow((current) => {
      if (!current) return current;
      const next = {
        ...current,
        steps,
        updatedAt: formatJourneyAt(),
      };
      upsertJourney(next);
      return next;
    });
  }

  function updateSelected(step: JourneyStep) {
    setRow((current) => {
      if (!current) return current;
      const next = {
        ...current,
        steps: current.steps.map((s) => (s.id === step.id ? step : s)),
        updatedAt: formatJourneyAt(),
      };
      upsertJourney(next);
      return next;
    });
  }

  function toggleActive() {
    setRow((current) => {
      if (!current) return current;
      const status: JourneyStatus =
        current.status === "Active" ? "Paused" : "Active";
      const next = { ...current, status, updatedAt: formatJourneyAt() };
      upsertJourney(next);
      flash(`Status → ${status}`);
      return next;
    });
  }

  function onClone() {
    if (!row) return;
    const copy = upsertJourney(cloneJourney(row));
    flash(`Cloned as ${copy.journeyId}`);
    router.push(`/journeys/${copy.id}`);
  }

  function onTest() {
    if (!row) return;
    persist(runTestJourney(row), "Test run completed (mock: no messages sent)");
  }

  function onExitContact(enrollmentId: string) {
    if (!row) return;
    persist(exitEnrollment(row, enrollmentId), "Contact exited");
  }

  function toggleExit(cond: string) {
    if (!row) return;
    const next = row.exitConditions.includes(cond)
      ? row.exitConditions.filter((c) => c !== cond)
      : [...row.exitConditions, cond];
    persist({ ...row, exitConditions: next, updatedAt: formatJourneyAt() });
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => router.push("/journeys")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
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
                <Link href="/journeys" className="hover:text-slate-600">
                  Journeys
                </Link>
                <span>/</span>
              </nav>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[16px] font-bold tracking-tight text-slate-900">
                {row.journeyId}
              </h1>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                  JOURNEY_STATUS_STYLE[row.status],
                )}
              >
                {row.status}
              </span>
            </div>
            <p className="mt-0.5 text-[13px] font-medium text-slate-700">
              {row.name}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Trigger: {row.trigger} · {activeEnrollmentCount(row)} active ·{" "}
              {overallConversion(row)}% overall conversion
              {row.lastTestRunAt
                ? ` · Last test ${row.lastTestRunAt}`
                : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={toggleActive}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white hover:bg-violet-700"
            >
              {row.status === "Active" ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Activate
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onTest}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Test run
            </button>
            <button
              type="button"
              onClick={onClone}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Copy className="h-3.5 w-3.5" />
              Clone
            </button>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold",
                editing
                  ? "border-violet-300 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <Save className="h-3.5 w-3.5" />
              {editing ? "Editing…" : "Edit journey"}
            </button>
          </div>
        </div>

        <div className="mb-2.5 flex gap-1 border-b border-slate-200">
          {(
            [
              ["canvas", Route, "Canvas"],
              ["enrollments", Users, "Enrolled contacts"],
              ["analytics", BarChart3, "Conversion"],
              ["settings", LayoutGrid, "Settings"],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] font-semibold",
                tab === key
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "canvas" ? (
          <div className="grid gap-3 xl:grid-cols-[1fr_280px]">
            <JourneyCanvas
              steps={row.steps}
              onChange={setSteps}
              selectedId={selectedId}
              onSelect={setSelectedId}
              showMetrics
              readOnly={!editing}
            />
            <div className="space-y-3">
              <JourneyStepInspector
                step={selected}
                onChange={updateSelected}
                readOnly={!editing}
              />
              {selected ? (
                <div className="rounded-2xl border border-slate-100/80 bg-white p-3 shadow-sm">
                  <div className="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Contacts on this step
                  </div>
                  <ul className="space-y-1">
                    {enrollmentsForStep(row, selected.id).map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="truncate font-medium text-slate-700">
                          {e.contactName}
                        </span>
                        <button
                          type="button"
                          onClick={() => onExitContact(e.id)}
                          className="shrink-0 text-[10px] font-semibold text-rose-600 hover:underline"
                        >
                          Exit
                        </button>
                      </li>
                    ))}
                    {enrollmentsForStep(row, selected.id).length === 0 ? (
                      <li className="text-[11px] text-slate-400">None active</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "enrollments" ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={stepFilter}
                onChange={(e) => setStepFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] outline-none"
              >
                <option value="all">All steps</option>
                {row.steps.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    Step {i + 1}: {s.label}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500">
                {enrollmentRows.length} contact
                {enrollmentRows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
              <table className="w-full text-left text-[12px]">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Contact</th>
                    <th className="px-3 py-2.5">Current step</th>
                    <th className="px-3 py-2.5">Entered</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollmentRows.map((e) => {
                    const step = row.steps.find((s) => s.id === e.currentStepId);
                    return (
                      <tr
                        key={e.id}
                        className="border-t border-slate-50"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {e.contactName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {e.email}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {step?.label ?? ""}
                        </td>
                        <td className="px-3 py-3 text-slate-500">
                          {e.enteredAt}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                              e.status === "Active" &&
                                "bg-emerald-50 text-emerald-700",
                              e.status === "Completed" &&
                                "bg-sky-50 text-sky-700",
                              e.status === "Exited" &&
                                "bg-rose-50 text-rose-600",
                            )}
                          >
                            {e.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {e.status === "Active" ? (
                            <button
                              type="button"
                              onClick={() => onExitContact(e.id)}
                              className="text-[11px] font-semibold text-rose-600 hover:underline"
                            >
                              Exit manually
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-300"></span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {enrollmentRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-slate-400"
                      >
                        No contacts enrolled
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "analytics" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Step</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Enrolled</th>
                  <th className="px-3 py-2.5">Progressed</th>
                  <th className="px-4 py-2.5">Conversion rate</th>
                </tr>
              </thead>
              <tbody>
                {row.steps.map((s, i) => {
                  const rate = stepConversionRate(s);
                  return (
                    <tr key={s.id} className="border-t border-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {i + 1}. {s.label}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{s.type}</td>
                      <td className="px-3 py-3 font-semibold">
                        {s.enrolledCount}
                      </td>
                      <td className="px-3 py-3">{s.convertedCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 max-w-[120px] overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-violet-500"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-800">
                            {rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">
              Overall journey conversion:{" "}
              <strong className="text-slate-800">
                {overallConversion(row)}%
              </strong>
            </div>
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className="max-w-2xl space-y-3 rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm sm:p-5">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-slate-600">
                Journey name
              </span>
              <input
                value={row.name}
                onChange={(e) =>
                  persist({
                    ...row,
                    name: e.target.value,
                    updatedAt: formatJourneyAt(),
                  })
                }
                className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none focus:border-violet-400"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-slate-600">
                Trigger
              </span>
              <select
                value={row.trigger}
                onChange={(e) =>
                  persist({
                    ...row,
                    trigger: e.target.value as JourneyTrigger,
                    updatedAt: formatJourneyAt(),
                  })
                }
                className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none"
              >
                {JOURNEY_TRIGGERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold text-slate-600">
                Exit conditions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EXIT_CONDITION_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleExit(c)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                      row.exitConditions.includes(c)
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Updated {row.updatedAt} · by {row.createdBy}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
