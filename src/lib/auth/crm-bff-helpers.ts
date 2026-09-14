import { NextResponse } from "next/server";

const LIST_ROOTS = new Set([
  "tasks",
  "deals",
  "companies",
  "contacts",
  "leads",
  "signature-requests",
  "signature-templates",
  "documents",
  "document-requests",
]);

export function isEmptySignedInListPath(path: string[], method: string) {
  if (method !== "GET") {
    return false;
  }
  const segs = path[0] === "workspaces" ? path.slice(2) : path;
  const resource = segs[0];
  const rest = segs[1];
  if (!resource || !LIST_ROOTS.has(resource)) {
    return false;
  }
  if (resource === "tasks") {
    return (
      rest == null ||
      rest === "today" ||
      rest === "overdue" ||
      rest === "upcoming" ||
      rest === "my"
    );
  }
  return rest == null;
}

export function tryEmptySignedInGet(path: string[], method: string) {
  if (!isEmptySignedInListPath(path, method)) {
    return null;
  }
  return NextResponse.json({
    statusCode: 200,
    message: "OK",
    data: [],
  });
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
