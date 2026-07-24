/** SRS §28.1 — soft delete → Recycle Bin (unlimited retention in demo) */

import { appendAuditEvent, logDelete } from "@/lib/rules/audit";
import {
  emitRulesChange,
  formatRulesAt,
  newRulesId,
  readJsonStore,
  writeJsonStore,
} from "@/lib/rules/storage";

export interface RecycleBinItem {
  id: string;
  module: string;
  recordId: string;
  recordLabel: string;
  recordType: string;
  deletedAt: string;
  deletedBy: string;
  /** Original payload for restore (demo) */
  snapshot: unknown;
}

const STORE_KEY = "rules:recycle-bin:v1";

function readStore(): RecycleBinItem[] {
  return readJsonStore<RecycleBinItem[]>(STORE_KEY, []);
}

function writeStore(list: RecycleBinItem[]) {
  writeJsonStore(STORE_KEY, list);
  emitRulesChange("bin");
}

export function listRecycleBin(): RecycleBinItem[] {
  return readStore();
}

/** Deleted records move to the Recycle Bin for unlimited retention. */
export function moveToRecycleBin(input: {
  module: string;
  recordId: string;
  recordLabel: string;
  recordType: string;
  deletedBy: string;
  snapshot: unknown;
}): RecycleBinItem {
  // Avoid duplicate bin rows for the same live record
  const withoutDup = listRecycleBin().filter(
    (x) => !(x.module === input.module && x.recordId === input.recordId),
  );
  const item: RecycleBinItem = {
    id: newRulesId("rb"),
    module: input.module,
    recordId: input.recordId,
    recordLabel: input.recordLabel,
    recordType: input.recordType,
    deletedAt: formatRulesAt(),
    deletedBy: input.deletedBy,
    snapshot: input.snapshot,
  };
  withoutDup.unshift(item);
  writeStore(withoutDup);
  logDelete(input.module, input.deletedBy, input.recordId, input.recordLabel);
  return item;
}

export function restoreFromRecycleBin(id: string, actor: string) {
  const list = listRecycleBin();
  const item = list.find((x) => x.id === id);
  if (!item) return null;
  writeStore(list.filter((x) => x.id !== id));
  appendAuditEvent({
    action: "restore",
    module: item.module,
    recordId: item.recordId,
    recordLabel: item.recordLabel,
    actor,
    summary: `Restored ${item.recordLabel} from Recycle Bin`,
  });
  return item;
}

export function purgeRecycleBinItem(id: string, actor: string) {
  const list = listRecycleBin();
  const item = list.find((x) => x.id === id);
  if (!item) return null;
  writeStore(list.filter((x) => x.id !== id));
  appendAuditEvent({
    action: "purge",
    module: item.module,
    recordId: item.recordId,
    recordLabel: item.recordLabel,
    actor,
    summary: `Permanently purged ${item.recordLabel}`,
  });
  return item;
}
