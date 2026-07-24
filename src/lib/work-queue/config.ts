/** Client Workqueue mock: category defaults + activity icons */

export type ActivityNavId =
  | "tasks"
  | "calls"
  | "meetings"
  | "emails"
  | "messages"
  | "reminders";

export type WorkqueueItemId =
  | "my-leads"
  | "new-leads"
  | "pending-tags"
  | "stale-leads"
  | "my-contacts"
  | "contacts-3h"
  | "followup"
  | "my-deals"
  | "closing-soon"
  | "pending-deal-tags"
  | "stalled"
  | "pending-review"
  | "missing-info"
  | "awaiting-action"
  | "pending-approval"
  | "waiting-approval"
  | "overdue"
  | "high-priority"
  | "escalated"
  /** Session 18 — Pipeline SLA Work Queue */
  | "sla-attention"
  | "sla-overdue"
  | "sla-milestone-overdue"
  | "sla-due-today"
  | "sla-at-risk";

export type WorkQueueNavId = ActivityNavId | WorkqueueItemId;

export type ActivityIconId =
  | "check-circle"
  | "phone"
  | "calendar"
  | "mail"
  | "message"
  | "bell";

export interface WorkqueueItemDef {
  id: WorkqueueItemId;
  label: string;
  checked: boolean;
  danger?: boolean;
}

export interface WorkqueueCategoryDef {
  id: string;
  label: string;
  checked: boolean;
  items: WorkqueueItemDef[];
}

export const ACTIVITY_DEFAULT: {
  id: ActivityNavId;
  label: string;
  icon: ActivityIconId;
}[] = [
  { id: "tasks", label: "Tasks", icon: "check-circle" },
  { id: "calls", label: "Calls", icon: "phone" },
  { id: "meetings", label: "Meetings", icon: "calendar" },
  { id: "emails", label: "Emails", icon: "mail" },
  { id: "messages", label: "Messages", icon: "message" },
  { id: "reminders", label: "Reminders", icon: "bell" },
];

export const CATEGORIES_DEFAULT: WorkqueueCategoryDef[] = [
  {
    id: "leads",
    label: "Leads",
    checked: true,
    items: [
      { id: "my-leads", label: "My Leads", checked: true },
      {
        id: "new-leads",
        label: "Leads assigned in last 3 hours",
        checked: true,
      },
      { id: "pending-tags", label: "Pending Tags", checked: true },
      {
        id: "stale-leads",
        label: "Stale Leads",
        checked: true,
        danger: true,
      },
    ],
  },
  {
    id: "contacts",
    label: "Contacts",
    checked: true,
    items: [
      { id: "my-contacts", label: "My Contacts", checked: true },
      {
        id: "contacts-3h",
        label: "Contacts assigned in last 3 hours",
        checked: true,
      },
      { id: "followup", label: "Follow-up Required", checked: true },
    ],
  },
  {
    id: "deals",
    label: "Deals",
    checked: true,
    items: [
      { id: "my-deals", label: "My Deals", checked: true },
      {
        id: "closing-soon",
        label: "Deals Closing This Month",
        checked: true,
      },
      { id: "pending-deal-tags", label: "Pending Deal Tags", checked: true },
      { id: "stalled", label: "Stalled Deals", checked: false },
    ],
  },
  {
    id: "records",
    label: "Records",
    checked: true,
    items: [
      { id: "pending-review", label: "Pending Review", checked: true },
      { id: "missing-info", label: "Missing Information", checked: false },
      { id: "awaiting-action", label: "Awaiting Action", checked: true },
    ],
  },
  {
    id: "approvals",
    label: "Approvals",
    checked: true,
    items: [
      { id: "pending-approval", label: "Pending My Approval", checked: true },
      {
        id: "waiting-approval",
        label: "Waiting for Approval",
        checked: true,
      },
    ],
  },
  {
    id: "attention",
    label: "Attention Required",
    checked: true,
    items: [
      { id: "overdue", label: "Overdue", checked: true, danger: true },
      {
        id: "high-priority",
        label: "High Priority",
        checked: true,
        danger: true,
      },
      { id: "escalated", label: "Escalated", checked: true, danger: true },
    ],
  },
  {
    id: "pipeline-sla",
    label: "Pipeline SLA",
    checked: true,
    items: [
      {
        id: "sla-attention",
        label: "Needs attention",
        checked: true,
        danger: true,
      },
      { id: "sla-overdue", label: "Overdue", checked: true, danger: true },
      {
        id: "sla-milestone-overdue",
        label: "Milestone Overdue",
        checked: true,
        danger: true,
      },
      { id: "sla-due-today", label: "Due Today", checked: true },
      { id: "sla-at-risk", label: "At Risk", checked: true },
    ],
  },
];

export const USER_TAB_COLORS = [
  "#2563EB",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
] as const;

/** v2 — adds Pipeline SLA category (Session 18). */
export const QUEUE_STORAGE_KEY = "finconnex:workqueue:categories:v2";

export function cloneCategories(
  cats: WorkqueueCategoryDef[] = CATEGORIES_DEFAULT,
): WorkqueueCategoryDef[] {
  return JSON.parse(JSON.stringify(cats)) as WorkqueueCategoryDef[];
}

export function isActivityNav(id: string): id is ActivityNavId {
  return ACTIVITY_DEFAULT.some((a) => a.id === id);
}

export function getActivityTitle(nav: string): string {
  const activity = ACTIVITY_DEFAULT.find((a) => a.id === nav);
  if (activity) return activity.label;
  for (const cat of CATEGORIES_DEFAULT) {
    const item = cat.items.find((it) => it.id === nav);
    if (item) return item.label;
  }
  return "Workqueue";
}
