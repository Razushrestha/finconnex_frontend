import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { isUuid } from "@/lib/activity-timeline/auth";
import { DASHBOARD_CONSULTANTS } from "@/lib/booking/dashboard";
import { listMentionPeople } from "@/lib/mentions/people";

export type WorkQueuePerson = {
  id: string;
  name: string;
  role?: string;
  email?: string;
};

let crmDirectory: WorkQueuePerson[] = [];

export function setWorkQueueCrmDirectory(people: WorkQueuePerson[]) {
  crmDirectory = people.filter((p) => p.id && p.name);
}

export function displayNameForWorkQueueId(id: string): string {
  if (!id) return "";
  const hit = crmDirectory.find((p) => p.id === id);
  if (hit) return hit.name;
  return id;
}

export function assigneeIdForScope(scope: string | undefined): string | undefined {
  if (!scope) return undefined;
  if (isUuid(scope)) return scope;
  const key = scope.trim().toLowerCase();
  const hit = crmDirectory.find((p) => p.name.trim().toLowerCase() === key);
  return hit && isUuid(hit.id) ? hit.id : undefined;
}

export function nameMapFromDirectory(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const person of crmDirectory) {
    out[person.id] = person.name;
  }
  return out;
}

function addPerson(
  out: WorkQueuePerson[],
  seen: Set<string>,
  person: WorkQueuePerson,
) {
  const key = person.name.trim().toLowerCase();
  if (!key || seen.has(key)) return;
  seen.add(key);
  out.push({
    id: person.id || key,
    name: person.name.trim(),
    role: person.role,
    email: person.email,
  });
}

/** Full org directory for the Work Queue + picker (not just pinned tabs). */
export function listWorkQueueDirectory(): WorkQueuePerson[] {
  const seen = new Set<string>();
  const out: WorkQueuePerson[] = [];

  for (const person of crmDirectory) {
    addPerson(out, seen, person);
  }

  for (const person of listMentionPeople()) {
    addPerson(out, seen, person);
  }

  for (const consultant of DASHBOARD_CONSULTANTS) {
    addPerson(out, seen, {
      id: consultant.id,
      name: consultant.name,
      role: consultant.role,
    });
  }

  ACTIVITY_OWNERS.forEach((name, index) => {
    addPerson(out, seen, {
      id: `owner_${index}`,
      name,
      role: "Broker",
    });
  });

  return out;
}

export function listRemainingWorkQueuePeople(
  pinnedNames: string[],
): WorkQueuePerson[] {
  const pinned = new Set(
    pinnedNames.map((name) => name.trim().toLowerCase()).filter(Boolean),
  );
  return listWorkQueueDirectory().filter(
    (person) => !pinned.has(person.name.toLowerCase()),
  );
}
