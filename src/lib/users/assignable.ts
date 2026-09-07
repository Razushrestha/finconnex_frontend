import { decodeJwtPayload, ensureCrmSession, isUuid } from "@/lib/activity-timeline/auth";
import { listCrmUsers } from "@/lib/settings/users-store";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";
import {
  listWorkspaceMembers,
  type WorkspaceMember,
} from "@/lib/workspace-members/types";
import { listCrmWorkspaceMembersAdmin } from "@/lib/workspace-operations/api";
import { OWNERS } from "@/lib/leads/types";
import { getRulesActor } from "@/lib/rules/actor";

export type AssignableOwner = {
  id: string;
  name: string;
  email: string;
};

function mergeOwners(rows: AssignableOwner[]): AssignableOwner[] {
  const byEmail = new Map<string, AssignableOwner>();
  const extras: AssignableOwner[] = [];

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    if (!email) {
      extras.push(row);
      continue;
    }
    const prev = byEmail.get(email);
    if (!prev || (isUuid(row.id) && !isUuid(prev.id))) {
      byEmail.set(email, row);
    }
  }

  const merged = [...byEmail.values()];
  for (const row of extras) {
    const exists = merged.some(
      (item) => item.name.trim().toLowerCase() === row.name.trim().toLowerCase(),
    );
    if (!exists) merged.push(row);
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

function toOwner(member: WorkspaceMember): AssignableOwner {
  return {
    id: isUuid(member.userId)
      ? member.userId
      : isUuid(member.id)
        ? member.id
        : member.userId || member.id,
    name: member.name,
    email: member.email,
  };
}

function fromDirectory(): AssignableOwner[] {
  const users = listCrmUsers()
    .filter((user) => user.status !== "Inactive")
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    }));

  const members = listWorkspaceMembers()
    .filter((member) => member.status !== "Inactive")
    .map(toOwner);

  return mergeOwners([...users, ...members]);
}

function fallbackOwners(): AssignableOwner[] {
  return OWNERS.map((name) => ({ id: name, name, email: "" }));
}

export function listAssignableOwnersLocal(): AssignableOwner[] {
  const local = fromDirectory();
  return local.length ? local : fallbackOwners();
}

async function listRemoteMembers(): Promise<WorkspaceMember[]> {
  try {
    const page = await listCrmWorkspaceMembersAdmin({ limit: 100 });
    if (page.items.length) return page.items;
  } catch {
    /* fall through */
  }
  return listCrmWorkspaceMembers();
}

export async function loadAssignableOwners(): Promise<AssignableOwner[]> {
  const local = fromDirectory();
  try {
    const live = (await listRemoteMembers())
      .filter((member) => member.status !== "Inactive")
      .map(toOwner);
    const merged = mergeOwners([...live, ...local]);
    const uuidOwners = merged.filter((row) => isUuid(row.id));
    if (uuidOwners.length) return uuidOwners;
    return merged.length ? merged : fallbackOwners();
  } catch {
    const uuidLocal = local.filter((row) => isUuid(row.id));
    if (uuidLocal.length) return uuidLocal;
    return local.length ? local : fallbackOwners();
  }
}

export function defaultAssignableOwnerId(
  options: AssignableOwner[],
  currentId?: string,
): string {
  const uuidOptions = options.filter((row) => isUuid(row.id));
  const pool = uuidOptions.length ? uuidOptions : options;
  if (currentId && isUuid(currentId) && pool.some((row) => row.id === currentId)) {
    return currentId;
  }
  const actor = getRulesActor();
  const email = actor.email?.trim().toLowerCase();
  const name = actor.name.trim().toLowerCase();
  const actorId = actor.id && isUuid(actor.id) ? actor.id : "";
  const match =
    (actorId ? pool.find((row) => row.id === actorId) : undefined) ??
    (email
      ? pool.find((row) => row.email.trim().toLowerCase() === email)
      : undefined) ??
    pool.find((row) => row.name.trim().toLowerCase() === name) ??
    pool[0];
  return match?.id ?? "";
}

function currentSessionUserId(accessToken: string): string | undefined {
  const payload = decodeJwtPayload(accessToken);
  const id = payload?.sub ?? payload?.userId ?? payload?.id;
  return typeof id === "string" && isUuid(id) ? id : undefined;
}

/** Map a picker name / id to a CRM user UUID for assigneeIds. */
export async function resolveCrmAssigneeUserId(
  preferred?: string,
): Promise<string | undefined> {
  if (preferred && isUuid(preferred)) return preferred;
  const session = await ensureCrmSession();
  const jwt = session ? currentSessionUserId(session.accessToken) : undefined;
  const hint = preferred?.trim().toLowerCase();
  const actor = getRulesActor();
  try {
    const members = await listRemoteMembers();
    const match =
      members.find((m) => m.userId === jwt || m.id === jwt) ??
      (hint
        ? members.find(
            (m) =>
              m.name.trim().toLowerCase() === hint ||
              m.email.trim().toLowerCase() === hint ||
              m.userId.toLowerCase() === hint,
          )
        : undefined) ??
      (actor.email
        ? members.find(
            (m) => m.email.trim().toLowerCase() === actor.email?.trim().toLowerCase(),
          )
        : undefined) ??
      members.find(
        (m) => m.name.trim().toLowerCase() === actor.name.trim().toLowerCase(),
      ) ??
      members.find((m) => isUuid(m.userId));
    if (match && isUuid(match.userId)) return match.userId;
    if (match && isUuid(match.id)) return match.id;
  } catch {
    /* directory optional */
  }
  return jwt;
}

export function assignableOwnerLabel(row: AssignableOwner): string {
  return row.email ? `${row.name} (${row.email})` : row.name;
}
