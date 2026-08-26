/**
 * Workspace settings CRM client — `/v1/settings` Swagger routes.
 */

import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type { SettingsValues } from "@/lib/settings/settings-store";
import type { SmtpConfig } from "@/lib/comms/smtp";

export type CrmWorkspaceSettings = {
  id?: string;
  workspaceId?: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  customDomain?: string | null;
  timezone?: string;
  dateFormat?: string;
  currency?: string;
  language?: string;
  enableLeads?: boolean;
  enableDeals?: boolean;
  enableProjects?: boolean;
  enablePosts?: boolean;
  passwordMinLength?: number;
  enforce2FA?: boolean;
  ipAllowlist?: string[];
  sessionTimeoutMinutes?: number;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpFromEmail?: string | null;
  smtpFromName?: string | null;
  revision?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CrmSettingsPatch = {
  logoKey?: string | null;
  faviconKey?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  timezone?: string;
  dateFormat?: string;
  currency?: string;
  language?: string;
  enableLeads?: boolean;
  enableDeals?: boolean;
  enableProjects?: boolean;
  enablePosts?: boolean;
  passwordMinLength?: number;
  enforce2FA?: boolean;
  ipAllowlist?: string[];
  sessionTimeoutMinutes?: number;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpFromEmail?: string | null;
  smtpFromName?: string | null;
  expectedRevision?: number;
};

export type CrmSecuritySettings = {
  passwordMinLength: number;
  enforce2FA: boolean;
  ipAllowlist: string[];
  sessionTimeoutMinutes: number;
};

export type CrmCapabilities = {
  workspaceId?: string;
  enabled: string[];
  revision?: number;
};

export type CrmSmtpTestJob = {
  jobId?: string;
  id?: string;
  state: string;
  result?: {
    reachable?: boolean;
    host?: string;
    port?: number;
    testedAt?: string;
  };
  error?: string;
};

/** Form field id → PATCH/GET workspace settings key. */
export const SETTINGS_FIELD_MAP: Record<string, keyof CrmSettingsPatch> = {
  primaryColor: "primaryColor",
  secondaryColor: "secondaryColor",
  dateFormat: "dateFormat",
  timezone: "timezone",
  currency: "currency",
  language: "language",
  customDomain: "customDomain",
  minLength: "passwordMinLength",
  idleMinutes: "sessionTimeoutMinutes",
};

export function settingsPath(suffix = ""): string {
  return `/v1/settings${suffix}`;
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

function asRecord(data: unknown): Record<string, unknown> {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return {};
}

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function pickNum(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function normalizeCrmWorkspaceSettings(
  raw: unknown,
): CrmWorkspaceSettings {
  const rec = asRecord(raw);
  const ip = rec.ipAllowlist;
  return {
    id: pickStr(rec.id) || undefined,
    workspaceId: pickStr(rec.workspaceId) || undefined,
    logoUrl: pickStr(rec.logoUrl) || null,
    faviconUrl: pickStr(rec.faviconUrl) || null,
    primaryColor: pickStr(rec.primaryColor) || null,
    secondaryColor: pickStr(rec.secondaryColor) || null,
    customDomain: pickStr(rec.customDomain) || null,
    timezone: pickStr(rec.timezone) || "UTC",
    dateFormat: pickStr(rec.dateFormat) || "YYYY-MM-DD",
    currency: pickStr(rec.currency) || "USD",
    language: pickStr(rec.language) || "en",
    enableLeads: pickBool(rec.enableLeads, true),
    enableDeals: pickBool(rec.enableDeals, true),
    enableProjects: pickBool(rec.enableProjects, true),
    enablePosts: pickBool(rec.enablePosts, false),
    passwordMinLength: pickNum(rec.passwordMinLength, 8),
    enforce2FA: pickBool(rec.enforce2FA, false),
    ipAllowlist: Array.isArray(ip)
      ? ip.filter((v): v is string => typeof v === "string")
      : [],
    sessionTimeoutMinutes: pickNum(rec.sessionTimeoutMinutes, 480),
    smtpHost: pickStr(rec.smtpHost) || null,
    smtpPort: rec.smtpPort == null ? null : pickNum(rec.smtpPort, 587),
    smtpUser: pickStr(rec.smtpUser) || null,
    smtpFromEmail: pickStr(rec.smtpFromEmail) || null,
    smtpFromName: pickStr(rec.smtpFromName) || null,
    revision: pickNum(rec.revision, 1),
    createdAt: pickStr(rec.createdAt) || undefined,
    updatedAt: pickStr(rec.updatedAt) || undefined,
  };
}

export function normalizeCrmSecuritySettings(
  raw: unknown,
): CrmSecuritySettings {
  const rec = asRecord(raw);
  const ip = rec.ipAllowlist;
  return {
    passwordMinLength: pickNum(rec.passwordMinLength, 8),
    enforce2FA: pickBool(rec.enforce2FA, false),
    ipAllowlist: Array.isArray(ip)
      ? ip.filter((v): v is string => typeof v === "string")
      : [],
    sessionTimeoutMinutes: pickNum(rec.sessionTimeoutMinutes, 480),
  };
}

export function normalizeCrmCapabilities(raw: unknown): CrmCapabilities {
  const rec = asRecord(raw);
  const enabled = rec.enabled;
  return {
    workspaceId: pickStr(rec.workspaceId) || undefined,
    enabled: Array.isArray(enabled)
      ? enabled.filter((v): v is string => typeof v === "string")
      : [],
    revision: pickNum(rec.revision, 1),
  };
}

export function overlaySettingsValues(
  values: SettingsValues,
  settings: CrmWorkspaceSettings,
): SettingsValues {
  const next = { ...values };
  for (const [field, key] of Object.entries(SETTINGS_FIELD_MAP)) {
    const raw = settings[key as keyof CrmWorkspaceSettings];
    if (raw == null || raw === "") continue;
    if (typeof raw === "boolean" || typeof raw === "number") {
      next[field] = raw;
    } else if (typeof raw === "string") {
      next[field] = raw;
    }
  }
  return next;
}

export function valuesToSettingsPatch(
  values: SettingsValues,
  expectedRevision?: number,
): CrmSettingsPatch {
  const patch: CrmSettingsPatch = {};
  for (const [field, key] of Object.entries(SETTINGS_FIELD_MAP)) {
    if (!(field in values)) continue;
    const value = values[field];
    if (value === undefined) continue;
    (patch as Record<string, unknown>)[key] = value;
  }
  if (expectedRevision != null) patch.expectedRevision = expectedRevision;
  return patch;
}

export function smtpFromWorkspaceSettings(
  settings: CrmWorkspaceSettings,
  fallback: SmtpConfig,
): SmtpConfig {
  return {
    ...fallback,
    host: settings.smtpHost || fallback.host,
    port: settings.smtpPort ?? fallback.port,
    username: settings.smtpUser || fallback.username,
    fromEmail: settings.smtpFromEmail || fallback.fromEmail,
    fromName: settings.smtpFromName || fallback.fromName,
    enabled: Boolean(settings.smtpHost),
  };
}

export function smtpToSettingsPatch(
  cfg: SmtpConfig,
  password?: string,
  expectedRevision?: number,
): CrmSettingsPatch {
  const patch: CrmSettingsPatch = {
    smtpHost: cfg.host || null,
    smtpPort: cfg.port,
    smtpUser: cfg.username || null,
    smtpFromEmail: cfg.fromEmail || null,
    smtpFromName: cfg.fromName || null,
  };
  if (password) patch.smtpPass = password;
  if (expectedRevision != null) patch.expectedRevision = expectedRevision;
  return patch;
}

async function settingsGet(suffix = ""): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to load settings");
  return crmFetch(auth, settingsPath(suffix));
}

async function settingsMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to update settings");
  return crmFetch(auth, settingsPath(suffix), init);
}

export async function getCrmWorkspaceSettings(): Promise<CrmWorkspaceSettings> {
  return normalizeCrmWorkspaceSettings(await settingsGet());
}

export async function patchCrmWorkspaceSettings(
  patch: CrmSettingsPatch,
): Promise<CrmWorkspaceSettings> {
  return normalizeCrmWorkspaceSettings(
    await settingsMutate("", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function getCrmSecuritySettings(): Promise<CrmSecuritySettings> {
  return normalizeCrmSecuritySettings(await settingsGet("/security"));
}

export async function getCrmWorkspaceCapabilities(): Promise<CrmCapabilities> {
  return normalizeCrmCapabilities(await settingsGet("/capabilities"));
}

export async function queueCrmSmtpTest(
  recipient: string,
): Promise<CrmSmtpTestJob> {
  const data = asRecord(
    await settingsMutate("/smtp-test", {
      method: "POST",
      body: JSON.stringify({ recipient }),
    }),
  );
  return {
    jobId: pickStr(data.jobId, data.id),
    id: pickStr(data.id, data.jobId),
    state: pickStr(data.state, "queued") || "queued",
  };
}

export async function getCrmSmtpTestStatus(
  jobId: string,
): Promise<CrmSmtpTestJob> {
  const data = asRecord(await settingsGet(`/smtp-test/${jobId}`));
  const result =
    data.result && typeof data.result === "object"
      ? (data.result as CrmSmtpTestJob["result"])
      : undefined;
  return {
    jobId: pickStr(data.jobId, data.id, jobId),
    id: pickStr(data.id, data.jobId, jobId),
    state: pickStr(data.state, "unknown") || "unknown",
    result,
    error: pickStr(data.error) || undefined,
  };
}

export async function tryCrmSettings<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
