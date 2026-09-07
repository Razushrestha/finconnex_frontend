/** Live contact board store: session-backed (production adapter: swap for API). */

import {
  emptyContactGroups,
  type ContactCardData,
  type ContactGroup,
  type ContactSource,
  type ContactStatus,
} from "@/lib/contacts/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { getRulesActor } from "@/lib/rules/actor";
import { isUuid } from "@/lib/activity-timeline/auth";

function cloneSeed(): ContactGroup[] {
  return emptyContactGroups();
}

function liveContacts(contacts: ContactCardData[]): ContactCardData[] {
  return contacts.filter((c) => isUuid(c.id)).map((c) => ({ ...c }));
}

const board = createBoardStore({
  key: "sales:contacts:board:v6",
  seed: cloneSeed,
});

export function listContactGroups(): ContactGroup[] {
  return board.list().map((g) => ({
    ...g,
    contacts: liveContacts(g.contacts),
  }));
}

export function saveContactGroups(groups: ContactGroup[]) {
  board.save(
    groups.map((g) => ({
      ...g,
      contacts: g.contacts.map((c) => ({ ...c })),
    })),
  );
}

export function listContactEmails(): string[] {
  return listContactGroups().flatMap((g) =>
    g.contacts.map((c) => c.email.trim().toLowerCase()),
  );
}

export function findContactById(id: string) {
  for (const g of listContactGroups()) {
    const contact = g.contacts.find((c) => c.id === id);
    if (contact)
      return { contact, status: g.title as ContactStatus, groupId: g.id };
  }
  return null;
}

export function listAllContacts(): ContactCardData[] {
  return listContactGroups().flatMap((g) => g.contacts);
}

export function findContactByName(name: string): ContactCardData | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  return listAllContacts().find((c) => c.name.trim().toLowerCase() === q) ?? null;
}

export function findContactByEmail(email: string): ContactCardData | null {
  const q = email.trim().toLowerCase();
  if (!q) return null;
  return (
    listAllContacts().find((c) => c.email.trim().toLowerCase() === q) ?? null
  );
}

export function updateContact(
  id: string,
  patch: Partial<
    Pick<
      ContactCardData,
      | "name"
      | "email"
      | "phone"
      | "mobile"
      | "company"
      | "owner"
      | "source"
      | "dealIds"
      | "tags"
      | "firstName"
      | "lastName"
      | "jobTitle"
      | "department"
      | "linkedinUrl"
      | "lifecycleStage"
      | "doNotContact"
      | "notes"
    >
  > & { status?: ContactStatus },
): ContactCardData | null {
  const found = findContactById(id);
  if (!found) return null;
  const nextStatus = patch.status ?? found.status;
  const merged: ContactCardData = {
    ...found.contact,
    ...patch,
    id,
    name: patch.name?.trim() || found.contact.name,
    email: patch.email?.trim() || found.contact.email,
    dealIds: patch.dealIds ?? found.contact.dealIds,
    accentColorClass:
      nextStatus !== found.status
        ? (listContactGroups().find((g) => g.title === nextStatus)?.dotColorClass ??
          found.contact.accentColorClass)
        : found.contact.accentColorClass,
  };

  let groups = listContactGroups().map((g) => ({
    ...g,
    contacts: g.contacts.filter((c) => c.id !== id),
  }));
  const target =
    groups.find((g) => g.title === nextStatus) ??
    groups.find((g) => g.id === found.groupId) ??
    groups[0];
  if (!target) return null;
  groups = groups.map((g) =>
    g.id === target.id ? { ...g, contacts: [merged, ...g.contacts] } : g,
  );
  saveContactGroups(groups);

  void import("@/lib/contacts/api").then(({ updateCrmContact, tryCrmContact }) => {
    void tryCrmContact(() =>
      updateCrmContact(id, {
        name: patch.name,
        firstName: patch.firstName,
        lastName: patch.lastName,
        email: patch.email,
        phone: patch.phone,
        mobile: patch.mobile,
        company: patch.company,
        owner: patch.owner,
        source: patch.source,
        status: nextStatus,
        jobTitle: patch.jobTitle,
        department: patch.department,
        linkedinUrl: patch.linkedinUrl,
        lifecycleStage: patch.lifecycleStage,
        doNotContact: patch.doNotContact,
        notes: patch.notes,
      }),
    );
  });
  return merged;
}

/** Bidirectional contact ↔ deal link. */
export function linkDealToContact(
  contactId: string,
  dealId: string,
): ContactCardData | null {
  const found = findContactById(contactId);
  if (!found) return null;
  const dealIds = Array.from(
    new Set([...(found.contact.dealIds ?? []), dealId]),
  );
  return updateContact(contactId, { dealIds });
}

export function unlinkDealFromContact(
  contactId: string,
  dealId: string,
): ContactCardData | null {
  const found = findContactById(contactId);
  if (!found) return null;
  const dealIds = (found.contact.dealIds ?? []).filter((id) => id !== dealId);
  return updateContact(contactId, { dealIds });
}

export async function createContact(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  company?: string;
  source?: ContactSource;
  status: ContactStatus;
  owner: string;
}): Promise<ContactCardData> {
  const { createCrmContact, isCrmContactId } = await import("@/lib/contacts/api");
  const remote = await createCrmContact(input);
  if (!remote || !isCrmContactId(remote.contact.id)) {
    throw new Error("CRM did not save the contact");
  }
  mergeCrmContactsIntoBoard([remote]);
  return remote.contact;
}

export async function createQuickContact(fullName: string): Promise<ContactCardData> {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Contact";
  const lastName = parts.slice(1).join(" ");
  const slug =
    fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "") || "contact";
  const created = await createContact({
    firstName,
    lastName: lastName || firstName,
    email: `${slug}@added.finconnex.local`,
    status: "Active",
    owner: getRulesActor().name || "",
    source: "Other",
  });
  const label = fullName.trim() || created.name;
  if (created.name !== label) {
    return updateContact(created.id, { name: label }) ?? created;
  }
  return created;
}

export function deleteContact(
  id: string,
  opts?: { skipCrm?: boolean },
): ContactCardData | null {
  const found = findContactById(id);
  if (!found) return null;
  saveContactGroups(
    listContactGroups().map((g) => ({
      ...g,
      contacts: g.contacts.filter((c) => c.id !== id),
    })),
  );
  if (!opts?.skipCrm) {
    void import("@/lib/contacts/api").then(({ deleteCrmContact, tryCrmContact }) => {
      void tryCrmContact(() => deleteCrmContact(id));
    });
  }
  return found.contact;
}

export function replaceCrmContactsOnBoard(
  remote: Array<{ contact: ContactCardData; status: ContactStatus }>,
) {
  const groups = emptyContactGroups();
  for (const item of remote) {
    const target =
      groups.find((g) => g.title === item.status) ??
      groups.find((g) => g.title === "Active") ??
      groups[0];
    if (!target) continue;
    target.contacts.push({
      ...item.contact,
      accentColorClass: target.dotColorClass,
    });
  }
  saveContactGroups(groups);
}

export function mergeCrmContactsIntoBoard(
  remote: Array<{ contact: ContactCardData; status: ContactStatus }>,
) {
  if (!remote.length) return;
  const remoteIds = new Set(remote.map((r) => r.contact.id));
  let groups = listContactGroups().map((g) => ({
    ...g,
    contacts: g.contacts.filter((c) => !remoteIds.has(c.id)),
  }));
  for (const item of remote) {
    const target =
      groups.find((g) => g.title === item.status) ??
      groups.find((g) => g.title === "Active") ??
      groups[0];
    if (!target) continue;
    const contact: ContactCardData = {
      ...item.contact,
      accentColorClass: target.dotColorClass,
    };
    groups = groups.map((g) =>
      g.id === target.id
        ? { ...g, contacts: [contact, ...g.contacts] }
        : g,
    );
  }
  saveContactGroups(groups);
}
