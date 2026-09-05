/** Live messages store (session-backed). */

import {
  type Message,
  type MessageStatus,
  type MessageType,
} from "@/lib/messages/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";

const store = createBoardStore({
  key: "activities:messages:list:v2",
  seed: () => [] as Message[],
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
  const remoteIds = new Set(remote.map((row) => row.id));
  const extras = listMessages().filter((row) => {
    if (remoteIds.has(row.id)) return false;
    if (/^msg-\d+$/.test(row.id)) return false;
    const duplicate = remote.some(
      (item) =>
        item.subject.trim().toLowerCase() === row.subject.trim().toLowerCase() &&
        item.body.trim() === row.body.trim(),
    );
    return !duplicate;
  });
  saveMessages([...remote.map(cloneMessage), ...extras.map(cloneMessage)]);
  emitLeadActivityChange();
}
