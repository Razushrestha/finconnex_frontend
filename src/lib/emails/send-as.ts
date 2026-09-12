import {
  decodeJwtPayload,
  ensureCrmAccess,
} from "@/lib/activity-timeline/auth";
import { getRulesActor, setRulesActor } from "@/lib/rules/actor";
import { loadUserProfile, replaceCrmUserProfile } from "@/lib/user-profile/types";
import { listAssignableOwnersLocal } from "@/lib/users/assignable";

export type SendAsKind = "own" | "send-as" | "shared";

export interface SendAsIdentity {
  email: string;
  name: string;
  kind: SendAsKind;
}

const GRANTED: SendAsIdentity[] = [];

let approvedSender: SendAsIdentity | null = null;

function canSendAsOther() {
  const role = getRulesActor().role ?? "User";
  return role !== "User" && role !== "Read Only";
}

function isMailbox(value: string | undefined | null): value is string {
  return Boolean(value && value.includes("@"));
}

function pickEmail(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && isMailbox(value.trim())) return value.trim();
  }
  return "";
}

function emailFromJwt(token?: string | null): string {
  if (!token) return "";
  const payload = decodeJwtPayload(token);
  if (!payload) return "";
  return pickEmail(
    payload.email,
    payload.userEmail,
    payload.preferred_username,
    payload.upn,
    payload.unique_name,
  );
}

function identityFromDirectory(): SendAsIdentity | null {
  const actor = getRulesActor();
  const owners = listAssignableOwnersLocal();
  const actorId = actor.id?.trim();
  const email = actor.email?.trim().toLowerCase();
  const name = actor.name.trim().toLowerCase();
  const match =
    (actorId ? owners.find((row) => row.id === actorId) : undefined) ??
    (email
      ? owners.find((row) => row.email.trim().toLowerCase() === email)
      : undefined) ??
    (name
      ? owners.find((row) => row.name.trim().toLowerCase() === name)
      : undefined);
  if (!match || !isMailbox(match.email)) return null;
  return {
    email: match.email.trim(),
    name: match.name.trim() || actor.name || match.email.split("@")[0] || "You",
    kind: "own",
  };
}

/** Mailbox for the signed-in user (session actor, then profile, JWT, directory). */
export function currentMailboxIdentity(): SendAsIdentity | null {
  const actor = getRulesActor();
  const profile = loadUserProfile();
  const email = pickEmail(actor.email, profile.email, identityFromDirectory()?.email);
  const name = (
    actor.name ||
    profile.displayName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    identityFromDirectory()?.name ||
    ""
  ).trim();
  if (!isMailbox(email)) return null;
  return {
    email,
    name: name || email.split("@")[0] || "You",
    kind: "own",
  };
}

export function setApprovedSender(identity: SendAsIdentity | null) {
  approvedSender =
    identity && isMailbox(identity.email)
      ? {
          email: identity.email.trim(),
          name: identity.name.trim() || "Workspace mailbox",
          kind: "shared",
        }
      : null;
}

export function listFromIdentities(): SendAsIdentity[] {
  const own = currentMailboxIdentity();
  const extras = canSendAsOther()
    ? GRANTED.filter(
        (item) =>
          item.email.toLowerCase() !== (own?.email ?? "").toLowerCase() &&
          item.email.toLowerCase() !== (approvedSender?.email ?? "").toLowerCase(),
      )
    : [];
  const rows: SendAsIdentity[] = [];
  const seen = new Set<string>();
  for (const item of [approvedSender, own, ...extras]) {
    if (!item) continue;
    const key = item.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(item);
  }
  return rows;
}

export function canChooseFromAddress() {
  return listFromIdentities().length > 1;
}

export function sendAsLabel(kind: SendAsKind) {
  if (kind === "own") return "Your mailbox";
  if (kind === "shared") return "Workspace mailbox";
  return "Send as";
}

export async function loadFromIdentities(): Promise<SendAsIdentity[]> {
  const access = await ensureCrmAccess();
  const jwtEmail = emailFromJwt(access?.accessToken);
  const actor = getRulesActor();
  if (jwtEmail && !isMailbox(actor.email)) {
    setRulesActor({
      ...actor,
      email: jwtEmail,
      name: actor.name || jwtEmail.split("@")[0] || "You",
    });
  }

  const [{ getCrmUserProfile, tryCrmUserProfile }, { getCrmWorkspaceSettings, tryCrmSettings }] =
    await Promise.all([
      import("@/lib/user-profile/api"),
      import("@/lib/settings/api"),
    ]);

  const profile = await tryCrmUserProfile(() => getCrmUserProfile());
  if (profile) {
    replaceCrmUserProfile(profile);
    const next = getRulesActor();
    if (isMailbox(profile.email) && !isMailbox(next.email)) {
      setRulesActor({
        ...next,
        email: profile.email,
        name: next.name || profile.displayName || profile.email,
      });
    }
  }

  const settings = await tryCrmSettings(() => getCrmWorkspaceSettings());
  if (isMailbox(settings?.smtpFromEmail)) {
    setApprovedSender({
      email: settings.smtpFromEmail!,
      name: settings.smtpFromName?.trim() || "Workspace mailbox",
      kind: "shared",
    });
  }

  return listFromIdentities();
}
