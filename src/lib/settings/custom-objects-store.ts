/**
 * Settings → CRM Configuration → Custom Objects (demo module definitions).
 */

import {
  readPersistedJson,
  writePersistedJson,
} from "@/lib/persistence/registry";
import { newRulesId } from "@/lib/rules/storage";

const STORE_KEY = "settings:custom-objects:v1";

export type CustomObjectDef = {
  id: string;
  apiName: string;
  label: string;
  pluralLabel: string;
  description?: string;
  active: boolean;
  fieldCount: number;
  createdAt: string;
};

const SEED: CustomObjectDef[] = [
  {
    id: "co-property",
    apiName: "Property",
    label: "Property",
    pluralLabel: "Properties",
    description: "Security / collateral on a loan deal",
    active: true,
    fieldCount: 8,
    createdAt: "2026-01-12",
  },
  {
    id: "co-referral",
    apiName: "ReferralPartner",
    label: "Referral Partner",
    pluralLabel: "Referral Partners",
    description: "External broker / partner source",
    active: true,
    fieldCount: 5,
    createdAt: "2026-02-03",
  },
];

function load(): CustomObjectDef[] {
  const raw = readPersistedJson<CustomObjectDef[]>(STORE_KEY, SEED);
  return Array.isArray(raw) && raw.length ? raw : SEED;
}

function save(rows: CustomObjectDef[]) {
  writePersistedJson(STORE_KEY, rows);
  return rows;
}

export function listCustomObjects(): CustomObjectDef[] {
  return load();
}

export function createCustomObject(input: {
  label: string;
  pluralLabel: string;
  apiName: string;
  description?: string;
}): CustomObjectDef {
  const row: CustomObjectDef = {
    id: newRulesId("co"),
    apiName: input.apiName.trim().replace(/\s+/g, "") || "CustomObject",
    label: input.label.trim() || "Custom Object",
    pluralLabel: input.pluralLabel.trim() || "Custom Objects",
    description: input.description?.trim() || undefined,
    active: true,
    fieldCount: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  return save([row, ...load()])[0]!;
}

export function updateCustomObject(
  id: string,
  patch: Partial<
    Pick<
      CustomObjectDef,
      "label" | "pluralLabel" | "apiName" | "description" | "active" | "fieldCount"
    >
  >,
): CustomObjectDef | null {
  let updated: CustomObjectDef | null = null;
  const next = load().map((r) => {
    if (r.id !== id) return r;
    updated = { ...r, ...patch };
    return updated;
  });
  if (updated) save(next);
  return updated;
}

export function deleteCustomObject(id: string): boolean {
  const rows = load();
  const next = rows.filter((r) => r.id !== id);
  if (next.length === rows.length) return false;
  save(next);
  return true;
}
