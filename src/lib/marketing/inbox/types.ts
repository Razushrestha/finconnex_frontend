/** SRS §10.4 Unified Social Inbox */

export type InboxChannel =
  | "Facebook Messenger"
  | "Instagram DM"
  | "WhatsApp"
  | "SMS";

export type InboxStatus = "Open" | "Pending" | "Resolved";

export const INBOX_CHANNELS: InboxChannel[] = [
  "Facebook Messenger",
  "Instagram DM",
  "WhatsApp",
  "SMS",
];

export const INBOX_CHANNEL_LABELS: Record<InboxChannel, string> = {
  "Facebook Messenger": "Facebook/Messenger",
  "Instagram DM": "Instagram",
  WhatsApp: "Whatsapp",
  SMS: "SMS",
};

export function inboxChannelLabel(channel: InboxChannel) {
  return INBOX_CHANNEL_LABELS[channel];
}

export const INBOX_STATUSES: InboxStatus[] = ["Open", "Pending", "Resolved"];

export const INBOX_AGENTS = [
  "Unassigned",
  "John Smith",
  "Tejas Gokhe",
  "Shiva Kadhka",
  "Roshna Abraham",
] as const;

export interface InboxAttachment {
  id: string;
  name: string;
  sizeLabel: string;
  mimeType: string;
  /** data URL for images; empty for files/voice mock */
  url?: string;
  kind: "image" | "file" | "voice";
  durationSec?: number;
}

export interface InboxMessage {
  id: string;
  body: string;
  at: string;
  /** true = outbound from CRM agent */
  outbound: boolean;
  author: string;
  replyToId?: string;
  replyToPreview?: string;
  kind?: "text" | "voice";
  voiceDurationSec?: number;
  attachments?: InboxAttachment[];
  scheduledFor?: string;
}

export interface InboxConversation {
  id: string;
  conversationId: string;
  channel: InboxChannel;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLocation?: string;
  /** Linked CRM contact id when this chat is attached to a contact. */
  contactId?: string;
  relatedTo?: string;
  assignedAgent: string;
  status: InboxStatus;
  lastMessage: string;
  unreadCount: number;
  /** Contact is currently online on the channel */
  online?: boolean;
  timestamp: string;
  tags: string[];
  notes: string;
  messages: InboxMessage[];
  archived?: boolean;
  starred?: boolean;
  flagged?: boolean;
  pinned?: boolean;
  followers?: string[];
}

export interface InboxChannelConnection {
  channel: InboxChannel;
  connected: boolean;
  accountLabel: string;
  via: string;
}

const STORE_KEY = "marketing:inbox:v6";
const CONNECTIONS_KEY = "marketing:inbox:connections";

export const inboxChannelConnections: InboxChannelConnection[] = [
  {
    channel: "Facebook Messenger",
    connected: true,
    accountLabel: "FinConnex Sydney Page",
    via: "Meta Graph API",
  },
  {
    channel: "Instagram DM",
    connected: true,
    accountLabel: "@finconnex.au",
    via: "Meta Graph API",
  },
  {
    channel: "WhatsApp",
    connected: true,
    accountLabel: "+61 400 000 100",
    via: "WhatsApp Business API",
  },
  {
    channel: "SMS",
    connected: true,
    accountLabel: "FinConnex SMS",
    via: "Twilio (mock)",
  },
];

export const inboxConversations: InboxConversation[] = [
  {
    id: "in1",
    conversationId: "IN-9001",
    channel: "WhatsApp",
    contactName: "William Anderson",
    contactEmail: "william@example.com",
    contactPhone: "+61 412 880 221",
    contactLocation: "Sydney, NSW",
    relatedTo: "Lead: William Anderson",
    assignedAgent: "John Smith",
    status: "Open",
    lastMessage: "Can we lock the rate this week?",
    unreadCount: 2,
    online: true,
    starred: true,
    pinned: true,
    followers: ["Tejas Gokhe"],
    timestamp: "20/07/2026 16:42",
    tags: ["hot"],
    notes: "Pre-approval in progress. Wants rate lock before Friday.",
    messages: [
      {
        id: "m1",
        body: "Hi John: saw the rate update email.",
        at: "20/07/2026 16:30",
        outbound: false,
        author: "William Anderson",
      },
      {
        id: "m2",
        body: "Happy to help. Are you looking to lock this week?",
        at: "20/07/2026 16:35",
        outbound: true,
        author: "John Smith",
      },
      {
        id: "m3",
        body: "Can we lock the rate this week?",
        at: "20/07/2026 16:42",
        outbound: false,
        author: "William Anderson",
      },
    ],
  },
  {
    id: "in2",
    conversationId: "IN-9002",
    channel: "Facebook Messenger",
    contactName: "Olivia Bennett",
    contactEmail: "olivia@northwind.com",
    contactPhone: "+61 400 112 334",
    contactLocation: "Melbourne, VIC",
    relatedTo: "Deal: Greystone Realty",
    assignedAgent: "Tejas Gokhe",
    status: "Pending",
    lastMessage: "Thanks: reviewing the proposal tonight.",
    unreadCount: 0,
    online: true,
    starred: true,
    followers: ["John Smith"],
    timestamp: "20/07/2026 14:10",
    tags: ["proposal"],
    notes: "",
    messages: [
      {
        id: "m1",
        body: "Hi Olivia, your Greystone proposal pack is attached.",
        at: "20/07/2026 09:00",
        outbound: true,
        author: "Tejas Gokhe",
      },
      {
        id: "m2",
        body: "Thanks: reviewing the proposal tonight.",
        at: "20/07/2026 14:10",
        outbound: false,
        author: "Olivia Bennett",
      },
    ],
  },
  {
    id: "in3",
    conversationId: "IN-9003",
    channel: "Instagram DM",
    contactName: "Chloe Ramirez",
    contactEmail: "chloe.ramirez@email.com",
    contactPhone: "+61 423 556 019",
    contactLocation: "Brisbane, QLD",
    relatedTo: "Lead: Chloe Ramirez",
    assignedAgent: "Unassigned",
    status: "Open",
    lastMessage: "Do you cover first-home buyers?",
    unreadCount: 1,
    online: false,
    timestamp: "20/07/2026 11:05",
    tags: [],
    notes: "",
    messages: [
      {
        id: "m1",
        body: "Hi! Love your stories on rates.",
        at: "20/07/2026 10:50",
        outbound: false,
        author: "Chloe Ramirez",
      },
      {
        id: "m2",
        body: "Do you cover first-home buyers?",
        at: "20/07/2026 11:05",
        outbound: false,
        author: "Chloe Ramirez",
      },
    ],
  },
  {
    id: "in4",
    conversationId: "IN-9004",
    channel: "SMS",
    contactName: "Marcus Lin",
    contactEmail: "marcus.lin@email.com",
    contactPhone: "+61 411 902 441",
    contactLocation: "Sydney, NSW",
    relatedTo: "Deal: Vendor Management",
    assignedAgent: "Shiva Kadhka",
    status: "Resolved",
    lastMessage: "Docs uploaded: thanks!",
    unreadCount: 0,
    online: false,
    timestamp: "19/07/2026 18:20",
    tags: ["docs"],
    notes: "Vendor agreement received.",
    messages: [
      {
        id: "m1",
        body: "Quick nudge: please upload your ID proof when you can.",
        at: "19/07/2026 09:00",
        outbound: true,
        author: "Shiva Kadhka",
      },
      {
        id: "m2",
        body: "Docs uploaded: thanks!",
        at: "19/07/2026 18:20",
        outbound: false,
        author: "Marcus Lin",
      },
    ],
  },
  {
    id: "in5",
    conversationId: "IN-9005",
    channel: "Facebook Messenger",
    contactName: "Northwind Traders",
    contactEmail: "hello@northwind.com",
    contactPhone: "+61 2 8000 1200",
    contactLocation: "Sydney, NSW",
    relatedTo: "Company: Northwind Traders",
    assignedAgent: "Roshna Abraham",
    status: "Open",
    lastMessage: "Can someone call about commercial lending?",
    unreadCount: 3,
    online: true,
    flagged: true,
    timestamp: "20/07/2026 15:01",
    tags: ["commercial"],
    notes: "",
    messages: [
      {
        id: "m1",
        body: "Can someone call about commercial lending?",
        at: "20/07/2026 15:01",
        outbound: false,
        author: "Northwind Traders",
      },
    ],
  },
  {
    id: "in6",
    conversationId: "IN-9006",
    channel: "Instagram DM",
    contactName: "Guest visitor",
    assignedAgent: "Unassigned",
    status: "Pending",
    lastMessage: "Is anyone available for a chat?",
    unreadCount: 1,
    online: false,
    timestamp: "20/07/2026 17:12",
    tags: ["new"],
    notes: "",
    messages: [
      {
        id: "m1",
        body: "Is anyone available for a chat?",
        at: "20/07/2026 17:12",
        outbound: false,
        author: "Guest visitor",
      },
    ],
  },
];

function readStore(): InboxConversation[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as InboxConversation[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: InboxConversation[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listInboxConversations(): InboxConversation[] {
  return readStore() ?? inboxConversations.map((c) => ({ ...c }));
}

export function upsertInboxConversation(c: InboxConversation) {
  const list = listInboxConversations();
  const i = list.findIndex((x) => x.id === c.id);
  if (i >= 0) list[i] = c;
  else list.unshift(c);
  writeStore(list);
  return c;
}

export function getInboxConversationById(id: string) {
  return listInboxConversations().find((c) => c.id === id);
}

export function listChannelConnections(): InboxChannelConnection[] {
  if (typeof window === "undefined") return inboxChannelConnections;
  try {
    const raw = sessionStorage.getItem(CONNECTIONS_KEY);
    return raw
      ? (JSON.parse(raw) as InboxChannelConnection[])
      : inboxChannelConnections.map((c) => ({ ...c }));
  } catch {
    return inboxChannelConnections.map((c) => ({ ...c }));
  }
}

export function upsertChannelConnection(conn: InboxChannelConnection) {
  if (typeof window === "undefined") return;
  const list = listChannelConnections();
  const i = list.findIndex((c) => c.channel === conn.channel);
  if (i >= 0) list[i] = conn;
  else list.push(conn);
  sessionStorage.setItem(CONNECTIONS_KEY, JSON.stringify(list));
}

export function formatInboxAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
