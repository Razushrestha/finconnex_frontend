/**
 * Preferred Phase 10 REST paths (first-class modules).
 * KV `/v1/kv/...` remains the bootstrap transport until OpenAPI lands.
 */

export type ModuleRestRoute = {
  logicalKey: string;
  collectionPath: string;
  notes: string;
};

/** Map Lead Card hydrate keys → future REST collections. */
export const LEAD_CARD_MODULE_ROUTES: readonly ModuleRestRoute[] = [
  {
    logicalKey: "sales:leads:board:v6",
    collectionPath: "/v1/leads",
    notes: "Kanban/list board payload or paginated leads",
  },
  {
    logicalKey: "sales:leads:activity-extras:v1",
    collectionPath: "/v1/leads/activity-extras",
    notes: "Legacy extras; prefer per-module activity APIs",
  },
  {
    logicalKey: "activities:calls:board:v1",
    collectionPath: "/v1/calls",
    notes: "Call records for activity index",
  },
  {
    logicalKey: "activities:meetings:list:v1",
    collectionPath: "/v1/meetings",
    notes: "Meetings list",
  },
  {
    logicalKey: "activities:messages:list:v1",
    collectionPath: "/v1/messages",
    notes: "SMS / messages",
  },
  {
    logicalKey: "activities:emails:list:v1",
    collectionPath: "/v1/emails",
    notes: "Email threads / messages",
  },
  {
    logicalKey: "activities:tasks:board:v2",
    collectionPath: "/v1/tasks",
    notes: "Tasks board",
  },
  {
    logicalKey: "activities:notes:list:v1",
    collectionPath: "/v1/notes",
    notes: "Notes",
  },
  {
    logicalKey: "activities:attachments:list:v1",
    collectionPath: "/v1/attachments",
    notes: "Metadata; binary upload via multipart separately",
  },
  {
    logicalKey: "settings:values:v1",
    collectionPath: "/v1/settings",
    notes: "Org settings bag including Lead Card",
  },
  {
    logicalKey: "settings:custom-fields:v1",
    collectionPath: "/v1/custom-fields",
    notes: "Custom field definitions",
  },
] as const;

export function resolveModuleRestPath(logicalKey: string): string | null {
  return (
    LEAD_CARD_MODULE_ROUTES.find((r) => r.logicalKey === logicalKey)
      ?.collectionPath ?? null
  );
}
