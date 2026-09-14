const STORAGE_KEY = "fc_pending_verification";

export function setPendingVerificationEmail(email: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, email.trim().toLowerCase());
  } catch {
    /* ignore quota / private mode */
  }
}

export function getPendingVerificationEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export function isPendingVerificationEmail(email: string): boolean {
  const pending = getPendingVerificationEmail();
  if (!pending) return false;
  return pending === email.trim().toLowerCase();
}

export function clearPendingVerificationEmail() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
