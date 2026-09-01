import { getCrmApiBaseUrl } from "@/lib/activity-timeline/auth";

export function publicAuthPath(suffix = ""): string {
  return `/v1/auth${suffix}`;
}

export function crmAuthBaseUrl(): string {
  return (
    getCrmApiBaseUrl() ||
    process.env.CRM_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_CRM_API_URL?.trim() ||
    "https://finconnex.payperless.app"
  ).replace(/\/$/, "");
}

export class PublicAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function envelopeMessage(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const rec = body as { message?: unknown; error?: unknown };
    if (typeof rec.message === "string" && rec.message.trim()) return rec.message;
    if (Array.isArray(rec.message) && rec.message.length) {
      return rec.message.map(String).join(", ");
    }
    if (typeof rec.error === "string" && rec.error.trim()) return rec.error;
  }
  return `Auth request failed (${status})`;
}

function unwrapData(body: unknown): unknown {
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data?: unknown }).data;
  }
  return body;
}

export async function postPublicAuth(
  suffix: string,
  body?: unknown,
  bearer?: string,
): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const res = await fetch(`${crmAuthBaseUrl()}${publicAuthPath(suffix)}`, {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
    throw new PublicAuthError(res.status, envelopeMessage(res.status, json));
  }
  return unwrapData(json);
}

export async function loginPublicUser(email: string, password: string) {
  return postPublicAuth("/login", { email, password });
}

export async function refreshPublicAuthToken(refreshToken: string) {
  return postPublicAuth("/refresh-token", {}, refreshToken);
}

export async function forgotPublicPassword(email: string) {
  return postPublicAuth("/forgot-password", { email });
}

export async function resetPublicPassword(input: {
  token: string;
  password: string;
  confirmPassword?: string;
}) {
  return postPublicAuth("/reset-password", {
    token: input.token,
    password: input.password,
    confirmPassword: input.confirmPassword ?? input.password,
  });
}

export async function resendPublicEmailVerification(email: string) {
  return postPublicAuth("/email-verification/resend", { email });
}

export async function verifyPublicEmail(token: string) {
  return postPublicAuth("/email-verification/verify", { token });
}
