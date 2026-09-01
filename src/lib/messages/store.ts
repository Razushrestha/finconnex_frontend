/** Live messages store (session-backed). */

import {
  messages as SEED_MESSAGES,
  type Message,
  type MessageStatus,
  type MessageType,
} from "@/lib/messages/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";

function cloneSeed(): Message[] {
  return SEED_MESSAGES.map((m) => ({ ...m }));
}

const store = createBoardStore({
  key: "activities:messages:list:v1",
  seed: cloneSeed,
});

export function listMessages(): Message[] {
  return store.list();
}

export function saveMessages(items: Message[]) {
  store.save(items);
}

export function createMessage(input: {
  type: MessageType;
  subject: string;
  body: string;
  from: string;
  to: string;
  relatedTo?: string;
  relatedType?: string;
  relatedId?: string;
  status: MessageStatus;
  sentDate?: string;
  template?: string;
}): Message {
  const msg: Message = {
    id: newRulesId("msg"),
    type: input.type,
    subject: input.subject.trim(),
    body: input.body,
    from: input.from,
    to: input.to,
    relatedTo: input.relatedTo,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    status: input.status,
    sentDate: input.sentDate ?? formatRulesAt(new Date()),
    template: input.template,
  };
  saveMessages([msg, ...listMessages()]);
  emitLeadActivityChange();
  return msg;
}

export function findMessageById(id: string) {
  const message = listMessages().find((m) => m.id === id);
  return message ? { message } : null;
}

function cloneMessage(row: Message): Message {
  return {
    ...row,
    attachments: [...(row.attachments ?? [])],
  };
}

export function upsertMessage(row: Message) {
  const next = cloneMessage(row);
  const items = listMessages();
  const i = items.findIndex((m) => m.id === next.id);
  if (i >= 0) items[i] = next;
  else items.unshift(next);
  saveMessages(items);
  emitLeadActivityChange();
  return next;
}

export function deleteMessage(id: string): Message | null {
  const items = listMessages();
  const found = items.find((m) => m.id === id) ?? null;
  if (!found) return null;
  saveMessages(items.filter((m) => m.id !== id));
  emitLeadActivityChange();
  return found;
}

/** Replace the session store with live CRM rows (empty list is a valid live result). */
export function replaceCrmMessages(remote: Message[]) {
  saveMessages(remote.map(cloneMessage));
  emitLeadActivityChange();
}
