/** Live contact board store: session-backed (production adapter: swap for API). */

import {
  CONTACT_GROUPS,
  type ContactCardData,
  type ContactGroup,
  type ContactSource,
  type ContactStatus,
} from "@/lib/contacts/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";

const AVATAR_COLORS = [
  "bg-amber-50 text-amber-600",
  "bg-pink-50 text-pink-600",
  "bg-teal-50 text-teal-600",
  "bg-blue-50 text-blue-600",
  "bg-indigo-50 text-indigo-600",
  "bg-violet-50 text-violet-600",
  "bg-emerald-50 text-emerald-600",
  "bg-rose-50 text-rose-600",
];

function cloneSeed(): ContactGroup[] {
  return CONTACT_GROUPS.map((g) => ({
    ...g,
    contacts: g.contacts.map((c) => ({ ...c })),
  }));
}

const board = createBoardStore({
  key: "sales:contacts:board:v2",
  seed: cloneSeed,
});

export function listContactGroups(): ContactGroup[] {
  return board.list().map((g) => ({
    ...g,
    contacts: g.contacts.map((c) => ({ ...c })),
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

export function createContact(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  company?: string;
  source?: ContactSource;
  status: ContactStatus;
  owner: string;
}): ContactCardData {
  const groups = listContactGroups();
  const target =
    groups.find((g) => g.title === input.status) ??
    groups.find((g) => g.title === "Active") ??
    groups[0];
  const name = `${input.firstName} ${input.lastName}`.trim();
  const initials = `${input.firstName.charAt(0)}${input.lastName.charAt(0)}`.toUpperCase();
  const avatarIndex = groups.reduce((n, g) => n + g.contacts.length, 0);
  const contact: ContactCardData = {
    id: newRulesId("ct"),
    name,
    initials,
    company: input.company?.trim() || "",
    email: input.email.trim(),
    phone: input.phone?.trim() || "",
    mobile: input.mobile?.trim() || undefined,
    owner: input.owner,
    source: input.source ?? "Website",
    createdDate: formatRulesAt().split(",")[0] ?? formatRulesAt(),
    accentColorClass: target.dotColorClass,
    avatarBgClass: AVATAR_COLORS[avatarIndex % AVATAR_COLORS.length],
  };

  saveContactGroups(
    groups.map((g) =>
      g.id === target.id
        ? { ...g, contacts: [contact, ...g.contacts] }
        : g,
    ),
  );
  return contact;
}

export function deleteContact(id: string): ContactCardData | null {
  const found = findContactById(id);
  if (!found) return null;
  saveContactGroups(
    listContactGroups().map((g) => ({
      ...g,
      contacts: g.contacts.filter((c) => c.id !== id),
    })),
  );
  return found.contact;
}
