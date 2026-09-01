/** Notify UI when CRM record stores change (same tab + other tabs). */

const EVENT = "finconnex:records";

export function emitRecordsChange(key?: string) {
  if (typeof window === "undefined") return;
  if (typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { key } }));
}

export function onRecordsChange(handler: (key?: string) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCustom = (e: Event) => {
    handler((e as CustomEvent<{ key?: string }>).detail?.key);
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key) handler(e.key);
  };
  const onFocus = () => handler();
  window.addEventListener(EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", onFocus);
  return () => {
    window.removeEventListener(EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", onFocus);
  };
}
