/** Shared helpers for activity create pages (?relatedKind=&relatedName=). */

import {
  RELATED_ENTITY_KINDS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";

export function asRelatedKind(raw?: string): RelatedEntityKind | undefined {
  if (!raw) return undefined;
  return RELATED_ENTITY_KINDS.includes(raw as RelatedEntityKind)
    ? (raw as RelatedEntityKind)
    : undefined;
}

export type CreateRelatedDefaults = {
  relatedKind?: RelatedEntityKind;
  relatedName?: string;
  to?: string;
  contact?: string;
};
