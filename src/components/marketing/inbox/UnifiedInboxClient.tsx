"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MentionTextarea } from "@/components/shared/MentionTextarea";
import Link from "next/link";
import {
  Inbox,
  Search,
  Send,
  Settings,
  UserPlus,
  Archive,
  CheckCheck,
  StickyNote,
  Link2,
  ChevronDown,
  Smile,
  Reply,
  Star,
  Pin,
  Flag,
  X,
  ImageIcon,
  Paperclip,
  Mic,
  Plus,
  Calendar,
  ListTodo,
  Mail,
  Phone,
  MessageSquare,
  History,
  Sparkles,
  Clock,
  Check,
  Loader2,
} from "lucide-react";
import {
  INBOX_AGENTS,
  INBOX_CHANNELS,
  INBOX_STATUSES,
  formatInboxAt,
  inboxChannelLabel,
  listInboxConversations,
  upsertInboxConversation,
  type InboxChannel,
  type InboxConversation,
  type InboxMessage,
  type InboxAttachment,
  type InboxStatus,
} from "@/lib/marketing/inbox/types";
import {
  crmMessageToInbox,
  isDemoInboxMessageId,
  resolveInboxCrmParent,
} from "@/lib/marketing/inbox/crm-parent";
import {
  createCrmMessage,
  listCrmMessages,
  listRelatedCrmMessages,
  sendCrmMessage,
  tryCrmMessage,
} from "@/lib/messages/api";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";
import { LeadFollowersField } from "@/components/sales/leads/detail/LeadFollowersField";
import { RelatedInternalNotes } from "@/components/shared/RelatedInternalNotes";
import { getRulesActor } from "@/lib/rules/actor";
import { listDealPipelines, listAllDeals, updateDeal } from "@/lib/deals/store";
import { listLeadColumns, updateLead } from "@/lib/leads/store";
import {
  findCompanyByName,
  updateCompany,
} from "@/lib/companies/store";
import { findContactByEmail, findContactById, findContactByName } from "@/lib/contacts/store";
import type { ContactCardData } from "@/lib/contacts/types";
import {
  InboxCreateLeadModal,
  InboxLinkContactModal,
} from "@/components/marketing/inbox/InboxRecordModals";
import {
  inboxAiSuggest,
  inboxAiSuggestedReplies,
} from "@/lib/marketing/inbox/ai-suggest";
import { uniqueTags } from "@/lib/tags";
import { RecordTagChip, RecordTagPicker } from "@/components/shared/tags/RecordTags";

const CHANNEL_SOFT: Record<InboxChannel, string> = {
  "Facebook Messenger": "bg-blue-100 text-blue-700",
  "Instagram DM": "bg-fuchsia-100 text-fuchsia-700",
  WhatsApp: "bg-emerald-100 text-emerald-700",
  SMS: "bg-sky-100 text-sky-700",
};

const BRAND = "#5A32A3";

const STATUS_STYLE: Record<InboxStatus, string> = {
  Open: "bg-sky-50 text-sky-700",
  Pending: "bg-amber-50 text-amber-800",
  Resolved: "bg-emerald-50 text-emerald-700",
};

type InboxListFilter = "Unread" | "All" | "Recent" | "Starred" | "Archived";

const LIST_FILTERS: {
  id: InboxListFilter;
  label: string;
  icon: typeof Mail;
}[] = [
  { id: "Unread", label: "Unread", icon: Mail },
  { id: "All", label: "All", icon: Inbox },
  { id: "Recent", label: "Recent", icon: History },
  { id: "Starred", label: "Starred", icon: Star },
  { id: "Archived", label: "Archived", icon: Archive },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function listClock(ts: string) {
  const match = ts.trim().match(/(\d{1,2}:\d{2})\s*$/);
  return match?.[1] ?? ts;
}

function formatDayHeading(at: string) {
  const match = at.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return at;
  return `${Number(match[1])} ${MONTHS[Number(match[2]) - 1]} ${match[3]}`;
}

function relatedParts(relatedTo?: string) {
  if (!relatedTo) return null;
  const idx = relatedTo.indexOf(": ");
  if (idx < 0) return { kind: "Related", name: relatedTo };
  return { kind: relatedTo.slice(0, idx), name: relatedTo.slice(idx + 2) };
}

function leadCards() {
  return listLeadColumns().flatMap((col) => col.cards);
}

function findLeadByName(name: string) {
  const key = name.trim().toLowerCase();
  return leadCards().find((card) => card.name.trim().toLowerCase() === key) ?? null;
}

function findDealByName(name: string) {
  const key = name.trim().toLowerCase();
  return listAllDeals().find((deal) => deal.name.trim().toLowerCase() === key) ?? null;
}

function syncTagToRelated(relatedTo: string | undefined, tag: string) {
  const related = relatedParts(relatedTo);
  if (!related) return;
  if (related.kind === "Lead") {
    const lead = findLeadByName(related.name);
    if (!lead) return;
    updateLead(lead.id, { tags: uniqueTags([...(lead.tags ?? []), tag]) });
    return;
  }
  if (related.kind === "Company") {
    const found = findCompanyByName(related.name);
    if (!found) return;
    updateCompany(found.company.id, {
      tags: uniqueTags([...(found.company.tags ?? []), tag]),
    });
    return;
  }
  if (related.kind === "Deal") {
    const deal = findDealByName(related.name);
    if (!deal) return;
    updateDeal(deal.id, { tags: uniqueTags([...(deal.tags ?? []), tag]) });
    if (deal.account) {
      const company = findCompanyByName(deal.account);
      if (company) {
        updateCompany(company.company.id, {
          tags: uniqueTags([...(company.company.tags ?? []), tag]),
        });
      }
    }
  }
}

function isClosedDealStage(title: string) {
  const t = title.trim().toLowerCase();
  return t.includes("closed");
}

function isClosedLeadStatus(status: string, archived?: boolean, converted?: boolean) {
  if (archived || converted) return true;
  return status === "Converted" || status === "Unqualified";
}

function namesMatch(a?: string, b?: string) {
  return Boolean(
    a &&
      b &&
      a.trim().toLowerCase() === b.trim().toLowerCase(),
  );
}

function phonesMatch(a?: string, b?: string) {
  if (!a || !b) return false;
  const left = a.replace(/\D/g, "");
  const right = b.replace(/\D/g, "");
  return left.length >= 8 && left === right;
}

type InboxRelatedLink = {
  kind: "Lead" | "Deal" | "Company" | "Contact";
  name: string;
  href?: string;
};

function inboxRelatedLinks(conversation: InboxConversation): InboxRelatedLink[] {
  const items: InboxRelatedLink[] = [];
  const seen = new Set<string>();
  const add = (item: InboxRelatedLink) => {
    const key = `${item.kind}:${item.name.trim().toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };
  const samePerson = (name?: string, email?: string, phone?: string) =>
    namesMatch(name, conversation.contactName) ||
    namesMatch(email, conversation.contactEmail) ||
    phonesMatch(phone, conversation.contactPhone);

  const explicit = relatedParts(conversation.relatedTo);
  const contact =
    (conversation.contactEmail
      ? findContactByEmail(conversation.contactEmail)
      : null) ?? findContactByName(conversation.contactName);

  for (const col of listLeadColumns()) {
    for (const card of col.cards) {
      if (isClosedLeadStatus(col.leadStatus, card.archived, card.isConverted)) {
        continue;
      }
      const linked =
        samePerson(card.name, card.email, card.phone) ||
        (explicit?.kind === "Lead" && namesMatch(explicit.name, card.name));
      if (!linked) continue;
      add({
        kind: "Lead",
        name: card.name,
        href: `/sales/leads/detail/${encodeURIComponent(card.id)}`,
      });
    }
  }

  for (const stages of Object.values(listDealPipelines())) {
    for (const stage of stages) {
      if (isClosedDealStage(stage.title)) continue;
      for (const deal of stage.deals) {
        const linked =
          samePerson(deal.contact) ||
          (explicit?.kind === "Deal" && namesMatch(explicit.name, deal.name)) ||
          Boolean(
            contact &&
              (deal.contactId === contact.id ||
                contact.dealIds?.includes(deal.id) ||
                namesMatch(deal.contact, contact.name)),
          );
        if (!linked) continue;
        add({
          kind: "Deal",
          name: deal.name,
          href: `/sales/deals/detail/${encodeURIComponent(deal.id)}`,
        });
      }
    }
  }

  if (explicit?.kind === "Company") {
    add({ kind: "Company", name: explicit.name });
  } else if (explicit?.kind === "Lead" && !items.some((item) => item.kind === "Lead")) {
    add({ kind: "Lead", name: explicit.name });
  } else if (explicit?.kind === "Deal" && !items.some((item) => item.kind === "Deal")) {
    add({ kind: "Deal", name: explicit.name });
  }

  const linkedContact =
    (conversation.contactId
      ? findContactById(conversation.contactId)?.contact
      : null) ??
    (conversation.contactEmail
      ? findContactByEmail(conversation.contactEmail)
      : null) ??
    findContactByName(conversation.contactName);
  if (linkedContact) {
    add({
      kind: "Contact",
      name: linkedContact.name,
      href: `/sales/contacts/detail/${encodeURIComponent(linkedContact.id)}`,
    });
  }

  return items;
}

const RELATED_KIND_TONE: Record<InboxRelatedLink["kind"], string> = {
  Lead: "bg-sky-50 text-sky-700 ring-sky-200",
  Deal: "bg-violet-50 text-violet-700 ring-violet-200",
  Company: "bg-amber-50 text-amber-800 ring-amber-200",
  Contact: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

function followerSlotLabel(index: number) {
  if (index === 0) return "1st follower";
  if (index === 1) return "2nd follower";
  if (index === 2) return "3rd follower";
  return `Follower ${index + 1}`;
}

const FOLLOWED_BY_ME = "Followed by me";

function inInboxScope(
  c: InboxConversation,
  channelFilter: InboxChannel | "All",
  agentFilter: string,
  me: string,
) {
  if (channelFilter !== "All" && c.channel !== channelFilter) return false;
  if (agentFilter === FOLLOWED_BY_ME) {
    const who = me.trim().toLowerCase();
    return (c.followers ?? []).some((name) => name.trim().toLowerCase() === who);
  }
  if (agentFilter !== "All" && c.assignedAgent !== agentFilter) return false;
  return true;
}

function recentCutoff(conversations: InboxConversation[]) {
  const newest = conversations.reduce(
    (max, c) => Math.max(max, parseInboxTimestamp(c.timestamp)),
    0,
  );
  return newest - 7 * 24 * 60 * 60 * 1000;
}

function firstNameOf(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}


function ensureSentence(text: string) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  const capped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

function inboxAiFromPrompt(conversation: InboxConversation, prompt: string) {
  const first = firstNameOf(conversation.contactName);
  const raw = prompt.trim();
  if (!raw || /suggest( a)? reply/i.test(raw)) return inboxAiSuggest(conversation);

  const lower = raw.toLowerCase();
  if (
    /outstanding documents|send the (outstanding )?docs|upload (the )?docs/.test(
      lower,
    )
  ) {
    return `Hi ${first}, could you please send the outstanding documents when you have a moment? Once I have them I can keep your application moving.`;
  }
  if (/call (them|you) today|we can call|give .+ a call|callback/.test(lower)) {
    return `Hi ${first}, I can give you a call today to go through this. What time works best for you?`;
  }
  if (/next steps/.test(lower)) {
    return `Hi ${first}, next I'll confirm your details, collect any missing documents, then we can look at options and the best way forward. Does that work?`;
  }
  if (/^(hi|hello|hey|thanks|dear|good (morning|afternoon))\b/i.test(raw)) {
    return ensureSentence(raw);
  }

  let instruction = raw
    .replace(
      /^(please\s+)?(write|draft|compose|send|say)\s+(a\s+)?(message|reply|sms|note)\s+(to\s+(them|him|her)\s+)?((that|to|saying)\s+)?/i,
      "",
    )
    .replace(
      /^(please\s+)?(ask|tell|let)\s+(them|him|her|the client)\s+(to|that|know\s+that)\s+/i,
      "",
    )
    .replace(/^(please\s+)?(confirm|share|explain|mention)\s+(that\s+)?/i, "")
    .trim();
  instruction = instruction
    .replace(/\btheir\b/gi, "your")
    .replace(/\bthem\b/gi, "you")
    .replace(/\bthey\b/gi, "you");

  if (/^ask\b/i.test(raw)) {
    return `Hi ${first}, could you please ${instruction.replace(/[?.!]+$/, "")}?`;
  }
  if (/^confirm\b/i.test(raw)) {
    return `Hi ${first}, just confirming ${instruction.charAt(0).toLowerCase()}${instruction.slice(1).replace(/[?.!]+$/, "")}. Does that work for you?`;
  }
  if (/^share\b|^explain\b/i.test(raw)) {
    return `Hi ${first}, ${ensureSentence(instruction)} Happy to walk you through it if useful.`;
  }
  return `Hi ${first}, ${ensureSentence(instruction)}`;
}

function inboxAiRewrite(
  text: string,
  mode: "professional" | "friendly" | "shorter",
) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const cleaned = trimmed
    .replace(/\s*—\s*happy to help!?\s*$/i, "")
    .replace(/\s*Happy to help!?\s*$/i, "")
    .trim();
  if (mode === "shorter") {
    const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
    return sentence.length > 140 ? `${sentence.slice(0, 137).trim()}…` : sentence;
  }
  if (mode === "friendly") {
    const base = /[.!?]$/.test(cleaned) ? cleaned.slice(0, -1) : cleaned;
    return `${base} — happy to help!`;
  }
  let next = cleaned
    .replace(/\bhey\b/gi, "Hi")
    .replace(/!+/g, ".")
    .replace(/\s+/g, " ")
    .trim();
  if (!/^(hi|hello|dear|thanks)\b/i.test(next)) {
    next = `Hi, ${next.charAt(0).toLowerCase()}${next.slice(1)}`;
  }
  next = ensureSentence(next);
  if (!/\bthanks\b/i.test(next)) next = `${next.replace(/[.]$/, "")}. Thanks.`;
  return next;
}

const INBOX_AI_PROMPTS = [
  "Suggest a reply to their last message",
  "Ask them to send the outstanding documents",
  "Confirm we can call them today",
  "Share next steps for their application",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInput(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function fromLocalInput(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function tomorrowNine() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
}

function nextMondayNine() {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? 1 : 8 - day));
  date.setHours(9, 0, 0, 0);
  return date;
}

function parseInboxTimestamp(value: string) {
  const match = value.trim().match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/,
  );
  if (!match) return 0;
  return new Date(
    Number(match[3]),
    Number(match[2]) - 1,
    Number(match[1]),
    match[4] ? Number(match[4]) : 0,
    match[5] ? Number(match[5]) : 0,
  ).getTime();
}

const EMOJI_CATEGORIES: { id: string; label: string; emojis: string[] }[] = [
  {
    id: "smileys",
    label: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
      "🙂", "😉", "😍", "🥰", "😘", "😗", "😋", "😜", "🤪", "😝",
      "🤑", "🤗", "🤭", "🤫", "🤔", "😐", "😑", "😶", "🙄", "😏",
      "😣", "😥", "😮", "🤐", "😯", "😪", "😫", "🥱", "😴", "😌",
      "😛", "😒", "😓", "😔", "😕", "🙃", "🫠", "🙁", "😖", "😞",
      "😟", "😤", "😢", "😭", "😦", "😧", "😨", "😩", "🤯", "😬",
      "😰", "😱", "🥵", "🥶", "😳", "🥺", "🥹", "🤠", "🥳", "😎",
      "🤓", "🧐", "👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "✌️",
    ],
  },
  {
    id: "hearts",
    label: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "✨",
      "⭐", "🌟", "💫", "🔥", "💯", "✅", "✔️", "❌", "⚠️", "🎉",
      "🎊", "🎈", "🏆", "🥇", "🎯", "📌", "🔔", "💡", "⚡", "🌈",
    ],
  },
  {
    id: "people",
    label: "People",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "👈", "👉",
      "👆", "👇", "☝️", "🫵", "✊", "👊", "🤛", "🤜", "🫶", "👐",
      "🤲", "🙌", "👏", "🤞", "🤟", "🤘", "🤙", "💅", "🤳", "💃",
      "🕺", "🧑‍💻", "👩‍💻", "👨‍💻", "🧑‍💼", "👩‍💼", "👨‍💼", "🙋", "💁", "🙇",
    ],
  },
  {
    id: "work",
    label: "Work",
    emojis: [
      "📅", "📆", "🗂️", "📁", "📂", "📄", "📝", "✏️", "📌", "📎",
      "💼", "💻", "🖥️", "📱", "☎️", "📞", "📧", "📩", "📬", "📨",
      "🔗", "📊", "📈", "📉", "💰", "💵", "🏦", "🏠", "🏢", "🔑",
      "🔒", "🗓️", "⏱️", "⏰", "⌛", "🔎", "📋", "✅", "☑️", "📍",
    ],
  },
  {
    id: "extra",
    label: "More",
    emojis: [
      "☀️", "🌙", "⭐", "🌸", "🌺", "🍀", "🌿", "🌍", "☕", "🍵",
      "🥐", "🍕", "🍰", "🎂", "🍾", "🥂", "🚗", "✈️", "🚀", "🏡",
      "🎁", "📸", "🎥", "🎵", "🎶", "💬", "💭", "👀", "🙈", "🙌",
      "🤝", "🫶", "💙", "💚", "🧡", "❤️‍🔥", "🫡", "🤷", "🤦", "😴",
    ],
  },
];

export function UnifiedInboxClient() {
  const [rows, setRows] = useState<InboxConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<InboxChannel | "All">(
    "All",
  );
  const [listFilter, setListFilter] = useState<InboxListFilter>("All");
  const [agentFilter, setAgentFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<InboxMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [pendingFiles, setPendingFiles] = useState<InboxAttachment[]>([]);
  const [recording, setRecording] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(() =>
    toLocalInput(tomorrowNine()),
  );
  const feedRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const crmSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    const list = listInboxConversations();
    setRows(list);
    const firstOpen = list.find((c) => !c.archived) ?? list[0];
    if (firstOpen) {
      setActiveId(firstOpen.id);
    }
  }, []);

  const active = rows.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    if (!activeId) return;
    const conversation = listInboxConversations().find((c) => c.id === activeId);
    if (!conversation) return;
    const parent = resolveInboxCrmParent(conversation);
    const key = `${conversation.id}:${parent?.type ?? "none"}:${parent?.id ?? "none"}`;
    if (crmSyncedRef.current === key) return;
    crmSyncedRef.current = key;
    let cancelled = false;
    void (async () => {
      let remote = parent
        ? await tryCrmMessage(() =>
            listRelatedCrmMessages(parent.type, parent.id),
          )
        : null;
      if (remote == null) {
        const all = await tryCrmMessage(() => listCrmMessages());
        if (cancelled) return;
        if (all == null) {
          crmSyncedRef.current = null;
          return;
        }
        const needle = conversation.contactName.trim().toLowerCase();
        remote = all.filter((row) => {
          const blob =
            `${row.relatedTo ?? ""} ${row.to} ${row.from} ${row.subject}`.toLowerCase();
          return needle ? blob.includes(needle) : false;
        });
      }
      if (cancelled || remote == null) return;
      const mapped = remote.map((row) => crmMessageToInbox(row, conversation));
      const extras = conversation.messages.filter(
        (item) =>
          !isDemoInboxMessageId(item.id) &&
          !mapped.some((row) => row.id === item.id),
      );
      persist({
        ...conversation,
        messages: [...mapped, ...extras],
        relatedTo: parent?.relatedTo ?? conversation.relatedTo,
        contactId:
          parent?.type === "CONTACT" ? parent.id : conversation.contactId,
      });
    })();
    return () => {
      cancelled = true;
    };
    // persist is stable enough for this overlay; re-run when the open thread changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    feedRef.current?.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeId, active?.messages.length]);

  useEffect(() => {
    setReplyTo(null);
    setDraft("");
    setEmojiOpen(false);
    setAttachOpen(false);
    setAiOpen(false);
    setAiPrompt("");
    setAiBusy(false);
    setAiReady(false);
    setLinkOpen(false);
    setLeadOpen(false);
    setSendOpen(false);
    setScheduleOpen(false);
    setPendingFiles([]);
    setRecording(false);
  }, [activeId]);

  useEffect(() => {
    if (!emojiOpen) return;
    function onDoc(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [emojiOpen]);

  useEffect(() => {
    if (!attachOpen) return;
    function onDoc(e: MouseEvent) {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setAttachOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [attachOpen]);

  useEffect(() => {
    if (!sendOpen && !scheduleOpen) return;
    function onDoc(e: MouseEvent) {
      if (sendRef.current && !sendRef.current.contains(e.target as Node)) {
        setSendOpen(false);
        setScheduleOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sendOpen, scheduleOpen]);

  const scoped = useMemo(
    () => {
      const me = getRulesActor().name;
      return rows.filter((c) =>
        inInboxScope(c, channelFilter, agentFilter, me),
      );
    },
    [rows, channelFilter, agentFilter],
  );

  const filtered = useMemo(() => {
    let data = scoped;
    if (listFilter === "Archived") {
      data = data.filter((c) => c.archived);
    } else {
      data = data.filter((c) => !c.archived);
      if (listFilter === "Unread") data = data.filter((c) => c.unreadCount > 0);
      if (listFilter === "Starred") data = data.filter((c) => c.starred);
      if (listFilter === "Recent") {
        const cutoff = recentCutoff(data);
        data = data.filter((c) => parseInboxTimestamp(c.timestamp) >= cutoff);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) =>
          c.contactName.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q) ||
          c.conversationId.toLowerCase().includes(q) ||
          (c.relatedTo?.toLowerCase().includes(q) ?? false) ||
          c.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return [...data].sort((a, b) => {
      const pin = Number(!!b.pinned) - Number(!!a.pinned);
      if (pin !== 0) return pin;
      return parseInboxTimestamp(b.timestamp) - parseInboxTimestamp(a.timestamp);
    });
  }, [scoped, listFilter, search]);

  useEffect(() => {
    if (activeId && scoped.some((c) => c.id === activeId)) return;
    const next = filtered[0] ?? scoped.find((c) => !c.archived) ?? scoped[0];
    setActiveId(next?.id ?? null);
  }, [scoped, filtered, activeId]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function persist(next: InboxConversation) {
    upsertInboxConversation(next);
    setRows((prev) => prev.map((c) => (c.id === next.id ? next : c)));
  }

  function selectConversation(id: string) {
    setActiveId(id);
    const c = rows.find((x) => x.id === id);
    if (c && c.unreadCount > 0) {
      persist({ ...c, unreadCount: 0 });
    }
  }

  function sendReply(when?: Date) {
    if (!active) return;
    const body = draft.trim();
    if (!body && pendingFiles.length === 0) return;
    const scheduled =
      when && when.getTime() > Date.now() ? when : undefined;
    const author =
      active.assignedAgent === "Unassigned" ? "You" : active.assignedAgent;
    const hasVoice = pendingFiles.some((f) => f.kind === "voice");
    const lastPreview =
      body ||
      (hasVoice
        ? "Voice note"
        : pendingFiles.some((f) => f.kind === "image")
          ? "Photo"
          : pendingFiles[0]?.name ?? "Attachment");
    const at = scheduled ? formatInboxAt(scheduled) : formatInboxAt();
    const msg: InboxMessage = {
      id: `m-${Date.now()}`,
      body: body || lastPreview,
      at,
      outbound: true,
      author,
      replyToId: replyTo?.id,
      replyToPreview: replyTo
        ? `${replyTo.author}: ${replyTo.body.slice(0, 60)}`
        : undefined,
      kind: hasVoice && !body ? "voice" : "text",
      voiceDurationSec: pendingFiles.find((f) => f.kind === "voice")
        ?.durationSec,
      attachments: pendingFiles.length ? pendingFiles : undefined,
      scheduledFor: scheduled ? at : undefined,
    };
    persist({
      ...active,
      messages: [...active.messages, msg],
      lastMessage: scheduled ? `Scheduled: ${lastPreview}` : lastPreview,
      timestamp: formatInboxAt(),
      unreadCount: 0,
    });
    const parent = resolveInboxCrmParent(active);
    if (parent && body && !scheduled) {
      void tryCrmMessage(async () => {
        const created = await createCrmMessage({
          type: "External",
          subject: lastPreview.slice(0, 80),
          body,
          from: author,
          to: active.contactName,
          relatedTo: parent.relatedTo,
          relatedType: parent.type,
          relatedId: parent.id,
          status: "Draft",
        });
        if (!created) return null;
        return sendCrmMessage(created.id);
      });
    }
    setDraft("");
    setPendingFiles([]);
    setReplyTo(null);
    setEmojiOpen(false);
    setRecording(false);
    setSendOpen(false);
    setScheduleOpen(false);
    flash(
      scheduled
        ? `Reply scheduled for ${at}`
        : `Reply sent via ${inboxChannelLabel(active.channel)}`,
    );
  }

  function formatBytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  function addPickedFiles(files: FileList | null, kind: "image" | "file") {
    if (!files?.length) return;
    const next: InboxAttachment[] = [];
    const jobs: Promise<void>[] = [];
    for (const [index, file] of Array.from(files).slice(0, 6).entries()) {
      const att: InboxAttachment = {
        id: `att-${Date.now()}-${index}-${file.name}`,
        name: file.name,
        sizeLabel: formatBytes(file.size),
        mimeType: file.type || "application/octet-stream",
        kind: kind === "image" || file.type.startsWith("image/") ? "image" : "file",
      };
      if (att.kind === "image" && file.size <= 750 * 1024) {
        jobs.push(
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") att.url = reader.result;
              resolve();
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(file);
          }),
        );
      }
      next.push(att);
    }
    void Promise.all(jobs).then(() => {
      setPendingFiles((prev) => [...prev, ...next].slice(0, 8));
    });
    setEmojiOpen(false);
  }

  function toggleVoice() {
    if (recording) {
      setRecording(false);
      const duration = 6 + Math.floor(Math.random() * 8);
      setPendingFiles((prev) => [
        ...prev,
        {
          id: `voice-${Date.now()}`,
          name: "Voice note",
          sizeLabel: `${duration}s`,
          mimeType: "audio/webm",
          kind: "voice",
          durationSec: duration,
        },
      ]);
      flash("Voice note attached");
      return;
    }
    setRecording(true);
    setEmojiOpen(false);
    flash("Recording… tap mic again to attach");
  }

  function insertComposerText(text: string) {
    const el = composerRef.current;
    if (!el) {
      setDraft((d) => d + text);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + text + draft.slice(end);
    const cursor = start + text.length;
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }

  function insertQuickReply(text: string) {
    setDraft(text);
  }

  function closeInboxAi() {
    setAiOpen(false);
    setAiPrompt("");
    setAiBusy(false);
    setAiReady(false);
  }

  function runInboxAi(next: string, notice: string) {
    if (!next) {
      flash("Type a prompt first, or tap Suggest reply");
      return;
    }
    setAiBusy(true);
    window.setTimeout(() => {
      setAiPrompt(next);
      setAiReady(true);
      setAiBusy(false);
      flash(notice);
    }, 380);
  }

  function writeInboxFromPrompt(prompt: string) {
    if (!active) return;
    runInboxAi(inboxAiFromPrompt(active, prompt), "Draft ready in this box");
  }

  function suggestInboxReply() {
    if (!active) return;
    runInboxAi(inboxAiSuggest(active), "Suggested reply ready");
  }

  function refineInboxDraft(mode: "professional" | "friendly" | "shorter") {
    if (!aiPrompt.trim()) {
      flash("Write a prompt first, or tap Suggest reply");
      return;
    }
    const source =
      aiReady || !active
        ? aiPrompt
        : inboxAiFromPrompt(active, aiPrompt);
    const next = inboxAiRewrite(source, mode);
    const notice =
      mode === "shorter"
        ? "Shortened"
        : mode === "friendly"
          ? "Made friendlier"
          : "Made professional";
    runInboxAi(next, notice);
  }

  function importInboxAi() {
    const text = aiPrompt.trim();
    if (!text) {
      flash("Write a draft first, then use it in the message");
      return;
    }
    if (!aiReady) {
      flash("Write the draft first, then use it in the message");
      return;
    }
    setDraft(text);
    closeInboxAi();
    flash("Added to message");
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  function assignAgent(agent: string) {
    if (!active) return;
    persist({ ...active, assignedAgent: agent });
    flash(`Assigned to ${agent}`);
  }

  function setStatus(status: InboxStatus) {
    if (!active) return;
    persist({ ...active, status });
    flash(`Status → ${status}`);
  }

  function addTag(raw: string) {
    if (!active) return;
    const tag = raw.trim().replace(/\s+/g, " ");
    if (!tag) return;
    if (active.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) {
      flash("Tag already added");
      return;
    }
    persist({ ...active, tags: [...active.tags, tag] });
    syncTagToRelated(active.relatedTo, tag);
    flash(`Tagged #${tag}`);
  }

  function removeTag(tag: string) {
    if (!active) return;
    persist({ ...active, tags: active.tags.filter((t) => t !== tag) });
  }

  function toggleRead() {
    if (!active) return;
    persist({
      ...active,
      unreadCount: active.unreadCount > 0 ? 0 : 1,
    });
  }

  function archive() {
    if (!active) return;
    persist({ ...active, archived: true, status: "Resolved" });
    flash("Conversation archived");
    const next = filtered.find((c) => c.id !== active.id);
    setActiveId(next?.id ?? null);
  }

  function togglePinOn(c: InboxConversation) {
    persist({ ...c, pinned: !c.pinned });
    flash(c.pinned ? "Unpinned" : "Pinned to top");
  }

  function toggleFlagOn(c: InboxConversation) {
    persist({ ...c, flagged: !c.flagged });
    flash(c.flagged ? "Flag removed" : "Flagged");
  }

  function applyLinkedContact(contact: ContactCardData) {
    if (!active) return;
    persist({
      ...active,
      contactId: contact.id,
      contactName: contact.name,
      contactEmail: contact.email,
      contactPhone: contact.phone || active.contactPhone,
    });
    setLinkOpen(false);
    flash(`Linked contact · ${contact.name}`);
  }

  function conversationLeadName(conversation: InboxConversation) {
    return (
      inboxRelatedLinks(conversation).find((item) => item.kind === "Lead")
        ?.name ?? null
    );
  }

  const openScoped = scoped.filter((c) => !c.archived);
  const unreadTotal = openScoped.filter((c) => c.unreadCount > 0).length;
  const recentCount = openScoped.filter(
    (c) => parseInboxTimestamp(c.timestamp) >= recentCutoff(openScoped),
  ).length;
  const filterCount: Record<InboxListFilter, number> = {
    Unread: unreadTotal,
    All: openScoped.length,
    Recent: recentCount,
    Starred: openScoped.filter((c) => c.starred).length,
    Archived: scoped.filter((c) => c.archived).length,
  };
  const scheduleDate = fromLocalInput(scheduleAt);
  const scheduleValid = !!(
    scheduleDate && scheduleDate.getTime() > Date.now()
  );
  const explicitContact = active
    ? (active.contactId
        ? findContactById(active.contactId)?.contact
        : null) ??
      (active.contactEmail ? findContactByEmail(active.contactEmail) : null)
    : null;
  const existingLeadName = active ? conversationLeadName(active) : null;
  const suggestedReplies = useMemo(
    () => (active ? inboxAiSuggestedReplies(active) : []),
    [active],
  );

  return (
    <div className="flex min-h-0 min-h-full w-full flex-1 flex-col overflow-hidden bg-[#F7F8FA] p-2 pr-3">
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        {/* Conversation list */}
        <div className="flex w-[300px] shrink-0 flex-col overflow-hidden border-r border-slate-100 sm:w-[340px]">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Inbox
            </h1>
            {unreadTotal > 0 ? (
              <span className="rounded-full bg-[#F3ECFB] px-2 py-0.5 text-[11px] font-semibold text-[#5A32A3]">
                {unreadTotal} unread
              </span>
            ) : null}
            <Link
              href="/marketing/inbox/settings"
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Settings className="h-3.5 w-3.5" />
              Channels
            </Link>
          </div>
          <div className="space-y-2 border-b border-slate-100 p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="h-9 w-full rounded-lg border border-slate-200/90 bg-white pr-2.5 pl-8 text-[12px] outline-none focus:border-[#5A32A3] focus:shadow-[0_0_0_3px_rgba(90,50,163,0.12)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InboxAgentPicker
                value={agentFilter}
                onChange={setAgentFilter}
                options={["All", FOLLOWED_BY_ME, ...INBOX_AGENTS]}
                labels={{ All: "All agents" }}
                ariaLabel="Filter by agent"
                searchPlaceholder="Search"
              />
              <FilterSelect
                value={channelFilter}
                onChange={(v) =>
                  setChannelFilter(v as InboxChannel | "All")
                }
                ariaLabel="Filter by channel"
              >
                <option value="All">All channels</option>
                {INBOX_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {inboxChannelLabel(ch)}
                  </option>
                ))}
              </FilterSelect>
            </div>
          </div>
          <div className="grid grid-cols-5 border-b border-slate-100">
            {LIST_FILTERS.map((f) => {
              const count = filterCount[f.id];
              const active = listFilter === f.id;
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setListFilter(f.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 px-0.5 pt-2.5 pb-2",
                    active
                      ? "text-slate-800"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  <span className="relative inline-flex">
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        active ? "text-[#5A32A3]" : "text-slate-400",
                      )}
                      strokeWidth={1.75}
                    />
                    {f.id === "Unread" && count > 0 ? (
                      <span
                        className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold text-white"
                        style={{ backgroundColor: BRAND }}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] leading-none",
                      active ? "font-semibold" : "font-medium",
                    )}
                  >
                    {f.label}
                  </span>
                  {active ? (
                    <span
                      className="absolute right-2 bottom-0 left-2 h-0.5 rounded-full"
                      style={{ backgroundColor: BRAND }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {filtered.map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => selectConversation(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectConversation(c.id);
                  }
                }}
                className={cn(
                  "group flex w-full min-w-0 cursor-pointer gap-2.5 overflow-hidden border-b border-slate-50 px-3 py-2.5 text-left transition-colors",
                  activeId === c.id
                    ? "bg-[#F8F4FC]"
                    : "hover:bg-slate-50/80",
                )}
              >
                <InboxAvatar name={c.contactName} channel={c.channel} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="flex min-w-0 flex-1 items-center gap-1 truncate text-[13px] font-semibold text-slate-900">
                      {c.pinned ? (
                        <Pin className="h-3 w-3 shrink-0 fill-[#5A32A3] text-[#5A32A3]" />
                      ) : null}
                      <span className="truncate">{c.contactName}</span>
                      {c.starred ? (
                        <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                      ) : null}
                      {c.flagged ? (
                        <Flag className="h-3 w-3 shrink-0 fill-rose-500 text-rose-500" />
                      ) : null}
                    </p>
                    <div className="relative flex h-6 w-[52px] shrink-0 items-center justify-end">
                      <span className="text-[10px] text-slate-400 group-hover:invisible">
                        {listClock(c.timestamp)}
                      </span>
                      <div className="absolute inset-y-0 right-0 hidden items-center group-hover:flex">
                        <button
                          type="button"
                          title={c.pinned ? "Unpin" : "Pin to top"}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinOn(c);
                          }}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md hover:bg-white",
                            c.pinned
                              ? "text-[#5A32A3]"
                              : "text-slate-400 hover:text-[#5A32A3]",
                          )}
                        >
                          <Pin
                            className={cn(
                              "h-3.5 w-3.5",
                              c.pinned && "fill-[#5A32A3]",
                            )}
                          />
                        </button>
                        <button
                          type="button"
                          title={c.flagged ? "Remove flag" : "Flag"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFlagOn(c);
                          }}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md hover:bg-white",
                            c.flagged
                              ? "text-rose-500"
                              : "text-slate-400 hover:text-rose-500",
                          )}
                        >
                          <Flag
                            className={cn(
                              "h-3.5 w-3.5",
                              c.flagged && "fill-rose-500",
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[12px] text-slate-500">
                      {c.lastMessage}
                    </p>
                    {c.unreadCount > 0 ? (
                      <span
                        className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                        style={{ backgroundColor: BRAND }}
                      >
                        {c.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 ? (
              <p className="px-4 py-12 text-center text-[12px] text-slate-400">
                No conversations match.
              </p>
            ) : null}
          </div>
        </div>

          {/* Thread pane */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {!active ? (
              <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
                <Inbox className="mb-2 h-10 w-10 text-slate-300" />
                <p className="text-[13px]">Select a conversation</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <InboxAvatar
                      name={active.contactName}
                      size="lg"
                      channel={active.channel}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[15px] font-bold text-slate-900">
                          {active.contactName}
                        </h2>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            CHANNEL_SOFT[active.channel],
                          )}
                        >
                          {inboxChannelLabel(active.channel)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            STATUS_STYLE[active.status],
                          )}
                        >
                          {active.status}
                        </span>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        <span>{active.conversationId}</span>
                        {relatedParts(active.relatedTo) ? (
                          <span>{relatedParts(active.relatedTo)!.kind}</span>
                        ) : null}
                        {active.contactEmail ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {active.contactEmail}
                          </span>
                        ) : null}
                        {active.contactPhone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {active.contactPhone}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <IconBtn
                      title={active.pinned ? "Unpin" : "Pin to top"}
                      onClick={() => togglePinOn(active)}
                      icon={Pin}
                      iconClassName={
                        active.pinned
                          ? "fill-[#5A32A3] text-[#5A32A3]"
                          : undefined
                      }
                    />
                    <IconBtn
                      title={active.flagged ? "Remove flag" : "Flag"}
                      onClick={() => toggleFlagOn(active)}
                      icon={Flag}
                      iconClassName={
                        active.flagged
                          ? "fill-rose-500 text-rose-500"
                          : undefined
                      }
                    />
                    <IconBtn
                      title="Mark read/unread"
                      onClick={toggleRead}
                      icon={CheckCheck}
                    />
                    <IconBtn title="Archive" onClick={archive} icon={Archive} />
                    <IconBtn
                      title={
                        explicitContact
                          ? `Linked contact · ${explicitContact.name}`
                          : "Link contact"
                      }
                      onClick={() => setLinkOpen(true)}
                      icon={Link2}
                      active={Boolean(explicitContact)}
                      activeClassName="border-emerald-200 bg-emerald-50 text-emerald-700"
                    />
                    <IconBtn
                      title={
                        existingLeadName
                          ? `Already a lead · ${existingLeadName}`
                          : "Create lead"
                      }
                      onClick={() => {
                        if (existingLeadName) {
                          flash(`Already a lead · ${existingLeadName}`);
                          return;
                        }
                        setLeadOpen(true);
                      }}
                      icon={UserPlus}
                      active={Boolean(existingLeadName)}
                      activeClassName="border-sky-200 bg-sky-50 text-sky-700"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      Assign
                    </span>
                    <InboxAgentPicker
                      value={active.assignedAgent}
                      onChange={assignAgent}
                      options={INBOX_AGENTS}
                      ariaLabel="Assign agent"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      Status
                    </span>
                    <div className="w-[120px]">
                      <FilterSelect
                        value={active.status}
                        onChange={(v) => setStatus(v as InboxStatus)}
                        ariaLabel="Conversation status"
                      >
                        {INBOX_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </FilterSelect>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      Followers
                    </span>
                    <LeadFollowersField
                      value={JSON.stringify(active.followers ?? [])}
                      owner={
                        active.assignedAgent === "Unassigned"
                          ? undefined
                          : active.assignedAgent
                      }
                      onChange={(raw) => {
                        try {
                          const parsed = JSON.parse(raw) as unknown;
                          const next = Array.isArray(parsed)
                            ? parsed.filter(
                                (name): name is string =>
                                  typeof name === "string" && Boolean(name.trim()),
                              )
                            : [];
                          persist({ ...active, followers: next });
                        } catch {
                          persist({ ...active, followers: [] });
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {active.tags.map((t) => (
                      <RecordTagChip
                        key={t}
                        tag={t}
                        onRemove={() => removeTag(t)}
                      />
                    ))}
                    <RecordTagPicker
                      selected={active.tags}
                      relatedTo={active.relatedTo}
                      onAdd={addTag}
                    />
                  </div>
                </div>

                <div
                  ref={feedRef}
                  className="min-h-0 flex-1 overflow-auto bg-[#F7F8FA] px-4 py-4"
                >
                  {active.messages.map((m, i) => {
                    const day = formatDayHeading(m.at);
                    const prevDay =
                      i > 0
                        ? formatDayHeading(active.messages[i - 1]!.at)
                        : null;
                    return (
                      <div key={m.id}>
                        {day !== prevDay ? (
                          <div className="mb-3 flex items-center gap-3">
                            <span className="h-px flex-1 bg-slate-200/80" />
                            <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                              {day}
                            </span>
                            <span className="h-px flex-1 bg-slate-200/80" />
                          </div>
                        ) : null}
                        <div
                          className={cn(
                            "group mb-3 flex gap-2",
                            m.outbound ? "justify-end" : "justify-start",
                          )}
                        >
                          {!m.outbound ? (
                            <InboxAvatar name={m.author} size="sm" />
                          ) : null}
                          <div className="relative max-w-[75%]">
                            {m.replyToPreview ? (
                              <div
                                className={cn(
                                  "mb-1 truncate rounded-lg border px-2 py-1 text-[11px]",
                                  m.outbound
                                    ? "border-white/20 bg-white/15 text-white/80"
                                    : "border-slate-200 bg-slate-50 text-slate-500",
                                )}
                              >
                                {m.replyToPreview}
                              </div>
                            ) : null}
                            <div
                              className={cn(
                                "rounded-2xl px-3.5 py-2 shadow-sm",
                                m.outbound
                                  ? "rounded-br-md text-white"
                                  : "rounded-bl-md border border-slate-100 bg-white text-slate-800",
                              )}
                              style={
                                m.outbound
                                  ? { backgroundColor: BRAND }
                                  : undefined
                              }
                            >
                              {m.attachments?.length ? (
                                <InboxMessageMedia
                                  attachments={m.attachments}
                                  outbound={m.outbound}
                                />
                              ) : null}
                              {m.body &&
                              !(
                                m.attachments?.length &&
                                (m.body === "Voice note" ||
                                  m.body === "Photo" ||
                                  m.attachments.some((a) => a.name === m.body))
                              ) ? (
                                <InboxMessageText text={m.body} />
                              ) : null}
                              <div
                                className={cn(
                                  "mt-1 flex items-center gap-2 text-[9px]",
                                  m.outbound
                                    ? "text-violet-100"
                                    : "text-slate-400",
                                )}
                              >
                                <span>
                                  {m.scheduledFor ? (
                                    <>
                                      Scheduled · {m.scheduledFor}
                                    </>
                                  ) : (
                                    <>
                                      {listClock(m.at)}
                                      {m.outbound
                                        ? ` · Sent via ${inboxChannelLabel(active.channel)}`
                                        : ""}
                                    </>
                                  )}
                                </span>
                                {m.outbound && !m.scheduledFor ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : null}
                                {m.outbound && m.scheduledFor ? (
                                  <Clock className="h-3 w-3" />
                                ) : null}
                                <button
                                  type="button"
                                  title={`Reply to ${m.author}`}
                                  onClick={() => {
                                    setReplyTo(m);
                                    setEmojiOpen(false);
                                    requestAnimationFrame(() =>
                                      composerRef.current?.focus(),
                                    );
                                  }}
                                  className={cn(
                                    "inline-flex items-center gap-0.5 font-semibold opacity-80 transition-opacity sm:opacity-0 sm:group-hover:opacity-100",
                                    m.outbound
                                      ? "text-white hover:text-violet-100"
                                      : "text-[#5A32A3] hover:text-[#472880]",
                                  )}
                                >
                                  <Reply className="h-3 w-3" />
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                          {m.outbound ? (
                            <InboxAvatar name={m.author} size="sm" />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 bg-white p-3">
                  {suggestedReplies.length > 0 ? (
                    <div className="mb-2">
                      <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                        <Sparkles className="h-3 w-3 text-[#5A32A3]" />
                        Suggested for their last message
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {suggestedReplies.map((q) => (
                          <button
                            key={q}
                            type="button"
                            title={q}
                            onClick={() => insertQuickReply(q)}
                            className="max-w-[280px] rounded-2xl border border-violet-100 bg-[#F8F4FC] px-2.5 py-1 text-left text-[10px] font-medium text-[#5A32A3] hover:border-violet-200 hover:bg-[#F3ECFB]"
                          >
                            <span className="line-clamp-2">{q}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {replyTo ? (
                    <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/80 px-3 py-2 text-[12px] text-violet-800">
                      <span className="min-w-0 truncate">
                        Replying to {replyTo.author}: {replyTo.body.slice(0, 72)}
                      </span>
                      <button
                        type="button"
                        aria-label="Cancel reply"
                        onClick={() => setReplyTo(null)}
                        className="rounded p-0.5 hover:bg-violet-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                  {pendingFiles.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {pendingFiles.map((f) => (
                        <span
                          key={f.id}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                        >
                          {f.kind === "image" && f.url ? (
                            <img
                              src={f.url}
                              alt=""
                              className="h-6 w-6 rounded object-cover"
                            />
                          ) : f.kind === "voice" ? (
                            <Mic className="h-3.5 w-3.5 text-violet-600" />
                          ) : (
                            <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span className="max-w-[140px] truncate">
                            {f.name}
                          </span>
                          <span className="text-slate-400">{f.sizeLabel}</span>
                          <button
                            type="button"
                            aria-label={`Remove ${f.name}`}
                            onClick={() =>
                              setPendingFiles((prev) =>
                                prev.filter((x) => x.id !== f.id),
                              )
                            }
                            className="rounded p-0.5 hover:bg-slate-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 focus-within:border-violet-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]">
                    <textarea
                      ref={composerRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder="Type your message..."
                      rows={2}
                      className="max-h-28 min-h-[40px] w-full resize-none bg-transparent px-3 py-2.5 text-[13px] outline-none placeholder:text-slate-400"
                    />
                    <div className="flex items-center justify-between gap-2 px-2 pb-2">
                      <div className="flex items-center gap-0.5">
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            addPickedFiles(e.target.files, "image");
                            e.target.value = "";
                          }}
                        />
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            addPickedFiles(e.target.files, "file");
                            e.target.value = "";
                          }}
                        />
                        <div className="relative" ref={emojiRef}>
                          <button
                            type="button"
                            title="Emoji"
                            aria-label="Insert emoji"
                            onClick={() => {
                              setAttachOpen(false);
                              setAiOpen(false);
                              setEmojiOpen((v) => !v);
                            }}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700",
                              emojiOpen && "bg-violet-50 text-violet-700",
                            )}
                          >
                            <Smile className="h-4 w-4" />
                          </button>
                          {emojiOpen ? (
                            <InboxEmojiPicker
                              category={emojiCategory}
                              onCategory={setEmojiCategory}
                              onPick={(emoji) => {
                                insertComposerText(emoji);
                                composerRef.current?.focus();
                              }}
                            />
                          ) : null}
                        </div>
                        <div className="relative" ref={attachRef}>
                          <button
                            type="button"
                            title="Add"
                            aria-label="Add image, file, meeting, or task"
                            onClick={() => {
                              setEmojiOpen(false);
                              setAiOpen(false);
                              setAttachOpen((v) => !v);
                            }}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700",
                              attachOpen && "bg-violet-50 text-violet-700",
                            )}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          {attachOpen ? (
                            <div className="absolute bottom-10 left-0 z-40 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setAttachOpen(false);
                                  imageInputRef.current?.click();
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                              >
                                <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                                Image
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAttachOpen(false);
                                  fileInputRef.current?.click();
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                              >
                                <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                                Files
                              </button>
                              <Link
                                href="/activities/meetings"
                                onClick={() => setAttachOpen(false)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                              >
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                Meeting
                              </Link>
                              <Link
                                href="/activities/tasks"
                                onClick={() => setAttachOpen(false)}
                                className="flex w-full items-center gap-2 text-left text-[12px] font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 px-3 py-2"
                              >
                                <ListTodo className="h-3.5 w-3.5 text-slate-400" />
                                Task
                              </Link>
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          title={recording ? "Stop and attach voice note" : "Voice note"}
                          aria-label={recording ? "Stop recording" : "Record voice note"}
                          onClick={toggleVoice}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            recording
                              ? "bg-rose-50 text-rose-600"
                              : "text-slate-500 hover:bg-violet-50 hover:text-violet-700",
                          )}
                        >
                          <Mic className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Write with AI"
                          aria-label="Write with AI"
                          onClick={() => {
                            setEmojiOpen(false);
                            setAttachOpen(false);
                            setSendOpen(false);
                            setScheduleOpen(false);
                            setAiPrompt(draft);
                            setAiReady(Boolean(draft.trim()));
                            setAiOpen(true);
                          }}
                          className={cn(
                            "ml-0.5 inline-flex h-8 items-center gap-1 rounded-full bg-[#F3ECFB] px-2.5 text-[11px] font-semibold text-[#5A32A3] hover:bg-[#EDE4F7]",
                            aiOpen && "ring-1 ring-[#5A32A3]/25",
                          )}
                        >
                          <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                          AI
                        </button>
                      </div>
                      <div className="relative" ref={sendRef}>
                        <div
                          className={cn(
                            "inline-flex h-9 overflow-hidden rounded-xl shadow-md",
                            !draft.trim() && pendingFiles.length === 0 && "opacity-40",
                          )}
                          style={{
                            backgroundColor: BRAND,
                            boxShadow: "0 4px 12px rgba(90,50,163,0.22)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => sendReply()}
                            disabled={!draft.trim() && pendingFiles.length === 0}
                            className="inline-flex h-9 items-center gap-1.5 px-3.5 text-[12px] font-semibold text-white hover:bg-[#4a2888] disabled:pointer-events-none"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Send
                          </button>
                          <button
                            type="button"
                            disabled={!draft.trim() && pendingFiles.length === 0}
                            aria-label="Send options"
                            onClick={() => {
                              if (!draft.trim() && pendingFiles.length === 0) return;
                              const next = !(sendOpen || scheduleOpen);
                              setEmojiOpen(false);
                              setAttachOpen(false);
                              setAiOpen(false);
                              setSendOpen(next);
                              setScheduleOpen(false);
                            }}
                            className="border-l border-white/20 px-2 text-white hover:bg-[#4a2888] disabled:pointer-events-none"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {sendOpen && !scheduleOpen ? (
                          <div className="absolute right-0 bottom-11 z-40 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                            <button
                              type="button"
                              onClick={() => sendReply()}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
                            >
                              <Send className="h-3.5 w-3.5 text-[#5A32A3]" />
                              Send now
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setScheduleAt(toLocalInput(tomorrowNine()));
                                setScheduleOpen(true);
                                setSendOpen(false);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
                            >
                              <Clock className="h-3.5 w-3.5 text-[#5A32A3]" />
                              Schedule send
                            </button>
                            <button
                              type="button"
                              onClick={() => sendReply(tomorrowNine())}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
                            >
                              <Clock className="h-3.5 w-3.5 text-[#5A32A3]" />
                              Tomorrow 9:00 AM
                            </button>
                            <button
                              type="button"
                              onClick={() => sendReply(nextMondayNine())}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
                            >
                              <Clock className="h-3.5 w-3.5 text-[#5A32A3]" />
                              Next Monday 9:00 AM
                            </button>
                          </div>
                        ) : null}
                            {scheduleOpen ? (
                          <div className="absolute right-0 bottom-11 z-40 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                            <p className="text-[13px] font-semibold text-slate-800">
                              Schedule send
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              Pick a date and time. The reply will send then.
                            </p>
                            <input
                              type="datetime-local"
                              min={toLocalInput(new Date())}
                              value={scheduleAt}
                              onChange={(e) => setScheduleAt(e.target.value)}
                              className="mt-2 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[13px] text-slate-800 outline-none focus:border-[#5A32A3]"
                            />
                            {!scheduleValid ? (
                              <p className="mt-1 text-[11px] text-red-600">
                                Choose a time in the future.
                              </p>
                            ) : null}
                            <div className="mt-3 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setScheduleOpen(false);
                                  setSendOpen(true);
                                }}
                                className="h-8 rounded-md px-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                              >
                                Back
                              </button>
                              <button
                                type="button"
                                disabled={!scheduleValid}
                                onClick={() => {
                                  if (scheduleDate) sendReply(scheduleDate);
                                }}
                                className="h-8 rounded-md px-3 text-[12px] font-semibold text-white disabled:opacity-40"
                                style={{ backgroundColor: BRAND }}
                              >
                                Schedule
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Details rail */}
          {active ? (
            <InboxDetailsRail
              conversation={active}
              onNotify={flash}
              onClearLegacyNotes={() => {
                if (!active.notes.trim()) return;
                persist({ ...active, notes: "" });
              }}
            />
          ) : null}
        </div>

      {aiOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeInboxAi();
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#5A32A3]">
                <Sparkles className="h-3.5 w-3.5" />
                Write with AI
              </p>
              <button
                type="button"
                onClick={closeInboxAi}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  {aiReady ? "Draft" : "Prompt"}
                </p>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe the reply you want… e.g. Ask them to send payslips and confirm we can call today."
                  className="min-h-[120px] w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#5A32A3]/20"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {aiReady
                    ? "Edit this draft, refine the tone, then use it in the message."
                    : "Type a prompt or pick one below. AI writes the reply in this box."}
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  Quick actions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={aiBusy || !active}
                    onClick={suggestInboxReply}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-[#5A32A3] hover:bg-[#F3ECFB] disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" />
                    Suggest reply
                  </button>
                </div>
              </div>
              {aiPrompt.trim() ? (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    Refine this message
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["professional", "Professional"],
                        ["friendly", "Friendly"],
                        ["shorter", "Shorten"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        disabled={aiBusy}
                        onClick={() => refineInboxDraft(id)}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:border-violet-200 hover:bg-[#F8F4FC] hover:text-[#5A32A3] disabled:opacity-50"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  Starter prompts
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {INBOX_AI_PROMPTS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      disabled={aiBusy}
                      onClick={() => {
                        if (/suggest( a)? reply/i.test(item)) {
                          suggestInboxReply();
                          return;
                        }
                        writeInboxFromPrompt(item);
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-[11px] text-slate-600 hover:border-violet-200 hover:bg-[#F8F4FC] disabled:opacity-50"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={closeInboxAi}
                className="h-9 rounded-lg px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={aiBusy || !active || !aiPrompt.trim()}
                onClick={() => writeInboxFromPrompt(aiPrompt)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-[12px] font-semibold text-[#5A32A3] hover:bg-[#F3ECFB] disabled:opacity-40"
              >
                {aiBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Write draft
              </button>
              <button
                type="button"
                disabled={aiBusy || !aiReady || !aiPrompt.trim()}
                onClick={importInboxAi}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: BRAND }}
              >
                Use in message
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {active ? (
        <>
          <InboxLinkContactModal
            open={linkOpen}
            name={active.contactName}
            email={active.contactEmail}
            phone={active.contactPhone}
            onClose={() => setLinkOpen(false)}
            onLinked={applyLinkedContact}
          />
          <InboxCreateLeadModal
            open={leadOpen}
            name={active.contactName}
            email={active.contactEmail}
            phone={active.contactPhone}
            owner={
              active.assignedAgent === "Unassigned"
                ? undefined
                : active.assignedAgent
            }
            onClose={() => setLeadOpen(false)}
            onCreated={({ contact, leadName }) => {
              persist({
                ...active,
                contactId: contact.id,
                contactName: contact.name,
                contactEmail: contact.email,
                contactPhone: contact.phone || active.contactPhone,
                relatedTo: `Lead: ${leadName}`,
                tags: active.tags.some((t) => t.toLowerCase() === "new-lead")
                  ? active.tags
                  : [...active.tags, "new-lead"],
              });
              setLeadOpen(false);
              flash(`Lead created · ${leadName}`);
            }}
          />
        </>
      ) : null}

      {toast ? (
        <div className="fixed right-4 bottom-16 z-[60] rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function InboxMessageMedia({
  attachments,
  outbound,
}: {
  attachments: InboxAttachment[];
  outbound: boolean;
}) {
  return (
    <div className="mb-1.5 space-y-1.5">
      {attachments.map((att) => {
        if (att.kind === "image") {
          return att.url ? (
            <img
              key={att.id}
              src={att.url}
              alt={att.name}
              className="max-h-40 max-w-full rounded-lg object-cover"
            />
          ) : (
            <div
              key={att.id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]",
                outbound ? "bg-white/15" : "bg-slate-50",
              )}
            >
              <ImageIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{att.name}</span>
            </div>
          );
        }
        if (att.kind === "voice") {
          return (
            <div
              key={att.id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium",
                outbound ? "bg-white/15" : "bg-slate-50",
              )}
            >
              <Mic className="h-3.5 w-3.5 shrink-0" />
              Voice note · {att.durationSec ?? 0}s
            </div>
          );
        }
        return (
          <div
            key={att.id}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]",
              outbound ? "bg-white/15" : "bg-slate-50",
            )}
          >
            <Paperclip className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span className="min-w-0 flex-1 truncate font-medium">{att.name}</span>
            <span className={outbound ? "text-violet-100" : "text-slate-400"}>
              {att.sizeLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function InboxMessageText({ text }: { text: string }) {
  return (
    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{text}</p>
  );
}

function InboxEmojiPicker({
  category,
  onCategory,
  onPick,
}: {
  category: string;
  onCategory: (id: string) => void;
  onPick: (emoji: string) => void;
}) {
  const active =
    EMOJI_CATEGORIES.find((c) => c.id === category) ?? EMOJI_CATEGORIES[0];
  return (
    <div className="absolute bottom-10 left-0 z-40 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 py-1.5">
        {EMOJI_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onCategory(c.id)}
            className={cn(
              "shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold",
              c.id === active.id
                ? "bg-violet-50 text-violet-700"
                : "text-slate-500 hover:bg-slate-50",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto p-1.5">
        {active.emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            title={emoji}
            onClick={() => onPick(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-base hover:bg-violet-50"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function InboxChannelIcon({
  channel,
  size = "md",
}: {
  channel: InboxChannel;
  size?: "sm" | "md";
}) {
  const label = inboxChannelLabel(channel);
  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const igGrad = useId().replace(/:/g, "");

  return (
    <span
      title={label}
      aria-label={label}
      className={cn("block overflow-hidden leading-none", dim)}
    >
      {channel === "WhatsApp" ? (
        <svg viewBox="0 0 24 24" className={cn("block", dim)} aria-hidden>
          <circle cx="12.05" cy="12" r="10.15" fill="#fff" />
          <path
            fill="#25D366"
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"
          />
        </svg>
      ) : channel === "Instagram DM" ? (
        <svg viewBox="0 0 24 24" className={cn("block", dim)} aria-hidden>
          <defs>
            <radialGradient id={igGrad} cx="30%" cy="107%" r="150%">
              <stop offset="0%" stopColor="#FFDC80" />
              <stop offset="25%" stopColor="#F77737" />
              <stop offset="50%" stopColor="#E1306C" />
              <stop offset="75%" stopColor="#C13584" />
              <stop offset="100%" stopColor="#833AB4" />
            </radialGradient>
          </defs>
          <rect width="24" height="24" rx="6.5" fill={`url(#${igGrad})`} />
          <path
            fill="#fff"
            fillRule="evenodd"
            d="M8.15 6.7h7.7A2.45 2.45 0 0 1 18.3 9.15v7.7a2.45 2.45 0 0 1-2.45 2.45h-7.7A2.45 2.45 0 0 1 5.7 16.85v-7.7A2.45 2.45 0 0 1 8.15 6.7Zm0 1.6a.85.85 0 0 0-.85.85v7.7c0 .47.38.85.85.85h7.7c.47 0 .85-.38.85-.85v-7.7a.85.85 0 0 0-.85-.85h-7.7ZM12 9.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6Zm0 1.6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z"
          />
          <circle cx="16.2" cy="9" r="1" fill="#fff" />
        </svg>
      ) : channel === "Facebook Messenger" ? (
        <svg viewBox="0 0 24 24" className={cn("block", dim)} aria-hidden>
          <path
            fill="#fff"
            d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.975 18.627 0 12 0Z"
          />
          <path
            fill="#0084FF"
            d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.975 18.627 0 12 0Zm1.191 14.963-3.055-3.26-5.963 3.26L10.732 8.1l3.131 3.259 5.889-3.259-6.561 6.863Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={cn("block", dim)} aria-hidden>
          <rect width="24" height="24" rx="6" fill="#0EA5E9" />
          <path
            fill="#fff"
            d="M6.4 7.2h11.2c.88 0 1.6.72 1.6 1.6v6.2c0 .88-.72 1.6-1.6 1.6H11.1L7.2 18.8V16H6.4c-.88 0-1.6-.72-1.6-1.6V8.8c0-.88.72-1.6 1.6-1.6Z"
          />
        </svg>
      )}
    </span>
  );
}

function InboxAvatar({
  name,
  size = "md",
  channel,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  channel?: InboxChannel;
}) {
  const dim =
    size === "lg"
      ? "h-10 w-10 text-[12px]"
      : size === "sm"
        ? "h-7 w-7 text-[9px]"
        : "h-9 w-9 text-[11px]";
  return (
    <span className="relative inline-flex shrink-0 leading-none">
      <span
        className={cn(
          "flex items-center justify-center rounded-full font-semibold",
          avatarColor(name),
          dim,
        )}
      >
        {initials(name)}
      </span>
      {channel ? (
        <span className="absolute -right-px -bottom-px leading-none">
          <InboxChannelIcon channel={channel} size="sm" />
        </span>
      ) : null}
    </span>
  );
}

function InboxDetailsRail({
  conversation,
  onNotify,
  onClearLegacyNotes,
}: {
  conversation: InboxConversation;
  onNotify: (message: string) => void;
  onClearLegacyNotes: () => void;
}) {
  const relatedRecords = inboxRelatedLinks(conversation);
  const parent = resolveInboxCrmParent(conversation);
  const notesRelatedTo =
    parent?.relatedTo ||
    conversation.relatedTo?.trim() ||
    `Inbox: ${conversation.id}`;
  const followers = (conversation.followers ?? []).filter(
    (name) =>
      name.trim() &&
      name.trim().toLowerCase() !== conversation.assignedAgent.trim().toLowerCase(),
  );
  const firstAt = conversation.messages[0]?.at ?? conversation.timestamp;
  const legacyNotes = conversation.notes.trim();

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col overflow-auto border-l border-slate-100 bg-[#FBFBFD] lg:flex">
      <section className="border-b border-slate-100 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          <StickyNote className="h-3 w-3" />
          Notes
        </p>
        <RelatedInternalNotes
          relatedTo={notesRelatedTo}
          relatedType={parent?.type}
          relatedId={parent?.id}
          compact
          onNotify={onNotify}
          seed={
            legacyNotes
              ? {
                  id: `inbox-seed-${conversation.id}`,
                  body: legacyNotes,
                  createdAt: conversation.timestamp,
                  createdBy:
                    conversation.assignedAgent !== "Unassigned"
                      ? conversation.assignedAgent
                      : undefined,
                }
              : undefined
          }
          onSeeded={onClearLegacyNotes}
        />
      </section>

      <section className="border-b border-slate-100 p-3">
        <p className="mb-2.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          Related
        </p>
        <div className="space-y-2.5">
          {relatedRecords.map((item) => {
            const inner = (
              <>
                <InboxAvatar name={item.name} size="sm" />
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-[12px] font-semibold text-slate-800",
                      item.href &&
                        "decoration-[#5A32A3] underline-offset-2 group-hover:underline",
                    )}
                  >
                    {item.name}
                  </p>
                  <span
                    className={cn(
                      "mt-0.5 inline-flex rounded-full px-1.5 py-px text-[10px] font-semibold ring-1",
                      RELATED_KIND_TONE[item.kind],
                    )}
                  >
                    {item.kind}
                  </span>
                </div>
              </>
            );
            return item.href ? (
              <Link
                key={`${item.kind}-${item.name}`}
                href={item.href}
                className="group -mx-1 flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-white"
              >
                {inner}
              </Link>
            ) : (
              <div
                key={`${item.kind}-${item.name}`}
                className="flex items-center gap-2"
              >
                {inner}
              </div>
            );
          })}
          {conversation.assignedAgent !== "Unassigned" ? (
            <div className="flex items-center gap-2">
              <InboxAvatar name={conversation.assignedAgent} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-slate-800">
                  {conversation.assignedAgent}
                </p>
                <p className="text-[10px] text-slate-400">Owner</p>
              </div>
            </div>
          ) : null}
          {followers.map((name, index) => (
            <div key={`${name}-${index}`} className="flex items-center gap-2">
              <InboxAvatar name={name} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-slate-800">
                  {name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {followerSlotLabel(index)}
                </p>
              </div>
            </div>
          ))}
          {relatedRecords.length === 0 &&
          followers.length === 0 &&
          conversation.assignedAgent === "Unassigned" ? (
            <p className="text-[12px] text-slate-400">Not linked</p>
          ) : null}
        </div>
      </section>

      <section className="p-3">
        <p className="mb-2.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          Conversation info
        </p>
        <dl className="space-y-2 text-[12px]">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-400">First contact</dt>
            <dd className="text-right font-medium text-slate-700">
              {formatDayHeading(firstAt)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-400">Channel</dt>
            <dd className="font-medium text-slate-700">
              {inboxChannelLabel(conversation.channel)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="flex items-center gap-1 text-slate-400">
              <MessageSquare className="h-3 w-3" />
              Total messages
            </dt>
            <dd className="font-medium text-slate-700">
              {conversation.messages.length}
            </dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}

function InboxAgentPicker({
  value,
  onChange,
  options,
  ariaLabel,
  labels,
  searchPlaceholder = "Search team members",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  ariaLabel: string;
  labels?: Record<string, string>;
  searchPlaceholder?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const labelOf = (name: string) => labels?.[name] ?? name;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...options];
    return options.filter((name) => {
      const label = labels?.[name] ?? name;
      return (
        name.toLowerCase().includes(q) || label.toLowerCase().includes(q)
      );
    });
  }, [options, query, labels]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <div className="relative min-w-0" ref={wrapRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-white py-0 pr-2 pl-2.5 text-left text-[12px] font-semibold normal-case text-slate-700 outline-none",
          open
            ? "border-[#5A32A3] shadow-[0_0_0_3px_rgba(90,50,163,0.12)]"
            : "border-slate-200",
        )}
      >
        <span className="min-w-0 truncate">{labelOf(value)}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      </button>
      {open ? (
        <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-56 overflow-hidden rounded-xl bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
          <div className="px-2 pt-2 pb-1.5">
            <label className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-50 px-2 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#5A32A3]">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {matches.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-slate-400">No matches</p>
            ) : (
              matches.map((name) => (
                <button
                  key={name}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(name);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-medium text-slate-700 hover:bg-violet-50"
                >
                  <span className="flex w-4 shrink-0 justify-center">
                    {name === value ? (
                      <Check className="h-3.5 w-3.5 text-slate-800" />
                    ) : null}
                  </span>
                  {labelOf(name)}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-w-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="fc-select-caret h-8 w-full min-w-[120px] appearance-none rounded-lg border border-slate-200 bg-white py-0 pr-7 pl-2.5 text-[12px] font-semibold normal-case text-slate-700 outline-none focus:border-[#5A32A3] focus:shadow-[0_0_0_3px_rgba(90,50,163,0.12)]"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

function IconBtn({
  onClick,
  icon: Icon,
  title,
  iconClassName,
  active,
  activeClassName,
}: {
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  iconClassName?: string;
  active?: boolean;
  activeClassName?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border bg-white",
        active
          ? (activeClassName ??
            "border-violet-200 bg-violet-50 text-[#5A32A3]")
          : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-violet-700",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", iconClassName)} />
    </button>
  );
}
