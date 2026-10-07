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
import { readClientEmailBrand } from "@/lib/emails/brand-mail";
import { appointmentConfirmedEmail } from "@/lib/meetings/appointment-email";

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

/** Sends the designed HTML. The CRM mailbox only stores plain text, which is why the inbox showed stacked lines and a raw checkmark code. */
async function deliverStyledAppointment(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const res = await fetch("/api/auth/mail/deliver", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });
  if (res.ok) return;
  let message = "Could not send the appointment email";
  try {
    const json = (await res.json()) as { error?: string };
    if (json.error?.trim()) message = json.error.trim();
  } catch {
    /* keep the generic message */
  }
  throw new Error(message);
}

async function appointmentActionLinks(input: {
  meetingId?: string;
  title: string;
  guestName: string;
  hostName: string;
  dateIso: string;
  startHHmm: string;
  durationMinutes: number;
  timeZoneLabel?: string;
}) {
  const res = await fetch("/api/appointment/manage", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    rescheduleUrl?: string;
    cancelUrl?: string;
  };
  if (!res.ok || !json.rescheduleUrl || !json.cancelUrl) {
    throw new Error(json.error || "Could not prepare the reschedule and cancel links.");
  }
  return { rescheduleUrl: json.rescheduleUrl, cancelUrl: json.cancelUrl };
}

export async function sendRelatedMeetingInvites(input: {
  invitees: MeetingInvitee[];
  title: string;
  startLabel: string;
  endLabel: string;
  dateIso: string;
  startHHmm: string;
  durationMinutes: number;
  timeZoneLabel?: string;
  hostName: string;
  meetingType?: string;
  location?: string;
  meetingLink?: string;
  agenda?: string;
  meetingId?: string;
  relatedKind: RelatedEntityKind;
  relatedName: string;
  relatedId?: string;
}) {
  if (!input.invitees.length) {
    throw new Error(
      `No email on this ${input.relatedKind.toLowerCase()}. Add an email on the related record, then send invites again.`,
    );
  }
  const relatedId =
    (input.relatedId && isUuid(input.relatedId) ? input.relatedId : undefined) ??
    input.invitees.find((item) => item.relatedId && isUuid(item.relatedId))
      ?.relatedId;
  for (const invitee of input.invitees) {
    const links = await appointmentActionLinks({
      meetingId: input.meetingId,
      title: input.title,
      guestName: invitee.name,
      hostName: input.hostName,
      dateIso: input.dateIso,
      startHHmm: input.startHHmm,
      durationMinutes: input.durationMinutes,
      timeZoneLabel: input.timeZoneLabel,
    });
    const copy = appointmentConfirmedEmail({
      guestName: invitee.name,
      hostName: input.hostName,
      title: input.title,
      dateIso: input.dateIso,
      startHHmm: input.startHHmm,
      durationMinutes: input.durationMinutes,
      timeZoneLabel: input.timeZoneLabel,
      meetingType: input.meetingType,
      location: input.location,
      joinUrl: input.meetingLink,
      rescheduleUrl: links?.rescheduleUrl,
      cancelUrl: links?.cancelUrl,
      brand: readClientEmailBrand(),
    });
    try {
      await deliverStyledAppointment({
        to: invitee.email,
        subject: copy.subject,
        text: copy.text,
        html: copy.html,
      });
    } catch {
      await sendCrmActivityEmail({
        to: [invitee.email],
        subject: copy.subject,
        body: copy.text,
        relatedType: input.relatedKind,
        relatedId,
        relatedTo: `${input.relatedKind}: ${input.relatedName}`,
      });
    }
  }
}
