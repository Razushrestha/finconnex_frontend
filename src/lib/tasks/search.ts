import { formatRelatedTo } from "@/lib/activities/shared";
import type { Task } from "@/lib/tasks/types";

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
