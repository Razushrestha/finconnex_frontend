/**
 * Canonical REST catalog for the backend team.
 * All paths are relative to {NEXT_PUBLIC_API_BASE_URL}/v1
 */

export const ENDPOINT_CATALOG = [
  // Auth
  { method: "POST", path: "/auth/login", module: "auth", notes: "Sets session cookie" },
  { method: "POST", path: "/auth/logout", module: "auth" },
  { method: "GET", path: "/auth/me", module: "auth" },

  // Leads
  { method: "GET", path: "/leads/board", module: "leads", notes: "Kanban columns" },
  { method: "GET", path: "/leads", module: "leads", notes: "Paginated list" },
  { method: "GET", path: "/leads/:id", module: "leads" },
  { method: "POST", path: "/leads", module: "leads" },
  { method: "PATCH", path: "/leads/:id", module: "leads" },
  { method: "POST", path: "/leads/:id/status", module: "leads", notes: "Converted is final" },
  { method: "DELETE", path: "/leads/:id", module: "leads", notes: "Soft-delete → recycle bin" },

  // Contacts
  { method: "GET", path: "/contacts/board", module: "contacts" },
  { method: "GET", path: "/contacts", module: "contacts" },
  { method: "GET", path: "/contacts/:id", module: "contacts" },
  { method: "POST", path: "/contacts", module: "contacts" },
  { method: "PATCH", path: "/contacts/:id", module: "contacts" },
  { method: "DELETE", path: "/contacts/:id", module: "contacts" },

  // Deals
  { method: "GET", path: "/deals/pipelines", module: "deals" },
  { method: "GET", path: "/deals", module: "deals" },
  { method: "GET", path: "/deals/:id", module: "deals" },
  { method: "POST", path: "/deals", module: "deals" },
  { method: "POST", path: "/deals/:id/stage", module: "deals", notes: "Closed Won/Lost final" },
  { method: "DELETE", path: "/deals/:id", module: "deals" },

  // Tasks
  { method: "GET", path: "/tasks/board", module: "tasks" },
  { method: "GET", path: "/tasks", module: "tasks" },
  { method: "GET", path: "/tasks/:id", module: "tasks" },
  { method: "POST", path: "/tasks", module: "tasks" },
  { method: "PATCH", path: "/tasks/:id", module: "tasks" },
  { method: "DELETE", path: "/tasks/:id", module: "tasks" },

  // Support
  { method: "GET", path: "/tickets", module: "tickets" },
  { method: "GET", path: "/tickets/:id", module: "tickets" },
  { method: "POST", path: "/tickets", module: "tickets" },
  { method: "PATCH", path: "/tickets/:id", module: "tickets" },
  { method: "POST", path: "/tickets/:id/status", module: "tickets", notes: "Closed can reopen" },
  { method: "DELETE", path: "/tickets/:id", module: "tickets" },

  // Rules (§28)
  { method: "GET", path: "/rules/audit", module: "rules" },
  { method: "GET", path: "/rules/recycle-bin", module: "rules" },
  { method: "POST", path: "/rules/recycle-bin/:id/restore", module: "rules" },
  { method: "DELETE", path: "/rules/recycle-bin/:id", module: "rules", notes: "Permanent purge" },
  { method: "GET", path: "/rules/permissions/me", module: "rules" },
] as const;

export type EndpointEntry = (typeof ENDPOINT_CATALOG)[number];
