import { isUuid } from "@/lib/activity-timeline/auth";

/**
 * Resolve a person's display name from whatever shape the API returned.
 *
 * Records expose an owner/assignee three different ways depending on the
 * endpoint: a resolved object (`owner`), a flat string (`ownerName`), or —
 * historically — nothing but the raw `ownerId`. That last case is why this
 * exists: the lead board rendered the UUID under "Lead Owner" because the
 * mapper assigned `lead.ownerId` straight to a display field.
 *
 * A UUID is never a name, so it is rejected at every step rather than
 * falling through to the caller. Callers get "" and decide their own
 * placeholder ("Unassigned", "—") for the field they are filling.
 */
export type OwnerLike =
  | string
  | {
      name?: unknown;
      firstName?: unknown;
      lastName?: unknown;
      email?: unknown;
    }
  | null
  | undefined;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** A value only counts as a name if it is non-empty and not an id. */
function nameOrEmpty(value: unknown): string {
  const candidate = text(value);
  return candidate && !isUuid(candidate) ? candidate : "";
}

export function ownerDisplayName(...candidates: OwnerLike[]): string {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === "string") {
      const direct = nameOrEmpty(candidate);
      if (direct) return direct;
      continue;
    }
    const resolved = nameOrEmpty(candidate.name);
    if (resolved) return resolved;

    const full = [text(candidate.firstName), text(candidate.lastName)]
      .filter(Boolean)
      .join(" ");
    if (full) return full;

    // Local part of the email, so an account with no name set still reads as
    // a person rather than as a machine identifier.
    const email = text(candidate.email);
    if (email) return email.split("@")[0] || email;
  }
  return "";
}

/** `ownerDisplayName` with a caller-chosen placeholder for "nobody". */
export function ownerDisplayNameOr(
  fallback: string,
  ...candidates: OwnerLike[]
): string {
  return ownerDisplayName(...candidates) || fallback;
}
