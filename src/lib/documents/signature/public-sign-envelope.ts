import { createHmac, timingSafeEqual } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

import { getAuthSecretKey } from "@/lib/auth/constants";
import type { PublicSignSession } from "@/lib/documents/signature/public-sign-store";

const PREFIX = "sigp1";

function hmacKey() {
  return Buffer.from(getAuthSecretKey());
}

export function isPackedPublicSignToken(token: string) {
  const value = token.trim();
  const parts = value.split(".");
  return parts.length === 3 && parts[0] === PREFIX && Boolean(parts[1] && parts[2]);
}

export function sealPublicSignSession(session: PublicSignSession): string {
  const payload = deflateRawSync(
    Buffer.from(JSON.stringify(session), "utf8"),
  ).toString("base64url");
  const mac = createHmac("sha256", hmacKey())
    .update(`${PREFIX}.${payload}`)
    .digest("base64url");
  return `${PREFIX}.${payload}.${mac}`;
}

export function openPublicSignSession(token: string): PublicSignSession | null {
  const value = token.trim();
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX || !parts[1] || !parts[2]) {
    return null;
  }
  const signed = `${parts[0]}.${parts[1]}`;
  const expected = createHmac("sha256", hmacKey()).update(signed).digest("base64url");
  const actualBuf = Buffer.from(parts[2]);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(actualBuf, expectedBuf)) return null;
  try {
    const json = inflateRawSync(Buffer.from(parts[1], "base64url")).toString("utf8");
    const parsed = JSON.parse(json) as PublicSignSession;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
