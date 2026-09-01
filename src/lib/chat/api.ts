/**
 * Team Chat CRM client — workspace-scoped Swagger routes under
 * `/v1/workspaces/{workspaceId}/chat/...`
 */

import {
  ensureCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type { ChatChannel, ChatMessage } from "@/lib/chat/types";
import { CURRENT_CHAT_USER } from "@/lib/chat/types";

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function workspaceChatPath(workspaceId: string, suffix = ""): string {
  return `/v1/workspaces/${workspaceId}/chat${suffix}`;
}

async function resolveSession(): Promise<CrmSession> {
  const session = await ensureCrmSession();
  if (!session) throw new Error("Sign in with a workspace to use Team Chat");
  return session;
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return (data[0] as unknown[]).filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row),
      );
    }
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (typeof data === "object") {
    const rec = data as {
      items?: unknown;
      conversations?: unknown;
      messages?: unknown;
      data?: unknown;
    };
    if (Array.isArray(rec.items)) return extractRecords(rec.items);
    if (Array.isArray(rec.conversations)) return extractRecords(rec.conversations);
    if (Array.isArray(rec.messages)) return extractRecords(rec.messages);
    if (rec.data != null) return extractRecords(rec.data);
  }
  return [];
}

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isGroupConversation(raw: Record<string, unknown>): boolean {
  const type = pickStr(raw.type, raw.kind, raw.conversationType).toLowerCase();
  if (type.includes("group") || type.includes("channel")) return true;
  if (type.includes("dm") || type.includes("direct")) return false;
  const name = pickStr(raw.name, raw.title);
  if (name.startsWith("#")) return true;
  const memberCount =
    typeof raw.memberCount === "number"
      ? raw.memberCount
      : Array.isArray(raw.members)
        ? raw.members.length
        : 0;
  return memberCount > 2;
}

export function normalizeCrmConversation(
  raw: Record<string, unknown>,
  index: number,
): ChatChannel {
  const id =
    pickStr(raw.id, raw.uuid, raw.conversationId) || `crm-chat-${index}`;
  const group = isGroupConversation(raw);
  const baseName = pickStr(
    raw.name,
    raw.title,
    raw.displayName,
    group ? `group-${index + 1}` : "Direct message",
  );
  const name = group
    ? baseName.startsWith("#")
      ? baseName
      : `# ${baseName}`
    : baseName.replace(/^#\s*/, "");

  const last =
    raw.lastMessage && typeof raw.lastMessage === "object"
      ? (raw.lastMessage as Record<string, unknown>)
      : null;
  const unreadRaw = raw.unreadCount ?? raw.unread ?? 0;
  const unread =
    typeof unreadRaw === "number"
      ? unreadRaw
      : Number.parseInt(String(unreadRaw), 10) || 0;

  return {
    id,
    name,
    description: pickStr(
      raw.description,
      raw.topic,
      group ? "Group conversation" : "Direct message",
    ),
    unread,
    pinned: Boolean(raw.pinned ?? raw.isPinned),
    muted: Boolean(raw.muted ?? raw.isMuted),
    archived: Boolean(raw.archived ?? raw.isArchived),
    lastMessagePreview: pickStr(
      last && pickStr(last.body, last.text, last.content),
      raw.lastMessagePreview,
      raw.preview,
    ),
    lastMessageAt: pickStr(
      last && pickStr(last.createdAt, last.sentAt),
      raw.lastMessageAt,
      raw.updatedAt,
    )
      ? formatTime(
          pickStr(
            last && pickStr(last.createdAt, last.sentAt),
            raw.lastMessageAt,
            raw.updatedAt,
          ),
        )
      : undefined,
  };
}

export function normalizeCrmConversations(data: unknown): ChatChannel[] {
  return extractRecords(data).map((row, i) => normalizeCrmConversation(row, i));
}

export function normalizeCrmMessage(
  raw: Record<string, unknown>,
  channelId: string,
  index: number,
): ChatMessage {
  const authorObj =
    raw.author && typeof raw.author === "object"
      ? (raw.author as Record<string, unknown>)
      : raw.sender && typeof raw.sender === "object"
        ? (raw.sender as Record<string, unknown>)
        : null;
  const author = pickStr(
    authorObj && pickStr(authorObj.name, authorObj.displayName, authorObj.email),
    raw.authorName,
    raw.senderName,
    raw.author,
    "Unknown",
  );
  const created = pickStr(raw.createdAt, raw.sentAt, raw.updatedAt);
  const sentAtMs = created ? Date.parse(created) : undefined;
  const body = pickStr(raw.body, raw.text, raw.content, raw.message);
  const isOwn =
    Boolean(raw.isOwn ?? raw.mine) ||
    author.toLowerCase() === CURRENT_CHAT_USER.name.toLowerCase() ||
    author.toLowerCase() === "you";

  return {
    id: pickStr(raw.id, raw.uuid, raw.messageId) || `crm-msg-${index}`,
    channelId: pickStr(raw.conversationId, raw.channelId, channelId),
    author: isOwn ? "You" : author,
    body,
    sentAt: created ? formatTime(created) : "Just now",
    sentAtMs: Number.isFinite(sentAtMs) ? sentAtMs : Date.now(),
    isOwn,
    edited: Boolean(raw.edited ?? raw.isEdited),
    replyToId: pickStr(raw.replyToId, raw.parentId) || undefined,
    replyToPreview: pickStr(raw.replyToPreview, raw.parentPreview) || undefined,
    kind: pickStr(raw.kind, raw.type).toLowerCase().includes("voice")
      ? "voice"
      : pickStr(raw.kind, raw.type).toLowerCase().includes("system")
        ? "system"
        : "text",
  };
}

export function normalizeCrmMessages(
  data: unknown,
  channelId: string,
): ChatMessage[] {
  return extractRecords(data).map((row, i) =>
    normalizeCrmMessage(row, channelId, i),
  );
}

async function chatGet(suffix: string, query = ""): Promise<unknown> {
  const session = await resolveSession();
  return crmFetch(
    session,
    `${workspaceChatPath(session.workspaceId, suffix)}${query}`,
  );
}

async function chatMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  const session = await resolveSession();
  return crmFetch(
    session,
    workspaceChatPath(session.workspaceId, suffix),
    init,
  );
}

export async function listCrmConversations(): Promise<ChatChannel[]> {
  return normalizeCrmConversations(await chatGet("/conversations"));
}

export async function getCrmConversation(
  conversationId: string,
): Promise<ChatChannel | null> {
  const data = await chatGet(`/conversations/${conversationId}`);
  const items = normalizeCrmConversations(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeCrmConversation(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function createCrmConversation(input: {
  name?: string;
  description?: string;
  memberIds?: string[];
  type?: "GROUP" | "DIRECT";
}): Promise<ChatChannel | null> {
  const data = await chatMutate("/conversations", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const items = normalizeCrmConversations(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeCrmConversation(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function updateCrmConversation(
  conversationId: string,
  patch: { name?: string; description?: string },
): Promise<ChatChannel | null> {
  const data = await chatMutate(`/conversations/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const items = normalizeCrmConversations(data);
  return items[0] ?? null;
}

export async function deleteCrmConversation(
  conversationId: string,
): Promise<void> {
  await chatMutate(`/conversations/${conversationId}`, { method: "DELETE" });
}

export async function addCrmConversationMember(
  conversationId: string,
  userId: string,
): Promise<unknown> {
  return chatMutate(`/conversations/${conversationId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function removeCrmConversationMember(
  conversationId: string,
  userId: string,
): Promise<void> {
  await chatMutate(`/conversations/${conversationId}/members/${userId}`, {
    method: "DELETE",
  });
}

export async function listCrmChatMessages(
  conversationId: string,
  query: { cursor?: string; limit?: number } = {},
): Promise<ChatMessage[]> {
  return normalizeCrmMessages(
    await chatGet(
      `/conversations/${conversationId}/messages`,
      toQuery({ cursor: query.cursor, limit: query.limit ?? 50 }),
    ),
    conversationId,
  );
}

export async function createCrmChatMessage(
  conversationId: string,
  input: { body: string; replyToId?: string },
): Promise<ChatMessage | null> {
  const data = await chatMutate(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      body: input.body,
      text: input.body,
      content: input.body,
      replyToId: input.replyToId,
    }),
  });
  const items = normalizeCrmMessages(data, conversationId);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeCrmMessage(
      data as Record<string, unknown>,
      conversationId,
      0,
    );
  }
  return null;
}

export async function updateCrmChatMessage(
  messageId: string,
  body: string,
): Promise<ChatMessage | null> {
  const data = await chatMutate(`/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ body, text: body, content: body }),
  });
  const items = normalizeCrmMessages(data, "");
  return items[0] ?? null;
}

export async function deleteCrmChatMessage(messageId: string): Promise<void> {
  await chatMutate(`/messages/${messageId}`, { method: "DELETE" });
}

export async function markCrmConversationRead(
  conversationId: string,
): Promise<void> {
  await chatMutate(`/conversations/${conversationId}/read`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function markCrmMessageRead(messageId: string): Promise<void> {
  await chatMutate(`/messages/${messageId}/read`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function addCrmMessageReaction(
  messageId: string,
  reaction: string,
): Promise<unknown> {
  return chatMutate(`/messages/${messageId}/reactions`, {
    method: "POST",
    body: JSON.stringify({ reaction }),
  });
}

export async function removeCrmMessageReaction(
  messageId: string,
  reaction: string,
): Promise<void> {
  await chatMutate(
    `/messages/${messageId}/reactions/${encodeURIComponent(reaction)}`,
    { method: "DELETE" },
  );
}

export async function getCrmChatUnreadCount(): Promise<number> {
  const data = await chatGet("/unread-count");
  if (typeof data === "number") return data;
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    const n = rec.count ?? rec.unreadCount ?? rec.total;
    if (typeof n === "number") return n;
    if (typeof n === "string") return Number.parseInt(n, 10) || 0;
  }
  return 0;
}

export async function tryCrmChat<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
