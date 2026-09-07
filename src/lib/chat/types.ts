import { getRulesActor } from "@/lib/rules/actor";
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

/** The signed-in user, not a hardcoded demo persona. */
export const CURRENT_CHAT_USER = {
  get name() {
    return getRulesActor().name;
  },
  status: "Active" as const,
};

export const chatChannels: ChatChannel[] = [];

export const chatContacts: ChatContact[] = [];

/**
 * Seeded demo conversations were removed; real messages come from the chat
 * API. Channels start empty.
 */
export const chatMessages: Record<string, ChatMessage[]> = {
  general: [],
  sales: [],
  support: [],
};

export function canEditMessage(msg: ChatMessage, nowMs = Date.now()) {
  if (!msg.isOwn || msg.kind === "system") return false;
  const sent = msg.sentAtMs ?? 0;
  return nowMs - sent <= CHAT_EDIT_WINDOW_MS;
}
