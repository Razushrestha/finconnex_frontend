/** SRS §7.3 Messages */

import { ACTIVITY_OWNERS } from "@/lib/activities/shared";

export const MESSAGE_TYPES = ["Internal", "External", "System"] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const MESSAGE_STATUSES = [
  "Draft",
  "Sent",
  "Delivered",
  "Read",
  "Failed",
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export interface MessageAttachment {
  id: string;
  name: string;
  sizeLabel?: string;
}

export interface Message {
  id: string;
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
  attachments?: MessageAttachment[];
}

export const MESSAGE_OWNERS = ACTIVITY_OWNERS;

export const messages: Message[] = [];
