/**
 * Map Lead Card hydrate keys → owning source files (Phase 9 / 10 readiness).
 * Kept next to phase-9 so smokes can prove keys still exist in stores.
 */

import { LEAD_CARD_HYDRATE_KEYS } from "@/lib/leads/phase-9";

/** Relative to repo root. */
export const LEAD_CARD_HYDRATE_KEY_OWNERS: Record<
  (typeof LEAD_CARD_HYDRATE_KEYS)[number],
  string
> = {
  "sales:leads:board:v7": "src/lib/leads/store.ts",
  "sales:leads:activity-extras:v1": "src/lib/leads/lead-extras-store.ts",
  "activities:calls:board:v4": "src/lib/calls/store.ts",
  "activities:meetings:list:v4": "src/lib/meetings/store.ts",
  "activities:messages:list:v3": "src/lib/messages/store.ts",
  "activities:emails:list:v4": "src/lib/emails/store.ts",
  "activities:notes:list:v3": "src/lib/notes/store.ts",
  "activities:attachments:list:v2": "src/lib/attachments/store.ts",
  "activities:tasks:board:v6": "src/lib/tasks/store.ts",
  "settings:values:v1": "src/lib/settings/settings-store.ts",
  "settings:custom-fields:v1": "src/lib/custom-fields/store.ts",
};

export function assertHydrateKeysOwned(readFile: (rel: string) => string) {
  for (const key of LEAD_CARD_HYDRATE_KEYS) {
    const owner = LEAD_CARD_HYDRATE_KEY_OWNERS[key];
    if (!owner) throw new Error(`No owner file for hydrate key ${key}`);
    const body = readFile(owner);
    if (!body.includes(`"${key}"`) && !body.includes(`'${key}'`)) {
      throw new Error(`Hydrate key ${key} not found in ${owner}`);
    }
  }
}
