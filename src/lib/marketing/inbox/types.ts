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

const STORE_KEY = "marketing:inbox:v8";
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

export const inboxConversations: InboxConversation[] = [];

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
