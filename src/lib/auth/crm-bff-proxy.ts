import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  applyCrmTokenCookies,
  resolveLiveCrmAuth,
} from "@/lib/auth/crm-server";

const ALLOWED_ROOTS = new Set([
  "leads",
  "deals",
  "calls",
  "companies",
  "smart-hubs",
  "smart-short-links",
  "emails",
  "tasks",
  "messages",
  "notes",
  "public",
]);

function crmBaseUrl(): string | null {
  const raw =
    process.env.CRM_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_CRM_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "https://finconnex.payperless.app";
  return raw.replace(/\/$/, "") || null;
}

function isAllowed(path: string[]): boolean {
  const root = path[0];
  if (!root) return false;
  if (root === "workspaces") {
    return (
      path.includes("calls") ||
      path.includes("emails") ||
      path.includes("tasks") ||
      path.includes("messages") ||
      path.includes("notes") ||
      path[2] === "members" ||
      path[2] === "members-summary"
    );
  }
  if (!ALLOWED_ROOTS.has(root)) return false;
  if (root === "public") {
    return path[1] === "smart-hubs" || path[1] === "smart-short-links";
  }
  return true;
}

export async function proxyCrmV1(
  request: Request,
  path: string[],
): Promise<NextResponse> {
  if (!isAllowed(path)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const base = crmBaseUrl();
  if (!base) {
    return NextResponse.json(
      { message: "CRM API URL is not configured" },
      { status: 503 },
    );
  }

  const isPublic = path[0] === "public";
  let auth: Awaited<ReturnType<typeof resolveLiveCrmAuth>> = null;

  if (!isPublic) {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { message: "Sign in to continue" },
        { status: 401 },
      );
    }
    auth = await resolveLiveCrmAuth();
    if (!auth?.accessToken) {
      return NextResponse.json(
        { message: "Invalid or missing access token" },
        { status: 401 },
      );
    }
  }

  const search = new URL(request.url).search;
  const target = `${base}/v1/${path.map(encodeURIComponent).join("/")}${search}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (auth?.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  const incomingType = request.headers.get("content-type");
  if (incomingType) headers["Content-Type"] = incomingType;

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: body || undefined,
  });

  const text = await upstream.text();
  const response = new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") || "application/json",
    },
  });

  if (auth?.accessToken) {
    applyCrmTokenCookies(response, {
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
    });
  }

  return response;
}
