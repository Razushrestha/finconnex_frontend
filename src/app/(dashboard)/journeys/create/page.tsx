"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft, Route, Save } from "lucide-react";
import {
  EXIT_CONDITION_PRESETS,
  JOURNEY_OWNERS,
  JOURNEY_TRIGGERS,
  createStep,
  formatJourneyAt,
  nextJourneyIds,
  upsertJourney,
  type JourneyTrigger,
} from "@/lib/journeys/types";
import {
  JourneyCanvas,
  JourneyStepInspector,
} from "@/components/journeys/JourneyCanvas";
import type { JourneyStep } from "@/lib/journeys/types";
import { cn } from "@/lib/utils";

export default function CreateJourneyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<JourneyTrigger>("Lead Created");
  const [createdBy, setCreatedBy] = useState<string>(JOURNEY_OWNERS[0]);
  const [exitConditions, setExitConditions] = useState<string[]>([
    EXIT_CONDITION_PRESETS[0],
    EXIT_CONDITION_PRESETS[5],
  ]);
  const [steps, setSteps] = useState<JourneyStep[]>([
    createStep("Send Email", { label: "Welcome", detail: "Template: Welcome" }),
    createStep("Wait", { label: "Wait 2 days" }),
    createStep("Create Task", { label: "Follow-up call" }),
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(
    steps[0]?.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  const selected = steps.find((s) => s.id === selectedId) ?? null;

  function toggleExit(cond: string) {
    setExitConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond],
    );
  }

  function updateSelected(next: JourneyStep) {
    setSteps((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  }

  function onSave() {
    if (!name.trim()) {
      setError("Journey name is required");
      return;
    }
    if (steps.length === 0) {
      setError("Add at least one step");
      return;
    }
    const ids = nextJourneyIds();
    const created = upsertJourney({
      id: ids.id,
      journeyId: ids.journeyId,
      name: name.trim(),
      trigger,
      status: "Draft",
      exitConditions,
      steps,
      enrollments: [],
      createdBy,
      updatedAt: formatJourneyAt(),
    });
    router.push(`/journeys/${created.id}`);
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Build journey
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <Route className="h-2.5 w-2.5" />
              Canvas
            </span>
          </div>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700"
          >
            <Save className="h-3.5 w-3.5" />
            Save draft
          </button>
        </div>

        {error ? (
          <p className="mb-2 text-[11px] font-medium text-rose-600">{error}</p>
        ) : null}

        <div className="mb-3 grid gap-3 rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Journey name *
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. New Lead → Onboarding"
              className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none focus:border-violet-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-slate-600">
              Trigger *
            </span>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as JourneyTrigger)}
              className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none"
            >
              {JOURNEY_TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-slate-600">
              Created by
            </span>
            <select
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none"
            >
              {JOURNEY_OWNERS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
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
                    exitConditions.includes(c)
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_280px]">
          <JourneyCanvas
            steps={steps}
            onChange={setSteps}
            selectedId={selectedId}
            onSelect={setSelectedId}
            showMetrics={false}
          />
          <JourneyStepInspector step={selected} onChange={updateSelected} />
        </div>
      </div>
    </div>
  );
}
