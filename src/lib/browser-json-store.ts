import { emitRecordsChange } from "@/lib/records-sync";

/** Read an array store from localStorage, migrating sessionStorage if needed. */
export function readJsonArrayStore<T>(key: string): T[] | null {
  if (typeof window === "undefined") return null;
  try {
    const local = localStorage.getItem(key);
    const session = sessionStorage.getItem(key);
    const raw = local ?? session;
    if (!raw) return null;
    if (!local && session) localStorage.setItem(key, session);
    return JSON.parse(raw) as T[];
  } catch {
    return null;
  }
}

export function writeJsonArrayStore<T>(key: string, list: T[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
    emitRecordsChange(key);
  } catch {
    /* quota / private mode */
  }
}
