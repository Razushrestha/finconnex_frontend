/** SRS §7.9 Internal Team Chat */

export const CHAT_EDIT_WINDOW_MS = 20 * 60 * 1000;

export type ChatPresence = "online" | "away" | "offline";

export interface ChatAttachment {
  id: string;
  name: string;
  sizeLabel: string;
  mimeType: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  author: string;
  body: string;
  sentAt: string;
  /** Epoch ms — used for 20-minute edit window */
  sentAtMs?: number;
  isOwn?: boolean;
  edited?: boolean;
  replyToId?: string;
  replyToPreview?: string;
  kind?: "text" | "voice" | "system";
  voiceDurationSec?: number;
  attachments?: ChatAttachment[];
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  unread: number;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
  /** DM / peer presence */
  presence?: ChatPresence;
  lastMessagePreview?: string;
  lastMessageAt?: string;
}

/** Directory contacts (Contacts tab) — may or may not have an open chat yet */
export interface ChatContact {
  id: string;
  name: string;
  role: string;
  presence: ChatPresence;
  channelId?: string;
}

export const CURRENT_CHAT_USER = {
  name: "Roshna Abraham",
  status: "Active" as const,
};

export const chatChannels: ChatChannel[] = [
  {
    id: "general",
    name: "# general",
    description: "Company-wide announcements",
    unread: 2,
    pinned: true,
    lastMessagePreview: "Attached the forecast workbook.",
    lastMessageAt: "1 hr",
  },
  {
    id: "sales",
    name: "# sales",
    description: "Pipeline & deal chatter",
    unread: 5,
    lastMessagePreview: "I can take that: creating a task…",
    lastMessageAt: "10 min",
  },
  {
    id: "support",
    name: "# support",
    description: "Internal support coordination",
    unread: 0,
    lastMessagePreview: "Anyone free for a Contoso billing…",
    lastMessageAt: "25 min",
  },
  {
    id: "dm-shiva",
    name: "Shiva Kadhka",
    description: "Direct message",
    unread: 1,
    pinned: true,
    presence: "online",
    lastMessagePreview: "Can you cover my calls Friday morning?",
    lastMessageAt: "05 min",
  },
  {
    id: "dm-john",
    name: "John Smith",
    description: "Direct message",
    unread: 0,
    presence: "away",
    lastMessagePreview: "Hey! there I'm available",
    lastMessageAt: "12 min",
  },
  {
    id: "dm-tejas",
    name: "Tejas Gokhe",
    description: "Direct message",
    unread: 0,
    presence: "online",
    lastMessagePreview: "I've finished it! See you soon",
    lastMessageAt: "24 min",
  },
  {
    id: "dm-priya",
    name: "Priya Shrestha",
    description: "Direct message",
    unread: 2,
    presence: "offline",
    lastMessagePreview: "Nice to meet you",
    lastMessageAt: "1 hr",
    archived: true,
  },
];

export const chatContacts: ChatContact[] = [
  {
    id: "c-shiva",
    name: "Shiva Kadhka",
    role: "Broker",
    presence: "online",
    channelId: "dm-shiva",
  },
  {
    id: "c-john",
    name: "John Smith",
    role: "Sales Lead",
    presence: "away",
    channelId: "dm-john",
  },
  {
    id: "c-tejas",
    name: "Tejas Gokhe",
    role: "Broker",
    presence: "online",
    channelId: "dm-tejas",
  },
  {
    id: "c-priya",
    name: "Priya Shrestha",
    role: "Ops",
    presence: "offline",
    channelId: "dm-priya",
  },
  {
    id: "c-new",
    name: "Alex Morgan",
    role: "Underwriter",
    presence: "online",
  },
];

const now = Date.now();

export const chatMessages: Record<string, ChatMessage[]> = {
  general: [
    {
      id: "cm1",
      channelId: "general",
      author: "John Smith",
      body: "Reminder: Q3 forecast lock Friday EOD.",
      sentAt: "09:12 AM",
      sentAtMs: now - 3 * 60 * 60 * 1000,
    },
    {
      id: "cm2",
      channelId: "general",
      author: "Roshna Abraham",
      body: "Got it: I'll push the NSW numbers today.",
      sentAt: "09:18 AM",
      sentAtMs: now - 2 * 60 * 60 * 1000,
      isOwn: true,
    },
    {
      id: "cm2b",
      channelId: "general",
      author: "John Smith",
      body: "Attached the forecast workbook.",
      sentAt: "09:20 AM",
      sentAtMs: now - 90 * 60 * 1000,
      attachments: [
        {
          id: "att1",
          name: "Q3-forecast.xlsx",
          sizeLabel: "248 KB",
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          url: "#",
        },
      ],
    },
  ],
  sales: [
    {
      id: "cm3",
      channelId: "sales",
      author: "Shiva Kadhka",
      body: "Greystone is asking for a revised proposal by Thursday.",
      sentAt: "10:02 AM",
      sentAtMs: now - 45 * 60 * 1000,
    },
    {
      id: "cm4",
      channelId: "sales",
      author: "Tejas Gokhe",
      body: "I can take that: creating a task from this thread.",
      sentAt: "10:05 AM",
      sentAtMs: now - 10 * 60 * 1000,
      isOwn: true,
    },
    {
      id: "cm5",
      channelId: "sales",
      author: "System",
      body: "Task T-010 created: Revised Greystone proposal",
      sentAt: "10:06 AM",
      kind: "system",
    },
  ],
  support: [
    {
      id: "cm6",
      channelId: "support",
      author: "John Smith",
      body: "Anyone free for a Contoso billing callback?",
      sentAt: "11:20 AM",
      sentAtMs: now - 25 * 60 * 1000,
    },
  ],
  "dm-shiva": [
    {
      id: "cm7",
      channelId: "dm-shiva",
      author: "Shiva Kadhka",
      body: "Can you cover my calls Friday morning?",
      sentAt: "Yesterday",
      sentAtMs: now - 26 * 60 * 60 * 1000,
    },
    {
      id: "cm8",
      channelId: "dm-shiva",
      author: "You",
      body: "Sure: assign them to me.",
      sentAt: "Yesterday",
      sentAtMs: now - 25 * 60 * 60 * 1000,
      isOwn: true,
    },
    {
      id: "cm9",
      channelId: "dm-shiva",
      author: "You",
      body: "Voice note",
      sentAt: "Just now",
      sentAtMs: now - 2 * 60 * 1000,
      isOwn: true,
      kind: "voice",
      voiceDurationSec: 12,
    },
  ],
  "dm-john": [
    {
      id: "cmj1",
      channelId: "dm-john",
      author: "John Smith",
      body: "Hey! there I'm available",
      sentAt: "12 min",
      sentAtMs: now - 12 * 60 * 1000,
    },
  ],
  "dm-tejas": [
    {
      id: "cmt1",
      channelId: "dm-tejas",
      author: "Tejas Gokhe",
      body: "I've finished it! See you soon",
      sentAt: "24 min",
      sentAtMs: now - 24 * 60 * 1000,
    },
  ],
  "dm-priya": [
    {
      id: "cmp1",
      channelId: "dm-priya",
      author: "Priya Shrestha",
      body: "Nice to meet you",
      sentAt: "1 hr",
      sentAtMs: now - 60 * 60 * 1000,
    },
  ],
};

export function canEditMessage(msg: ChatMessage, nowMs = Date.now()) {
  if (!msg.isOwn || msg.kind === "system") return false;
  const sent = msg.sentAtMs ?? 0;
  return nowMs - sent <= CHAT_EDIT_WINDOW_MS;
}
