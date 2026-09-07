import { isUuid } from "@/lib/activity-timeline/auth";
import type { RelatedEntityKind } from "@/lib/activities/shared";
import { liveRelatedRecords } from "@/lib/activities/related-records";
import { getCrmContact, tryCrmContact } from "@/lib/contacts/api";
import {
  findContactById,
  findContactByName,
  listAllContacts,
} from "@/lib/contacts/store";
import { findCompanyByName } from "@/lib/companies/store";
import { fetchLeadById } from "@/lib/leads/api";
import { findLeadById, listLeadColumns } from "@/lib/leads/store";
import { findDealById, listAllDeals } from "@/lib/deals/store";
import { sendCrmActivityEmail } from "@/lib/emails/compose-send";

export type MeetingInvitee = {
  name: string;
  email: string;
  relatedId?: string;
};

const PLACEHOLDER_EMAIL = /@(added\.)?finconnex\.local$|@example\.com$/i;

export function isSendableInviteEmail(email: string): boolean {
  const value = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  return !PLACEHOLDER_EMAIL.test(value);
}

function addInvitee(
  list: MeetingInvitee[],
  name: string,
  email: string | undefined,
  relatedId?: string,
) {
  const trimmed = email?.trim() ?? "";
  if (!isSendableInviteEmail(trimmed)) return;
  const key = trimmed.toLowerCase();
  if (list.some((item) => item.email.toLowerCase() === key)) return;
  list.push({ name: name.trim() || trimmed, email: trimmed, relatedId });
}

function relatedRecordId(
  kind: RelatedEntityKind,
  name: string,
  preferredId?: string,
) {
  if (preferredId && isUuid(preferredId)) return preferredId;
  const match = liveRelatedRecords(kind).find(
    (row) => row.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  return match?.id && isUuid(match.id) ? match.id : undefined;
}

function findLeadByName(name: string) {
  const key = name.trim().toLowerCase();
  for (const column of listLeadColumns()) {
    const card = column.cards.find((item) => item.name.trim().toLowerCase() === key);
    if (card) return card;
  }
  return null;
}

export function collectRelatedInvitees(
  kind: RelatedEntityKind,
  name: string,
  relatedId?: string,
): MeetingInvitee[] {
  const invitees: MeetingInvitee[] = [];
  const id = relatedRecordId(kind, name, relatedId);

  if (kind === "Contact") {
    const contact =
      (id ? findContactById(id)?.contact : null) ?? findContactByName(name);
    addInvitee(invitees, contact?.name || name, contact?.email, contact?.id ?? id);
    return invitees;
  }

  if (kind === "Lead") {
    const lead =
      (id ? findLeadById(id)?.card : null) ?? findLeadByName(name);
    addInvitee(invitees, lead?.name || name, lead?.email, lead?.id ?? id);
    return invitees;
  }

  if (kind === "Company") {
    const companyName = findCompanyByName(name)?.company.name || name;
    for (const contact of listAllContacts()) {
      if (contact.company.trim().toLowerCase() !== companyName.trim().toLowerCase()) {
        continue;
      }
      addInvitee(invitees, contact.name, contact.email, contact.id);
    }
    return invitees;
  }

  const deal =
    (id ? findDealById(id)?.deal : null) ??
    listAllDeals().find(
      (item) => item.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
  if (deal?.contactId) {
    const linked = findContactById(deal.contactId)?.contact;
    addInvitee(invitees, linked?.name || deal.contact || name, linked?.email, linked?.id);
  } else if (deal?.contact) {
    const linked = findContactByName(deal.contact);
    addInvitee(invitees, linked?.name || deal.contact, linked?.email, linked?.id);
  }
  return invitees;
}

async function refreshInviteesFromCrm(
  kind: RelatedEntityKind,
  name: string,
  relatedId: string | undefined,
  current: MeetingInvitee[],
): Promise<MeetingInvitee[]> {
  const id = relatedRecordId(kind, name, relatedId);
  if (!id) return current;

  if (kind === "Contact") {
    const remote = await tryCrmContact(() => getCrmContact(id));
    const email = remote?.contact.email;
    if (isSendableInviteEmail(email ?? "")) {
      return [
        {
          name: remote?.contact.name || name,
          email: email!.trim(),
          relatedId: remote?.contact.id ?? id,
        },
      ];
    }
  }

  if (kind === "Lead") {
    try {
      const lead = await fetchLeadById(id);
      if (lead && isSendableInviteEmail(lead.email)) {
        const leadName =
          `${lead.firstName} ${lead.lastName}`.trim() || name;
        return [
          {
            name: leadName,
            email: lead.email.trim(),
            relatedId: lead.id,
          },
        ];
      }
    } catch {
      /* keep local invitees */
    }
  }

  return current;
}

export async function resolveRelatedMeetingInvitees(
  kind: RelatedEntityKind,
  name: string,
  relatedId?: string,
): Promise<MeetingInvitee[]> {
  const local = collectRelatedInvitees(kind, name, relatedId);
  return refreshInviteesFromCrm(kind, name, relatedId, local);
}

export function meetingRelatedApiFields(
  kind?: RelatedEntityKind | "",
  relatedId?: string,
) {
  const id = relatedId && isUuid(relatedId) ? relatedId : undefined;
  const type = kind?.toUpperCase();
  if (!type || !id) return {};
  if (type === "LEAD") return { relatedType: "LEAD", leadId: id };
  if (type === "CONTACT") return { relatedType: "CONTACT", contactId: id };
  if (type === "COMPANY") return { relatedType: "COMPANY", companyId: id };
  if (type === "DEAL") return { relatedType: "DEAL", dealId: id };
  return {};
}

export function buildMeetingInviteMessage(input: {
  title: string;
  startLabel: string;
  endLabel: string;
  location?: string;
  meetingLink?: string;
  agenda?: string;
  relatedLabel: string;
}) {
  const lines = [
    `You are invited to ${input.title}.`,
    "",
    `When: ${input.startLabel} – ${input.endLabel}`,
  ];
  if (input.location?.trim()) lines.push(`Location: ${input.location.trim()}`);
  if (input.meetingLink?.trim()) lines.push(`Join: ${input.meetingLink.trim()}`);
  lines.push(`Related: ${input.relatedLabel}`);
  if (input.agenda?.trim()) {
    lines.push("", input.agenda.trim());
  }
  return lines.join("\n");
}

export async function sendRelatedMeetingInvites(input: {
  invitees: MeetingInvitee[];
  title: string;
  startLabel: string;
  endLabel: string;
  location?: string;
  meetingLink?: string;
  agenda?: string;
  relatedKind: RelatedEntityKind;
  relatedName: string;
  relatedId?: string;
}) {
  const to = input.invitees.map((item) => item.email);
  if (!to.length) {
    throw new Error(
      `No email on this ${input.relatedKind.toLowerCase()}. Add an email on the related record, then send invites again.`,
    );
  }
  const relatedId =
    (input.relatedId && isUuid(input.relatedId) ? input.relatedId : undefined) ??
    input.invitees.find((item) => item.relatedId && isUuid(item.relatedId))
      ?.relatedId;
  return sendCrmActivityEmail({
    to,
    subject: `Meeting invitation: ${input.title}`,
    body: buildMeetingInviteMessage({
      title: input.title,
      startLabel: input.startLabel,
      endLabel: input.endLabel,
      location: input.location,
      meetingLink: input.meetingLink,
      agenda: input.agenda,
      relatedLabel: `${input.relatedKind}: ${input.relatedName}`,
    }),
    relatedType: input.relatedKind,
    relatedId,
    relatedTo: `${input.relatedKind}: ${input.relatedName}`,
  });
}
