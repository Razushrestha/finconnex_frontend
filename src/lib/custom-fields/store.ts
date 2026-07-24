/** Tenant custom field definitions (Settings → CRM Configuration). */

import {
  customFieldsSeed,
  type CustomFieldDef,
  type CustomFieldEntity,
} from "@/lib/custom-fields/types";
import {
  isBrowser,
  readJsonStore,
  writeJsonStore,
} from "@/lib/rules/storage";

const STORAGE_KEY = "settings:custom-fields:v1";

function read(): CustomFieldDef[] {
  if (!isBrowser()) return customFieldsSeed.map((f) => ({ ...f }));
  const saved = readJsonStore<CustomFieldDef[] | null>(STORAGE_KEY, null);
  if (!saved || !Array.isArray(saved) || saved.length === 0) {
    writeJsonStore(STORAGE_KEY, customFieldsSeed);
    return customFieldsSeed.map((f) => ({ ...f }));
  }
  return saved;
}

function write(next: CustomFieldDef[]) {
  writeJsonStore(STORAGE_KEY, next);
  emitCustomFieldsChange();
}

export function emitCustomFieldsChange() {
  if (!isBrowser()) return;
  if (typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent("finconnex:custom-fields"));
}

export function onCustomFieldsChange(handler: () => void): () => void {
  if (!isBrowser()) return () => {};
  const listener = () => handler();
  window.addEventListener("finconnex:custom-fields", listener);
  return () =>
    window.removeEventListener("finconnex:custom-fields", listener);
}

export function listCustomFields(): CustomFieldDef[] {
  return read();
}

export function listActiveCustomFieldsForEntity(
  entity: CustomFieldEntity,
): CustomFieldDef[] {
  return read().filter((f) => f.entity === entity && f.active);
}

export function upsertCustomField(def: CustomFieldDef) {
  const all = read();
  const i = all.findIndex((f) => f.id === def.id);
  if (i >= 0) {
    const next = [...all];
    next[i] = def;
    write(next);
  } else {
    write([def, ...all]);
  }
}

export function saveCustomFields(defs: CustomFieldDef[]) {
  write(defs);
}
