import {
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import { formatRulesAt } from "@/lib/rules/storage";
import { upsertTask, findTaskById } from "@/lib/tasks/store";
import {
  encodeActionItemsInDescription,
  parseActionItemsBlock,
  stripActionItemsBlock,
} from "@/lib/tasks/action-items";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  formatTaskTimestamp,
  formatTaskFileSize,
  type Priority,
  type Task,
  type TaskActionItem,
  type TaskFileAttachment,
  type TaskStatus,
  type TaskType,
} from "@/lib/tasks/types";
import {
  avatarColor,
  initials,
  type RelatedEntityKind,
  type RelatedTo,
} from "@/lib/activities/shared";
import { findCompanyById } from "@/lib/companies/store";
import { findContactById } from "@/lib/contacts/store";
import { findDealById } from "@/lib/deals/store";
import { findLeadById } from "@/lib/leads/store";
import { ownerDisplayName } from "@/lib/users/display-name";

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
    for (const key of [
      "items",
      "tasks",
      "records",
      "rows",
      "result",
      "collaborators",
    ]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    for (const key of ["item", "task", "record"]) {
      const nested = rec[key];
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        return extractRecords([nested]);
      }
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
    const hasId = pickStr(rec.id, rec.uuid, rec.taskId);
    const hasTitle = pickStr(rec.subject, rec.title, rec.name);
    if (
      hasId &&
      (hasTitle || rec.status != null) &&
      !Array.isArray(rec.items) &&
      !Array.isArray(rec.tasks) &&
      !Array.isArray(rec.records)
    ) {
      return [rec];
    }
  }
  return [];
}

export function mapTaskStatus(raw: string): TaskStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("progress")) return "In Progress";
  if (value.includes("wait") || value.includes("defer")) return "Waiting";
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
  if (status === "Waiting" || status === "Review") return "DEFERRED";
  if (status === "Completed") return "COMPLETED";
  if (status === "Cancelled") return "CANCELLED";
  return "NOT_STARTED";
}

export function mapTaskPriority(raw: string): Priority {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("urgent") || value.includes("critical")) return "Critical";
  const hit = TASK_PRIORITIES.find((p) => p.toLowerCase() === value);
  return hit ?? "Medium";
}

function apiTaskPriority(priority: Priority): string {
  if (priority === "Critical") return "URGENT";
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
  if (type === "Team Action") return "OTHER";
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

function memberDisplay(raw: unknown): string {
  if (typeof raw === "string") return ownerDisplayName(raw);
  if (!raw || typeof raw !== "object") return "";
  const rec = raw as Record<string, unknown>;
  const user =
    rec.user && typeof rec.user === "object"
      ? (rec.user as Record<string, unknown>)
      : rec;
  // `rec.userId` and `rec.id` used to be the last two fallbacks here, so a
  // member with neither a name nor an email rendered as a raw UUID.
  // ownerDisplayName rejects ids at every step instead.
  return ownerDisplayName(
    { name: rec.name },
    { name: rec.fullName },
    { name: rec.displayName },
    user,
    { email: rec.email },
  );
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
  const kindMap: Record<string, RelatedEntityKind> = {
    lead: "Lead",
    contact: "Contact",
    company: "Company",
    deal: "Deal",
  };
  const kind =
    kindMap[kindRaw.toLowerCase()] ??
    (pickStr(raw.leadId)
      ? "Lead"
      : pickStr(raw.contactId)
        ? "Contact"
        : pickStr(raw.companyId)
          ? "Company"
          : pickStr(raw.dealId)
            ? "Deal"
            : kindRaw
              ? "Lead"
              : undefined);
  if (!kind && !kindRaw) {
    const idOnly = pickStr(
      raw.leadId,
      raw.contactId,
      raw.companyId,
      raw.dealId,
      nested && nested.id,
      raw.relatedId,
    );
    if (!idOnly) return undefined;
  }
  const resolvedKind = kind ?? "Lead";
  const id = pickStr(
    nested && nested.id,
    raw.relatedId,
    resolvedKind === "Lead" ? raw.leadId : "",
    resolvedKind === "Contact" ? raw.contactId : "",
    resolvedKind === "Company" ? raw.companyId : "",
    resolvedKind === "Deal" ? raw.dealId : "",
  );
  const storedName =
    resolvedKind === "Company"
      ? findCompanyById(id)?.company.name
      : resolvedKind === "Contact"
        ? findContactById(id)?.contact.name
        : resolvedKind === "Deal"
          ? findDealById(id)?.deal.name
          : findLeadById(id)?.card.name;
  const name = pickStr(
    nested && (nested.name ?? nested.title ?? nested.label),
    raw.relatedName,
    typeof raw.relatedTo === "string" ? raw.relatedTo : "",
    storedName,
  );
  if (!name && !id && !kindRaw) return undefined;
  return {
    kind: resolvedKind,
    name: name || resolvedKind,
    id: isUuid(id) ? id : id || undefined,
  };
}

function relatedApiFields(relatedTo?: RelatedTo, relatedId?: string) {
  const id = isUuid(relatedId)
    ? relatedId
    : relatedTo && isUuid(relatedTo.id)
      ? relatedTo.id
      : undefined;
  const kind = relatedTo?.kind?.toUpperCase();
  if (!kind || !id) return {};
  if (kind === "LEAD") return { relatedType: "LEAD", leadId: id };
  if (kind === "CONTACT") return { relatedType: "CONTACT", contactId: id };
  if (kind === "COMPANY") return { relatedType: "COMPANY", companyId: id };
  if (kind === "DEAL") return { relatedType: "DEAL", dealId: id };
  return {};
}

function mapNameList(raw: unknown): string[] {
  return extractRecords(raw)
    .map((row) =>
      pickStr(row.name, row.fullName, row.displayName, row.email, row.userId, row.id),
    )
    .filter(Boolean);
}

function fileNameFromStorageKey(key: string): string {
  const segment = key.split("/").pop()?.split("?")[0] || key;
  const stripped = segment.replace(/^\d+-[a-z0-9]+-/i, "");
  return stripped || segment;
}

export function mapTaskAttachments(raw: unknown): TaskFileAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item, index): TaskFileAttachment[] => {
    if (typeof item === "string" && item.trim()) {
      const key = item.trim();
      return [
        {
          id: key,
          name: fileNameFromStorageKey(key),
          key,
        },
      ];
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const rec = item as Record<string, unknown>;
    const key = pickStr(rec.key, rec.storageKey, rec.objectKey);
    const url = pickStr(rec.url, rec.href, rec.storageUrl);
    const name =
      pickStr(rec.fileName, rec.filename, rec.name, rec.originalName) ||
      fileNameFromStorageKey(key || url);
    if (!name) return [];
    const size =
      typeof rec.size === "number"
        ? rec.size
        : typeof rec.byteSize === "number"
          ? rec.byteSize
          : Number(rec.size) || 0;
    return [
      {
        id: pickStr(rec.id, rec.uuid) || `${key || name}-${index}`,
        name,
        url: url || undefined,
        key: key || undefined,
        sizeLabel: formatTaskFileSize(size) || undefined,
      },
    ];
  });
}

export function normalizeTask(raw: Record<string, unknown>, index: number): Task {
  const assignee =
    raw.assignee && typeof raw.assignee === "object"
      ? (raw.assignee as Record<string, unknown>)
      : null;
  const assignees = extractRecords(raw.assignees);
  const assignedTo =
    memberDisplay(assignees[0]) ||
    pickStr(
      assignee && (assignee.name ?? assignee.email),
      raw.assignedTo,
      raw.assigneeName,
      raw.ownerName,
      memberDisplay(raw.createdBy),
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
  const rawDescription = pickStr(raw.description);
  const encodedItems = parseActionItemsBlock(rawDescription);
  return {
    taskId: pickStr(raw.id, raw.uuid, raw.taskId) || `crm-task-${index}`,
    title: pickStr(raw.title, raw.subject, raw.name, "Untitled task"),
    taskType: mapTaskType(pickStr(raw.type, raw.taskType, "OTHER")),
    priority: mapTaskPriority(pickStr(raw.priority, "MEDIUM")),
    status,
    dueDate: formatDueDisplay(raw.dueAt ?? raw.dueDate ?? raw.dueOn),
    reminderDate: formatDueDisplay(raw.reminderAt ?? raw.reminderDate) || undefined,
    assignedTo,
    relatedTo: mapRelated(raw),
    description: stripActionItemsBlock(rawDescription) || undefined,
    notes: pickStr(raw.notes) || undefined,
    createdBy: pickStr(
      memberDisplay(raw.createdBy),
      raw.createdByName,
      assignedTo,
    ),
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
    actionItems: encodedItems,
    attachments: (() => {
      const files = mapTaskAttachments(raw.attachments);
      return files.length ? files : undefined;
    })(),
    attachmentsCount:
      typeof raw.attachmentsCount === "number"
        ? raw.attachmentsCount
        : Array.isArray(raw.attachments)
          ? raw.attachments.length
          : undefined,
    overdue:
      raw.isOverdue === true ||
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

function compactBody(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

async function tasksPath(suffix: string, query = ""): Promise<string> {
  const scoped = await ensureCrmSession();
  if (scoped) {
    return `${workspaceTasksPath(scoped.workspaceId, suffix)}${query}`;
  }
  return `${globalTasksPath(suffix)}${query}`;
}

async function tasksGet(suffix: string, query = ""): Promise<unknown> {
  if (!isBoundCrmSession()) {
    return crmBffFetch(await tasksPath(suffix, query));
  }
  return withSession((session, scoped) => {
    const path = scoped
      ? workspaceTasksPath((session as CrmSession).workspaceId, suffix)
      : globalTasksPath(suffix);
    return crmFetch(session, `${path}${query}`);
  });
}

async function tasksMutate(suffix: string, init: RequestInit): Promise<unknown> {
  if (!isBoundCrmSession()) {
    return crmBffFetch(await tasksPath(suffix), init);
  }
  return withSession((session, scoped) => {
    const path = scoped
      ? workspaceTasksPath((session as CrmSession).workspaceId, suffix)
      : globalTasksPath(suffix);
    return crmFetch(session, path, init);
  });
}

function asTask(data: unknown): Task | null {
  const items = normalizeTasks(data);
  if (items[0] && isPersistedTask(items[0])) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const rec = data as Record<string, unknown>;
    if (!pickStr(rec.id, rec.uuid, rec.taskId, rec.title, rec.subject, rec.name)) {
      return null;
    }
    const mapped = normalizeTask(rec, 0);
    return isPersistedTask(mapped) ? mapped : null;
  }
  return null;
}

function isPersistedTask(task: Task) {
  return Boolean(task.title.trim() && task.title !== "Untitled task" && isUuid(task.taskId));
}

export async function listCrmTasks(query: CrmTaskQuery = {}): Promise<Task[]> {
  const limit = Math.min(100, Math.max(1, query.limit ?? 100));
  const relatedType = query.relatedType
    ? query.relatedType.toUpperCase()
    : undefined;
  const startPage = query.page != null ? Math.max(1, query.page) : 1;
  const maxPages = query.page != null ? 1 : 20;
  const all: Task[] = [];
  for (let i = 0; i < maxPages; i += 1) {
    const page = startPage + i;
    const batch = normalizeTasks(
      await tasksGet(
        "",
        toQuery({
          page,
          limit,
          search: query.search,
          status: query.status,
          relatedType,
          relatedId: query.relatedId,
        }),
      ),
    );
    all.push(...batch);
    if (batch.length < limit) break;
  }
  return all;
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
  relatedId?: string;
  description?: string;
  notes?: string;
  collaborators?: string[];
  reminderDate?: string;
  startDate?: string;
  attachmentKeys?: string[];
  actionItems?: TaskActionItem[];
  repeatEvery?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
};

export function toCreateTaskBody(input: CreateCrmTaskInput): Record<string, unknown> {
  const dueDate = toTaskIso(input.dueDate) || new Date().toISOString();
  const startDate = toTaskIso(input.startDate ?? "") || dueDate;
  const owners = isUuid(input.assignedTo) ? [input.assignedTo] : [];
  const collaboratorIds = (input.collaborators ?? []).filter(
    (id) => isUuid(id) && id !== input.assignedTo,
  );
  return compactBody({
    subject: input.title.trim(),
    taskType: apiTaskType(input.taskType),
    priority: apiTaskPriority(input.priority),
    startDate,
    dueDate,
    reminderAt: input.reminderDate
      ? toTaskIso(input.reminderDate) || undefined
      : undefined,
    description:
      encodeActionItemsInDescription(
        input.description?.trim() || input.notes?.trim() || "",
        input.actionItems,
      ) || undefined,
    assigneeIds: owners,
    collaboratorIds,
    attachmentKeys: input.attachmentKeys,
    repeatEvery: input.repeatEvery,
    recurrenceTimezone: input.repeatEvery
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined,
    recurrenceLimit: input.repeatEvery ? 12 : undefined,
    ...relatedApiFields(input.relatedTo, input.relatedId),
  });
}

export async function createCrmTask(
  input: CreateCrmTaskInput,
): Promise<Task | null> {
  const { resolveCrmAssigneeUserId } = await import("@/lib/users/assignable");
  const assigneeId = await resolveCrmAssigneeUserId(input.assignedTo);
  if (!assigneeId) {
    throw new Error(
      "Could not find a workspace member to assign. Sign in and pick a Task Owner.",
    );
  }
  const created = asTask(
    await tasksMutate("", {
      method: "POST",
      body: JSON.stringify(
        toCreateTaskBody({ ...input, assignedTo: assigneeId }),
      ),
    }),
  );
  if (
    created &&
    input.attachmentKeys?.length &&
    !created.attachments?.length
  ) {
    const linked = await linkCrmTaskAttachments(
      created.taskId,
      input.attachmentKeys,
    );
    return linked ?? created;
  }
  return created;
}

export async function linkCrmTaskAttachments(
  taskId: string,
  keys: string[],
): Promise<Task | null> {
  if (!isUuid(taskId) || !keys.length) return null;
  let latest: Task | null = null;
  for (const key of keys) {
    latest = await addCrmTaskAttachment(taskId, { key });
  }
  return latest;
}

export async function updateCrmTask(
  id: string,
  patch: Partial<Task> & { relatedId?: string; attachmentKeys?: string[] },
): Promise<Task | null> {
  const body: Record<string, unknown> = {};
  if (patch.title) body.subject = patch.title;
  if (patch.taskType) body.taskType = apiTaskType(patch.taskType);
  if (patch.priority) body.priority = apiTaskPriority(patch.priority);
  if (patch.dueDate) {
    const dueDate = toTaskIso(patch.dueDate);
    body.dueDate = dueDate;
  }
  if (patch.reminderDate) {
    body.reminderAt = toTaskIso(patch.reminderDate);
  }
  if (patch.assignedTo && isUuid(patch.assignedTo)) {
    body.assigneeIds = [patch.assignedTo];
  }
  if (patch.description != null || patch.actionItems) {
    const current = findTaskById(id)?.task;
    body.description =
      encodeActionItemsInDescription(
        patch.description ?? current?.description ?? "",
        patch.actionItems ?? current?.actionItems,
      ) ?? "";
  }
  if (patch.relatedTo || patch.relatedId) {
    Object.assign(body, relatedApiFields(patch.relatedTo, patch.relatedId));
  }
  if (patch.attachmentKeys) body.attachmentKeys = patch.attachmentKeys;
  if (patch.collaborators?.length) {
    const ids = patch.collaborators.filter((item) => isUuid(item));
    if (ids.length) body.collaboratorIds = ids;
  }
  return asTask(
    await tasksMutate(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(compactBody(body)),
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
  const mapped =
    operation === "complete"
      ? "MARK_COMPLETE"
      : operation === "reassign"
        ? "REASSIGN"
        : "SOFT_DELETE";
  return tasksMutate("/bulk", {
    method: "POST",
    body: JSON.stringify(
      compactBody({
        ids,
        operation: mapped,
        assigneeId:
          typeof extra.assigneeId === "string" ? extra.assigneeId : undefined,
      }),
    ),
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
      body: JSON.stringify({ userIds }),
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
      body: JSON.stringify({ userIds }),
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
      body: JSON.stringify({ userIds }),
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
      body: JSON.stringify({ name: tag.name }),
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
        key: attachment.key,
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
  const current = await tryCrmTask(() => getCrmTask(id));
  if (
    current &&
    (current.status === "Completed" || current.status === "Cancelled") &&
    (status === "Not Started" ||
      status === "In Progress" ||
      status === "Waiting" ||
      status === "Review")
  ) {
    return reopenCrmTask(id);
  }
  return current;
}

export async function tryCrmTask<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteTask(row: Task | null) {
  if (!row) return row;
  return upsertTask(row);
}

export function isCrmTaskId(id: string): boolean {
  return isUuid(id);
}
