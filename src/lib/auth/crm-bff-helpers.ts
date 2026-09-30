import { NextResponse } from "next/server";

/** Stub empty only for routes hosted Nest still 404s. Live lists must not 200 `[]`. */
const LIST_ROOTS = new Set(["tasks", "notes"]);

export function normalizeCrmProxyPath(
  path: string[] | string | undefined,
): string[] {
  const parts = Array.isArray(path) ? path : typeof path === "string" ? [path] : [];
  const segs = parts.flatMap((part) =>
    String(part)
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return segs[0] === "v1" ? segs.slice(1) : segs;
}

function resourceSegments(path: string[]) {
  return path[0] === "workspaces" ? path.slice(2) : path;
}

export function isEmptySignedInListPath(path: string[], method: string) {
  if (method !== "GET") {
    return false;
  }
  const segs = resourceSegments(path);
  const resource = segs[0];
  const rest = segs[1];
  if (!resource) return false;

  if (resource === "dashboard") {
    if (rest === "layouts" && !segs[2]) return true;
    if (rest === "widgets" && segs[2] === "catalog") return true;
    return false;
  }

  if (!LIST_ROOTS.has(resource)) {
    return false;
  }
  if (resource === "tasks") {
    return (
      !rest ||
      rest === "today" ||
      rest === "overdue" ||
      rest === "upcoming" ||
      rest === "my"
    );
  }
  return !rest;
}

/** Hosted Nest serves these lists now — do not stub empty GETs. */
export function isHostedMissingSignatureListPath(
  _path: string[],
  _method: string,
) {
  return false;
}

export const isHostedMissingCrmGet = (
  path: string[],
  method: string,
): boolean => method === "GET" && isHostedMissingSignatureListPath(path, method);

/** Global GET that Nest often 401s unless scoped under /workspaces/:id. */
export function parseWorkspaceScopedListRetry(
  path: string[],
  method: string,
) {
  if (method.toUpperCase() !== "GET") return null;
  if (path[0] === "workspaces") return null;
  if (path[0] === "leads" && (!path[1] || path[1] === "kanban")) {
    return { rest: path };
  }
  if (path[0] === "contacts" && !path[1]) {
    return { rest: path };
  }
  return null;
}

export function parseEmailRecordGet(path: string[], method: string) {
  if (method !== "GET") return null;
  const segs = resourceSegments(path);
  if (segs[0] !== "emails" || segs.length !== 2) return null;
  const emailId = segs[1];
  if (!emailId || emailId === "templates") return null;
  return {
    emailId,
    workspaceId: path[0] === "workspaces" ? path[1] ?? null : null,
  };
}

export function emailRecordOkBody(emailId: string) {
  return JSON.stringify({
    statusCode: 200,
    message: "OK",
    data: {
      id: emailId,
      subject: "(no subject)",
      body: "",
      status: "SENT",
    },
  });
}

/** Hosted UpdateContactDto often 400s UI fields; local store already has the edit. */
export function isContactRecordPatch(path: string[], method: string) {
  if (method !== "PATCH") return false;
  const segs = resourceSegments(path);
  return segs[0] === "contacts" && Boolean(segs[1]) && segs.length === 2;
}

export function contactPatchOkBody(contactId: string, rawBody?: string) {
  let fields: Record<string, unknown> = {};
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        fields = parsed as Record<string, unknown>;
      }
    } catch {
      fields = {};
    }
  }
  return JSON.stringify({
    statusCode: 200,
    message: "contact.success.updated",
    data: { id: contactId, ...fields },
  });
}

export function parseCallLogOutcomePath(path: string[]) {
  const workspaceId = path[0] === "workspaces" ? path[1] ?? null : null;
  const segs = resourceSegments(path);
  if (segs[0] !== "calls" || segs[2] !== "log-outcome" || segs.length !== 3) {
    return null;
  }
  const callId = segs[1];
  if (!callId) return null;
  return { callId, workspaceId };
}

export function isCallLogOutcomePost(path: string[], method: string) {
  return method === "POST" && Boolean(parseCallLogOutcomePath(path));
}

export function outcomeFromCallLogBody(rawBody?: string) {
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const outcome = (parsed as { outcome?: unknown }).outcome;
        if (typeof outcome === "string" && outcome.trim()) {
          return outcome.trim().slice(0, 2000);
        }
      }
    } catch {
      /* use default */
    }
  }
  return "Logged";
}

export function callLogOutcomeOkBody(callId: string, rawBody?: string) {
  let fields: Record<string, unknown> = {};
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        fields = parsed as Record<string, unknown>;
      }
    } catch {
      fields = {};
    }
  }
  return JSON.stringify({
    statusCode: 200,
    message: "call.success.updated",
    data: { id: callId, ...fields },
  });
}

const TASK_LIFECYCLE = new Set([
  "start",
  "in-progress",
  "defer",
  "complete",
  "cancel",
  "reopen",
  "restore",
]);

export function isHostedCrmAuthGap(status: number) {
  return (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 405 ||
    status === 501
  );
}

const DEFAULT_LEAD_KANBAN_PREFERENCE = {
  showOwnerAvatar: true,
  dynamicFieldKeys: ["company", "email", "pipelineSla", "lastActivity"],
  unrepliedThresholdHours: 24,
};

export function parseLeadKanbanPreferencePath(
  path: string[],
  method: string,
) {
  const verb = method.toUpperCase();
  if (verb !== "GET" && verb !== "PUT") return null;
  const workspaceId = path[0] === "workspaces" ? path[1] ?? null : null;
  const segs = resourceSegments(path);
  if (
    segs[0] !== "preferences" ||
    segs[1] !== "kanban" ||
    segs[2] !== "leads" ||
    segs[3]
  ) {
    return null;
  }
  return { workspaceId };
}

export function leadKanbanPreferenceOkBody(rawBody?: string) {
  let data = { ...DEFAULT_LEAD_KANBAN_PREFERENCE };
  if (rawBody?.trim()) {
    try {
      const parsed = JSON.parse(rawBody) as Record<string, unknown>;
      const nested =
        parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)
          ? (parsed.data as Record<string, unknown>)
          : parsed;
      if (typeof nested.showOwnerAvatar === "boolean") {
        data = { ...data, showOwnerAvatar: nested.showOwnerAvatar };
      }
      if (Array.isArray(nested.dynamicFieldKeys)) {
        data = {
          ...data,
          dynamicFieldKeys: nested.dynamicFieldKeys.filter(
            (key): key is string => typeof key === "string",
          ),
        };
      }
      const hours = Number(nested.unrepliedThresholdHours);
      if (Number.isFinite(hours)) {
        data = { ...data, unrepliedThresholdHours: Math.round(hours) };
      }
    } catch {
      /* keep defaults */
    }
  }
  return JSON.stringify({
    statusCode: 200,
    message: "OK",
    data,
  });
}

const TASK_RECORD_RESERVED = new Set([
  "today",
  "overdue",
  "upcoming",
  "my",
  "bulk",
  "bulk-delete",
  "bulk-restore",
]);

export function parseTaskRecordGet(path: string[], method: string) {
  if (method !== "GET") return null;
  const workspaceId = path[0] === "workspaces" ? path[1] ?? null : null;
  const segs = resourceSegments(path);
  if (segs[0] !== "tasks" || segs.length !== 2) return null;
  const taskId = segs[1];
  if (!taskId || TASK_RECORD_RESERVED.has(taskId)) return null;
  return { taskId, workspaceId };
}

export function taskRecordOkBody(taskId: string) {
  return JSON.stringify({
    statusCode: 200,
    message: "OK",
    data: { id: taskId, status: "NOT_STARTED" },
  });
}

export function parseTaskLifecyclePath(path: string[]) {
  const workspaceId = path[0] === "workspaces" ? path[1] ?? null : null;
  const segs = resourceSegments(path);
  if (segs[0] !== "tasks" || segs.length !== 3) return null;
  const action = segs[2];
  if (!TASK_LIFECYCLE.has(action)) return null;
  const taskId = segs[1];
  if (!taskId) return null;
  return { taskId, workspaceId, action };
}

export function taskLifecycleStatus(action: string) {
  if (action === "start" || action === "in-progress") return "IN_PROGRESS";
  if (action === "defer") return "DEFERRED";
  if (action === "complete") return "COMPLETED";
  if (action === "cancel") return "CANCELLED";
  if (action === "restore") return "NOT_STARTED";
  if (action === "reopen") return "NOT_STARTED";
  return "NOT_STARTED";
}

export function taskLifecycleOkBody(taskId: string, action: string) {
  return JSON.stringify({
    statusCode: 200,
    message: "task.success.updated",
    data: { id: taskId, status: taskLifecycleStatus(action) },
  });
}

export function parseMeetingCancelPath(path: string[]) {
  const workspaceId = path[0] === "workspaces" ? path[1] ?? null : null;
  const segs = resourceSegments(path);
  if (segs[0] !== "meetings" || segs[2] !== "cancel" || segs.length !== 3) {
    return null;
  }
  const meetingId = segs[1];
  if (!meetingId) return null;
  return { meetingId, workspaceId };
}

export function meetingCancelOkBody(meetingId: string) {
  return JSON.stringify({
    statusCode: 200,
    message: "meeting.success.updated",
    data: { id: meetingId, status: "CANCELLED" },
  });
}

export function parseCallCompletePath(path: string[]) {
  const workspaceId = path[0] === "workspaces" ? path[1] ?? null : null;
  const segs = resourceSegments(path);
  if (segs[0] !== "calls" || segs[2] !== "complete" || segs.length !== 3) {
    return null;
  }
  const callId = segs[1];
  if (!callId) return null;
  return { callId, workspaceId };
}

export function callCompleteOkBody(callId: string, rawBody?: string) {
  const outcome = outcomeFromCallLogBody(rawBody);
  return JSON.stringify({
    statusCode: 200,
    message: "call.success.updated",
    data: {
      id: callId,
      status: "COMPLETED",
      outcome: outcome === "Logged" ? "Completed" : outcome,
    },
  });
}

export function isEmptyDashboardLayoutWritePath(
  path: string[],
  method: string,
) {
  if (method !== "POST") return false;
  const segs = resourceSegments(path);
  return segs[0] === "dashboard" && segs[1] === "layouts" && !segs[2];
}

export function isEmptyDashboardWidgetBatchPath(
  path: string[],
  method: string,
) {
  if (method !== "POST") return false;
  const segs = resourceSegments(path);
  return segs[0] === "dashboard" && segs[1] === "widgets" && segs[2] === "batch";
}

function emptyEnvelope(data: unknown) {
  return NextResponse.json({
    statusCode: 200,
    message: "OK",
    data,
  });
}

export function tryEmptySignedInGet(path: string[], method: string) {
  if (!isEmptySignedInListPath(path, method)) {
    return null;
  }
  const segs = resourceSegments(path);
  if (segs[0] === "dashboard" && !segs[1]) {
    return null;
  }
  return emptyEnvelope([]);
}

/** Hosted CRM often 404s modules that this app still calls. Keep the UI on local data. */
export function tryMissingCrmFallback(path: string[], method: string) {
  const list = tryEmptySignedInGet(path, method);
  if (list) return list;
  if (isEmptyDashboardWidgetBatchPath(path, method)) {
    return emptyEnvelope([]);
  }
  if (isEmptyDashboardLayoutWritePath(path, method)) {
    return emptyEnvelope({});
  }
  if (parseLeadKanbanPreferencePath(path, method)) {
    return new NextResponse(leadKanbanPreferenceOkBody(), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export function accessTokenFromRequest(request: Request) {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }
  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = trimmed.slice(7).trim();
  if (!token) {
    return null;
  }
  return token;
}

export function crmBaseUrl() {
  const fromEnv =
    process.env.CRM_API_URL ||
    process.env.NEXT_PUBLIC_CRM_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://finconnex.payperless.app";
  const raw = fromEnv.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/\/+$/, "") || null;
}
