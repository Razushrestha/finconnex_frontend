import {
  ensureCrmAccess,
  ensureCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import { formatRulesAt } from "@/lib/rules/storage";
import { upsertTask } from "@/lib/tasks/store";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  formatTaskTimestamp,
  type Priority,
  type Task,
  type TaskStatus,
  type TaskType,
} from "@/lib/tasks/types";
import {
  avatarColor,
  initials,
  type RelatedEntityKind,
  type RelatedTo,
} from "@/lib/activities/shared";

export type CrmTaskQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  relatedType?: string;
  relatedId?: string;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function workspaceTasksPath(workspaceId: string, suffix = ""): string {
  return `/v1/workspaces/${workspaceId}/tasks${suffix}`;
}

export function globalTasksPath(suffix = ""): string {
  return `/v1/tasks${suffix}`;
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return (data[0] as unknown[]).filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row),
      );
    }
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of ["items", "tasks", "records", "rows", "result", "collaborators"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

export function mapTaskStatus(raw: string): TaskStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("progress")) return "In Progress";
  if (value.includes("wait")) return "Waiting";
  if (value.includes("review")) return "Review";
  if (value.includes("complete") || value.includes("done") || value.includes("closed")) {
    return "Completed";
  }
  if (value.includes("cancel")) return "Cancelled";
  const hit = TASK_STATUSES.find((status) => status.toLowerCase() === value);
  return hit ?? "Not Started";
}

function apiTaskStatus(status: TaskStatus): string {
  if (status === "In Progress") return "IN_PROGRESS";
  if (status === "Waiting") return "WAITING";
  if (status === "Review") return "REVIEW";
  if (status === "Completed") return "COMPLETED";
  if (status === "Cancelled") return "CANCELLED";
  return "NOT_STARTED";
}

export function mapTaskPriority(raw: string): Priority {
  const value = raw.toLowerCase();
  const hit = TASK_PRIORITIES.find((p) => p.toLowerCase() === value);
  return hit ?? "Medium";
}

function apiTaskPriority(priority: Priority): string {
  return priority.toUpperCase();
}

export function mapTaskType(raw: string): TaskType {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("team")) return "Team Action";
  if (value.includes("follow")) return "Follow-up";
  const hit = TASK_TYPES.find((type) => type.toLowerCase() === value);
  return hit ?? "Other";
}

function apiTaskType(type: TaskType): string {
  if (type === "Team Action") return "TEAM_ACTION";
  if (type === "Follow-up") return "FOLLOW_UP";
  return type.toUpperCase().replace(/[\s-]+/g, "_");
}

function formatDueDisplay(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return "";
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) return value.slice(0, 10);
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  const d = new Date(parsed);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export function toTaskIso(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString();
  }
  const au = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/);
  if (au) {
    const d = new Date(
      Number(au[3]),
      Number(au[2]) - 1,
      Number(au[1]),
      au[4] ? Number(au[4]) : 9,
      au[5] ? Number(au[5]) : 0,
    );
    return d.toISOString();
  }
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return value;
}

function mapRelated(raw: Record<string, unknown>): RelatedTo | undefined {
  const nested =
    raw.relatedTo && typeof raw.relatedTo === "object"
      ? (raw.relatedTo as Record<string, unknown>)
      : null;
  const kindRaw = pickStr(
    nested && (nested.kind ?? nested.type ?? nested.relatedType),
    raw.relatedType,
    raw.parentType,
  );
  const name = pickStr(
    nested && (nested.name ?? nested.title ?? nested.label),
    raw.relatedName,
    typeof raw.relatedTo === "string" ? raw.relatedTo : "",
  );
  if (!name && !kindRaw) return undefined;
  const kindMap: Record<string, RelatedEntityKind> = {
    lead: "Lead",
    contact: "Contact",
    company: "Company",
    deal: "Deal",
  };
  const kind = kindMap[kindRaw.toLowerCase()] ?? "Lead";
  return { kind, name: name || kind };
}

function mapNameList(raw: unknown): string[] {
  return extractRecords(raw)
    .map((row) =>
      pickStr(row.name, row.fullName, row.displayName, row.email, row.userId, row.id),
    )
    .filter(Boolean);
}

export function normalizeTask(raw: Record<string, unknown>, index: number): Task {
  const assignee =
    raw.assignee && typeof raw.assignee === "object"
      ? (raw.assignee as Record<string, unknown>)
      : null;
  const assignedTo = pickStr(
    assignee && (assignee.name ?? assignee.email),
    raw.assignedTo,
    raw.assigneeName,
    raw.ownerName,
    "Unassigned",
  );
  const status = mapTaskStatus(pickStr(raw.status, raw.state, "NOT_STARTED"));
  const createdOn = pickStr(raw.createdAt, raw.createdOn)
    ? formatRulesAt(new Date(pickStr(raw.createdAt, raw.createdOn)))
    : formatTaskTimestamp();
  const modifiedOn = pickStr(raw.updatedAt, raw.modifiedOn, raw.modifiedAt)
    ? formatRulesAt(new Date(pickStr(raw.updatedAt, raw.modifiedOn, raw.modifiedAt)))
    : createdOn;
  const collaborators = mapNameList(raw.collaborators ?? raw.followers);
  return {
    taskId: pickStr(raw.id, raw.uuid, raw.taskId) || `crm-task-${index}`,
    title: pickStr(raw.title, raw.subject, raw.name, "Untitled task"),
    taskType: mapTaskType(pickStr(raw.type, raw.taskType, "OTHER")),
    priority: mapTaskPriority(pickStr(raw.priority, "MEDIUM")),
    status,
    dueDate: formatDueDisplay(raw.dueAt ?? raw.dueDate ?? raw.dueOn),
    assignedTo,
    relatedTo: mapRelated(raw),
    description: pickStr(raw.description) || undefined,
    notes: pickStr(raw.notes) || undefined,
    createdBy: pickStr(raw.createdByName, raw.createdBy, assignedTo),
    createdOn,
    modifiedBy: pickStr(raw.updatedByName, raw.modifiedBy, assignedTo),
    modifiedOn,
    completedBy:
      status === "Completed"
        ? pickStr(raw.completedByName, raw.completedBy, assignedTo)
        : undefined,
    completedDate:
      status === "Completed"
        ? formatDueDisplay(raw.completedAt ?? raw.completedDate) || modifiedOn
        : undefined,
    collaborators: collaborators.length ? collaborators : undefined,
    attachmentsCount:
      typeof raw.attachmentsCount === "number" ? raw.attachmentsCount : undefined,
    overdue:
      raw.overdue === true ||
      pickStr(raw.state, raw.bucket).toLowerCase().includes("overdue"),
    assignee: {
      initials: initials(assignedTo),
      colorClass: avatarColor(assignedTo),
    },
  };
}

export function normalizeTasks(data: unknown): Task[] {
  return extractRecords(data).map((row, index) => normalizeTask(row, index));
}

async function withSession<T>(
  run: (
    session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">,
    scoped: boolean,
  ) => Promise<T>,
): Promise<T> {
  const scoped = await ensureCrmSession();
  if (scoped) return run(scoped, true);
  const access = await ensureCrmAccess();
  if (!access) throw new Error("Sign in to manage tasks");
  return run(access, false);
}

async function tasksGet(suffix: string, query = ""): Promise<unknown> {
  return withSession((session, scoped) => {
    const path = scoped
      ? workspaceTasksPath((session as CrmSession).workspaceId, suffix)
      : globalTasksPath(suffix);
    return crmFetch(session, `${path}${query}`);
  });
}

async function tasksMutate(suffix: string, init: RequestInit): Promise<unknown> {
  return withSession((session, scoped) => {
    const path = scoped
      ? workspaceTasksPath((session as CrmSession).workspaceId, suffix)
      : globalTasksPath(suffix);
    return crmFetch(session, path, init);
  });
}

function asTask(data: unknown): Task | null {
  const items = normalizeTasks(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeTask(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmTasks(query: CrmTaskQuery = {}): Promise<Task[]> {
  return normalizeTasks(
    await tasksGet(
      "",
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
        status: query.status,
        relatedType: query.relatedType,
        relatedId: query.relatedId,
      }),
    ),
  );
}

export async function listCrmTasksToday(): Promise<Task[]> {
  return normalizeTasks(await tasksGet("/today"));
}

export async function listUpcomingCrmTasks(): Promise<Task[]> {
  return normalizeTasks(await tasksGet("/upcoming"));
}

export async function listOverdueCrmTasks(): Promise<Task[]> {
  return normalizeTasks(await tasksGet("/overdue"));
}

export async function listMyCrmTasks(): Promise<Task[]> {
  return normalizeTasks(await tasksGet("/my"));
}

export async function getCrmTask(id: string): Promise<Task | null> {
  return asTask(await tasksGet(`/${id}`));
}

export async function listCrmTaskCollaborators(id: string): Promise<string[]> {
  return mapNameList(await tasksGet(`/${id}/collaborators`));
}

export type CreateCrmTaskInput = {
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
};

export function toCreateTaskBody(input: CreateCrmTaskInput): Record<string, unknown> {
  const dueAt = toTaskIso(input.dueDate);
  return {
    title: input.title,
    subject: input.title,
    type: apiTaskType(input.taskType),
    taskType: apiTaskType(input.taskType),
    priority: apiTaskPriority(input.priority),
    status: apiTaskStatus(input.status),
    dueAt,
    dueDate: dueAt,
    assignedTo: input.assignedTo,
    assigneeName: input.assignedTo,
    relatedType: input.relatedTo?.kind?.toUpperCase(),
    relatedName: input.relatedTo?.name,
    relatedTo: input.relatedTo,
    description: input.description,
    notes: input.notes,
    collaborators: input.collaborators,
  };
}

export async function createCrmTask(
  input: CreateCrmTaskInput,
): Promise<Task | null> {
  return asTask(
    await tasksMutate("", {
      method: "POST",
      body: JSON.stringify(toCreateTaskBody(input)),
    }),
  );
}

export async function updateCrmTask(
  id: string,
  patch: Partial<Task>,
): Promise<Task | null> {
  const body: Record<string, unknown> = {};
  if (patch.title) body.title = patch.title;
  if (patch.taskType) body.type = apiTaskType(patch.taskType);
  if (patch.priority) body.priority = apiTaskPriority(patch.priority);
  if (patch.status) body.status = apiTaskStatus(patch.status);
  if (patch.dueDate) {
    const dueAt = toTaskIso(patch.dueDate);
    body.dueAt = dueAt;
    body.dueDate = dueAt;
  }
  if (patch.assignedTo) {
    body.assignedTo = patch.assignedTo;
    body.assigneeName = patch.assignedTo;
  }
  if (patch.description != null) body.description = patch.description;
  if (patch.notes != null) body.notes = patch.notes;
  if (patch.relatedTo) {
    body.relatedType = patch.relatedTo.kind.toUpperCase();
    body.relatedName = patch.relatedTo.name;
  }
  return asTask(
    await tasksMutate(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteCrmTask(id: string): Promise<void> {
  await tasksMutate(`/${id}`, { method: "DELETE" });
}

export async function completeCrmTask(id: string): Promise<Task | null> {
  return asTask(await tasksMutate(`/${id}/complete`, { method: "POST", body: "{}" }));
}

export async function reopenCrmTask(id: string): Promise<Task | null> {
  return asTask(await tasksMutate(`/${id}/reopen`, { method: "POST", body: "{}" }));
}

export async function cancelCrmTask(id: string): Promise<Task | null> {
  return asTask(await tasksMutate(`/${id}/cancel`, { method: "POST", body: "{}" }));
}

export async function restoreCrmTask(id: string): Promise<Task | null> {
  return asTask(await tasksMutate(`/${id}/restore`, { method: "POST", body: "{}" }));
}

export async function duplicateCrmTask(id: string): Promise<Task | null> {
  return asTask(await tasksMutate(`/${id}/duplicate`, { method: "POST", body: "{}" }));
}

export async function bulkCrmTasks(
  ids: string[],
  operation: "complete" | "reassign" | "delete",
  extra: Record<string, unknown> = {},
): Promise<unknown> {
  return tasksMutate("/bulk", {
    method: "POST",
    body: JSON.stringify({
      ids,
      taskIds: ids,
      operation,
      action: operation,
      ...extra,
    }),
  });
}

export async function bulkDeleteCrmTasks(ids: string[]): Promise<unknown> {
  return tasksMutate("/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids, taskIds: ids }),
  });
}

export async function bulkRestoreCrmTasks(ids: string[]): Promise<unknown> {
  return tasksMutate("/bulk-restore", {
    method: "POST",
    body: JSON.stringify({ ids, taskIds: ids }),
  });
}

export async function addCrmTaskAssignee(id: string, userId: string): Promise<Task | null> {
  return asTask(
    await tasksMutate(`/${id}/assignees/${userId}`, { method: "POST", body: "{}" }),
  );
}

export async function removeCrmTaskAssignee(
  id: string,
  userId: string,
): Promise<Task | null> {
  return asTask(await tasksMutate(`/${id}/assignees/${userId}`, { method: "DELETE" }));
}

export async function replaceCrmTaskAssignees(
  id: string,
  userIds: string[],
): Promise<Task | null> {
  return asTask(
    await tasksMutate(`/${id}/assignees`, {
      method: "PUT",
      body: JSON.stringify({ userIds, assigneeIds: userIds }),
    }),
  );
}

export async function addCrmTaskCollaborator(
  id: string,
  userId: string,
): Promise<Task | null> {
  return asTask(
    await tasksMutate(`/${id}/collaborators/${userId}`, { method: "POST", body: "{}" }),
  );
}

export async function removeCrmTaskCollaborator(
  id: string,
  userId: string,
): Promise<Task | null> {
  return asTask(
    await tasksMutate(`/${id}/collaborators/${userId}`, { method: "DELETE" }),
  );
}

export async function replaceCrmTaskCollaborators(
  id: string,
  userIds: string[],
): Promise<Task | null> {
  return asTask(
    await tasksMutate(`/${id}/collaborators`, {
      method: "PUT",
      body: JSON.stringify({ userIds, collaboratorIds: userIds }),
    }),
  );
}

export async function replaceCrmTaskFollowers(
  id: string,
  userIds: string[],
): Promise<Task | null> {
  return asTask(
    await tasksMutate(`/${id}/followers`, {
      method: "PUT",
      body: JSON.stringify({ userIds, followerIds: userIds }),
    }),
  );
}

export async function addCrmTaskTag(
  id: string,
  tag: { name?: string; tagId?: string },
): Promise<Task | null> {
  return asTask(
    await tasksMutate(`/${id}/tags`, {
      method: "POST",
      body: JSON.stringify({ name: tag.name, tagId: tag.tagId, tag: tag.name }),
    }),
  );
}

export async function removeCrmTaskTag(id: string, tagId: string): Promise<Task | null> {
  return asTask(await tasksMutate(`/${id}/tags/${tagId}`, { method: "DELETE" }));
}

export async function addCrmTaskAttachment(
  id: string,
  attachment: { key?: string; url?: string; fileName?: string },
): Promise<Task | null> {
  return asTask(
    await tasksMutate(`/${id}/attachments`, {
      method: "POST",
      body: JSON.stringify({
        fileKey: attachment.key,
        storageKey: attachment.key,
        key: attachment.key,
        url: attachment.url,
        fileName: attachment.fileName,
      }),
    }),
  );
}

export async function removeCrmTaskAttachment(
  id: string,
  attachmentId: string,
): Promise<Task | null> {
  return asTask(
    await tasksMutate(`/${id}/attachments/${attachmentId}`, { method: "DELETE" }),
  );
}

export async function syncTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<Task | null> {
  if (status === "Completed") return completeCrmTask(id);
  if (status === "Cancelled") return cancelCrmTask(id);
  if (status === "Not Started" || status === "In Progress") {
    const current = await tryCrmTask(() => getCrmTask(id));
    if (current?.status === "Completed" || current?.status === "Cancelled") {
      const reopened = await reopenCrmTask(id);
      if (status === "Not Started") return reopened;
    }
  }
  return updateCrmTask(id, { status });
}

export async function tryCrmTask<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteTask(row: Task | null) {
  if (row) upsertTask(row);
  return row;
}

export function isCrmTaskId(id: string): boolean {
  return isUuid(id);
}
