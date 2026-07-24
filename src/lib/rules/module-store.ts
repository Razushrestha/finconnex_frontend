/**
 * Production-style client module store helper (session-backed demo adapter).
 * Swap write/read for API calls without changing call sites.
 */

import {
  readJsonStore,
  writeJsonStore,
  emitRulesChange,
} from "@/lib/rules/storage";

export function createBoardStore<T>(opts: {
  key: string;
  seed: () => T;
}): {
  list: () => T;
  save: (value: T) => void;
  reset: () => void;
} {
  return {
    list() {
      const stored = readJsonStore<T | null>(opts.key, null);
      return stored ?? opts.seed();
    },
    save(value: T) {
      writeJsonStore(opts.key, value);
      emitRulesChange("all");
    },
    reset() {
      writeJsonStore(opts.key, opts.seed());
      emitRulesChange("all");
    },
  };
}
