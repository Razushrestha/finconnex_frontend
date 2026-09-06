import { getRulesActor } from "@/lib/rules/actor";
import { roleLevel } from "@/lib/rules/permissions";

export const REPORT_TEAMS: Record<string, string[]> = {
  Sales: ["John Smith", "Shiva Kadhka"],
  Operations: ["Tejas Gokhe"],
  Support: ["Roshna Abraham"],
};

export function teamForOwner(owner: string) {
  for (const [team, names] of Object.entries(REPORT_TEAMS)) {
    if (names.includes(owner)) return team;
  }
  return "Unassigned";
}

export function reportAccess() {
  const actor = getRulesActor();
  const level = roleLevel(actor.role ?? "User");
  return {
    actor,
    level,
    canViewAll: level >= 80,
    canViewTeam: level >= 40,
    canExportAll: level >= 60,
    canExport: level >= 20,
  };
}

export function ownerVisible(owner: string) {
  const access = reportAccess();
  if (access.canViewAll) return true;
  if (access.canViewTeam) {
    const mine = teamForOwner(access.actor.name);
    return owner === access.actor.name || teamForOwner(owner) === mine;
  }
  return owner === access.actor.name;
}

export function filterVisibleOwners<T extends { owner: string }>(rows: T[]) {
  return rows.filter((row) => ownerVisible(row.owner));
}
