/** SRS §10.4 Unified Social Inbox */

export type InboxChannel =
  | "Facebook Messenger"
  | "Instagram DM"
  | "WhatsApp"
  | "SMS"
  | "Email"
  | "Web Chat";

export type InboxStatus = "Open" | "Pending" | "Resolved";

export const INBOX_CHANNELS: InboxChannel[] = [
  "Facebook Messenger",
  "Instagram DM",
  "WhatsApp",
  "SMS",
  "Email",
  "Web Chat",
];

export const INBOX_STATUSES: InboxStatus[] = ["Open", "Pending", "Resolved"];

export const INBOX_AGENTS = [
  "Unassigned",
  "John Smith",
  "Tejas Gokhe",
  "Shiva Kadhka",
  "Roshna Abraham",
] as const;

export const QUICK_REPLIES = [
  "Thanks — we'll get back to you shortly.",
  "Happy to help. Can you share a bit more detail?",
  "I've linked this to your CRM record. A broker will follow up today.",
  "Please upload the requested docs in the portal when you can.",
] as const;

export interface InboxMessage {
  id: string;
  body: string;
  at: string;
  /** true = outbound from CRM agent */
  outbound: boolean;
  author: string;
}

export interface InboxConversation {
  id: string;
  conversationId: string;
  channel: InboxChannel;
  contactName: string;
  contactEmail?: string;
  relatedTo?: string;
  assignedAgent: string;
  status: InboxStatus;
  lastMessage: string;
  unreadCount: number;
  timestamp: string;
  tags: string[];
  notes: string;
  messages: InboxMessage[];
  archived?: boolean;
}

export interface InboxChannelConnection {
  channel: InboxChannel;
  connected: boolean;
  accountLabel: string;
  via: string;
}

const STORE_KEY = "marketing:inbox:v1";
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
  {
    channel: "Email",
    connected: true,
    accountLabel: "inbox@finconnex.example",
    via: "IMAP / ESP",
  },
  {
    channel: "Web Chat",
    connected: false,
    accountLabel: "Website widget",
    via: "FinConnex Chat",
  },
];

export const inboxConversations: InboxConversation[] = [
  {
    id: "in1",
    conversationId: "IN-9001",
    channel: "WhatsApp",
    contactName: "William Anderson",
    contactEmail: "william@example.com",
    relatedTo: "Lead: William Anderson",
    assignedAgent: "John Smith",
    status: "Open",
    lastMessage: "Can we lock the rate this week?",
    unreadCount: 2,
    timestamp: "20/07/2026 16:42",
    tags: ["hot"],
    notes: "Pre-approval in progress. Wants rate lock before Friday.",
    messages: [
      {
        id: "m1",
        body: "Hi John — saw the rate update email.",
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
    channel: "Email",
    contactName: "Olivia Bennett",
    contactEmail: "olivia@northwind.com",
    relatedTo: "Deal: Greystone Realty",
    assignedAgent: "Tejas Gokhe",
    status: "Pending",
    lastMessage: "Thanks — reviewing the proposal tonight.",
    unreadCount: 0,
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
        body: "Thanks — reviewing the proposal tonight.",
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
    relatedTo: "Lead: Chloe Ramirez",
    assignedAgent: "Unassigned",
    status: "Open",
    lastMessage: "Do you cover first-home buyers?",
    unreadCount: 1,
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
    relatedTo: "Deal: Vendor Management",
    assignedAgent: "Shiva Kadhka",
    status: "Resolved",
    lastMessage: "Docs uploaded — thanks!",
    unreadCount: 0,
    timestamp: "19/07/2026 18:20",
    tags: ["docs"],
    notes: "Vendor agreement received.",
    messages: [
      {
        id: "m1",
        body: "Quick nudge — please upload your ID proof when you can.",
        at: "19/07/2026 09:00",
        outbound: true,
        author: "Shiva Kadhka",
      },
      {
        id: "m2",
        body: "Docs uploaded — thanks!",
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
    relatedTo: "Company: Northwind Traders",
    assignedAgent: "Roshna Abraham",
    status: "Open",
    lastMessage: "Can someone call about commercial lending?",
    unreadCount: 3,
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
    channel: "Web Chat",
    contactName: "Guest visitor",
    assignedAgent: "Unassigned",
    status: "Pending",
    lastMessage: "Is anyone available for a chat?",
    unreadCount: 1,
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
