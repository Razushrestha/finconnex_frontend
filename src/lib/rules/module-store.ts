/**
 * Production-style client module store helper.
 * Default: session persistence. Swap driver via `enableApiPersistence` when backend is live.
 */

import { emitRulesChange } from "@/lib/rules/storage";
import {
  readPersistedJson,
  writePersistedJson,
} from "@/lib/persistence/registry";

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
      const stored = readPersistedJson<T | null>(opts.key, null);
      return stored ?? opts.seed();
    },
    save(value: T) {
      writePersistedJson(opts.key, value);
      emitRulesChange("all");
    },
    reset() {
      writePersistedJson(opts.key, opts.seed());
      emitRulesChange("all");
    },
  };
}
