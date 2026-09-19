import type { Conversation, TimelineItem } from "@/lib/inbox/api";
import {
  formatInboxAt,
  type InboxChannel,
  type InboxConversation,
  type InboxMessage,
  type InboxStatus,
} from "@/lib/marketing/inbox/types";

function mapStatus(status: string): InboxStatus {
  const value = status.toUpperCase();
  if (value === "PENDING") return "Pending";
  if (value === "RESOLVED" || value === "CLOSED") return "Resolved";
  return "Open";
}

function mapChannel(
  conversation: Conversation,
  timeline: TimelineItem[] = [],
): InboxChannel {
  const last = timeline[timeline.length - 1];
  const channel = (last?.channel ?? "").toUpperCase();
  if (channel.includes("WHATSAPP")) return "WhatsApp";
  if (channel.includes("SMS")) return "SMS";
  if (conversation.channelGroup === "PHONE") {
    return conversation.contact.mobilePhone ? "WhatsApp" : "SMS";
  }
  return "SMS";
}

function mapMessage(item: TimelineItem, contactName: string): InboxMessage {
  return {
    id: item.id,
    body: item.body || item.subject || "",
    at: item.createdAt
      ? formatInboxAt(new Date(item.createdAt))
      : formatInboxAt(),
    outbound: item.direction === "OUTBOUND",
    author: item.direction === "OUTBOUND" ? "You" : contactName,
  };
}

export function crmConversationToInbox(
  conversation: Conversation,
  timeline: TimelineItem[] = [],
): InboxConversation {
  const contactName = [conversation.contact.firstName, conversation.contact.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || conversation.contact.email || "Contact";
  const channel = mapChannel(conversation, timeline);
  const messages = timeline
    .filter((item) => item.kind === "MESSAGE" || item.kind === "EMAIL")
    .map((item) => mapMessage(item, contactName));
  const assigned =
    conversation.assignedTo
      ? [conversation.assignedTo.firstName, conversation.assignedTo.lastName]
          .filter(Boolean)
          .join(" ")
      : "Unassigned";

  return {
    id: conversation.id,
    conversationId: conversation.id.slice(0, 8).toUpperCase(),
    channel,
    contactName,
    contactEmail: conversation.contact.email || undefined,
    contactPhone:
      conversation.contact.mobilePhone ||
      conversation.contact.phone ||
      undefined,
    contactId: conversation.contact.id,
    assignedAgent: assigned,
    status: mapStatus(conversation.status),
    lastMessage:
      conversation.lastMessagePreview ||
      messages[messages.length - 1]?.body ||
      "",
    unreadCount: conversation.unreadCount ?? 0,
    timestamp: conversation.lastMessageAt
      ? formatInboxAt(new Date(conversation.lastMessageAt))
      : formatInboxAt(new Date(conversation.updatedAt)),
    tags: [],
    notes: "",
    messages,
  };
}
