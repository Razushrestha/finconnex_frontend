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
