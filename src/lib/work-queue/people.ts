import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { DASHBOARD_CONSULTANTS } from "@/lib/booking/dashboard";
import { listMentionPeople } from "@/lib/mentions/people";

export type WorkQueuePerson = {
  id: string;
  name: string;
  role?: string;
  email?: string;
};

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
