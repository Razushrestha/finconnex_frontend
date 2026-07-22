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

export interface Message {
  id: string;
  type: MessageType;
  subject: string;
  body: string;
  from: string;
  to: string;
  relatedTo?: string;
  status: MessageStatus;
  sentDate?: string;
  template?: string;
}

export const MESSAGE_OWNERS = ACTIVITY_OWNERS;

export const messages: Message[] = [
  {
    id: "msg-1",
    type: "External",
    subject: "Meeting tomorrow?",
    body: "Hi Olivia, are we still on for the meeting tomorrow at 2pm?",
    from: "John Smith",
    to: "Olivia Bennett",
    relatedTo: "Contact: Olivia Bennett",
    status: "Read",
    sentDate: "20/07/2026 04:30 PM",
  },
  {
    id: "msg-2",
    type: "Internal",
    subject: "Handoff — Atlas deal",
    body: "Please take over Atlas CRM Rollout while I'm on leave Friday.",
    from: "Shiva Kadhka",
    to: "Tejas Gokhe",
    relatedTo: "Deal: Atlas CRM Rollout",
    status: "Delivered",
    sentDate: "21/07/2026 09:10 AM",
  },
  {
    id: "msg-3",
    type: "External",
    subject: "Document request",
    body: "Could you send the latest financials when you get a chance?",
    from: "Roshna Abraham",
    to: "Marcus Lin",
    relatedTo: "Company: Contoso Ltd.",
    status: "Sent",
    sentDate: "21/07/2026 11:00 AM",
    template: "Document Request",
  },
  {
    id: "msg-4",
    type: "System",
    subject: "Task assigned",
    body: "You were assigned task T-004: Demo environment setup.",
    from: "System",
    to: "Roshna Abraham",
    relatedTo: "Task: T-004",
    status: "Delivered",
    sentDate: "21/07/2026 08:00 AM",
  },
  {
    id: "msg-5",
    type: "External",
    subject: "Draft intro",
    body: "Hi William — looking forward to connecting…",
    from: "John Smith",
    to: "William Anderson",
    relatedTo: "Lead: William Anderson",
    status: "Draft",
  },
  {
    id: "msg-6",
    type: "External",
    subject: "Delivery failed",
    body: "Your rate has been approved.",
    from: "Tejas Gokhe",
    to: "invalid@example.com",
    status: "Failed",
    sentDate: "19/07/2026 02:20 PM",
  },
];
