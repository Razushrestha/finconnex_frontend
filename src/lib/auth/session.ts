import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionPayload } from "./types";
import {
  getAuthSecretKey,
  PENDING_2FA_COOKIE,
  PENDING_2FA_MAX_AGE,
  REMEMBER_MAX_AGE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "./constants";

export { SESSION_COOKIE, PENDING_2FA_COOKIE } from "./constants";

export type Pending2faPayload = {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  rememberMe: boolean;
  purpose: "2fa";
};

export async function createSessionToken(
  payload: SessionPayload,
  rememberMe = false,
): Promise<string> {
  const maxAge = rememberMe ? REMEMBER_MAX_AGE : SESSION_MAX_AGE;

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(getAuthSecretKey());
}

export async function createPending2faToken(
  payload: Omit<Pending2faPayload, "purpose">,
): Promise<string> {
  return new SignJWT({ ...payload, purpose: "2fa" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_2FA_MAX_AGE}s`)
    .sign(getAuthSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function verifyPending2faToken(
  token: string,
): Promise<Pending2faPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    const p = payload as unknown as Pending2faPayload;
    if (p.purpose !== "2fa") return null;
    return p;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
