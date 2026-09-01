/** Outbound numbers assigned to a CRM user (demo). */

const OWNER_NUMBERS: Record<string, string[]> = {
  "John Smith": ["+61480893823", "+61480112004"],
  "Shiva Kadhka": ["+61480112004"],
  "Tejas Gokhe": ["+61480893823"],
  "Roshna Abraham": ["+61480893823", "+61480999001"],
};

export function assignedCallerIds(owner?: string): string[] {
  const named = owner?.trim() ? OWNER_NUMBERS[owner.trim()] : undefined;
  if (named?.length) return named;
  return OWNER_NUMBERS["John Smith"] ?? [];
}

export function defaultCallerId(owner?: string): string {
  return assignedCallerIds(owner)[0] ?? "";
}
