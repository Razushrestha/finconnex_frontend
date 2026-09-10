import {
  ACTIVITY_OWNERS,
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
import type { FieldClause } from "@/lib/filters/types";

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
  systemDefined?: string[];
  clauses?: FieldClause[];
}

export const EMPTY_TASK_FILTERS: TaskFilters = {
  statuses: [],
  priorities: [],
  types: [],
  scope: "all",
  systemDefined: [],
  clauses: [],
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

export interface TaskFileAttachment {
  id?: string;
  name: string;
  sizeLabel?: string;
  url?: string;
  key?: string;
}

export function formatTaskFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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
  attachments?: TaskFileAttachment[];
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

export const taskColumns: TaskColumn[] = [
  {
    id: "not-started",
    title: "Not Started",
    count: 0,
    badgeColorClass: "bg-slate-500 text-white",
    tasks: [],
  },
  {
    id: "in-progress",
    title: "In Progress",
    count: 0,
    badgeColorClass: "bg-blue-500 text-white",
    tasks: [],
  },

  {
    id: "waiting",
    title: "Waiting",
    count: 0,
    badgeColorClass: "bg-yellow-500 text-white",
    tasks: [],
  },

  {
    id: "review",
    title: "Review",
    count: 0,
    badgeColorClass: "bg-purple-500 text-white",
    tasks: [],
  },
  {
    id: "completed",
    title: "Completed",
    count: 0,
    badgeColorClass: "bg-emerald-500 text-white",
    tasks: [],
  },

  {
    id: "cancelled",
    title: "Cancelled",
    count: 0,
    badgeColorClass: "bg-rose-500 text-white",
    tasks: [],
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
