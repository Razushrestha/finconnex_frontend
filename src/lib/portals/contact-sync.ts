import {
  findContactByEmail,
  findContactById,
  updateContact,
} from "@/lib/contacts/store";
import type { ContactCardData } from "@/lib/contacts/types";
import { findLeadById } from "@/lib/leads/store";
import type { ClientPortal } from "@/lib/portals/types";

export type PortalContactFields = {
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  contactId?: string;
};

function contactDialPhone(contact: ContactCardData) {
  return (contact.mobile?.trim() || contact.phone?.trim() || "").trim();
}

/** Resolve email/phone from the linked CRM contact (or lead fallback). */
export function resolvePortalContactFields(
  portal: ClientPortal,
): PortalContactFields {
  const byId =
    portal.primaryContactId != null
      ? findContactById(portal.primaryContactId)?.contact
      : null;
  const byEmail =
    !byId && portal.primaryContactEmail
      ? findContactByEmail(portal.primaryContactEmail)
      : null;
  const contact = byId ?? byEmail ?? null;

  if (contact) {
    return {
      email: contact.email.trim() || portal.primaryContactEmail,
      phone:
        contactDialPhone(contact) ||
        portal.primaryContactPhone?.trim() ||
        "",
      firstName: contact.firstName,
      lastName: contact.lastName,
      contactId: contact.id,
    };
  }

  const lead = portal.leadId ? findLeadById(portal.leadId)?.card : null;
  return {
    email:
      portal.primaryContactEmail.trim() ||
      lead?.email?.trim() ||
      "",
    phone:
      portal.primaryContactPhone?.trim() ||
      lead?.phone?.trim() ||
      "",
    contactId: portal.primaryContactId,
  };
}

/** Push portal profile edits back onto the CRM contact card. */
export function writePortalProfileToCrmContact(
  portal: ClientPortal,
  fields: { email: string; phone: string; firstName: string; lastName: string },
): ContactCardData | null {
  const resolved = resolvePortalContactFields(portal);
  const id = resolved.contactId;
  if (!id) return null;

  const found = findContactById(id)?.contact;
  if (!found) return null;

  const email = fields.email.trim();
  const phone = fields.phone.trim();
  const firstName = fields.firstName.trim();
  const lastName = fields.lastName.trim();
  const name = [firstName, lastName].filter(Boolean).join(" ") || found.name;

  return updateContact(id, {
    email: email || found.email,
    phone: phone || found.phone,
    mobile: phone || found.mobile,
    firstName: firstName || found.firstName,
    lastName: lastName || found.lastName,
    name,
  });
}
