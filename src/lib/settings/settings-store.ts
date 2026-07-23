/** sessionStorage persistence + favorites + audit for Settings */

const VALUES_KEY = "settings:values:v1";
const FAVORITES_KEY = "settings:favorites:v1";
const AUDIT_KEY = "settings:audit:v1";

export type SettingsValues = Record<string, string | boolean | number>;

export interface SettingsAuditEvent {
  id: string;
  at: string;
  path: string;
  title: string;
  actor: string;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function loadSettingsValues(schemaKey: string): SettingsValues {
  const all = readJson<Record<string, SettingsValues>>(VALUES_KEY, {});
  return all[schemaKey] ?? {};
}

export function saveSettingsValues(
  schemaKey: string,
  values: SettingsValues,
  meta: { path: string; title: string; actor?: string },
) {
  const all = readJson<Record<string, SettingsValues>>(VALUES_KEY, {});
  all[schemaKey] = values;
  writeJson(VALUES_KEY, all);

  const audit = readJson<SettingsAuditEvent[]>(AUDIT_KEY, []);
  audit.unshift({
    id: `sa-${Date.now()}`,
    at: new Date().toLocaleString("en-AU"),
    path: meta.path,
    title: meta.title,
    actor: meta.actor ?? "admin",
  });
  writeJson(AUDIT_KEY, audit.slice(0, 100));
}

export function listSettingsAudit(): SettingsAuditEvent[] {
  return readJson(AUDIT_KEY, []);
}

export function listFavoriteSettings(): string[] {
  return readJson(FAVORITES_KEY, []);
}

export function toggleFavoriteSetting(path: string) {
  const list = listFavoriteSettings();
  const i = list.indexOf(path);
  if (i >= 0) list.splice(i, 1);
  else list.unshift(path);
  writeJson(FAVORITES_KEY, list.slice(0, 40));
  return list;
}

export function isFavoriteSetting(path: string) {
  return listFavoriteSettings().includes(path);
}
