/** SRS §18 Notifications — event inbox for the CRM */

export type NotificationType =
  | "Task Assigned"
  | "Deal Won"
  | "Lead Assigned"
  | "Meeting Reminder"
  | "Ticket Updated"
  | "Campaign Sent"
  | "System Alert"
  | "Mention";

export type NotificationStatus = "Unread" | "Read" | "Dismissed";

export interface AppNotification {
  id: string;
  notificationId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedTo: string;
  relatedHref: string;
  recipient: string;
  status: NotificationStatus;
  sentAt: string;
  readAt?: string;
}

export const NOTIFICATION_TYPES: NotificationType[] = [
  "Task Assigned",
  "Deal Won",
  "Lead Assigned",
  "Meeting Reminder",
  "Ticket Updated",
  "Campaign Sent",
  "System Alert",
  "Mention",
];

export const NOTIFICATION_STATUSES: NotificationStatus[] = [
  "Unread",
  "Read",
  "Dismissed",
];

export const NOTIFICATION_TYPE_STYLE: Record<NotificationType, string> = {
  "Task Assigned": "bg-sky-50 text-sky-700",
  "Deal Won": "bg-emerald-50 text-emerald-700",
  "Lead Assigned": "bg-violet-50 text-violet-700",
  "Meeting Reminder": "bg-amber-50 text-amber-800",
  "Ticket Updated": "bg-rose-50 text-rose-700",
  "Campaign Sent": "bg-indigo-50 text-indigo-700",
  "System Alert": "bg-slate-100 text-slate-600",
  Mention: "bg-fuchsia-50 text-fuchsia-700",
};

export const NOTIFICATION_STATUS_STYLE: Record<NotificationStatus, string> = {
  Unread: "bg-violet-50 text-violet-700",
  Read: "bg-slate-100 text-slate-600",
  Dismissed: "bg-rose-50 text-rose-600",
};

export const NOTIFICATION_SETTINGS_HREF =
  "/settings/notifications/in-app-notifications";

const STORE_KEY = "notifications:v1";

export function formatNotificationAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const seedNotifications: AppNotification[] = [
  {
    id: "ntf1",
    notificationId: "NTF-6001",
    type: "Task Assigned",
    title: "New task assigned",
    message: "Follow up with Harbour Lending on document pack.",
    relatedTo: "Task · Follow-up Harbour",
    relatedHref: "/activities/tasks",
    recipient: "John Smith",
    status: "Unread",
    sentAt: "22/07/2026 09:12",
  },
  {
    id: "ntf2",
    notificationId: "NTF-6002",
    type: "Deal Won",
    title: "Deal won",
    message: "Northside Refinance moved to Closed Won — $850k.",
    relatedTo: "Deal · Northside Refinance",
    relatedHref: "/sales/deals",
    recipient: "John Smith",
    status: "Unread",
    sentAt: "22/07/2026 08:40",
  },
  {
    id: "ntf3",
    notificationId: "NTF-6003",
    type: "Lead Assigned",
    title: "Lead assigned to you",
    message: "Priya Sharma (First home) was assigned to your queue.",
    relatedTo: "Lead · Priya Sharma",
    relatedHref: "/sales/leads",
    recipient: "John Smith",
    status: "Unread",
    sentAt: "21/07/2026 16:55",
  },
  {
    id: "ntf4",
    notificationId: "NTF-6004",
    type: "Meeting Reminder",
    title: "Meeting in 30 minutes",
    message: "Discovery call with Westfield Partners at 2:00 pm.",
    relatedTo: "Meeting · Westfield discovery",
    relatedHref: "/activities/meetings",
    recipient: "John Smith",
    status: "Read",
    sentAt: "21/07/2026 13:30",
    readAt: "21/07/2026 13:32",
  },
  {
    id: "ntf5",
    notificationId: "NTF-6005",
    type: "Ticket Updated",
    title: "Support ticket updated",
    message: "TKT-1042 marked Waiting on Client.",
    relatedTo: "Ticket · TKT-1042",
    relatedHref: "/support",
    recipient: "John Smith",
    status: "Read",
    sentAt: "21/07/2026 11:05",
    readAt: "21/07/2026 11:20",
  },
  {
    id: "ntf6",
    notificationId: "NTF-6006",
    type: "Campaign Sent",
    title: "Campaign sent",
    message: "July rate update email delivered to 248 contacts.",
    relatedTo: "Campaign · July rate update",
    relatedHref: "/marketing/email",
    recipient: "John Smith",
    status: "Read",
    sentAt: "20/07/2026 10:00",
    readAt: "20/07/2026 10:18",
  },
  {
    id: "ntf7",
    notificationId: "NTF-6007",
    type: "System Alert",
    title: "Storage near limit",
    message: "Document library is at 92% of plan capacity.",
    relatedTo: "Settings · Storage",
    relatedHref: "/settings",
    recipient: "John Smith",
    status: "Unread",
    sentAt: "20/07/2026 08:15",
  },
  {
    id: "ntf8",
    notificationId: "NTF-6008",
    type: "Mention",
    title: "You were mentioned",
    message: "Tejas mentioned you in Team Chat about Harbour settlement.",
    relatedTo: "Team Chat · Harbour settlement",
    relatedHref: "/activities/team-chat",
    recipient: "John Smith",
    status: "Dismissed",
    sentAt: "19/07/2026 15:22",
    readAt: "19/07/2026 15:40",
  },
];

function readStore(): AppNotification[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: AppNotification[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listNotifications(): AppNotification[] {
  return readStore() ?? seedNotifications.map((n) => ({ ...n }));
}

export function upsertNotification(n: AppNotification) {
  const list = listNotifications();
  const i = list.findIndex((x) => x.id === n.id);
  if (i >= 0) list[i] = n;
  else list.unshift(n);
  writeStore(list);
  return n;
}

export function writeAllNotifications(list: AppNotification[]) {
  writeStore(list);
}

export function getNotificationById(id: string) {
  return listNotifications().find((n) => n.id === id);
}

export function countUnread(list?: AppNotification[]) {
  return (list ?? listNotifications()).filter((n) => n.status === "Unread")
    .length;
}

export function markNotificationRead(n: AppNotification): AppNotification {
  if (n.status === "Dismissed") return n;
  if (n.status === "Read" && n.readAt) return n;
  return {
    ...n,
    status: "Read",
    readAt: n.readAt ?? formatNotificationAt(),
  };
}

export function markNotificationDismissed(n: AppNotification): AppNotification {
  return {
    ...n,
    status: "Dismissed",
    readAt: n.readAt ?? formatNotificationAt(),
  };
}

export function markAllNotificationsRead(list: AppNotification[]) {
  const at = formatNotificationAt();
  return list.map((n) =>
    n.status === "Unread"
      ? { ...n, status: "Read" as const, readAt: at }
      : n,
  );
}

export function exportNotificationsCsv(rows: AppNotification[]) {
  const header = [
    "Notification ID",
    "Type",
    "Title",
    "Message",
    "Related To",
    "Recipient",
    "Status",
    "Sent At",
    "Read At",
  ];
  const body = rows.map((n) =>
    [
      n.notificationId,
      n.type,
      n.title,
      n.message,
      n.relatedTo,
      n.recipient,
      n.status,
      n.sentAt,
      n.readAt ?? "",
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...body].join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "notifications-log.csv";
  a.click();
  URL.revokeObjectURL(url);
}
