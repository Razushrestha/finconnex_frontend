import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { getRulesActor } from "@/lib/rules/actor";

function norm(value: string) {
  return value.trim().toLowerCase();
}

function addIdentity(set: Set<string>, value?: string) {
  if (!value?.trim()) return;
  const v = norm(value);
  set.add(v);
  if (v.includes("@")) {
    const local = v.split("@")[0];
    if (local) set.add(local);
  }
}

/** Names / emails / login aliases that mean "the signed-in user". */
export function currentUserIdentities(): Set<string> {
  const actor = getRulesActor();
  const keys = new Set<string>();
  addIdentity(keys, actor.name);
  addIdentity(keys, actor.email);
  addIdentity(keys, actor.id);
  if (
    norm(actor.email ?? "") === "admin@finconnex.com" ||
    actor.id === "user_john"
  ) {
    addIdentity(keys, "John Smith");
  }

  const first = actor.name.trim().split(/\s+/)[0]?.toLowerCase();
  const last = actor.name.trim().split(/\s+/).slice(-1)[0]?.toLowerCase();
  const ownersForFirst = ACTIVITY_OWNERS.filter(
    (owner) => owner.split(/\s+/)[0]?.toLowerCase() === first,
  );

  for (const owner of ACTIVITY_OWNERS) {
    const oFirst = owner.split(/\s+/)[0]?.toLowerCase();
    const oLast = owner.split(/\s+/).slice(-1)[0]?.toLowerCase();
    const exact = keys.has(norm(owner));
    const samePerson = Boolean(first && last && oFirst === first && oLast === last);
    const uniqueFirst = ownersForFirst.length === 1 && oFirst === first;
    if (!exact && !samePerson && !uniqueFirst) continue;
    addIdentity(keys, owner);
    addIdentity(keys, oFirst);
    if (oFirst === "shiva") {
      addIdentity(keys, "Shiva Khadka");
      addIdentity(keys, "Shiva Kadhka");
    }
  }

  return keys;
}

/** True when a name or email refers to the signed-in user. */
export function isCurrentUserIdentity(value?: string) {
  if (!value?.trim()) return false;
  const v = norm(value);
  const keys = currentUserIdentities();
  if (keys.has(v)) return true;
  if (v.includes("@")) {
    const local = v.split("@")[0];
    if (local && keys.has(local)) return true;
  }
  return false;
}

export function isAssignedToCurrentUser(...values: (string | undefined)[]) {
  return values.some((value) => isCurrentUserIdentity(value));
}
