/**
 * Lead Kanban card + column preference
 * GET/PUT /v1/workspaces/:id/preferences/kanban/leads
 *
 * Display titles and which enum stages are visible. Does not create Postgres
 * MortgagePipelineStage values.
 */

import {
  ensureCrmSession,
  isBoundCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import { resolvePipelineStage, stageColumnId } from "@/lib/pipeline-sla/board";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";
import type { KanbanViewConfig } from "@/components/common/KanbanViewControls";

export type CrmLeadKanbanPreference = {
  selectedFieldIds: string[];
  selectedStageIds: string[];
  stageLabels: Record<string, string>;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  for (const key of ["data", "preference", "preferences", "value", "config", "card"]) {
    const nested = rec[key];
    if (
      nested &&
      typeof nested === "object" &&
      !Array.isArray(nested) &&
      nested !== raw
    ) {
      return nested as Record<string, unknown>;
    }
  }
  return rec;
}

function coerceStageColumnId(raw: string): string {
  const id = raw.trim();
  if (!id) return "";
  const slug = MORTGAGE_PIPELINE_STAGES.find(
    (stage) => stageColumnId(stage) === id,
  );
  if (slug) return stageColumnId(slug);
  const resolved =
    resolvePipelineStage(id) ||
    resolvePipelineStage(id.replace(/_/g, " ")) ||
    resolvePipelineStage(id.replace(/-/g, " "));
  return resolved ? stageColumnId(resolved) : id;
}
function asStringList(value: unknown, asStage = false): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      out.push(asStage ? coerceStageColumnId(item.trim()) : item.trim());
      continue;
    }
    if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      const id = pickStr(rec.id, rec.key, rec.field, rec.stageId, rec.stage);
      if (id) out.push(asStage ? coerceStageColumnId(id) : id);
    }
  }
  return out;
}

function asLabelMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw.trim()) out[key] = raw.trim();
  }
  return out;
}

function labelsFromColumns(value: unknown): Record<string, string> {
  if (!Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = coerceStageColumnId(pickStr(rec.id, rec.key, rec.stageId, rec.stage));
    const label = pickStr(rec.label, rec.title, rec.name);
    if (id && label) out[id] = label;
  }
  return out;
}

function visibleIdsFromColumns(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = coerceStageColumnId(pickStr(rec.id, rec.key, rec.stageId, rec.stage));
    if (!id) continue;
    if (rec.visible === false) continue;
    out.push(id);
  }
  return out;
}

export function workspaceLeadKanbanPreferencePath(workspaceId: string) {
  return `/v1/workspaces/${workspaceId}/preferences/kanban/leads`;
}

export function isEmptyLeadKanbanPreference(pref: CrmLeadKanbanPreference) {
  return (
    pref.selectedFieldIds.length === 0 &&
    pref.selectedStageIds.length === 0 &&
    Object.keys(pref.stageLabels).length === 0
  );
}

export function normalizeCrmLeadKanbanPreference(
  raw: unknown,
): CrmLeadKanbanPreference {
  const rec = asRecord(raw) ?? {};
  const columns = rec.columns ?? rec.stages ?? rec.stageColumns;
  const selectedFieldIds = asStringList(
    rec.selectedFieldIds ??
      rec.visibleFieldIds ??
      rec.visibleFields ??
      rec.fields ??
      rec.cardFields,
  );
  const fromIds = asStringList(
    rec.selectedStageIds ?? rec.visibleStageIds ?? rec.visibleStages,
    true,
  );
  const selectedStageIds = fromIds.length ? fromIds : visibleIdsFromColumns(columns);
  const stageLabels = {
    ...labelsFromColumns(columns),
    ...Object.fromEntries(
      Object.entries(asLabelMap(rec.stageLabels ?? rec.labels ?? rec.titles)).map(
        ([key, label]) => [coerceStageColumnId(key) || key, label],
      ),
    ),
  };
  return { selectedFieldIds, selectedStageIds, stageLabels };
}

export function toLeadKanbanPreferenceBodies(
  pref: CrmLeadKanbanPreference,
): Record<string, unknown>[] {
  const columns = pref.selectedStageIds.map((id) => ({
    id,
    key: id,
    label: pref.stageLabels[id] || undefined,
    visible: true,
  }));
  return [
    {
      selectedFieldIds: pref.selectedFieldIds,
      visibleFieldIds: pref.selectedFieldIds,
      fields: pref.selectedFieldIds,
      selectedStageIds: pref.selectedStageIds,
      visibleStageIds: pref.selectedStageIds,
      stageLabels: pref.stageLabels,
      columns,
    },
    {
      selectedFieldIds: pref.selectedFieldIds,
      selectedStageIds: pref.selectedStageIds,
      stageLabels: pref.stageLabels,
    },
    {
      visibleFields: pref.selectedFieldIds,
      visibleStages: pref.selectedStageIds,
      stageLabels: pref.stageLabels,
    },
    {
      selectedFieldIds: pref.selectedFieldIds,
      visibleFieldIds: pref.selectedFieldIds,
      fields: pref.selectedFieldIds,
    },
  ];
}

export function kanbanPreferenceFromView(
  view: KanbanViewConfig,
): CrmLeadKanbanPreference {
  return {
    selectedFieldIds: [...view.selectedFieldIds],
    selectedStageIds: [...(view.selectedStageIds ?? [])],
    stageLabels: { ...(view.stageLabels ?? {}) },
  };
}

export function applyKanbanPreferenceToView(
  fallback: KanbanViewConfig,
  pref: CrmLeadKanbanPreference,
): KanbanViewConfig {
  if (isEmptyLeadKanbanPreference(pref)) return { ...fallback };
  return {
    ...fallback,
    selectedFieldIds: pref.selectedFieldIds.length
      ? pref.selectedFieldIds
      : fallback.selectedFieldIds,
    selectedStageIds: pref.selectedStageIds.length
      ? pref.selectedStageIds
      : fallback.selectedStageIds,
    stageLabels: {
      ...(fallback.stageLabels ?? {}),
      ...pref.stageLabels,
    },
  };
}

async function withWorkspace<T>(
  run: (session: CrmSession) => Promise<T>,
): Promise<T> {
  const scoped = await ensureCrmSession();
  if (!scoped) throw new Error("Sign in to manage Kanban preferences");
  return run(scoped);
}

async function kanbanCall(path: string, init?: RequestInit): Promise<unknown> {
  return withWorkspace(async (session) => {
    if (isBoundCrmSession()) return crmFetch(session, path, init);
    if (typeof window !== "undefined") return crmBffFetch(path, init);
    return crmFetch(session, path, init);
  });
}

function isWhitelistRejection(err: unknown) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /property |should not exist|whitelist|unknown property|could not save/i.test(
    message,
  );
}

export async function getCrmLeadKanbanPreference(): Promise<CrmLeadKanbanPreference> {
  return withWorkspace(async (session) =>
    normalizeCrmLeadKanbanPreference(
      await kanbanCall(workspaceLeadKanbanPreferencePath(session.workspaceId)),
    ),
  );
}

export async function putCrmLeadKanbanPreference(
  preference: CrmLeadKanbanPreference,
): Promise<CrmLeadKanbanPreference> {
  return withWorkspace(async (session) => {
    const path = workspaceLeadKanbanPreferencePath(session.workspaceId);
    const bodies = toLeadKanbanPreferenceBodies(preference);
    let lastError: unknown;
    for (const body of bodies) {
      try {
        return normalizeCrmLeadKanbanPreference(
          await kanbanCall(path, {
            method: "PUT",
            body: JSON.stringify(body),
          }),
        );
      } catch (err) {
        lastError = err;
        if (!isWhitelistRejection(err)) throw err;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Could not save Kanban preference");
  });
}

export async function tryCrmLeadKanbanPreference<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistCrmLeadKanbanPreference(view: KanbanViewConfig) {
  void tryCrmLeadKanbanPreference(() =>
    putCrmLeadKanbanPreference(kanbanPreferenceFromView(view)),
  );
}
