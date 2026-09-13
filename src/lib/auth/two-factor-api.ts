/**
 * Personal TOTP — POST /v1/security/two-factor/{setup,confirm,disable}
 */

import {
  ensureCrmSession,
  isBoundCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";

export type TwoFactorSetup = {
  secret: string;
  otpAuthUrl: string;
};

async function call(path: string, init?: RequestInit): Promise<unknown> {
  const scoped = await ensureCrmSession();
  if (!scoped) throw new Error("Sign in to manage two-factor authentication");
  if (isBoundCrmSession()) return crmFetch(scoped, path, init);
  return crmBffFetch(path, init);
}

function rec(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const row = data as Record<string, unknown>;
  if (row.data && typeof row.data === "object" && !Array.isArray(row.data)) {
    return row.data as Record<string, unknown>;
  }
  return row;
}

export async function startCrmTwoFactorSetup(): Promise<TwoFactorSetup> {
  const row = rec(await call("/v1/security/two-factor/setup", { method: "POST" }));
  const secret = String(row.secret ?? "");
  const otpAuthUrl = String(row.otpAuthUrl ?? row.otpauthUrl ?? row.uri ?? "");
  if (!secret && !otpAuthUrl) {
    throw new Error("CRM did not return a 2FA secret.");
  }
  return { secret, otpAuthUrl };
}

export async function confirmCrmTwoFactorSetup(
  code: string,
): Promise<string[]> {
  const row = rec(
    await call("/v1/security/two-factor/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    }),
  );
  const codes = row.recoveryCodes;
  return Array.isArray(codes) ? codes.map(String) : [];
}

export async function disableCrmTwoFactor(): Promise<void> {
  await call("/v1/security/two-factor/disable", { method: "POST" });
}
