/** Shared SSR-safe storage + id/time helpers for §28 engines */

import {
  readPersistedJson,
  writePersistedJson,
} from "@/lib/persistence/registry";

export function isBrowser() {
  return typeof window !== "undefined";
}

export function formatRulesAt(d = new Date(), withSeconds = false) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" as const } : {}),
  });
}

export function newRulesId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

/** Tenant-scoped JSON via active persistence driver (session → API). */
export function readJsonStore<T>(key: string, fallback: T): T {
  return readPersistedJson(key, fallback);
}

export function writeJsonStore(key: string, value: unknown) {
  writePersistedJson(key, value);
}

/** Notify UI listeners (audit panels, rules hub) after store mutations. */
export function emitRulesChange(kind: "audit" | "bin" | "actor" | "all" = "all") {
  if (!isBrowser()) return;
  if (typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent("finconnex:rules", { detail: { kind } }));
}

export function onRulesChange(
  handler: (kind: string) => void,
): () => void {
  if (!isBrowser()) return () => {};
  const listener = (e: Event) => {
    const kind = (e as CustomEvent<{ kind?: string }>).detail?.kind ?? "all";
    handler(kind);
  };
  window.addEventListener("finconnex:rules", listener);
  return () => window.removeEventListener("finconnex:rules", listener);
}

export function humanizeFieldKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
