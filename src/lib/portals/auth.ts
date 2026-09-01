/**
 * Phase D3 — Portal guest credentials (demo password + invite/reset tokens).
 */

import {
  appendPortalActivity,
  appendPortalAudit,
  formatPortalAt,
  getPortalBySlug,
  portalAbsoluteUrl,
  portalLoginPath,
  upsertPortal,
  type ClientPortal,
} from "@/lib/portals/types";
import { sendEmailDemoLive, sendSmsDemoLive } from "@/lib/comms/send-gateway";
import { getMortgageState } from "@/lib/portals/mortgage";

const CREDS_KEY = "portal:credentials:v1";
const DEFAULT_PASSWORD = "portal123";

type CredMap = Record<
  string,
  { email: string; password: string; resetToken?: string }
>;

function readCreds(): CredMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(CREDS_KEY);
    return raw ? (JSON.parse(raw) as CredMap) : {};
  } catch {
    return {};
  }
}

function writeCreds(map: CredMap) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CREDS_KEY, JSON.stringify(map));
}

export function getPortalDefaultPassword() {
  return DEFAULT_PASSWORD;
}

export function ensurePortalCredentials(portal: ClientPortal): {
  email: string;
  password: string;
} {
  const map = readCreds();
  const existing = map[portal.slug];
  if (
    existing &&
    existing.email.toLowerCase() === portal.primaryContactEmail.toLowerCase()
  ) {
    return existing;
  }
  const next = {
    email: portal.primaryContactEmail,
    password: existing?.password ?? DEFAULT_PASSWORD,
  };
  map[portal.slug] = next;
  writeCreds(map);
  return next;
}

export function setPortalPassword(slug: string, email: string, password: string) {
  const map = readCreds();
  map[slug] = { email, password, resetToken: undefined };
  writeCreds(map);
}

const CODE_KEY = "portal:access-code:v1";
const CODE_TTL_MS = 10 * 60 * 1000;

type CodeMap = Record<
  string,
  { code: string; channel: "email" | "sms"; sentAt: number }
>;

function readCodes(): CodeMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(CODE_KEY);
    return raw ? (JSON.parse(raw) as CodeMap) : {};
  } catch {
    return {};
  }
}

function writeCodes(map: CodeMap) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CODE_KEY, JSON.stringify(map));
}

export function maskPortalEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const start = user.slice(0, 1);
  return `${start}***@${domain}`;
}

export function maskPortalPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "••• •••";
  return `${digits.slice(0, 4)} *** ${digits.slice(-3)}`;
}

export function portalContactHints(portal: ClientPortal) {
  const mortgage = getMortgageState(portal.slug, portal);
  return {
    email: portal.primaryContactEmail,
    phone: mortgage.client.phone || "",
    maskedEmail: maskPortalEmail(portal.primaryContactEmail),
    maskedPhone: maskPortalPhone(mortgage.client.phone || "0411222333"),
  };
}

function makeAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendPortalAccessCode(
  slug: string,
  channel: "email" | "sms",
): Promise<
  | { ok: true; code: string; destination: string; channel: "email" | "sms" }
  | { ok: false; message: string }
> {
  const portal = getPortalBySlug(slug);
  if (!portal) return { ok: false, message: "Portal not found" };
  if (portal.status !== "Active") {
    return { ok: false, message: `Portal is ${portal.status}` };
  }
  const hints = portalContactHints(portal);
  const code = makeAccessCode();
  const map = readCodes();
  map[slug] = { code, channel, sentAt: Date.now() };
  writeCodes(map);

  if (channel === "email") {
    await sendEmailDemoLive({
      email: hints.email,
      subject: `Your FinConnex sign-in code is ${code}`,
      body: [
        `Hi ${portal.primaryContactName},`,
        "",
        `Your one-time sign-in code is ${code}.`,
        "It expires in 10 minutes.",
        "",
        `Or open your portal: ${portalAbsoluteUrl(portalLoginPath(slug))}`,
      ].join("\n"),
    });
  } else if (hints.phone) {
    await sendSmsDemoLive({
      phone: hints.phone,
      body: `FinConnex sign-in code: ${code}. Expires in 10 minutes.`,
    });
  }

  return {
    ok: true,
    code,
    channel,
    destination: channel === "email" ? hints.maskedEmail : hints.maskedPhone,
  };
}

export function verifyPortalAccessCode(
  slug: string,
  code: string,
): { ok: true; portal: ClientPortal } | { ok: false; message: string } {
  const portal = getPortalBySlug(slug);
  if (!portal) return { ok: false, message: "Portal not found" };
  if (portal.status !== "Active") {
    return { ok: false, message: `Portal is ${portal.status}` };
  }
  const entry = readCodes()[slug];
  if (!entry) {
    return { ok: false, message: "Send a code first" };
  }
  if (Date.now() - entry.sentAt > CODE_TTL_MS) {
    return { ok: false, message: "That code has expired. Send a new one." };
  }
  if (code.replace(/\s/g, "") !== entry.code) {
    return { ok: false, message: "Incorrect code" };
  }
  return { ok: true, portal };
}

export function verifyPortalLogin(
  slug: string,
  email: string,
  password: string,
): { ok: true; portal: ClientPortal } | { ok: false; message: string } {
  const portal = getPortalBySlug(slug);
  if (!portal) return { ok: false, message: "Portal not found" };
  if (portal.status !== "Active") {
    return { ok: false, message: `Portal is ${portal.status}` };
  }
  const creds = ensurePortalCredentials(portal);
  const trimmed = email.trim().toLowerCase();
  if (trimmed !== portal.primaryContactEmail.toLowerCase()) {
    return {
      ok: false,
      message: `Use the invited email (${portal.primaryContactEmail})`,
    };
  }
  if (password !== creds.password) {
    return { ok: false, message: "Incorrect password" };
  }
  return { ok: true, portal };
}

function randomTempPassword() {
  return `Fc${Math.random().toString(36).slice(2, 8)}!`;
}

export async function sendPortalInvite(
  portal: ClientPortal,
  actor: string,
): Promise<{ ok: true; portal: ClientPortal; url: string } | { ok: false; message: string }> {
  if (portal.status !== "Active") {
    return { ok: false, message: "Activate portal before inviting" };
  }
  ensurePortalCredentials(portal);
  const loginUrl = portalAbsoluteUrl(portalLoginPath(portal.slug));
  const sent = await sendEmailDemoLive({
    email: portal.primaryContactEmail,
    subject: `Your FinConnex client portal is ready`,
    body: [
      `Hi ${portal.primaryContactName},`,
      "",
      `Your broker has set up a private client portal for ${portal.clientName}.`,
      "Open this unique link to verify it's you, then continue your application:",
      "",
      loginUrl,
      "",
      "You'll receive a one-time code to this email (or your mobile) to sign in.",
      "After that you can complete your fact find and upload documents.",
    ].join("\n"),
  });
  if (!sent.ok) return { ok: false, message: sent.message };

  let next = appendPortalAudit(
    { ...portal, inviteSentAt: formatPortalAt() },
    "Invite sent (email gateway)",
    actor,
  );
  next = appendPortalActivity(
    next,
    `Invite emailed to ${portal.primaryContactEmail}`,
    actor,
  );
  upsertPortal(next);
  return { ok: true, portal: next, url: loginUrl };
}

export async function sendPortalPasswordReset(
  portal: ClientPortal,
  actor: string,
): Promise<
  | { ok: true; portal: ClientPortal; tempPassword: string }
  | { ok: false; message: string }
> {
  const temp = randomTempPassword();
  setPortalPassword(portal.slug, portal.primaryContactEmail, temp);
  const loginUrl = portalAbsoluteUrl(portalLoginPath(portal.slug));
  const sent = await sendEmailDemoLive({
    email: portal.primaryContactEmail,
    subject: `Password reset · ${portal.name}`,
    body: [
      `Hi ${portal.primaryContactName},`,
      "",
      "Your client portal password was reset.",
      `Login: ${loginUrl}`,
      `New temporary password: ${temp}`,
    ].join("\n"),
  });
  if (!sent.ok) return { ok: false, message: sent.message };

  let next = appendPortalAudit(portal, "Password reset emailed", actor);
  next = appendPortalActivity(
    next,
    `Password reset → ${portal.primaryContactEmail}`,
    actor,
  );
  upsertPortal(next);
  return { ok: true, portal: next, tempPassword: temp };
}
