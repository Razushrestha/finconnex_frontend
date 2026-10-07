import "server-only";

import { crmBaseUrl, resolveLiveCrmAuth } from "@/lib/auth/crm-server";
import { dateInTimezone } from "@/lib/booking/timezones";
import {
  isAppointmentMeetingId,
  matchAppointmentMeetingId,
  type AppointmentManageRecord,
} from "@/lib/meetings/appointment-manage";
import { saveAppointmentManage } from "@/lib/meetings/appointment-manage-store";

function workspaceIdFromAccessToken(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      workspaceId?: unknown;
    };
    return typeof json.workspaceId === "string" && json.workspaceId ? json.workspaceId : null;
  } catch {
    return null;
  }
}

type CrmAuth = { accessToken: string };

async function crmCall(
  auth: CrmAuth,
  path: string,
  init?: RequestInit,
) {
  const base = crmBaseUrl();
  if (!base) return null;
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
}

function meetingList(payload: unknown) {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const data = root.data ?? root.items ?? root.meetings ?? payload;
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)
      ? (data as { items: unknown[] }).items
      : [];
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map((row) => ({
      id: typeof row.id === "string" ? row.id : "",
      title: typeof row.title === "string" ? row.title : typeof row.name === "string" ? row.name : "",
    }));
}

async function resolveMeetingId(record: AppointmentManageRecord, auth: CrmAuth, workspaceId: string) {
  if (isAppointmentMeetingId(record.meetingId)) return record.meetingId;
  const res = await crmCall(
    auth,
    `/v1/workspaces/${workspaceId}/meetings?page=1&limit=100`,
  );
  if (!res?.ok) return undefined;
  const id = matchAppointmentMeetingId(record, meetingList(await res.json().catch(() => null)));
  if (!id) return undefined;
  await saveAppointmentManage({ ...record, meetingId: id });
  return id;
}

const loggedSyncFailures = new Set<string>();

/** Writes the guest's new date and time onto the CRM meeting the appointment summary reads. */
export async function syncAppointmentToCrm(
  record: AppointmentManageRecord,
  action: "reschedule" | "cancel",
): Promise<boolean> {
  const auth = await resolveLiveCrmAuth().catch(() => null);
  const workspaceId = auth?.accessToken
    ? workspaceIdFromAccessToken(auth.accessToken)
    : null;
  if (!auth?.accessToken || !workspaceId) return false;

  const meetingId = await resolveMeetingId(record, auth, workspaceId);
  if (!meetingId) return false;

  const start = dateInTimezone(record.dateIso, record.startHHmm, record.timeZone);
  const end = new Date(start.getTime() + record.durationMinutes * 60 * 1000);
  const path = `/v1/workspaces/${workspaceId}/meetings/${meetingId}/${action === "cancel" ? "cancel" : "reschedule"}`;
  const bodies =
    action === "cancel"
      ? ["{}", record.remarks?.trim() ? JSON.stringify({ reason: record.remarks.trim() }) : ""]
      : [JSON.stringify({ startAt: start.toISOString(), endAt: end.toISOString() })];
  let res: Response | null = null;
  let detail = "";
  for (const body of bodies) {
    if (!body) continue;
    res = await crmCall(auth, path, { method: "POST", body });
    if (!res) return false;
    if (res.ok) return true;
    detail = (await res.text().catch(() => "")).slice(0, 180);
    if (
      action === "cancel" &&
      (res.status === 404 ||
        res.status === 409 ||
        /already|invalid transition|cancelled/i.test(detail))
    ) {
      return true;
    }
    if (res.status !== 400) break;
  }
  if (
    action === "cancel" &&
    res &&
    (res.status === 404 ||
      res.status === 409 ||
      /already|invalid transition|cancelled/i.test(detail))
  ) {
    return true;
  }
  const key = `${action}:${meetingId}:${res?.status ?? "none"}`;
  if (!loggedSyncFailures.has(key)) {
    loggedSyncFailures.add(key);
    console.error(
      `[appointment] CRM ${action} failed (${res?.status ?? "no-response"}) for meeting ${meetingId}.${detail ? ` ${detail}` : ""}`,
    );
  }
  return false;
}
