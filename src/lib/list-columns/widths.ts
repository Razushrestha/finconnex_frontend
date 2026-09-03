const STORE_PREFIX = "finconnex.list-col-widths.v1:";

export function readColumnWidths(storageKey: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORE_PREFIX + storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed)) {
      const n = Number(value);
      if (id && Number.isFinite(n) && n > 0) next[id] = Math.round(n);
    }
    return next;
  } catch {
    return {};
  }
}

export function writeColumnWidths(
  storageKey: string,
  widths: Record<string, number>,
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORE_PREFIX + storageKey, JSON.stringify(widths));
  } catch {
    /* ignore quota / private mode */
  }
}

export const COLUMN_WIDTHS_RESET_EVENT = "finconnex:list-col-widths-reset";

export function clearColumnWidths(storageKey: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORE_PREFIX + storageKey);
  } catch {
    /* ignore */
  }
}

export function resetColumnWidths(storageKey: string) {
  clearColumnWidths(storageKey);
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COLUMN_WIDTHS_RESET_EVENT, { detail: { storageKey } }),
  );
}

export function clampColumnWidth(
  width: number,
  minWidth = 64,
  maxWidth = 720,
) {
  return Math.round(Math.min(maxWidth, Math.max(minWidth, width)));
}
