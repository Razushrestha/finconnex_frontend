/**
 * Workspace settings CRM client — `/v1/settings` Swagger routes.
 */

import {
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
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
  catalog?: Record<string, SettingsValues> | null;
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
  catalog?: Record<string, SettingsValues>;
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
  logo: "logoKey",
  favicon: "faviconKey",
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

/** CRM envelopes sometimes nest `{ data: { settings } }` even after unwrap. */
function unwrapSettingsRecord(raw: unknown): Record<string, unknown> {
  let rec = asRecord(raw);
  if (rec.data && typeof rec.data === "object" && !Array.isArray(rec.data)) {
    rec = asRecord(rec.data);
  }
  if (rec.settings && typeof rec.settings === "object" && !Array.isArray(rec.settings)) {
    rec = asRecord(rec.settings);
  }
  return rec;
}

function pickStrList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string" && item.trim()) return [item.trim()];
      const rec = asRecord(item);
      const name = pickStr(rec.key, rec.module, rec.name, rec.id);
      const on = rec.enabled;
      if (name && on === false) return [];
      return name ? [name] : [];
    });
  }
  if (value && typeof value === "object") {
    return Object.entries(asRecord(value))
      .filter(([, on]) => on === true || on === "true" || on === 1)
      .map(([key]) => key);
  }
  return [];
}

function canonModule(name: string) {
  return name.trim().toLowerCase().replace(/[\s_]+/g, "");
}

export const SETTINGS_MODULE_FLAGS = [
  { key: "leads", flag: "enableLeads" },
  { key: "deals", flag: "enableDeals" },
  { key: "projects", flag: "enableProjects" },
  { key: "posts", flag: "enablePosts" },
] as const;

export type SettingsModuleFlag = (typeof SETTINGS_MODULE_FLAGS)[number]["flag"];

export function flagsFromCapabilities(
  caps: CrmCapabilities | null | undefined,
  fallback?: Pick<
    CrmWorkspaceSettings,
    "enableLeads" | "enableDeals" | "enableProjects" | "enablePosts"
  >,
): Record<SettingsModuleFlag, boolean> {
  const enabled = new Set((caps?.enabled ?? []).map(canonModule));
  const fromList = enabled.size > 0;
  return {
    enableLeads: fromList
      ? enabled.has("leads")
      : (fallback?.enableLeads ?? true),
    enableDeals: fromList
      ? enabled.has("deals")
      : (fallback?.enableDeals ?? true),
    enableProjects: fromList
      ? enabled.has("projects")
      : (fallback?.enableProjects ?? true),
    enablePosts: fromList
      ? enabled.has("posts")
      : (fallback?.enablePosts ?? false),
  };
}

export function capabilitiesFromFlags(
  flags: Record<SettingsModuleFlag, boolean>,
  workspaceId?: string,
  revision?: number,
): CrmCapabilities {
  return {
    workspaceId,
    enabled: SETTINGS_MODULE_FLAGS.filter((m) => flags[m.flag]).map((m) => m.key),
    revision,
  };
}

function isRevisionConflict(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /409|revision|conflict/i.test(msg);
}

export function smtpIdempotencyKey(recipient: string) {
  return `smtp-test:${recipient.trim().toLowerCase()}`;
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

function parseSettingsCatalog(
  raw: unknown,
): Record<string, SettingsValues> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, SettingsValues> = {};
  for (const [key, page] of Object.entries(asRecord(raw))) {
    if (!/^[a-z0-9-]{1,64}\/[a-z0-9-]{1,64}$/.test(key)) continue;
    if (!page || typeof page !== "object" || Array.isArray(page)) continue;
    const values: SettingsValues = {};
    for (const [id, value] of Object.entries(asRecord(page))) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        values[id] = value;
      }
    }
    out[key] = values;
  }
  return out;
}

export function overlayCatalogValues(
  values: SettingsValues,
  settings: CrmWorkspaceSettings,
  pageKey: string,
): SettingsValues {
  const page = settings.catalog?.[pageKey];
  if (!page) return values;
  return { ...values, ...page };
}

export function normalizeCrmWorkspaceSettings(
  raw: unknown,
): CrmWorkspaceSettings {
  const rec = unwrapSettingsRecord(raw);
  const ip = rec.ipAllowlist ?? rec.ipWhitelist ?? rec.ip_allowlist;
  return {
    id: pickStr(rec.id) || undefined,
    workspaceId: pickStr(rec.workspaceId, rec.workspace_id) || undefined,
    logoUrl: pickStr(rec.logoUrl, rec.logo_url) || null,
    faviconUrl: pickStr(rec.faviconUrl, rec.favicon_url) || null,
    primaryColor: pickStr(rec.primaryColor, rec.primary_color) || null,
    secondaryColor: pickStr(rec.secondaryColor, rec.secondary_color) || null,
    customDomain: pickStr(rec.customDomain, rec.custom_domain) || null,
    timezone: pickStr(rec.timezone) || "UTC",
    dateFormat: pickStr(rec.dateFormat, rec.date_format) || "YYYY-MM-DD",
    currency: pickStr(rec.currency) || "USD",
    language: pickStr(rec.language) || "en",
    enableLeads: pickBool(rec.enableLeads ?? rec.enable_leads, true),
    enableDeals: pickBool(rec.enableDeals ?? rec.enable_deals, true),
    enableProjects: pickBool(rec.enableProjects ?? rec.enable_projects, true),
    enablePosts: pickBool(rec.enablePosts ?? rec.enable_posts, false),
    passwordMinLength: pickNum(
      rec.passwordMinLength ?? rec.password_min_length,
      8,
    ),
    enforce2FA: pickBool(
      rec.enforce2FA ?? rec.enforce2fa ?? rec.require2FA,
      false,
    ),
    ipAllowlist: pickStrList(ip),
    sessionTimeoutMinutes: pickNum(
      rec.sessionTimeoutMinutes ?? rec.sessionTimeout ?? rec.session_timeout_minutes,
      480,
    ),
    smtpHost: pickStr(rec.smtpHost, rec.smtp_host) || null,
    smtpPort:
      rec.smtpPort == null && rec.smtp_port == null
        ? null
        : pickNum(rec.smtpPort ?? rec.smtp_port, 587),
    smtpUser: pickStr(rec.smtpUser, rec.smtp_user) || null,
    smtpFromEmail: pickStr(rec.smtpFromEmail, rec.smtp_from_email) || null,
    smtpFromName: pickStr(rec.smtpFromName, rec.smtp_from_name) || null,
    revision: pickNum(rec.revision, 1),
    catalog: parseSettingsCatalog(rec.catalog),
    createdAt: pickStr(rec.createdAt, rec.created_at) || undefined,
    updatedAt: pickStr(rec.updatedAt, rec.updated_at) || undefined,
  };
}

export function normalizeCrmSecuritySettings(
  raw: unknown,
): CrmSecuritySettings {
  const rec = unwrapSettingsRecord(raw);
  const ip = rec.ipAllowlist ?? rec.ipWhitelist ?? rec.ip_allowlist;
  return {
    passwordMinLength: pickNum(
      rec.passwordMinLength ?? rec.password_min_length,
      8,
    ),
    enforce2FA: pickBool(
      rec.enforce2FA ?? rec.enforce2fa ?? rec.require2FA,
      false,
    ),
    ipAllowlist: pickStrList(ip),
    sessionTimeoutMinutes: pickNum(
      rec.sessionTimeoutMinutes ?? rec.sessionTimeout ?? rec.session_timeout_minutes,
      480,
    ),
  };
}

export function normalizeCrmCapabilities(raw: unknown): CrmCapabilities {
  const rec = unwrapSettingsRecord(raw);
  const enabled = pickStrList(
    rec.enabled ?? rec.modules ?? rec.capabilities ?? rec.flags,
  ).map((name) => {
    const lower = canonModule(name);
    const known = SETTINGS_MODULE_FLAGS.find((m) => m.key === lower);
    return known?.key ?? lower;
  });
  return {
    workspaceId: pickStr(rec.workspaceId, rec.workspace_id) || undefined,
    enabled,
    revision: pickNum(rec.revision, 1),
  };
}

export function normalizeCrmSmtpTestJob(
  raw: unknown,
  fallbackId?: string,
): CrmSmtpTestJob {
  const rec = unwrapSettingsRecord(raw);
  const nested = asRecord(rec.job ?? rec.result);
  const resultRaw =
    rec.result && typeof rec.result === "object" ? asRecord(rec.result) : nested;
  const state = pickStr(
    rec.state,
    rec.status,
    nested.state,
    nested.status,
    "queued",
  ).toLowerCase();
  return {
    jobId: pickStr(rec.jobId, rec.id, nested.jobId, nested.id, fallbackId),
    id: pickStr(rec.id, rec.jobId, nested.id, fallbackId),
    state: state || "queued",
    result: {
      reachable:
        typeof resultRaw.reachable === "boolean"
          ? resultRaw.reachable
          : undefined,
      host: pickStr(resultRaw.host) || undefined,
      port:
        resultRaw.port == null ? undefined : pickNum(resultRaw.port, 0) || undefined,
      testedAt: pickStr(resultRaw.testedAt, resultRaw.tested_at) || undefined,
    },
    error:
      /fail|error/.test(state)
        ? pickStr(rec.error, rec.message, nested.error) || undefined
        : pickStr(rec.error, nested.error) || undefined,
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

/** Overlay the safe security subset from GET /v1/settings/security. */
export function overlaySecurityValues(
  values: SettingsValues,
  security: CrmSecuritySettings,
): SettingsValues {
  return {
    ...values,
    minLength: security.passwordMinLength,
    idleMinutes: security.sessionTimeoutMinutes,
  };
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
    if ((key === "logoKey" || key === "faviconKey") && value === "") continue;
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
  if (!isBoundCrmSession()) {
    return crmBffFetch(settingsPath(suffix));
  }
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to load settings");
  return crmFetch(auth, settingsPath(suffix));
}

async function settingsMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  if (!isBoundCrmSession()) {
    return crmBffFetch(settingsPath(suffix), init);
  }
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
  const run = (body: CrmSettingsPatch) =>
    settingsMutate("", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  try {
    return normalizeCrmWorkspaceSettings(await run(patch));
  } catch (err) {
    if (!isRevisionConflict(err)) throw err;
    const fresh = await getCrmWorkspaceSettings();
    return normalizeCrmWorkspaceSettings(
      await run({ ...patch, expectedRevision: fresh.revision }),
    );
  }
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
  const to = recipient.trim();
  const key = smtpIdempotencyKey(to);
  return normalizeCrmSmtpTestJob(
    await settingsMutate("/smtp-test", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({ recipient: to }),
    }),
  );
}

export async function getCrmSmtpTestStatus(
  jobId: string,
): Promise<CrmSmtpTestJob> {
  return normalizeCrmSmtpTestJob(
    await settingsGet(`/smtp-test/${jobId}`),
    jobId,
  );
}

export async function getCrmSettingsCatalog(): Promise<{
  catalog: Record<string, SettingsValues>;
  revision: number;
}> {
  const rec = unwrapSettingsRecord(await settingsGet("/pages"));
  return {
    catalog: parseSettingsCatalog(rec.catalog) ?? {},
    revision: pickNum(rec.revision, 1),
  };
}

export async function getCrmSettingsPage(
  category: string,
  subpage: string,
): Promise<{
  pageKey: string;
  values: SettingsValues;
  revision: number;
}> {
  const rec = unwrapSettingsRecord(
    await settingsGet(
      `/pages/${encodeURIComponent(category)}/${encodeURIComponent(subpage)}`,
    ),
  );
  const values: SettingsValues = {};
  for (const [id, value] of Object.entries(asRecord(rec.values))) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      values[id] = value;
    }
  }
  return {
    pageKey: pickStr(rec.pageKey) || `${category}/${subpage}`,
    values,
    revision: pickNum(rec.revision, 1),
  };
}

export async function putCrmSettingsPage(
  category: string,
  subpage: string,
  values: SettingsValues,
  expectedRevision?: number,
): Promise<CrmWorkspaceSettings> {
  const body: Record<string, unknown> = { values };
  if (expectedRevision != null) body.expectedRevision = expectedRevision;
  const run = () =>
    settingsMutate(
      `/pages/${encodeURIComponent(category)}/${encodeURIComponent(subpage)}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  try {
    return normalizeCrmWorkspaceSettings(await run());
  } catch (err) {
    if (!isRevisionConflict(err)) throw err;
    const fresh = await getCrmWorkspaceSettings();
    return normalizeCrmWorkspaceSettings(
      await settingsMutate(
        `/pages/${encodeURIComponent(category)}/${encodeURIComponent(subpage)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            values,
            expectedRevision: fresh.revision,
          }),
        },
      ),
    );
  }
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
