/**
 * Lead Kanban card preference
 * GET/PUT /v1/workspaces/:id/preferences/kanban/leads
 *
 * Nest `LeadKanbanPreferenceDto` — card layout only (not column titles).
 */

import {
  ensureCrmSession,
  isBoundCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import type { LeadCardSettings } from "@/lib/leads/lead-card-settings";

/** Nest whitelist for `dynamicFieldKeys` (LeadKanbanPreferenceDto). */
export const CRM_KANBAN_DYNAMIC_FIELD_KEYS = [
  "company",
  "email",
  "phone",
  "pipelineSla",
  "lastActivity",
  "nextBestAction",
  "tags",
] as const;

export type CrmKanbanDynamicFieldKey =
  (typeof CRM_KANBAN_DYNAMIC_FIELD_KEYS)[number];

const CRM_FIELD_SET = new Set<string>(CRM_KANBAN_DYNAMIC_FIELD_KEYS);

export type CrmLeadKanbanPreference = {
  showOwnerAvatar: boolean;
  dynamicFieldKeys: string[];
  unrepliedThresholdHours: number;
};

export const DEFAULT_CRM_LEAD_KANBAN_PREFERENCE: CrmLeadKanbanPreference = {
  showOwnerAvatar: true,
  dynamicFieldKeys: ["company", "email", "pipelineSla", "lastActivity"],
  unrepliedThresholdHours: 24,
};

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  for (const key of ["data", "preference", "preferences", "value", "config"]) {
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

export function sanitizeCrmKanbanDynamicFields(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  const out: string[] = [];
  for (const item of keys) {
    if (typeof item !== "string") continue;
    const key = item.trim();
    if (!CRM_FIELD_SET.has(key) || out.includes(key)) continue;
    out.push(key);
    if (out.length >= 4) break;
  }
  return out;
}

export function workspaceLeadKanbanPreferencePath(workspaceId: string) {
  return `/v1/workspaces/${workspaceId}/preferences/kanban/leads`;
}

export function isEmptyLeadKanbanPreference(pref: CrmLeadKanbanPreference) {
  return (
    pref.dynamicFieldKeys.length === 0 &&
    pref.unrepliedThresholdHours ===
      DEFAULT_CRM_LEAD_KANBAN_PREFERENCE.unrepliedThresholdHours &&
    pref.showOwnerAvatar === DEFAULT_CRM_LEAD_KANBAN_PREFERENCE.showOwnerAvatar
  );
}

export function normalizeCrmLeadKanbanPreference(
  raw: unknown,
): CrmLeadKanbanPreference {
  const rec = asRecord(raw) ?? {};
  const hours = Number(rec.unrepliedThresholdHours);
  const dynamicFieldKeys = sanitizeCrmKanbanDynamicFields(
    rec.dynamicFieldKeys ?? rec.selectedFieldIds ?? rec.fields,
  );
  return {
    showOwnerAvatar:
      typeof rec.showOwnerAvatar === "boolean"
        ? rec.showOwnerAvatar
        : DEFAULT_CRM_LEAD_KANBAN_PREFERENCE.showOwnerAvatar,
    dynamicFieldKeys: dynamicFieldKeys.length
      ? dynamicFieldKeys
      : [...DEFAULT_CRM_LEAD_KANBAN_PREFERENCE.dynamicFieldKeys],
    unrepliedThresholdHours:
      Number.isFinite(hours) && hours >= 1 && hours <= 168
        ? Math.round(hours)
        : DEFAULT_CRM_LEAD_KANBAN_PREFERENCE.unrepliedThresholdHours,
  };
}

/** Single PUT body that matches Nest `LeadKanbanPreferenceDto`. */
export function toLeadKanbanPreferenceBody(
  pref: CrmLeadKanbanPreference,
): CrmLeadKanbanPreference {
  const dynamicFieldKeys = sanitizeCrmKanbanDynamicFields(pref.dynamicFieldKeys);
  return {
    showOwnerAvatar: Boolean(pref.showOwnerAvatar),
    dynamicFieldKeys: dynamicFieldKeys.length
      ? dynamicFieldKeys
      : [...DEFAULT_CRM_LEAD_KANBAN_PREFERENCE.dynamicFieldKeys],
    unrepliedThresholdHours: Math.min(
      168,
      Math.max(1, Math.round(Number(pref.unrepliedThresholdHours) || 24)),
    ),
  };
}

export function kanbanPreferenceFromLeadCard(
  settings: LeadCardSettings,
): CrmLeadKanbanPreference {
  return toLeadKanbanPreferenceBody({
    showOwnerAvatar: settings.showOwnerAvatar,
    dynamicFieldKeys: settings.dynamicFieldKeys,
    unrepliedThresholdHours: settings.unrepliedThresholdHours,
  });
}

export function applyKanbanPreferenceToLeadCard(
  fallback: LeadCardSettings,
  pref: CrmLeadKanbanPreference,
): LeadCardSettings {
  const normalized = normalizeCrmLeadKanbanPreference(pref);
  const crmKeys = sanitizeCrmKanbanDynamicFields(normalized.dynamicFieldKeys);
  const localOnly = fallback.dynamicFieldKeys.filter(
    (key) => !CRM_FIELD_SET.has(key),
  );
  const merged = [...crmKeys, ...localOnly].slice(0, 4);
  return {
    ...fallback,
    showOwnerAvatar: normalized.showOwnerAvatar,
    unrepliedThresholdHours: normalized.unrepliedThresholdHours,
    dynamicFieldKeys: merged.length ? merged : fallback.dynamicFieldKeys,
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
    const body = toLeadKanbanPreferenceBody(preference);
    return normalizeCrmLeadKanbanPreference(
      await kanbanCall(path, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    );
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

export function persistCrmLeadKanbanPreference(settings: LeadCardSettings) {
  void tryCrmLeadKanbanPreference(() =>
    putCrmLeadKanbanPreference(kanbanPreferenceFromLeadCard(settings)),
  );
}
