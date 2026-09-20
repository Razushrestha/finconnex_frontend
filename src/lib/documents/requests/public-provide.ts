/**
 * Sealed public "provide documents" link for document requests.
 * Same pattern as e-sign tokens: payload is in the URL so the client does
 * not need CRM login or the broker's localStorage.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

import { getAuthSecretKey } from "@/lib/auth/constants";

const PREFIX = "drp1";

export type PublicProvideDocItem = {
  id: string;
  title: string;
  description?: string;
  applicant?: string;
};

export type PublicProvideSession = {
  requestId: string;
  title: string;
  clientName: string;
  clientEmail: string;
  brokerName: string;
  brokerEmail: string;
  dueDate?: string;
  notes?: string;
  items: PublicProvideDocItem[];
  /** Unix ms — links older than this are rejected. */
  exp: number;
};

function hmacKey() {
  return Buffer.from(getAuthSecretKey());
}

export function isPackedProvideToken(token: string) {
  const value = token.trim();
  const parts = value.split(".");
  return parts.length === 3 && parts[0] === PREFIX && Boolean(parts[1] && parts[2]);
}

export function sealPublicProvideSession(session: PublicProvideSession): string {
  const payload = deflateRawSync(
    Buffer.from(JSON.stringify(session), "utf8"),
  ).toString("base64url");
  const mac = createHmac("sha256", hmacKey())
    .update(`${PREFIX}.${payload}`)
    .digest("base64url");
  return `${PREFIX}.${payload}.${mac}`;
}

export function openPublicProvideSession(
  token: string,
): PublicProvideSession | null {
  const value = token.trim();
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX || !parts[1] || !parts[2]) {
    return null;
  }
  const signed = `${parts[0]}.${parts[1]}`;
  const expected = createHmac("sha256", hmacKey())
    .update(signed)
    .digest("base64url");
  const actualBuf = Buffer.from(parts[2]);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(actualBuf, expectedBuf)) return null;
  try {
    const json = inflateRawSync(Buffer.from(parts[1], "base64url")).toString(
      "utf8",
    );
    const parsed = JSON.parse(json) as PublicProvideSession;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.items) || !parsed.clientEmail) return null;
    if (typeof parsed.exp === "number" && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function provideAbsoluteUrl(token: string, origin?: string): string {
  const base =
    (origin || (typeof window !== "undefined" ? window.location.origin : ""))
      .replace(/\/$/, "") || "";
  return `${base}/provide/${encodeURIComponent(token)}`;
}

/** Default: 30 days from now. */
export function defaultProvideExpiryMs(from = Date.now()) {
  return from + 30 * 24 * 60 * 60 * 1000;
}
