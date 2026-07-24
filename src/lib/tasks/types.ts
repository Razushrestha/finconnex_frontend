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

export const TASK_PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
export type Priority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = [
  "Not Started",
  "In Progress",
  "Waiting",
  "Review",
  "Completed",
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
  commentsCount?: number;
  attachmentsCount?: number;
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
    badgeColorClass: "bg-slate-500 text-white",
    tasks: [
      task({
        taskId: "T-001",
        title: "Send welcome pack",
        taskType: "Email",
        priority: "Critical",
        status: "Not Started",
        dueDate: "22/07/2026",
        assignedTo: "John Smith",
        relatedTo: { kind: "Lead", name: "William Anderson" },
        collaborators: [
          "John Doe",
          "Justin Smith",
          "William Philips",
          "Michael Jordan",
        ],
        createdBy: "John Smith",
        overdue: false,
      }),

      task({
        taskId: "T-003",
        title: "Discovery call prep nhabsh jhabskf habskf jhasfhas fjhaif",
        taskType: "Call",
        priority: "Medium",
        status: "Not Started",
        dueDate: "23/07/2026",
        assignedTo: "Shiva Kadhka",
        relatedTo: { kind: "Contact", name: "Olivia Bennett" },
        collaborators: [
          "John Doe",
          "Justin Smith",
          "William Philips",
          "Michael Jordan",
        ],

        commentsCount: 2,
        attachmentsCount: 1,
        createdBy: "Shiva Kadhka",
      }),
      task({
        taskId: "T-004",
        title: "Research competitor pricing",
        taskType: "Research",
        priority: "Low",
        status: "Not Started",
        dueDate: "25/07/2026",
        assignedTo: "Tejas Gokhe",
        relatedTo: { kind: "Deal", name: "Atlas CRM Rollout" },
        collaborators: [
          "John Doe",
          "Justin Smith",
          "William Philips",
          "Michael Jordan",
        ],
        createdBy: "Tejas Gokhe",
      }),
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    count: 2,
    badgeColorClass: "bg-blue-500 text-white",
    tasks: [
      task({
        taskId: "T-005",
        title: "Demo environment setup",
        taskType: "Demo",
        priority: "High",
        status: "In Progress",
        dueDate: "21/07/2026",
        assignedTo: "Roshna Abraham",
        relatedTo: { kind: "Company", name: "Fabrikam Inc." },
        collaborators: [
          "John Doe",
          "Justin Smith",
          "William Philips",
          "Michael Jordan",
        ],
        createdBy: "John Smith",
        overdue: true,
      }),
      task({
        taskId: "T-006",
        title: "Follow-up on proposal",
        taskType: "Follow-up",
        priority: "Medium",
        status: "In Progress",
        dueDate: "24/07/2026",
        assignedTo: "John Smith",
        relatedTo: { kind: "Deal", name: "Greystone Realty" },
        collaborators: [
          "John Doe",
          "Justin Smith",
          "William Philips",
          "Michael Jordan",
        ],
        createdBy: "John Smith",
      }),
    ],
  },

  {
    id: "waiting",
    title: "Waiting",
    count: 1,
    badgeColorClass: "bg-yellow-500 text-white",
    tasks: [
      task({
        taskId: "T-009",
        title: "Quarterly business review",
        taskType: "Meeting",
        priority: "Low",
        status: "Waiting",
        dueDate: "30/08/2026",
        assignedTo: "Roshna Abraham",
        relatedTo: { kind: "Contact", name: "Marcus Lin" },
        collaborators: [
          "John Doe",
          "Justin Smith",
          "William Philips",
          "Michael Jordan",
        ],
        createdBy: "John Smith",
      }),
    ],
  },

  {
    id: "review",
    title: "Review",
    count: 1,
    badgeColorClass: "bg-purple-500 text-white",
    tasks: [
      task({
        taskId: "T-010",
        title: "Quarterly business review",
        taskType: "Meeting",
        priority: "Medium",
        status: "Review",
        dueDate: "30/08/2026",
        assignedTo: "Roshna Abraham",
        relatedTo: { kind: "Contact", name: "Marcus Lin" },
        collaborators: [
          "John Doe",
          "Justin Smith",
          "William Philips",
          "Michael Jordan",
        ],
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
        taskId: "T-007",
        title: "Kickoff meeting notes",
        taskType: "Meeting",
        priority: "Medium",
        status: "Completed",
        dueDate: "18/07/2026",
        completedDate: "18/07/2026",
        assignedTo: "Shiva Kadhka",
        relatedTo: { kind: "Company", name: "Northwind Traders" },
        collaborators: [
          "John Doe",
          "Justin Smith",
          "William Philips",
          "Michael Jordan",
        ],
        createdBy: "Shiva Kadhka",
      }),
      task({
        taskId: "T-008",
        title: "Send contract draft",
        taskType: "Email",
        priority: "High",
        status: "Completed",
        dueDate: "17/07/2026",
        completedDate: "17/07/2026",
        assignedTo: "Tejas Gokhe",
        relatedTo: { kind: "Deal", name: "Atlas CRM Rollout" },
        collaborators: [
          "John Doe",
          "Justin Smith",
          "William Philips",
          "Michael Jordan",
        ],
        createdBy: "Tejas Gokhe",
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
        taskId: "T-011",
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
