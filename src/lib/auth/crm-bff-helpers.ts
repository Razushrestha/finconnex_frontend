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
  "members",
]);

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

/** Hosted CRM 404s these modules; keep the UI on local drafts. */
export function isHostedMissingSignatureListPath(
  path: string[],
  method: string,
) {
  if (!isEmptySignedInListPath(path, method)) return false;
  const resource = resourceSegments(path)[0];
  return resource === "signature-requests" || resource === "signature-templates";
}

/** Skip the hosted round-trip so the Next access log is 200, not 404. */
export function isHostedMissingCrmGet(path: string[], method: string) {
  if (method !== "GET") return false;
  return isHostedMissingSignatureListPath(path, method);
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
