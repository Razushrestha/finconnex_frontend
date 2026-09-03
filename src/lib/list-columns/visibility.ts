const STORE_PREFIX = "finconnex.list-col-hidden.v1:";
const ORDER_PREFIX = "finconnex.list-col-order.v1:";

export function readHiddenColumnIds(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_PREFIX + storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function writeHiddenColumnIds(storageKey: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORE_PREFIX + storageKey, JSON.stringify(ids));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readColumnOrder(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ORDER_PREFIX + storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function writeColumnOrder(storageKey: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ORDER_PREFIX + storageKey, JSON.stringify(ids));
  } catch {
    /* ignore quota / private mode */
  }
}
