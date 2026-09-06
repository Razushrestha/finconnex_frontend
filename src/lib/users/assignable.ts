import { isUuid } from "@/lib/activity-timeline/auth";
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
    return merged.length ? merged : fallbackOwners();
  } catch {
    return local.length ? local : fallbackOwners();
  }
}

export function defaultAssignableOwnerId(
  options: AssignableOwner[],
  currentId?: string,
): string {
  if (currentId && options.some((row) => row.id === currentId)) {
    return currentId;
  }
  const actor = getRulesActor();
  const email = actor.email?.trim().toLowerCase();
  const name = actor.name.trim().toLowerCase();
  const match =
    (email
      ? options.find((row) => row.email.trim().toLowerCase() === email)
      : undefined) ??
    options.find((row) => row.name.trim().toLowerCase() === name) ??
    options.find((row) => row.id === currentId) ??
    options[0];
  return match?.id ?? currentId ?? "";
}

export function assignableOwnerLabel(row: AssignableOwner): string {
  return row.email ? `${row.name} (${row.email})` : row.name;
}
