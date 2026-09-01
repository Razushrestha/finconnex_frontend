import { getCrmApiBaseUrl } from "@/lib/activity-timeline/auth";
import { crmErrorMessage, unwrapCrmData } from "@/lib/crm/request";

export function workspaceInvitationAcceptPath(): string {
  return "/v1/workspaces/invitations/accept";
}

export type WorkspaceInvitationAcceptResult = {
  workspaceId?: string;
  workspaceName?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id?: string;
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
    userName?: string;
    globalRole?: string;
  };
};

function crmBase(): string {
  return (
    getCrmApiBaseUrl() ||
    process.env.NEXT_PUBLIC_CRM_API_URL?.trim() ||
    "https://finconnex.payperless.app"
  ).replace(/\/$/, "");
}

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  if (rec.data && rec.data !== raw && typeof rec.data === "object" && !Array.isArray(rec.data)) {
    return rec.data as Record<string, unknown>;
  }
  return rec;
}

export function normalizeInvitationAccept(
  raw: unknown,
): WorkspaceInvitationAcceptResult {
  const rec = asRecord(raw) ?? {};
  const workspace =
    rec.workspace && typeof rec.workspace === "object"
      ? (rec.workspace as Record<string, unknown>)
      : null;
  const user =
    rec.user && typeof rec.user === "object"
      ? (rec.user as Record<string, unknown>)
      : null;
  return {
    workspaceId: pickStr(rec.workspaceId, workspace && workspace.id) || undefined,
    workspaceName:
      pickStr(rec.workspaceName, workspace && workspace.name) || undefined,
    accessToken: pickStr(rec.accessToken) || undefined,
    refreshToken: pickStr(rec.refreshToken) || undefined,
    user: user
      ? {
          id: pickStr(user.id) || undefined,
          email: pickStr(user.email) || undefined,
          firstName: pickStr(user.firstName) || null,
          lastName: pickStr(user.lastName) || null,
          userName: pickStr(user.userName) || undefined,
          globalRole: pickStr(user.globalRole) || undefined,
        }
      : undefined,
  };
}

export async function acceptWorkspaceInvitation(
  token: string,
): Promise<WorkspaceInvitationAcceptResult> {
  const res = await fetch(`${crmBase()}${workspaceInvitationAcceptPath()}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    throw new Error(
      crmErrorMessage(json, `Invitation could not be accepted (${res.status})`),
    );
  }
  return normalizeInvitationAccept(unwrapCrmData(json) ?? json);
}
