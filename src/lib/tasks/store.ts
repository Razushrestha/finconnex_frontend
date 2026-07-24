/** Live task board store — session-backed (production adapter: swap for API). */

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
  key: "activities:tasks:board:v1",
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

export function findTaskById(taskId: string) {
  for (const col of listTaskColumns()) {
    const task = col.tasks.find((t) => t.taskId === taskId);
    if (task) return { task, status: col.title, columnId: col.id };
  }
  return null;
}
