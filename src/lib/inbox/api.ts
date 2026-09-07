import { ensureCrmAccess, ensureCrmSession } from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";

export type ConversationChannelGroup = "EMAIL" | "PHONE";
export type ConversationStatus = "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";

export type Conversation = {
  id: string;
  workspaceId: string;
  contactId: string;
  channelGroup: ConversationChannelGroup;
  status: ConversationStatus;
  assignedToId: string | null;
  lastMessageAt: string | null;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  escalatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    mobilePhone: string | null;
  };
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
  } | null;
};

export type TimelineItem = {
  kind: "EMAIL" | "MESSAGE";
  id: string;
  channel: string;
  direction: "INBOUND" | "OUTBOUND";
  subject: string | null;
  body: string;
  status: string;
  createdAt: string;
};

export type ConversationListFilters = {
  page?: number;
  limit?: number;
  status?: ConversationStatus;
  channelGroup?: ConversationChannelGroup;
  assignedToId?: string;
  unassigned?: boolean;
};

export type InboxAssignmentConfig = {
  workspaceId: string;
  isActive: boolean;
  memberUserIds: string[];
  cursor: number;
  pendingEscalationMinutes: number;
};

function inboxPath(suffix = ""): string {
  return `/v1/inbox${suffix}`;
}

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

async function inboxGet(suffix: string): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to load the inbox");
  return crmFetch(auth, inboxPath(suffix));
}

async function inboxMutate(suffix: string, init: RequestInit): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage the inbox");
  return crmFetch(auth, inboxPath(suffix), init);
}

export async function listCrmConversations(
  filters: ConversationListFilters = {},
): Promise<[Conversation[], number]> {
  const data = await inboxGet(
    `/conversations${toQuery({
      page: filters.page,
      limit: filters.limit,
      status: filters.status,
      channelGroup: filters.channelGroup,
      assignedToId: filters.assignedToId,
      unassigned: filters.unassigned,
    })}`,
  );
  return data as [Conversation[], number];
}

export async function getCrmConversation(
  id: string,
): Promise<{ conversation: Conversation; timeline: TimelineItem[] }> {
  const data = await inboxGet(`/conversations/${id}`);
  return data as { conversation: Conversation; timeline: TimelineItem[] };
}

export async function assignCrmConversation(
  id: string,
  userId?: string,
): Promise<Conversation> {
  const data = await inboxMutate(`/conversations/${id}/assign`, {
    method: "POST",
    body: JSON.stringify(userId ? { userId } : {}),
  });
  return data as Conversation;
}

export async function setCrmConversationStatus(
  id: string,
  status: ConversationStatus,
): Promise<Conversation> {
  const data = await inboxMutate(`/conversations/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
  return data as Conversation;
}

export async function replyToCrmConversation(
  id: string,
  body: string,
  options: { subjectLine?: string; channel?: "SMS" | "WHATSAPP" } = {},
): Promise<Conversation> {
  const data = await inboxMutate(`/conversations/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ body, ...options }),
  });
  return data as Conversation;
}

export async function logCrmInboundMessage(input: {
  contactId: string;
  channel: "SMS" | "WHATSAPP";
  body: string;
  occurredAt?: string;
}): Promise<{ conversation: Conversation; messageId: string }> {
  const data = await inboxMutate("/conversations/log-inbound", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data as { conversation: Conversation; messageId: string };
}

export async function getCrmInboxAssignmentConfig(): Promise<InboxAssignmentConfig> {
  const data = await inboxGet("/assignment-config");
  return data as InboxAssignmentConfig;
}

export async function setCrmInboxAssignmentConfig(input: {
  isActive?: boolean;
  memberUserIds?: string[];
  pendingEscalationMinutes?: number;
}): Promise<InboxAssignmentConfig> {
  const data = await inboxMutate("/assignment-config", {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return data as InboxAssignmentConfig;
}
