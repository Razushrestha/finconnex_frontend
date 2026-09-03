import { isAssignedToCurrentUser } from "@/lib/activities/assigned-to-me";
import { formatRelatedTo } from "@/lib/activities/shared";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import { taskMatchesDeepFilters } from "@/lib/filters/records";
import type { Task, TaskFilters } from "@/lib/tasks/types";

function isTaskOverdueNow(task: Task) {
  if (task.status === "Completed" || task.status === "Cancelled") return false;
  if (task.overdue) return true;
  const due = parseTaskDueDate(task.dueDate);
  return due != null && due.getTime() < Date.now();
}

export function taskMatchesSearch(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    task.title.toLowerCase().includes(q) ||
    task.taskId.toLowerCase().includes(q) ||
    task.assignedTo.toLowerCase().includes(q) ||
    task.taskType.toLowerCase().includes(q) ||
    task.status.toLowerCase().includes(q) ||
    formatRelatedTo(task.relatedTo).toLowerCase().includes(q) ||
    (task.createdBy?.toLowerCase().includes(q) ?? false) ||
    (task.description?.toLowerCase().includes(q) ?? false)
  );
}

export function taskMatchesFilters(task: Task, filters?: TaskFilters) {
  if (!filters) return true;
  if (filters.statuses.length && !filters.statuses.includes(task.status)) {
    return false;
  }
  if (filters.priorities.length && !filters.priorities.includes(task.priority)) {
    return false;
  }
  if (filters.types.length && !filters.types.includes(task.taskType)) {
    return false;
  }
  const scope = filters.scope ?? "all";
  if (scope === "mine" || scope === "my-overdue") {
    if (!isAssignedToCurrentUser(task.assignedTo)) return false;
  }
  if (scope === "my-overdue" && !isTaskOverdueNow(task)) return false;
  return taskMatchesDeepFilters(task, filters);
}
