import type { LeadCardData } from "@/lib/leads/types";
import { leadApplicants } from "@/lib/leads/detail-snapshot";
import { normalizeRelatedKind } from "@/lib/related-entity";

export const LEAD_SEND_ACTIONS = [
  {
    id: "portal",
    label: "Send Client Portal",
    href: "/portals/create?layoutid=standard&redirect=false",
  },
  { id: "fact-find", label: "Send Fact Find", href: "/journeys/create" },
  {
    id: "documents",
    label: "Request Documents",
    href: "/documents/requests/create?layoutid=standard&redirect=false",
  },
  { id: "esign", label: "Send E-Sign", href: "/signature/create" },
  {
    id: "proposal",
    label: "Send Proposal",
    href: "/finance/estimates/create",
  },
  { id: "quote", label: "Send Quote", href: "/finance/quotations/create" },
  {
    id: "invoice",
    label: "Create / Send Invoice",
    href: "/finance/invoices/create?layoutid=standard&redirect=false",
  },
  {
    id: "meeting",
    label: "Schedule Meeting",
    href: "/activities/meetings/create",
  },
] as const;

export function leadEsignSigners(card: LeadCardData) {
  return leadDocumentRequestPeople(card).map(({ name, email }) => ({
    name,
    email,
  }));
}

export function leadDocumentRequestPeople(card: LeadCardData) {
  return leadApplicants(card).map((applicant, index) => {
    const email =
      index === 0
        ? (card.email || "").trim()
        : (card.custom?.["secondary.email"] || "").trim();
    const phone =
      index === 0
        ? (card.phone || card.custom?.mobile || "").trim()
        : (
            card.custom?.["secondary.mobile"] ||
            card.custom?.["secondary.phone"] ||
            ""
          ).trim();
    return { name: applicant.name, email, phone };
  });
}

export type DocumentRequestPersonSeed = {
  name: string;
  email: string;
  phone: string;
};

export function parseDocumentRequestPeople(
  raw?: string | null,
): DocumentRequestPersonSeed[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        const item = row as { name?: unknown; email?: unknown; phone?: unknown };
        return {
          name: String(item?.name ?? "").trim(),
          email: String(item?.email ?? "").trim(),
          phone: String(item?.phone ?? "").trim(),
        };
      })
      .filter((row) => row.name || row.email);
  } catch {
    return [];
  }
}

export type SendRelatedEntity = {
  kind: string;
  name: string;
  id: string;
  email?: string;
  phone?: string;
  signers?: { name: string; email: string }[];
  applicants?: DocumentRequestPersonSeed[];
};

export function entitySendHref(baseHref: string, entity: SendRelatedEntity) {
  const url = new URL(baseHref, "https://finconnex.local");
  const kind = normalizeRelatedKind(entity.kind) || entity.kind || "Lead";
  url.searchParams.set("relatedKind", kind);
  url.searchParams.set("relatedName", entity.name);
  url.searchParams.set("relatedId", entity.id);
  if (entity.email) url.searchParams.set("to", entity.email);
  if (entity.phone) url.searchParams.set("phone", entity.phone);
  if (url.pathname === "/signature/create") {
    url.searchParams.set(
      "signers",
      JSON.stringify(entity.signers ?? [{ name: entity.name, email: entity.email ?? "" }]),
    );
    url.searchParams.set("documentName", `${entity.name} – Signature request`);
  }
  if (url.pathname === "/documents/requests/create") {
    url.searchParams.set(
      "applicants",
      JSON.stringify(
        entity.applicants ?? [
          {
            name: entity.name,
            email: entity.email ?? "",
            phone: entity.phone ?? "",
          },
        ],
      ),
    );
  }
  return `${url.pathname}${url.search}`;
}

export function leadSendHref(baseHref: string, card: LeadCardData) {
  return entitySendHref(baseHref, {
    kind: "Lead",
    name: card.name,
    id: card.id,
    email: card.email,
    phone: card.phone,
    signers: leadEsignSigners(card),
    applicants: leadDocumentRequestPeople(card),
  });
}

export function openLeadSendHref(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}
