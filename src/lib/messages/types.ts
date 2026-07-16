export type MessageStatus = "Sent" | "Delivered" | "Read" | "Failed";

export type MessageDirection = "Incoming" | "Outgoing";

export interface Message {
  id: string;
  relatedTo: string;
  sender: string;
  subject?: string;
  content: string;
  direction: MessageDirection;
  timestamp: string;
  status: MessageStatus;
  channel: "SMS" | "WhatsApp" | "Email" | "Chat";
}

export interface MessageColumn {
  id: string;
  title: string;
  count: number;
  badgeColorClass: string;
  messages: Message[];
}

export const messages: Message[] = [
  {
    id: "m1",
    relatedTo: "Shiva Khadka",
    sender: "Bishnu Aryal",
    content: "Hi Shiva, are we still on for the meeting tomorrow?",
    direction: "Outgoing",
    timestamp: "16/07/2026 04:30 PM",
    status: "Sent",
    channel: "WhatsApp",
  },
  {
    id: "m2",
    relatedTo: "Shiva Khadka",
    sender: "Bishnu Aryal",
    content: "Hi Shiva, are we still on for the meeting tomorrow?",
    direction: "Outgoing",
    timestamp: "16/07/2026 04:30 PM",
    status: "Sent",
    channel: "WhatsApp",
  },
  {
    id: "m3",
    relatedTo: "Shiva Khadka",
    sender: "Bishnu Aryal",
    content: "Hi Shiva, are we still on for the meeting tomorrow?",
    direction: "Outgoing",
    timestamp: "16/07/2026 04:30 PM",
    status: "Sent",
    channel: "WhatsApp",
  },
  {
    id: "m4",
    relatedTo: "Shiva Khadka",
    sender: "Bishnu Aryal",
    content: "Hi Shiva, are we still on for the meeting tomorrow?",
    direction: "Outgoing",
    timestamp: "16/07/2026 04:30 PM",
    status: "Sent",
    channel: "WhatsApp",
  },
  {
    id: "m5",
    relatedTo: "Shiva Khadka",
    sender: "Bishnu Aryal",
    content: "Hi Shiva, are we still on for the meeting tomorrow?",
    direction: "Outgoing",
    timestamp: "16/07/2026 04:30 PM",
    status: "Sent",
    channel: "WhatsApp",
  },
];

export const messageColumns: MessageColumn[] = [
  {
    id: "sent",
    title: "Sent",
    count: 120,
    badgeColorClass: "bg-blue-400 text-white",
    messages: messages.filter((m) => m.status === "Sent"),
  },
  {
    id: "delivered",
    title: "Delivered",
    count: 85,
    badgeColorClass: "bg-indigo-400 text-white",
    messages: messages.filter((m) => m.status === "Delivered"),
  },
  {
    id: "read",
    title: "Read",
    count: 310,
    badgeColorClass: "bg-emerald-400 text-white",
    messages: messages.filter((m) => m.status === "Read"),
  },
  {
    id: "failed",
    title: "Failed",
    count: 12,
    badgeColorClass: "bg-rose-400 text-white",
    messages: messages.filter((m) => m.status === "Failed"),
  },
];
