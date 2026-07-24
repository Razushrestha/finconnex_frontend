/**
 * Persist Mortgage Pipeline SLA config (Settings → CRM → Pipelines).
 */

import {
  loadSettingsValues,
  saveSettingsValues,
} from "@/lib/settings/settings-store";
import { DEFAULT_MORTGAGE_PIPELINE_SLA } from "@/lib/pipeline-sla/seed";
import type {
  MilestoneSlaRow,
  PipelineSlaConfig,
  SlaDuration,
  SlaDurationUnit,
  StageSlaRow,
} from "@/lib/pipeline-sla/types";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";
import { isBrowser } from "@/lib/rules/storage";

export const PIPELINE_SLA_SETTINGS_KEY = "crm-configuration/pipelines";
export const PIPELINE_SLA_SETTINGS_PATH = "/settings/crm-configuration/pipelines";

const STAGE_SET = new Set<string>(MORTGAGE_PIPELINE_STAGES);

function parseDuration(raw: unknown): SlaDuration | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const m = raw.trim().match(/^(\d+)\s*(minutes?|hours?|days?)$/i);
    if (!m) return null;
    const amount = Number(m[1]);
    const u = m[2]!.toLowerCase();
    const unit: SlaDurationUnit = u.startsWith("min")
      ? "minutes"
      : u.startsWith("hour")
        ? "hours"
        : "days";
    return { amount, unit };
  }
  if (typeof raw === "object" && raw !== null) {
    const o = raw as { amount?: number; unit?: string };
    if (typeof o.amount === "number" && o.unit) {
      const unit = o.unit as SlaDurationUnit;
      if (unit === "minutes" || unit === "hours" || unit === "days") {
        return { amount: o.amount, unit };
      }
    }
  }
  return null;
}

function parseConfig(raw: unknown): PipelineSlaConfig {
  if (!raw || typeof raw !== "object") {
    return structuredClone(DEFAULT_MORTGAGE_PIPELINE_SLA);
  }
  const o = raw as Partial<PipelineSlaConfig>;
  const base = structuredClone(DEFAULT_MORTGAGE_PIPELINE_SLA);
  const stageSlas: StageSlaRow[] = base.stageSlas.map((row) => {
    const hit = (o.stageSlas ?? []).find((r) => r.stage === row.stage);
    if (!hit) return row;
    return {
      stage: row.stage,
      duration:
        hit.duration === null ? null : parseDuration(hit.duration) ?? row.duration,
    };
  });

  const milestones: MilestoneSlaRow[] = (o.milestones ?? base.milestones)
    .map((m, i) => {
      const start = STAGE_SET.has(m.startStage)
        ? m.startStage
        : base.milestones[0]!.startStage;
      const target = STAGE_SET.has(m.targetStage)
        ? m.targetStage
        : base.milestones[0]!.targetStage;
      const duration =
        parseDuration(m.duration) ?? { amount: 10, unit: "days" as const };
      return {
        id: m.id || `ms-${i}`,
        startStage: start,
        targetStage: target,
        duration,
      };
    })
    .filter((m) => m.startStage !== m.targetStage);

  return {
    pipelineId: o.pipelineId || base.pipelineId,
    pipelineName: o.pipelineName || base.pipelineName,
    stageSlas,
    milestones: milestones.length ? milestones : base.milestones,
  };
}

export function loadPipelineSlaConfig(): PipelineSlaConfig {
  const values = loadSettingsValues(PIPELINE_SLA_SETTINGS_KEY);
  const raw = values.configJson;
  if (typeof raw !== "string" || !raw.trim()) {
    return structuredClone(DEFAULT_MORTGAGE_PIPELINE_SLA);
  }
  try {
    return parseConfig(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_MORTGAGE_PIPELINE_SLA);
  }
}

export function savePipelineSlaConfig(config: PipelineSlaConfig): PipelineSlaConfig {
  const normalized = parseConfig(config);
  saveSettingsValues(
    PIPELINE_SLA_SETTINGS_KEY,
    {
      pipelineName: normalized.pipelineName,
      configJson: JSON.stringify(normalized),
    },
    {
      path: PIPELINE_SLA_SETTINGS_PATH,
      title: "Pipelines",
    },
  );
  if (isBrowser() && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("finconnex:pipeline-sla"));
  }
  return normalized;
}

export function onPipelineSlaChange(handler: () => void): () => void {
  if (!isBrowser()) return () => {};
  const listener = () => handler();
  window.addEventListener("finconnex:pipeline-sla", listener);
  return () => window.removeEventListener("finconnex:pipeline-sla", listener);
}

export function durationSelectOptions(): { value: string; label: string }[] {
  return [
    { value: "", label: "None" },
    { value: "30 minutes", label: "30 Minutes" },
    { value: "1 hours", label: "1 Hour" },
    { value: "2 hours", label: "2 Hours" },
    { value: "1 days", label: "1 Day" },
    { value: "2 days", label: "2 Days" },
    { value: "5 days", label: "5 Days" },
    { value: "7 days", label: "7 Days" },
    { value: "10 days", label: "10 Days" },
    { value: "12 days", label: "12 Days" },
    { value: "14 days", label: "14 Days" },
    { value: "21 days", label: "21 Days" },
    { value: "60 days", label: "60 Days" },
  ];
}

export function durationToSelectValue(d: SlaDuration | null): string {
  if (!d) return "";
  return `${d.amount} ${d.unit}`;
}

export function selectValueToDuration(v: string): SlaDuration | null {
  return parseDuration(v);
}
