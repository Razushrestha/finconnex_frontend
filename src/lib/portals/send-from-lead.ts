import { createEmail } from "@/lib/emails/store";
import { addLeadConversationItem } from "@/lib/leads/conversation-store";
import { addLeadExtra } from "@/lib/leads/lead-extras-store";
import { updateLead } from "@/lib/leads/store";
import type { LeadCardData } from "@/lib/leads/types";
import { sendPortalInvite } from "@/lib/portals/auth";
import { ensureMortgageForLeadPortal } from "@/lib/portals/mortgage";
import { getRulesActor } from "@/lib/rules/actor";
import { formatRulesAt } from "@/lib/rules/storage";
import {
  appendPortalAudit,
  formatPortalDate,
  getPortalByLeadId,
  nextPortalIds,
  uniqueSlug,
  upsertPortal,
  type ClientPortal,
} from "@/lib/portals/types";

function inviteToken() {
  return Math.random().toString(36).slice(2, 8);
}

function actorName(card: LeadCardData) {
  return getRulesActor().name || card.owner || "Broker";
}

function ensurePortalForLead(card: LeadCardData): {
  portal: ClientPortal;
  created: boolean;
} {
  const existing = getPortalByLeadId(card.id);
  if (existing) {
    const next: ClientPortal = {
      ...existing,
      status: "Active",
      primaryContactName: card.name,
      primaryContactEmail: card.email.trim(),
      clientName: card.company || card.name,
      createdBy: existing.createdBy || actorName(card),
    };
    upsertPortal(next);
    return { portal: next, created: false };
  }

  const actor = actorName(card);
  const ids = nextPortalIds();
  const slug = uniqueSlug(`${card.name}-${inviteToken()}`);
  const portal = upsertPortal(
    appendPortalAudit(
      {
        id: ids.id,
        portalId: ids.portalId,
        name: `${card.name} client portal`,
        clientId: `lead:${card.id}`,
        clientName: card.company || card.name,
        slug,
        status: "Active",
        accessLevel: "Full",
        modules: ["Deals", "Documents", "Tasks", "Tickets", "Invoices", "Reports"],
        primaryContactName: card.name,
        primaryContactEmail: card.email.trim(),
        leadId: card.id,
        createdBy: actor,
        createdAt: formatPortalDate(),
        activity: [],
        audit: [],
      },
      "Created from lead",
      actor,
    ),
  );
  return { portal, created: true };
}

export async function sendClientPortalForLead(card: LeadCardData): Promise<
  | { ok: true; portal: ClientPortal; url: string; created: boolean }
  | { ok: false; message: string }
> {
  const email = card.email?.trim() ?? "";
  if (!email || !email.includes("@")) {
    return { ok: false, message: "This lead has no email address." };
  }

  const { portal, created } = ensurePortalForLead(card);
  ensureMortgageForLeadPortal(portal, card);
  const invited = await sendPortalInvite(portal, actorName(card));
  if (!invited.ok) return invited;

  updateLead(card.id, {
    custom: {
      portalSlug: invited.portal.slug,
      portalId: invited.portal.portalId,
    },
  });

  createEmail({
    subject: "Your FinConnex client portal is ready",
    body: `Unique portal link: ${invited.url}`,
    from: "noreply@finconnex.demo",
    to: [email],
    status: "Sent",
    sentDate: formatRulesAt(),
    relatedTo: `Lead: ${card.name}`,
    templateUsed: "Client portal invite",
  });

  addLeadConversationItem({
    leadId: card.id,
    channel: "email",
    kind: "email",
    direction: "out",
    fromName: actorName(card),
    fromEmail: "noreply@finconnex.demo",
    toEmail: email,
    subject: "Your FinConnex client portal is ready",
    body: `Open your unique portal link to verify it's you and continue your application:\n${invited.url}`,
    status: "sent",
  });

  addLeadExtra({
    leadName: card.name,
    kind: "email",
    title: created
      ? "Client portal invite sent"
      : "Client portal invite resent",
    dueAt: null,
    createdAt: new Date().toISOString(),
    bucket: "completed",
  });

  return {
    ok: true,
    portal: invited.portal,
    url: invited.url,
    created,
  };
}
