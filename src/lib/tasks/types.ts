import {
  ACTIVITY_OWNERS,
  avatarColor,
  initials,
  type RelatedTo,
} from "@/lib/activities/shared";
import {
  REMINDER_LEAD_TIMES,
  REMINDER_TYPES,
  type NotificationMethod,
  type ReminderLeadTime,
  type ReminderType,
} from "@/lib/reminders/types";
import type { ReminderRepeatRule } from "@/lib/tasks/repeat-reminder";

export const TASK_TYPES = [
  "Call",
  "Team Action",
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

export type TaskScope = "all" | "mine" | "my-overdue";

export interface TaskFilters {
  statuses: TaskStatus[];
  priorities: Priority[];
  types: TaskType[];
  scope?: TaskScope;
}

export const EMPTY_TASK_FILTERS: TaskFilters = {
  statuses: [],
  priorities: [],
  types: [],
  scope: "all",
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

export const REMINDER_NOTIFY_OPTIONS = ["Email", "Pop Up", "Both"] as const;
export type ReminderNotifyOption = (typeof REMINDER_NOTIFY_OPTIONS)[number];

export const REMINDER_SCHEDULE_MODES = ["onDate", "relative"] as const;
export type ReminderScheduleMode = (typeof REMINDER_SCHEDULE_MODES)[number];

export const REMINDER_RELATIVE_WHEN = ["Before", "After"] as const;
export type ReminderRelativeWhen = (typeof REMINDER_RELATIVE_WHEN)[number];

export const REMINDER_REPEAT_OPTIONS = [
  "None",
  "Daily",
  "Weekly",
  "Monthly",
  "Yearly",
  "Custom",
] as const;
export type ReminderRepeatType = (typeof REMINDER_REPEAT_OPTIONS)[number];

/** Reminder frequency labels. Stored value `None` is shown as Once. */
export const REMINDER_FREQUENCY_OPTIONS: {
  value: ReminderRepeatType;
  label: string;
}[] = [
  { value: "None", label: "Once" },
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
  { value: "Custom", label: "Custom" },
];

export function reminderFrequencyLabel(type?: ReminderRepeatType) {
  if (!type || type === "None") return "Once";
  return REMINDER_FREQUENCY_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

export interface TaskReminder {
  id: string;
  type: ReminderType;
  date: string;
  time: string;
  leadTime: ReminderLeadTime;
  notificationMethod: NotificationMethod;
  scheduleMode?: ReminderScheduleMode;
  relativeCount?: number;
  relativeWhen?: ReminderRelativeWhen;
  relativeOf?: "Due Date";
  repeatType?: ReminderRepeatType;
  repeatRule?: ReminderRepeatRule;
  notify?: ReminderNotifyOption;
  status?: "Pending" | "Completed" | "Stopped";
  completedAt?: string;
  sequenceId?: string;
  occurrenceIndex?: number;
  spawnedNextId?: string;
  nextScheduledLabel?: string;
}

export function reminderNotify(reminder: TaskReminder): ReminderNotifyOption {
  if (reminder.notify) return reminder.notify;
  return reminder.notificationMethod === "Email" ? "Email" : "Pop Up";
}

export function notifyToMethod(
  notify: ReminderNotifyOption,
): NotificationMethod {
  return notify === "Pop Up" ? "Web Push" : "Email";
}

export function createTaskReminder(
  patch: Partial<TaskReminder> = {},
): TaskReminder {
  const id = patch.id ?? `tr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    type: REMINDER_TYPES[0],
    date: "",
    time: "13:00",
    leadTime: REMINDER_LEAD_TIMES[0],
    notificationMethod: "Email",
    scheduleMode: "onDate",
    relativeCount: 1,
    relativeWhen: "Before",
    relativeOf: "Due Date",
    repeatType: "None",
    notify: "Email",
    status: "Pending",
    occurrenceIndex: 1,
    ...patch,
    id,
    sequenceId: patch.sequenceId ?? id,
  };
}

function parseTaskReminderDateTime(
  value: string,
): { date: string; time: string } | null {
  const iso = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/,
  );
  if (iso) {
    return {
      date: `${iso[1]}-${iso[2]}-${iso[3]}`,
      time: iso[4] ? `${iso[4]}:${iso[5]}` : "",
    };
  }

  const au = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i,
  );
  if (!au) return null;

  const day = au[1].padStart(2, "0");
  const month = au[2].padStart(2, "0");
  let hour = au[4] ? Number(au[4]) : undefined;
  const minute = au[5] ?? "00";
  const meridiem = au[6]?.toUpperCase();
  if (hour != null && meridiem === "PM" && hour < 12) hour += 12;
  if (hour != null && meridiem === "AM" && hour === 12) hour = 0;

  return {
    date: `${au[3]}-${month}-${day}`,
    time:
      hour != null ? `${String(hour).padStart(2, "0")}:${minute}` : "",
  };
}

export function remindersFromLegacyDate(
  reminderDate?: string,
): TaskReminder[] {
  if (!reminderDate?.trim()) return [];
  const parsed = parseTaskReminderDateTime(reminderDate.trim());
  if (!parsed) return [];
  return [
    createTaskReminder({
      type: "Task Due",
      date: parsed.date,
      time: parsed.time,
      leadTime: "15 minutes before",
      notificationMethod: "Web Push",
    }),
  ];
}

export function formatTaskReminderWhen(reminder: TaskReminder): string {
  const timeLabel = formatReminderTime(reminder.time);
  if (reminder.scheduleMode === "relative") {
    const count = reminder.relativeCount ?? 1;
    const when = reminder.relativeWhen ?? "Before";
    const of = reminder.relativeOf ?? "Due Date";
    return timeLabel
      ? `${count} Day(s) ${when} ${of} at ${timeLabel}`
      : `${count} Day(s) ${when} ${of}`;
  }
  if (!reminder.date) return "No date set";
  const [year, month, day] = reminder.date.split("-");
  const dateLabel = `${day}/${month}/${year}`;
  return timeLabel ? `${dateLabel} at ${timeLabel}` : dateLabel;
}

function formatReminderTime(time?: string): string {
  if (!time) return "";
  const [hourRaw, minute] = time.split(":");
  const hour = Number(hourRaw);
  if (!Number.isFinite(hour)) return "";
  const meridiem = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${minute} ${meridiem}`;
}

export function formatReminderDateLabel(
  reminders: TaskReminder[],
): string | undefined {
  const first =
    reminders.find(
      (reminder) => reminder.date && (reminder.status ?? "Pending") === "Pending",
    ) ?? reminders.find((reminder) => reminder.date);
  return first ? formatTaskReminderWhen(first) : undefined;
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
  repeatRule?: ReminderRepeatRule;
  createdBy?: string;
  createdOn?: string;
  modifiedBy?: string;
  modifiedOn?: string;
  description?: string;
  completedBy?: string;
  completedDate?: string;
  notes?: string;
  activityNotes?: TaskActivityNote[];
  actionItems?: TaskActionItem[];
  collaborators?: string[];
  notifyBy?: NotificationMethod[];
  reminders?: TaskReminder[];
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
        reminders: [
          {
            id: "tr-001-1",
            type: "Task Due",
            date: "2026-07-21",
            time: "09:00",
            leadTime: "1 day before",
            notificationMethod: "Web Push",
            notify: "Pop Up",
            scheduleMode: "onDate",
            repeatType: "None",
          },
          {
            id: "tr-001-2",
            type: "Follow-up",
            date: "2026-07-22",
            time: "08:00",
            leadTime: "15 minutes before",
            notificationMethod: "Email",
            notify: "Email",
            scheduleMode: "onDate",
            repeatType: "None",
          },
        ],
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
        completedDate: "18/07/2026 04:30 PM",
        completedBy: "Shiva Kadhka",
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
        completedDate: "17/07/2026 02:15 PM",
        completedBy: "Tejas Gokhe",
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
