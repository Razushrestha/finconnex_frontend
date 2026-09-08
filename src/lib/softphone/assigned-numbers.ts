/**
 * Outbound numbers assigned to a CRM user.
 *
 * Was a hardcoded demo map keyed by fake names. Real per-user numbers come
 * from the telephony settings; until one is configured this is empty and
 * callers fall back to the workspace default.
 */
const OWNER_NUMBERS: Record<string, string[]> = {};

export function assignedCallerIds(owner?: string): string[] {
  const named = owner?.trim() ? OWNER_NUMBERS[owner.trim()] : undefined;
  return named?.length ? named : [];
}

export function defaultCallerId(owner?: string): string {
  return assignedCallerIds(owner)[0] ?? "";
}
