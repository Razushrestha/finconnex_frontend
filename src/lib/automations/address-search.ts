/**
 * Address lookup for the Send Email step's recipient fields.
 *
 * Two sources, because both answer "who do I mean": the workspace's own
 * people (teammates, from the members list) and its contacts. Each suggestion
 * carries a real mailbox — a row with no usable address is dropped, since
 * picking it would put nothing in the field.
 */
import { listCrmContacts } from "@/lib/contacts/api";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";
import { isEmailAddress } from "@/lib/automations/email-recipients";

export type AddressSuggestion = {
  email: string;
  name: string;
  /** Which list the address came from, shown as a tag on the row. */
  source: "Teammate" | "Contact";
};

function matches(query: string, ...fields: string[]): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  return fields.some((field) => field.toLowerCase().includes(needle));
}

/**
 * Teammates are fetched whole (the members endpoint takes no search term) and
 * filtered here; contacts are searched server-side, which is what scales.
 * Both sides are capped so one source cannot crowd out the other.
 */
export async function searchEmailAddresses(
  query: string,
  limit = 8,
): Promise<AddressSuggestion[]> {
  const term = query.trim();
  const [members, contacts] = await Promise.all([
    listCrmWorkspaceMembers().catch(() => []),
    listCrmContacts({ page: 1, limit: 20, search: term || undefined }).catch(
      () => [],
    ),
  ]);

  const suggestions: AddressSuggestion[] = [];
  const seen = new Set<string>();
  const add = (suggestion: AddressSuggestion) => {
    const key = suggestion.email.toLowerCase();
    if (!isEmailAddress(suggestion.email) || seen.has(key)) return;
    seen.add(key);
    suggestions.push(suggestion);
  };

  for (const member of members) {
    if (suggestions.length >= limit) break;
    const email = member.email?.trim() ?? "";
    if (!matches(term, member.name ?? "", email)) continue;
    add({ email, name: member.name?.trim() || email, source: "Teammate" });
  }

  const room = limit * 2 - suggestions.length;
  for (const { contact } of contacts) {
    if (suggestions.length >= limit + room) break;
    const email = contact.email?.trim() ?? "";
    add({ email, name: contact.name?.trim() || email, source: "Contact" });
  }

  return suggestions.slice(0, limit * 2);
}
