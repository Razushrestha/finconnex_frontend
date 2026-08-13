/**
 * Phase D3 — Portal guest credentials (demo password + invite/reset tokens).
 */

import {
  appendPortalActivity,
  appendPortalAudit,
  formatPortalAt,
  getPortalBySlug,
  portalPublicPath,
  upsertPortal,
  type ClientPortal,
} from "@/lib/portals/types";
import { sendEmailDemoLive } from "@/lib/comms/send-gateway";

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
): Promise<{ ok: true; portal: ClientPortal } | { ok: false; message: string }> {
  if (portal.status !== "Active") {
    return { ok: false, message: "Activate portal before inviting" };
  }
  const creds = ensurePortalCredentials(portal);
  const loginUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${portalPublicPath(portal.slug)}/login`;
  const sent = await sendEmailDemoLive({
    email: portal.primaryContactEmail,
    subject: `You're invited to ${portal.name}`,
    body: [
      `Hi ${portal.primaryContactName},`,
      "",
      `You have been invited to the FinConnex client portal for ${portal.clientName}.`,
      `Login: ${loginUrl}`,
      `Email: ${portal.primaryContactEmail}`,
      `Temporary password: ${creds.password}`,
      "",
      "Please sign in and change your password if prompted.",
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
  return { ok: true, portal: next };
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
  const loginUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${portalPublicPath(portal.slug)}/login`;
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
