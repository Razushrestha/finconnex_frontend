import { listLeadColumns } from "@/lib/leads/store";
import { listAllContacts } from "@/lib/contacts/store";
import { listAllDeals } from "@/lib/deals/store";

export type VoiceAction =
  | { type: "navigate"; href: string; speak: string }
  | { type: "softphone"; speak: string }
  | { type: "notes"; speak: string }
  | { type: "reminders"; speak: string }
  | { type: "quick-add"; speak: string }
  | { type: "help"; speak: string };

const ROUTES: { keys: string[]; href: string; speak: string }[] = [
  { keys: ["dashboard", "home"], href: "/", speak: "Opening the dashboard." },
  { keys: ["work queue", "workqueue"], href: "/?view=work-queue", speak: "Opening the work queue." },
  { keys: ["leads", "lead"], href: "/sales/leads", speak: "Opening leads." },
  { keys: ["contacts", "contact"], href: "/sales/contacts", speak: "Opening contacts." },
  { keys: ["deals", "deal", "pipeline"], href: "/sales/deals", speak: "Opening deals." },
  { keys: ["companies", "company", "organisation", "organization"], href: "/sales/companies", speak: "Opening companies." },
  { keys: ["tasks", "task"], href: "/activities/tasks", speak: "Opening tasks." },
  { keys: ["calendar"], href: "/activities/calendar", speak: "Opening the calendar." },
  { keys: ["meetings", "appointment", "appointments"], href: "/activities/meetings", speak: "Opening meetings." },
  { keys: ["calls", "call log"], href: "/activities/calls", speak: "Opening calls." },
  { keys: ["emails", "email"], href: "/activities/emails", speak: "Opening emails." },
  { keys: ["notes"], href: "/activities/notes", speak: "Opening notes." },
  { keys: ["inbox", "messages"], href: "/marketing/inbox", speak: "Opening the inbox." },
  { keys: ["reminders"], href: "/activities/reminders", speak: "Opening reminders." },
  { keys: ["document request", "documents"], href: "/documents/requests", speak: "Opening document requests." },
  { keys: ["settings"], href: "/settings", speak: "Opening settings." },
];

const CREATE: { keys: string[]; href: string; speak: string }[] = [
  { keys: ["lead"], href: "/sales/leads/create", speak: "Creating a new lead." },
  { keys: ["contact"], href: "/sales/contacts/create", speak: "Creating a new contact." },
  { keys: ["deal"], href: "/sales/deals/create", speak: "Creating a new deal." },
  { keys: ["task"], href: "/activities/tasks/create", speak: "Creating a new task." },
  { keys: ["appointment", "meeting"], href: "/activities/meetings/create", speak: "Creating a new appointment." },
  { keys: ["reminder"], href: "/activities/reminders/create", speak: "Creating a reminder." },
  {
    keys: ["document"],
    href: "/documents/requests/create?layoutid=standard&redirect=false",
    speak: "Creating a document request.",
  },
];

function clean(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(hay: string, keys: string[]) {
  return keys.some((k) => hay.includes(k));
}

export function interpretVoiceCommand(raw: string): VoiceAction {
  const said = clean(raw);
  if (!said) {
    return { type: "help", speak: "I didn't catch that. Try again." };
  }

  if (includesAny(said, ["help", "what can you do", "commands"])) {
    return {
      type: "help",
      speak: "Try open leads, new contact, call, sticky notes, or reminders.",
    };
  }

  if (includesAny(said, ["softphone", "dialer", "keypad", "make a call", "phone"])) {
    return { type: "softphone", speak: "Opening the softphone." };
  }

  if (includesAny(said, ["sticky note", "sticky notes", "open notes pad"])) {
    return { type: "notes", speak: "Opening sticky notes." };
  }

  if (includesAny(said, ["reminder list", "show reminders", "open reminders"])) {
    return { type: "reminders", speak: "Opening reminders." };
  }

  if (includesAny(said, ["quick add"])) {
    return { type: "quick-add", speak: "Opening Quick Add." };
  }

  if (includesAny(said, ["new ", "create ", "add a ", "add an "])) {
    const hit = CREATE.find((c) => includesAny(said, c.keys));
    if (hit) return { type: "navigate", href: hit.href, speak: hit.speak };
  }

  if (includesAny(said, ["open ", "go to ", "show ", "take me", "navigate"])) {
    const hit = ROUTES.find((r) => includesAny(said, r.keys));
    if (hit) return { type: "navigate", href: hit.href, speak: hit.speak };
  }

  const named = said
    .replace(/^(open|find|search|show|go to|take me to)\s+/, "")
    .trim();
  if (named.length > 2) {
    for (const col of listLeadColumns()) {
      const lead = col.cards.find((c) =>
        c.name.toLowerCase().includes(named),
      );
      if (lead) {
        return {
          type: "navigate",
          href: `/sales/leads/detail/${encodeURIComponent(lead.id)}`,
          speak: `Opening lead ${lead.name}.`,
        };
      }
    }
    const contact = listAllContacts().find((c) =>
      c.name.toLowerCase().includes(named),
    );
    if (contact) {
      return {
        type: "navigate",
        href: `/sales/contacts/detail/${encodeURIComponent(contact.id)}`,
        speak: `Opening contact ${contact.name}.`,
      };
    }
    const deal = listAllDeals().find((d) =>
      d.name.toLowerCase().includes(named),
    );
    if (deal) {
      return {
        type: "navigate",
        href: `/sales/deals/detail/${encodeURIComponent(deal.id)}`,
        speak: `Opening deal ${deal.name}.`,
      };
    }
  }

  const route = ROUTES.find((r) => includesAny(said, r.keys));
  if (route) return { type: "navigate", href: route.href, speak: route.speak };

  return {
    type: "help",
    speak: "I can open leads, create a contact, start the phone, or take a sticky note.",
  };
}
