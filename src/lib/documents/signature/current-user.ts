import { getRulesActor } from "@/lib/rules/actor";
import { loadUserProfile } from "@/lib/user-profile/types";

export type SignatureSelf = {
  name: string;
  email: string;
};

function displayNameFromProfile() {
  const profile = loadUserProfile();
  return (
    profile.displayName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.userName ||
    ""
  ).trim();
}

export function selfFromStores(): SignatureSelf {
  const actor = getRulesActor();
  const profile = loadUserProfile();
  return {
    name: (actor.name || displayNameFromProfile()).trim(),
    email: (actor.email || profile.email || "").trim(),
  };
}

export async function fetchSignatureSelf(): Promise<SignatureSelf> {
  const stored = selfFromStores();
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    const data = (await res.json().catch(() => null)) as {
      authenticated?: boolean;
      user?: { name?: string; email?: string };
    } | null;
    const user = data?.authenticated === false ? null : data?.user;
    if (!user) return stored;
    return {
      name: (user.name || stored.name || "").trim(),
      email: (user.email || stored.email || "").trim(),
    };
  } catch {
    return stored;
  }
}
