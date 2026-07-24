"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import {
  DEFAULT_MORTGAGE_PIPELINE_SLA,
} from "@/lib/pipeline-sla/seed";
import {
  PIPELINE_SLA_SETTINGS_PATH,
  durationSelectOptions,
  durationToSelectValue,
  loadPipelineSlaConfig,
  savePipelineSlaConfig,
  selectValueToDuration,
} from "@/lib/pipeline-sla/settings";
import { formatSlaDuration } from "@/lib/pipeline-sla/engine";
import type {
  MilestoneSlaRow,
  MortgagePipelineStage,
  PipelineSlaConfig,
  StageSlaRow,
} from "@/lib/pipeline-sla/types";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";
import { cn } from "@/lib/utils";

export function PipelineSlaSettingsClient() {
  const [config, setConfig] = useState<PipelineSlaConfig>(() =>
    loadPipelineSlaConfig(),
  );
  const [toast, setToast] = useState<string | null>(null);
  const durationOptions = useMemo(() => durationSelectOptions(), []);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  function onCancel() {
    setConfig(loadPipelineSlaConfig());
    flash("Reverted to last saved");
  }

  function onResetDefaults() {
    setConfig(structuredClone(DEFAULT_MORTGAGE_PIPELINE_SLA));
    flash("Restored mortgage defaults (not saved yet)");
  }

  function onSave() {
    const saved = savePipelineSlaConfig(config);
    setConfig(saved);
    flash("Saved — lead cards will refresh");
  }

  function setStageDuration(stage: MortgagePipelineStage, value: string) {
    setConfig((prev) => ({
      ...prev,
      stageSlas: prev.stageSlas.map((row) =>
        row.stage === stage
          ? { ...row, duration: selectValueToDuration(value) }
          : row,
      ),
    }));
  }

  function updateMilestone(
    id: string,
    patch: Partial<MilestoneSlaRow>,
  ) {
    setConfig((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      ),
    }));
  }

  function addMilestone() {
    const id = `ms-${Date.now()}`;
    setConfig((prev) => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        {
          id,
          startStage: "New Lead",
          targetStage: "Appointment Booked",
          duration: { amount: 1, unit: "days" },
        },
      ],
    }));
  }

  function removeMilestone(id: string) {
    setConfig((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((m) => m.id !== id),
    }));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-bold tracking-tight text-slate-900">
              {config.pipelineName}
            </h2>
            <p className="mt-0.5 max-w-2xl text-[12px] leading-relaxed text-slate-500">
              Two clocks per lead: <strong className="font-semibold text-slate-700">Stage SLA</strong>{" "}
              (resets when the stage changes) and{" "}
              <strong className="font-semibold text-slate-700">Milestone SLA</strong>{" "}
              (runs from pipeline start until the target stage). Badges on the Lead
              Card: On Track, Due Today, At Risk, Overdue, Milestone Overdue.
            </p>
          </div>
          <Link
            href="/sales/leads"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Leads board
          </Link>
        </div>
      </div>

      <div className="space-y-8 p-5 sm:p-6">
        <section>
          <h3 className="text-[13px] font-semibold text-slate-900">
            Stage SLAs
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Time allowed in each mortgage stage. Settled / Lost have no SLA.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-[12px]">
              <thead className="bg-slate-50 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {config.stageSlas.map((row: StageSlaRow) => {
                  const locked = row.stage === "Settled" || row.stage === "Lost";
                  return (
                    <tr
                      key={row.stage}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {row.stage}
                      </td>
                      <td className="px-3 py-2">
                        {locked ? (
                          <span className="text-slate-400">None</span>
                        ) : (
                          <select
                            aria-label={`Stage SLA for ${row.stage}`}
                            value={durationToSelectValue(row.duration)}
                            onChange={(e) =>
                              setStageDuration(row.stage, e.target.value)
                            }
                            className="h-9 w-full max-w-[12rem] rounded-lg border border-slate-200 bg-white px-2 text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-violet-300"
                          >
                            {durationOptions.map((opt) => (
                              <option key={opt.value || "none"} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[13px] font-semibold text-slate-900">
                Milestone SLAs
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Clock starts at the start stage (usually New Lead) and stops when
                the target stage is reached.
              </p>
            </div>
            <button
              type="button"
              onClick={addMilestone}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add milestone
            </button>
          </div>

          <ul className="mt-3 space-y-2">
            {config.milestones.map((m) => (
              <li
                key={m.id}
                className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end"
              >
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Start
                  </span>
                  <select
                    value={m.startStage}
                    onChange={(e) =>
                      updateMilestone(m.id, {
                        startStage: e.target.value as MortgagePipelineStage,
                      })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {MORTGAGE_PIPELINE_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Target
                  </span>
                  <select
                    value={m.targetStage}
                    onChange={(e) =>
                      updateMilestone(m.id, {
                        targetStage: e.target.value as MortgagePipelineStage,
                      })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {MORTGAGE_PIPELINE_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Duration
                  </span>
                  <select
                    value={durationToSelectValue(m.duration)}
                    onChange={(e) => {
                      const d = selectValueToDuration(e.target.value);
                      if (d) updateMilestone(m.id, { duration: d });
                    }}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {durationOptions
                      .filter((o) => o.value)
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => removeMilestone(m.id)}
                  aria-label={`Remove milestone ${m.startStage} to ${m.targetStage}`}
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-700",
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <p className="text-[10px] text-slate-400 sm:col-span-4">
                  {m.startStage} → {m.targetStage} within{" "}
                  {formatSlaDuration(m.duration)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-[11px] text-slate-400">
          Settings path:{" "}
          <code className="rounded bg-slate-100 px-1">
            {PIPELINE_SLA_SETTINGS_PATH}
          </code>
          . Kanban statuses map to mortgage stages (New→New Lead, Contacted→In
          Conversation, Qualified→Waiting on Documents, Converted→Settled,
          Unqualified→Lost).
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
        <button
          type="button"
          onClick={onResetDefaults}
          className="mr-auto h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          Reset defaults
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="h-9 rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700"
        >
          Save changes
        </button>
      </div>

      {toast && (
        <div
          className="fixed right-4 bottom-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
