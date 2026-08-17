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

export interface TaskFilters {
  statuses: TaskStatus[];
  priorities: Priority[];
  types: TaskType[];
}

export const EMPTY_TASK_FILTERS: TaskFilters = {
  statuses: [],
  priorities: [],
  types: [],
};

export interface TaskActionItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskActivityNote {
  id: string;
  body: string;
  author: string;
  createdAt: string;
}

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
  createdOn?: string;
  modifiedBy?: string;
  modifiedOn?: string;
  description?: string;
  completedDate?: string;
  notes?: string;
  activityNotes?: TaskActivityNote[];
  actionItems?: TaskActionItem[];
  collaborators?: string[];
  commentsCount?: number;
  attachmentsCount?: number;
  assignee: {
    initials: string;
    colorClass: string;
  };
  overdue?: boolean;
}

export function formatTaskTimestamp(date = new Date()): string {
  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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
  const createdBy = partial.createdBy ?? partial.assignedTo;
  const createdOn = partial.createdOn ?? "17/08/2026 09:00 AM";
  const modifiedBy = partial.modifiedBy ?? createdBy;
  const modifiedOn = partial.modifiedOn ?? createdOn;
  return {
    ...partial,
    createdBy,
    createdOn,
    modifiedBy,
    modifiedOn,
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
    count: 4,
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
        overdue: true,
      }),
      task({
        // Extra pending competitor for William (+X coverage)
        taskId: "T-019",
        title: "Confirm documents checklist",
        taskType: "Follow-up",
        priority: "Medium",
        status: "Not Started",
        dueDate: "25/07/2026",
        assignedTo: "John Smith",
        relatedTo: { kind: "Lead", name: "William Anderson" },
        createdBy: "John Smith",
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
        activityNotes: [
          {
            id: "note-t005-1",
            body: "Client confirmed the Q3 targets during the morning sync. Need to ensure the churn metrics account for the recent platform update.",
            author: "Alex Sterling",
            createdAt: "17/08/2026 09:30 AM",
          },
        ],
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
        taskId: "T-012",
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

export type TaskGroupBy = "status" | "assignee" | "priority";

export const TASK_SAVED_VIEWS = [
  { label: "Tasks by Status", groupBy: "status" as TaskGroupBy },
  { label: "Tasks by Assignee", groupBy: "assignee" as TaskGroupBy },
  { label: "Tasks by Priority", groupBy: "priority" as TaskGroupBy },
] as const;

export interface TaskBoardColumn {
  id: string;
  title: string;
  count: number;
  badgeColorClass: string;
  tasks: Task[];
}

const PRIORITY_COLUMN_BADGE: Record<Priority, string> = {
  Critical: "bg-red-500 text-white",
  High: "bg-rose-500 text-white",
  Medium: "bg-amber-500 text-white",
  Low: "bg-slate-400 text-white",
};

export function groupTaskColumns(
  statusColumns: TaskColumn[],
  groupBy: TaskGroupBy,
): TaskBoardColumn[] {
  const allTasks = statusColumns.flatMap((col) => col.tasks);

  if (groupBy === "status") {
    return statusColumns.map((col) => ({
      id: col.id,
      title: col.title,
      count: col.tasks.length,
      badgeColorClass: col.badgeColorClass,
      tasks: col.tasks,
    }));
  }

  if (groupBy === "priority") {
    return TASK_PRIORITIES.map((priority) => {
      const tasks = allTasks.filter((task) => task.priority === priority);
      return {
        id: `priority-${priority.toLowerCase()}`,
        title: priority,
        count: tasks.length,
        badgeColorClass: PRIORITY_COLUMN_BADGE[priority],
        tasks,
      };
    });
  }

  const assignees = [
    ...new Set([
      ...TASK_OWNERS,
      ...allTasks.map((task) => task.assignedTo),
    ]),
  ];

  return assignees.map((name) => {
    const tasks = allTasks.filter((task) => task.assignedTo === name);
    return {
      id: `assignee-${name.toLowerCase().replace(/\s+/g, "-")}`,
      title: name,
      count: tasks.length,
      badgeColorClass: "bg-violet-500 text-white",
      tasks,
    };
  });
}
