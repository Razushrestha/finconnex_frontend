/**
 * Settings → Users & Access → Users (demo session store).
 */

import {
  readPersistedJson,
  writePersistedJson,
} from "@/lib/persistence/registry";
import { newRulesId } from "@/lib/rules/storage";
import type { HierarchyLevel } from "@/lib/rules/permissions";

const STORE_KEY = "settings:users:v1";

export type CrmUserStatus = "Active" | "Inactive" | "Invited";

export type CrmUser = {
  id: string;
  name: string;
  email: string;
  role: HierarchyLevel;
  status: CrmUserStatus;
  team?: string;
  lastLoginAt?: string;
  joinedAt?: string;
};

const SEED: CrmUser[] = [
  {
    id: "user_john",
    name: "John Smith",
    email: "admin@finconnex.com",
    role: "Manager",
    status: "Active",
    team: "Sales",
    lastLoginAt: new Date().toISOString(),
    joinedAt: "2024-05-12",
  },
  {
    id: "user_shiva",
    name: "Shiva Kadhka",
    email: "shiva@finconnex.com",
    role: "Team Lead",
    status: "Active",
    team: "Sales",
    joinedAt: "2024-06-03",
  },
  {
    id: "user_tejas",
    name: "Tejas Gokhe",
    email: "tejas@finconnex.com",
    role: "User",
    status: "Active",
    team: "Support",
    joinedAt: "2024-07-18",
  },
  {
    id: "user_roshna",
    name: "Roshna Abraham",
    email: "roshna@finconnex.com",
    role: "User",
    status: "Invited",
    team: "Marketing",
    joinedAt: "2024-08-01",
  },
];

function load(): CrmUser[] {
  const raw = readPersistedJson<CrmUser[]>(STORE_KEY, SEED);
  return Array.isArray(raw) && raw.length ? raw : SEED;
}

function save(users: CrmUser[]) {
  writePersistedJson(STORE_KEY, users);
  return users;
}

export function listCrmUsers(): CrmUser[] {
  return load();
}

export function createCrmUser(input: {
  name: string;
  email: string;
  role: HierarchyLevel;
  team?: string;
  status?: CrmUserStatus;
}): CrmUser {
  const users = load();
  const user: CrmUser = {
    id: newRulesId("user"),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    status: input.status ?? "Invited",
    team: input.team?.trim() || undefined,
    joinedAt: new Date().toISOString().slice(0, 10),
  };
  return save([user, ...users])[0]!;
}

export function updateCrmUser(
  id: string,
  patch: Partial<Pick<CrmUser, "name" | "email" | "role" | "status" | "team">>,
): CrmUser | null {
  const users = load();
  let updated: CrmUser | null = null;
  const next = users.map((u) => {
    if (u.id !== id) return u;
    updated = {
      ...u,
      ...patch,
      name: patch.name?.trim() || u.name,
      email: patch.email?.trim().toLowerCase() || u.email,
      team: patch.team !== undefined ? patch.team.trim() || undefined : u.team,
    };
    return updated;
  });
  if (updated) save(next);
  return updated;
}

export function deleteCrmUser(id: string): boolean {
  const users = load();
  if (id === "user_john") return false;
  const next = users.filter((u) => u.id !== id);
  if (next.length === users.length) return false;
  save(next);
  return true;
}
