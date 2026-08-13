/**
 * Phase E4 — Org backup / restore of demo session keys.
 */

import {
  readPersistedJson,
  writePersistedJson,
} from "@/lib/persistence/registry";
import { getPersistenceDriver } from "@/lib/persistence/registry";
import { requireAction } from "@/lib/rules/actor";

const POINTS_KEY = "backup:points:v1";

/** Known demo keys worth snapshotting (best-effort). */
export const BACKUP_KEYS = [
  "settings:values:v1",
  "rules:actor:v1",
  "rules:audit:v1",
  "rules:bin:v1",
  "auth:2fa:v1",
  "billing:org:v1",
  "library:extras",
  "library:artifacts:v1",
  "finance:payments:v1",
  "finance:invoices:v1",
  "signature:requests:v2",
  "portals:v1",
  "portal:credentials:v1",
  "lifecycle-journeys:v1",
  "workflows:runs:v1",
  "workflows:logs:v1",
  "rules:field-grants:v1",
  "activities:calendar:items:v1",
  "notifications:v1",
] as const;

export type BackupPoint = {
  id: string;
  label: string;
  createdAt: string;
  keyCount: number;
  /** Serialized map of key → raw JSON string */
  payload: Record<string, string>;
};

function listPoints(): BackupPoint[] {
  return readPersistedJson<BackupPoint[]>(POINTS_KEY, []);
}

function savePoints(points: BackupPoint[]) {
  writePersistedJson(POINTS_KEY, points.slice(0, 20));
}

export function listBackupPoints(): BackupPoint[] {
  return listPoints();
}

export function createBackupPoint(label?: string): BackupPoint {
  const driver = getPersistenceDriver();
  const payload: Record<string, string> = {};
  for (const key of BACKUP_KEYS) {
    const raw = driver.getItem(key);
    if (raw != null) payload[key] = raw;
  }
  const point: BackupPoint = {
    id: `bk-${Date.now()}`,
    label: label?.trim() || `Backup ${new Date().toLocaleString("en-AU")}`,
    createdAt: new Date().toISOString(),
    keyCount: Object.keys(payload).length,
    payload,
  };
  const list = listPoints();
  list.unshift(point);
  savePoints(list);
  return point;
}

export function downloadBackupPoint(point: BackupPoint) {
  const blob = new Blob([JSON.stringify(point, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${point.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function restoreBackupPoint(
  point: BackupPoint,
): { ok: true; restored: number } | { ok: false; message: string } {
  const gate = requireAction("settings.backup.restore");
  if (!gate.ok) return { ok: false, message: gate.message };

  const driver = getPersistenceDriver();
  let restored = 0;
  for (const [key, raw] of Object.entries(point.payload)) {
    driver.setItem(key, raw);
    restored += 1;
  }
  return { ok: true, restored };
}

export function importBackupJson(
  json: string,
): { ok: true; point: BackupPoint } | { ok: false; message: string } {
  try {
    const parsed = JSON.parse(json) as BackupPoint;
    if (!parsed?.payload || typeof parsed.payload !== "object") {
      return { ok: false, message: "Invalid backup file" };
    }
    const point: BackupPoint = {
      id: parsed.id || `bk-import-${Date.now()}`,
      label: parsed.label || "Imported backup",
      createdAt: parsed.createdAt || new Date().toISOString(),
      keyCount: Object.keys(parsed.payload).length,
      payload: parsed.payload,
    };
    const list = listPoints();
    list.unshift(point);
    savePoints(list);
    return { ok: true, point };
  } catch {
    return { ok: false, message: "Could not parse JSON" };
  }
}

export function deleteBackupPoint(id: string) {
  savePoints(listPoints().filter((p) => p.id !== id));
}
