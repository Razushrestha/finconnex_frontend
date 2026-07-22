/** SRS §7.1 Tasks */

import {
  ACTIVITY_OWNERS,
  avatarColor,
  initials,
  type RelatedTo,
} from "@/lib/activities/shared";

export const TASK_TYPES = [
  "Call",
  "Email",
  "Meeting",
  "Follow-up",
  "Demo",
  "Research",
  "Other",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_PRIORITIES = ["High", "Medium", "Low"] as const;
export type Priority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = [
  "Not Started",
  "In Progress",
  "Completed",
  "Deferred",
  "Cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  taskId: string;
  title: string;
  taskType: TaskType;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  assignedTo: string;
  relatedTo?: RelatedTo;
  reminderDate?: string;
  createdBy?: string;
  description?: string;
  completedDate?: string;
  notes?: string;
  collaborators?: string[];
  assignee: {
    initials: string;
    colorClass: string;
  };
  overdue?: boolean;
}

export interface TaskColumn {
  id: string;
  title: TaskStatus;
  count: number;
  badgeColorClass: string;
  tasks: Task[];
}

function task(
  partial: Omit<Task, "assignee"> & { assignee?: Task["assignee"] },
): Task {
  return {
    ...partial,
    assignee: partial.assignee ?? {
      initials: initials(partial.assignedTo),
      colorClass: avatarColor(partial.assignedTo),
    },
  };
}

export const taskColumns: TaskColumn[] = [
  {
    id: "not-started",
    title: "Not Started",
    count: 3,
    badgeColorClass: "bg-sky-500 text-white",
    tasks: [
      task({
        taskId: "T-001",
        title: "Send welcome pack",
        taskType: "Email",
        priority: "High",
        status: "Not Started",
        dueDate: "22/07/2026",
        assignedTo: "John Smith",
        relatedTo: { kind: "Lead", name: "William Anderson" },
        createdBy: "John Smith",
        overdue: false,
      }),
      task({
        taskId: "T-002",
        title: "Discovery call prep",
        taskType: "Call",
        priority: "Medium",
        status: "Not Started",
        dueDate: "23/07/2026",
        assignedTo: "Shiva Kadhka",
        relatedTo: { kind: "Contact", name: "Olivia Bennett" },
        createdBy: "Shiva Kadhka",
      }),
      task({
        taskId: "T-003",
        title: "Research competitor pricing",
        taskType: "Research",
        priority: "Low",
        status: "Not Started",
        dueDate: "25/07/2026",
        assignedTo: "Tejas Gokhe",
        relatedTo: { kind: "Deal", name: "Atlas CRM Rollout" },
        createdBy: "Tejas Gokhe",
      }),
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    count: 2,
    badgeColorClass: "bg-amber-500 text-white",
    tasks: [
      task({
        taskId: "T-004",
        title: "Demo environment setup",
        taskType: "Demo",
        priority: "High",
        status: "In Progress",
        dueDate: "21/07/2026",
        assignedTo: "Roshna Abraham",
        relatedTo: { kind: "Company", name: "Fabrikam Inc." },
        createdBy: "John Smith",
        overdue: true,
      }),
      task({
        taskId: "T-005",
        title: "Follow-up on proposal",
        taskType: "Follow-up",
        priority: "Medium",
        status: "In Progress",
        dueDate: "24/07/2026",
        assignedTo: "John Smith",
        relatedTo: { kind: "Deal", name: "Greystone Realty" },
        createdBy: "John Smith",
      }),
    ],
  },
  {
    id: "completed",
    title: "Completed",
    count: 2,
    badgeColorClass: "bg-emerald-500 text-white",
    tasks: [
      task({
        taskId: "T-006",
        title: "Kickoff meeting notes",
        taskType: "Meeting",
        priority: "Medium",
        status: "Completed",
        dueDate: "18/07/2026",
        completedDate: "18/07/2026",
        assignedTo: "Shiva Kadhka",
        relatedTo: { kind: "Company", name: "Northwind Traders" },
        createdBy: "Shiva Kadhka",
      }),
      task({
        taskId: "T-007",
        title: "Send contract draft",
        taskType: "Email",
        priority: "High",
        status: "Completed",
        dueDate: "17/07/2026",
        completedDate: "17/07/2026",
        assignedTo: "Tejas Gokhe",
        relatedTo: { kind: "Deal", name: "Atlas CRM Rollout" },
        createdBy: "Tejas Gokhe",
      }),
    ],
  },
  {
    id: "deferred",
    title: "Deferred",
    count: 1,
    badgeColorClass: "bg-slate-500 text-white",
    tasks: [
      task({
        taskId: "T-008",
        title: "Quarterly business review",
        taskType: "Meeting",
        priority: "Low",
        status: "Deferred",
        dueDate: "30/08/2026",
        assignedTo: "Roshna Abraham",
        relatedTo: { kind: "Contact", name: "Marcus Lin" },
        createdBy: "John Smith",
      }),
    ],
  },
  {
    id: "cancelled",
    title: "Cancelled",
    count: 1,
    badgeColorClass: "bg-rose-500 text-white",
    tasks: [
      task({
        taskId: "T-009",
        title: "Legacy import check",
        taskType: "Other",
        priority: "Low",
        status: "Cancelled",
        dueDate: "10/07/2026",
        assignedTo: "John Smith",
        createdBy: "John Smith",
      }),
    ],
  },
];

export const TASK_OWNERS = ACTIVITY_OWNERS;
