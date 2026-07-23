/** SRS §28.3 Notifications — emitters into the Notifications store */

import {
  formatNotificationAt,
  listNotifications,
  upsertNotification,
  type AppNotification,
  type NotificationType,
} from "@/lib/notifications/types";

function nextIds() {
  const list = listNotifications();
  const nums = list
    .map((n) => Number(n.notificationId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 6000) + 1;
  return { id: `ntf-${Date.now()}`, notificationId: `NTF-${n}` };
}

function emit(partial: Omit<AppNotification, "id" | "notificationId" | "status" | "sentAt"> & {
  status?: AppNotification["status"];
}) {
  const ids = nextIds();
  return upsertNotification({
    id: ids.id,
    notificationId: ids.notificationId,
    status: partial.status ?? "Unread",
    sentAt: formatNotificationAt(),
    ...partial,
  });
}

export function notifyOwnerAssigned(input: {
  owner: string;
  entityLabel: string;
  relatedTo: string;
  relatedHref: string;
  type?: NotificationType;
}) {
  return emit({
    type: input.type ?? "Lead Assigned",
    title: "Owner assigned",
    message: `You were assigned as owner of ${input.entityLabel}`,
    relatedTo: input.relatedTo,
    relatedHref: input.relatedHref,
    recipient: input.owner,
  });
}

export function notifyStatusChanged(input: {
  recipient: string;
  entityLabel: string;
  from: string;
  to: string;
  relatedTo: string;
  relatedHref: string;
}) {
  return emit({
    type: "System Alert",
    title: "Status / stage changed",
    message: `${input.entityLabel}: ${input.from} → ${input.to}`,
    relatedTo: input.relatedTo,
    relatedHref: input.relatedHref,
    recipient: input.recipient,
  });
}

export function notifyDealClosed(input: {
  owner: string;
  manager?: string;
  dealName: string;
  stage: "Closed Won" | "Closed Lost" | string;
  relatedTo: string;
  relatedHref: string;
}) {
  const won = input.stage === "Closed Won";
  const ntf = emit({
    type: won ? "Deal Won" : "System Alert",
    title: won ? "Deal closed won" : "Deal closed lost",
    message: `${input.dealName} is now ${input.stage}`,
    relatedTo: input.relatedTo,
    relatedHref: input.relatedHref,
    recipient: input.owner,
  });
  if (input.manager && input.manager !== input.owner) {
    emit({
      type: won ? "Deal Won" : "System Alert",
      title: won ? "Deal closed won" : "Deal closed lost",
      message: `${input.dealName} (${input.owner}) → ${input.stage}`,
      relatedTo: input.relatedTo,
      relatedHref: input.relatedHref,
      recipient: input.manager,
    });
  }
  return ntf;
}

export function notifyTaskDue(input: {
  recipient: string;
  taskTitle: string;
  relatedTo: string;
  relatedHref: string;
}) {
  return emit({
    type: "Task Assigned",
    title: "Task due",
    message: `Reminder: "${input.taskTitle}" is due`,
    relatedTo: input.relatedTo,
    relatedHref: input.relatedHref,
    recipient: input.recipient,
  });
}

export function notifyTicketUpdated(input: {
  requester: string;
  ticketRef: string;
  summary: string;
  relatedHref: string;
}) {
  return emit({
    type: "Ticket Updated",
    title: "Ticket updated",
    message: `${input.ticketRef}: ${input.summary}`,
    relatedTo: input.ticketRef,
    relatedHref: input.relatedHref,
    recipient: input.requester,
  });
}
