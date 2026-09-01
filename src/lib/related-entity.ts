/** Related-to matching for Lead / Deal / Company / Contact records. */

export type RelatedEntityRef = {
  kind: string;
  name: string;
  id?: string;
  email?: string;
};

export function namesEqual(a?: string | null, b?: string | null) {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

export function normalizeRelatedKind(raw?: string | null) {
  const value = (raw ?? "").trim();
  if (!value) return "";
  const lower = value.toLowerCase();
  if (lower === "org" || lower === "organization" || lower === "organisation") {
    return "Company";
  }
  if (lower === "lead") return "Lead";
  if (lower === "deal") return "Deal";
  if (lower === "contact") return "Contact";
  if (lower === "company") return "Company";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function relatedToLabel(kind?: string | null, name?: string | null) {
  const normalized = normalizeRelatedKind(kind);
  const label = (name ?? "").trim();
  if (!normalized || !label) return undefined;
  return `${normalized}: ${label}`;
}

export function parseRelatedRef(
  related?: string | { kind: string; name: string } | null,
): { kind: string; name: string } | null {
  if (!related) return null;
  if (typeof related === "object") {
    const kind = normalizeRelatedKind(related.kind);
    const name = related.name.trim();
    return name ? { kind, name } : null;
  }
  const prefixed = related.match(/^([^:]+):\s*(.+)$/);
  if (prefixed) {
    const kind = normalizeRelatedKind(prefixed[1]);
    const name = prefixed[2].trim();
    return name ? { kind, name } : null;
  }
  const name = related.trim();
  return name ? { kind: "", name } : null;
}

export function relatedMatchesEntity(
  related: string | { kind: string; name: string } | undefined,
  entity: RelatedEntityRef,
): boolean {
  const parsed = parseRelatedRef(related);
  if (!parsed?.name || !namesEqual(parsed.name, entity.name)) return false;
  const want = normalizeRelatedKind(entity.kind);
  if (!parsed.kind || !want) return true;
  return parsed.kind === want;
}

export function financeMatchesEntity(
  row: {
    relatedTo?: string;
    clientName?: string;
    contactName?: string;
    dealName?: string;
    contactEmail?: string;
  },
  entity: RelatedEntityRef,
): boolean {
  if (relatedMatchesEntity(row.relatedTo, entity)) return true;
  const kind = normalizeRelatedKind(entity.kind);
  if (kind === "Deal" && namesEqual(row.dealName, entity.name)) return true;
  if (kind === "Company" && namesEqual(row.clientName, entity.name)) return true;
  if (
    (kind === "Lead" || kind === "Contact") &&
    (namesEqual(row.contactName, entity.name) ||
      namesEqual(row.clientName, entity.name))
  ) {
    return true;
  }
  if (entity.email && namesEqual(row.contactEmail, entity.email)) return true;
  return false;
}
