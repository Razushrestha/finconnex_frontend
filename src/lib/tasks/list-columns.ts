import type { ManageColumn } from "@/components/work-queue/ManageColumnsModal";

const STORAGE_KEY = "finconnex.tasks.list-columns.v1";

/** Full Task list column catalog for Manage Columns. */
export const DEFAULT_TASK_LIST_COLUMNS: ManageColumn[] = [
  { id: "title", label: "Task Name", checked: true, required: true },
  { id: "taskId", label: "Task ID", checked: true },
  { id: "taskType", label: "Type", checked: true },
  { id: "priority", label: "Priority", checked: true },
  { id: "relatedTo", label: "Related To", checked: true },
  { id: "dueDate", label: "Due Date", checked: true },
  { id: "status", label: "Status", checked: true, required: true },
  { id: "assignedTo", label: "Assigned To", checked: true, required: true },
  { id: "createdBy", label: "Created By", checked: false },
  { id: "createdOn", label: "Created On", checked: false },
  { id: "modifiedBy", label: "Modified By", checked: false },
  { id: "modifiedOn", label: "Modified On", checked: false },
  { id: "reminderDate", label: "Reminder Date", checked: false },
  { id: "completedDate", label: "Completed Date", checked: false },
  { id: "collaborators", label: "Collaborators", checked: false },
  { id: "commentsCount", label: "Comments", checked: false },
  { id: "attachmentsCount", label: "Attachments", checked: false },
  { id: "description", label: "Description", checked: false },
  { id: "notes", label: "Notes", checked: false },
  { id: "overdue", label: "Overdue", checked: false },
];

const SORTABLE_COLUMN_IDS = new Set([
  "title",
  "taskId",
  "taskType",
  "priority",
  "dueDate",
  "status",
  "assignedTo",
  "createdBy",
  "createdOn",
  "modifiedBy",
  "modifiedOn",
  "reminderDate",
  "completedDate",
  "commentsCount",
  "attachmentsCount",
  "overdue",
]);

export function isTaskColumnSortable(id: string): boolean {
  return SORTABLE_COLUMN_IDS.has(id);
}

/** Merge saved prefs with current defaults (adds new columns, keeps order/checks). */
export function mergeTaskListColumns(
  saved: ManageColumn[] | null | undefined,
): ManageColumn[] {
  if (!saved?.length) {
    return DEFAULT_TASK_LIST_COLUMNS.map((c) => ({ ...c }));
  }

  const defaultById = new Map(
    DEFAULT_TASK_LIST_COLUMNS.map((c) => [c.id, c] as const),
  );
  const used = new Set<string>();
  const merged: ManageColumn[] = [];

  for (const col of saved) {
    const def = defaultById.get(col.id);
    if (!def) continue;
    used.add(col.id);
    merged.push({
      ...def,
      checked: def.required ? true : Boolean(col.checked),
      pinned: col.pinned,
    });
  }

  for (const def of DEFAULT_TASK_LIST_COLUMNS) {
    if (!used.has(def.id)) merged.push({ ...def });
  }

  // Pinned columns float to the front (after required ones stay with their checks).
  const pinned = merged.filter((c) => c.pinned);
  const unpinned = merged.filter((c) => !c.pinned);
  return [...pinned, ...unpinned];
}

export function loadTaskListColumns(): ManageColumn[] {
  if (typeof window === "undefined") {
    return DEFAULT_TASK_LIST_COLUMNS.map((c) => ({ ...c }));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TASK_LIST_COLUMNS.map((c) => ({ ...c }));
    const parsed = JSON.parse(raw) as ManageColumn[];
    return mergeTaskListColumns(parsed);
  } catch {
    return DEFAULT_TASK_LIST_COLUMNS.map((c) => ({ ...c }));
  }
}

export function saveTaskListColumns(columns: ManageColumn[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(mergeTaskListColumns(columns)),
    );
  } catch {
    /* ignore quota */
  }
}

export function visibleTaskColumnIds(columns: ManageColumn[]): string[] {
  return columns.filter((c) => c.checked).map((c) => c.id);
}
