import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { listCrmUsers } from "@/lib/settings/users-store";

export type MentionPerson = {
  id: string;
  name: string;
  email?: string;
  role?: string;
  team?: string;
};

export function listMentionPeople(): MentionPerson[] {
  const users = listCrmUsers().filter((user) => user.status !== "Inactive");
  if (users.length > 0) {
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      team: user.team,
    }));
  }

  return ACTIVITY_OWNERS.map((name, index) => ({
    id: `owner_${index}`,
    name,
  }));
}

export function parseMentionNames(text: string): string[] {
  const matches = text.matchAll(/@([A-Za-z][A-Za-z\s.'-]+?)(?=\s|$|[.,!?])/g);
  const people = listMentionPeople();
  const names = new Set<string>();

  for (const match of matches) {
    const fragment = match[1].trim();
    const exact = people.find(
      (person) => person.name.toLowerCase() === fragment.toLowerCase(),
    );
    if (exact) names.add(exact.name);
  }

  return [...names];
}
