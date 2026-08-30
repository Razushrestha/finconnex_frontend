import {
  ensureCrmAccess,
  ensureCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import { replaceCrmNotificationPreferences } from "@/lib/notification-preferences/store";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationDigest,
  type NotificationPreferences,
} from "@/lib/notification-preferences/types";

export function workspaceNotificationPreferencesPath(
  workspaceId: string,
): string {
  return `/v1/workspaces/${workspaceId}/notification-preferences`;
}

export function globalNotificationPreferencesPath(): string {
  return `/v1/notification-preferences`;
}

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function asBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const value = raw.toLowerCase();
    if (value === "true" || value === "1" || value === "enabled" || value === "on") {
      return true;
    }
    if (value === "false" || value === "0" || value === "disabled" || value === "off") {
      return false;
    }
  }
  return fallback;
}

function asDigest(raw: unknown): NotificationDigest {
  const value = pickStr(raw).toLowerCase().replace(/[_-]/g, "");
  if (value.includes("real") || value === "immediate") return "realtime";
  if (value.includes("week")) return "weekly";
  if (value === "off" || value === "none" || value === "disabled") return "off";
  if (value.includes("day") || value === "daily") return "daily";
  return DEFAULT_NOTIFICATION_PREFERENCES.digest;
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  if (rec.data && rec.data !== raw && typeof rec.data === "object" && !Array.isArray(rec.data)) {
    return rec.data as Record<string, unknown>;
  }
  if (rec.preferences && typeof rec.preferences === "object" && !Array.isArray(rec.preferences)) {
    return rec.preferences as Record<string, unknown>;
  }
  return rec;
}

function channelEnabled(
  raw: Record<string, unknown>,
  keys: string[],
  nestedKeys: string[],
  fallback: boolean,
): boolean {
  for (const key of keys) {
    if (raw[key] != null && typeof raw[key] !== "object") {
      return asBool(raw[key], fallback);
    }
  }
  for (const key of nestedKeys) {
    const nested = raw[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const row = nested as Record<string, unknown>;
      if (row.enabled != null) return asBool(row.enabled, fallback);
    }
  }
  const channels =
    raw.channels && typeof raw.channels === "object" && !Array.isArray(raw.channels)
      ? (raw.channels as Record<string, unknown>)
      : null;
  if (channels) {
    for (const key of nestedKeys) {
      if (channels[key] != null) return asBool(channels[key], fallback);
    }
  }
  return fallback;
}

export function normalizeNotificationPreferences(
  raw: unknown,
): NotificationPreferences {
  const rec = asRecord(raw) ?? {};
  const defaults = DEFAULT_NOTIFICATION_PREFERENCES;
  return {
    emailEnabled: channelEnabled(
      rec,
      ["emailEnabled", "email", "emailNotifications"],
      ["email"],
      defaults.emailEnabled,
    ),
    smsEnabled: channelEnabled(
      rec,
      ["smsEnabled", "sms", "smsNotifications"],
      ["sms"],
      defaults.smsEnabled,
    ),
    pushEnabled: channelEnabled(
      rec,
      ["pushEnabled", "push", "pushNotifications"],
      ["push"],
      defaults.pushEnabled,
    ),
    inAppEnabled: channelEnabled(
      rec,
      ["inAppEnabled", "inApp", "inAppNotifications"],
      ["inApp", "in_app"],
      defaults.inAppEnabled,
    ),
    emailMentions: asBool(
      rec.emailMentions ?? rec.mentionEmail,
      defaults.emailMentions,
    ),
    inAppMentions: asBool(
      rec.inAppMentions ?? rec.mentionInApp,
      defaults.inAppMentions,
    ),
    taskAssigned: asBool(
      rec.taskAssigned ?? rec.notifyTaskAssigned,
      defaults.taskAssigned,
    ),
    digest: asDigest(rec.digest ?? rec.digestFrequency ?? rec.digestSettings),
    fcmToken: pickStr(rec.fcmToken, rec.deviceToken, rec.fcmDeviceToken),
  };
}

export function toNotificationPreferencesBody(
  input: Partial<NotificationPreferences>,
): Record<string, unknown> {
  return {
    emailEnabled: input.emailEnabled,
    smsEnabled: input.smsEnabled,
    pushEnabled: input.pushEnabled,
    inAppEnabled: input.inAppEnabled,
    email: input.emailEnabled,
    sms: input.smsEnabled,
    push: input.pushEnabled,
    inApp: input.inAppEnabled,
    emailMentions: input.emailMentions,
    inAppMentions: input.inAppMentions,
    taskAssigned: input.taskAssigned,
    digest: input.digest,
    digestFrequency: input.digest,
    fcmToken: input.fcmToken || undefined,
    deviceToken: input.fcmToken || undefined,
  };
}

async function withSession<T>(
  run: (
    session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">,
    scoped: boolean,
  ) => Promise<T>,
): Promise<T> {
  const scoped = await ensureCrmSession();
  if (scoped) return run(scoped, true);
  const access = await ensureCrmAccess();
  if (!access) throw new Error("Sign in to manage notification preferences");
  return run(access, false);
}

function prefsUrl(
  session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">,
  scoped: boolean,
) {
  return scoped
    ? workspaceNotificationPreferencesPath((session as CrmSession).workspaceId)
    : globalNotificationPreferencesPath();
}

export async function getCrmNotificationPreferences(): Promise<NotificationPreferences> {
  return withSession(async (session, scoped) =>
    normalizeNotificationPreferences(await crmFetch(session, prefsUrl(session, scoped))),
  );
}

export async function updateCrmNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return withSession(async (session, scoped) =>
    normalizeNotificationPreferences(
      await crmFetch(session, prefsUrl(session, scoped), {
        method: "PATCH",
        body: JSON.stringify(toNotificationPreferencesBody(patch)),
      }),
    ),
  );
}

export async function tryCrmNotificationPreferences<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteNotificationPreferences(
  row: NotificationPreferences | null,
) {
  if (row) replaceCrmNotificationPreferences(row);
  return row;
}
