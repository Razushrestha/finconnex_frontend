import {
  ensureCrmAccess,
  ensureCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import {
  replaceCrmUserProfile,
  type UserProfile,
} from "@/lib/user-profile/types";

export function userProfilePath(): string {
  return "/v1/user/profile";
}

export function userUpdatePath(): string {
  return "/v1/user";
}

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  if (rec.data && rec.data !== raw && typeof rec.data === "object" && !Array.isArray(rec.data)) {
    return rec.data as Record<string, unknown>;
  }
  if (rec.user && typeof rec.user === "object" && !Array.isArray(rec.user)) {
    return rec.user as Record<string, unknown>;
  }
  if (rec.profile && typeof rec.profile === "object" && !Array.isArray(rec.profile)) {
    return rec.profile as Record<string, unknown>;
  }
  return rec;
}

function displayName(first: string, last: string, userName: string, email: string) {
  const joined = [first, last].filter(Boolean).join(" ").trim();
  return joined || userName || email;
}

export function normalizeUserProfile(raw: unknown): UserProfile {
  const rec = asRecord(raw) ?? {};
  const firstName = pickStr(rec.firstName, rec.first_name);
  const lastName = pickStr(rec.lastName, rec.last_name);
  const userName = pickStr(rec.userName, rec.username, rec.handle);
  const email = pickStr(rec.email);
  return {
    id: pickStr(rec.id, rec.userId, rec.uuid),
    email,
    firstName,
    lastName,
    userName,
    displayName: pickStr(rec.displayName, rec.name, displayName(firstName, lastName, userName, email)),
    phone: pickStr(rec.phone, rec.mobile, rec.phoneNumber),
    jobTitle: pickStr(rec.jobTitle, rec.title, rec.roleTitle),
    avatar: pickStr(rec.avatar, rec.avatarUrl, rec.photoUrl, rec.image),
    globalRole: pickStr(rec.globalRole, rec.role),
    isVerified: rec.isVerified === true || rec.verified === true,
  };
}

export function toUpdateUserBody(profile: UserProfile): Record<string, unknown> {
  const body: Record<string, unknown> = {
    firstName: profile.firstName.trim() || null,
    lastName: profile.lastName.trim() || null,
    userName: profile.userName.trim() || undefined,
  };
  if (profile.phone.trim()) body.phone = profile.phone.trim();
  if (profile.jobTitle.trim()) body.jobTitle = profile.jobTitle.trim();
  if (profile.avatar.trim()) body.avatar = profile.avatar.trim();
  return body;
}

async function withSession<T>(
  run: (
    session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">,
  ) => Promise<T>,
): Promise<T> {
  const scoped = await ensureCrmSession();
  if (scoped) return run(scoped);
  const access = await ensureCrmAccess();
  if (!access) throw new Error("Sign in to manage your profile");
  return run(access);
}

export async function getCrmUserProfile(): Promise<UserProfile> {
  return withSession(async (session) =>
    normalizeUserProfile(await crmFetch(session, userProfilePath())),
  );
}

export async function updateCrmUserProfile(
  profile: UserProfile,
): Promise<UserProfile> {
  return withSession(async (session) =>
    normalizeUserProfile(
      await crmFetch(session, userUpdatePath(), {
        method: "PUT",
        body: JSON.stringify(toUpdateUserBody(profile)),
      }),
    ),
  );
}

export async function tryCrmUserProfile<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteUserProfile(row: UserProfile | null) {
  if (row) replaceCrmUserProfile(row);
  return row;
}
