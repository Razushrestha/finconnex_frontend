/** Live task board store: session-backed (production adapter: swap for API). */

import {
  taskColumns as SEED_COLUMNS,
  type Priority,
  type Task,
  type TaskColumn,
  type TaskStatus,
  type TaskType,
} from "@/lib/tasks/types";
import {
  avatarColor,
  initials,
  type RelatedTo,
} from "@/lib/activities/shared";
import { createBoardStore } from "@/lib/rules/module-store";
import { newRulesId } from "@/lib/rules/storage";

function cloneSeed(): TaskColumn[] {
  return SEED_COLUMNS.map((col) => ({
    ...col,
    tasks: col.tasks.map((t) => ({
      ...t,
      assignee: { ...t.assignee },
      relatedTo: t.relatedTo ? { ...t.relatedTo } : undefined,
      collaborators: t.collaborators ? [...t.collaborators] : undefined,
    })),
  }));
}

function normalize(cols: TaskColumn[]): TaskColumn[] {
  return cols.map((col) => ({
    ...col,
    count: col.tasks.length,
    tasks: col.tasks.map((t) => ({ ...t, status: col.title })),
  }));
}

const board = createBoardStore({
  // v3: unique taskIds (T-010 was duplicated across Not Started + Review)
  key: "activities:tasks:board:v3",
  seed: cloneSeed,
});

export function listTaskColumns(): TaskColumn[] {
  return normalize(board.list());
}

export function saveTaskColumns(cols: TaskColumn[]) {
  board.save(normalize(cols));
}

export function createTask(input: {
  title: string;
  taskType: TaskType;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  assignedTo: string;
  relatedTo?: RelatedTo;
  description?: string;
  notes?: string;
  collaborators?: string[];
  createdBy?: string;
}): Task {
  const cols = listTaskColumns();
  const target =
    cols.find((c) => c.title === input.status) ??
    cols.find((c) => c.title === "Not Started") ??
    cols[0];
  const task: Task = {
    taskId: newRulesId("task"),
    title: input.title.trim(),
    taskType: input.taskType,
    priority: input.priority,
    status: target.title,
    dueDate: input.dueDate,
    assignedTo: input.assignedTo,
    relatedTo: input.relatedTo,
    description: input.description,
    notes: input.notes,
    collaborators: input.collaborators,
    createdBy: input.createdBy ?? input.assignedTo,
    assignee: {
      initials: initials(input.assignedTo),
      colorClass: avatarColor(input.assignedTo),
    },
  };

  saveTaskColumns(
    cols.map((c) =>
      c.id === target.id
        ? { ...c, tasks: [task, ...c.tasks], count: c.tasks.length + 1 }
        : c,
    ),
  );
  return task;
}

export function deleteTask(taskId: string): Task | null {
  const cols = listTaskColumns();
  let found: Task | null = null;
  const next = cols.map((c) => {
    const hit = c.tasks.find((t) => t.taskId === taskId);
    if (hit) found = hit;
    return {
      ...c,
      tasks: c.tasks.filter((t) => t.taskId !== taskId),
      count: c.tasks.filter((t) => t.taskId !== taskId).length,
    };
  });
  if (found) saveTaskColumns(next);
  return found;
}

/** Move a task into the Completed column (or mark status Completed). */
export function completeTask(taskId: string): Task | null {
  const found = findTaskById(taskId);
  if (!found) return null;
  if (found.task.status === "Completed") return found.task;

  const cols = listTaskColumns();
  const completedCol =
    cols.find((c) => c.title === "Completed") ??
    cols.find((c) => c.id === "completed");

  const updated: Task = {
    ...found.task,
    status: "Completed",
    completedDate: new Date().toISOString().slice(0, 10),
    overdue: false,
  };

  const without = cols.map((c) => ({
    ...c,
    tasks: c.tasks.filter((t) => t.taskId !== taskId),
    count: c.tasks.filter((t) => t.taskId !== taskId).length,
  }));

  if (completedCol) {
    saveTaskColumns(
      without.map((c) =>
        c.id === completedCol.id
          ? {
              ...c,
              tasks: [updated, ...c.tasks],
              count: c.tasks.length + 1,
            }
          : c,
      ),
    );
  } else {
    saveTaskColumns(without);
  }
  return updated;
}

export function findTaskById(taskId: string) {
  for (const col of listTaskColumns()) {
    const task = col.tasks.find((t) => t.taskId === taskId);
    if (task) return { task, status: col.title, columnId: col.id };
  }
  return null;
}

export function updateTaskPriority(
  taskId: string,
  priority: Priority,
): Task | null {
  const cols = listTaskColumns();
  let updated: Task | null = null;
  let matched = false;
  const next = cols.map((col) => ({
    ...col,
    tasks: col.tasks.map((t) => {
      // Only update the first match — IDs must be unique.
      if (matched || t.taskId !== taskId) return t;
      matched = true;
      updated = { ...t, priority };
      return updated;
    }),
  }));
  if (updated) saveTaskColumns(next);
  return updated;
}

/** Move a task into the column matching `status`. */
export function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Task | null {
  const found = findTaskById(taskId);
  if (!found) return null;
  if (found.task.status === status && found.status === status) {
    return found.task;
  }

  const cols = listTaskColumns();
  const targetCol =
    cols.find((c) => c.title === status) ??
    cols.find((c) => c.id === status.toLowerCase().replace(/\s+/g, "-"));

  const updated: Task = {
    ...found.task,
    status,
    completedDate:
      status === "Completed"
        ? new Date().toISOString().slice(0, 10)
        : found.task.completedDate,
    overdue: status === "Completed" ? false : found.task.overdue,
  };

  const without = cols.map((c) => ({
    ...c,
    tasks: c.tasks.filter((t) => t.taskId !== taskId),
    count: c.tasks.filter((t) => t.taskId !== taskId).length,
  }));

  if (targetCol) {
    saveTaskColumns(
      without.map((c) =>
        c.id === targetCol.id
          ? {
              ...c,
              tasks: [updated, ...c.tasks],
              count: c.tasks.length + 1,
            }
          : c,
      ),
    );
  } else {
    // No matching column — update in place
    saveTaskColumns(
      cols.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => (t.taskId === taskId ? updated : t)),
      })),
    );
  }
  return updated;
}

/** Sort rank: Critical → High → Medium → Low (not alphabetical). */
export const PRIORITY_RANK: Record<Priority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

export function compareTaskPriority(a: Priority, b: Priority): number {
  return PRIORITY_RANK[a] - PRIORITY_RANK[b];
}
