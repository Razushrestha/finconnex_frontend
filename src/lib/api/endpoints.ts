/**
 * Canonical REST catalog for the backend team.
 * All paths are relative to {NEXT_PUBLIC_API_BASE_URL}/v1
 */

export const ENDPOINT_CATALOG = [
  // Auth
  { method: "POST", path: "/auth/login", module: "auth", notes: "Public; returns access + refresh tokens" },
  { method: "POST", path: "/auth/refresh-token", module: "auth", notes: "Bearer refreshToken" },
  { method: "GET", path: "/auth/me", module: "auth" },
  { method: "GET", path: "/auth/sessions", module: "auth" },
  { method: "DELETE", path: "/auth/sessions/:id", module: "auth" },
  { method: "POST", path: "/auth/workspace", module: "auth", notes: "Select workspace; returns scoped access token" },
  { method: "POST", path: "/auth/logout", module: "auth" },
  { method: "POST", path: "/auth/logout-all", module: "auth" },

  // Leads
  { method: "GET", path: "/leads/kanban", module: "leads", notes: "Kanban columns grouped by CRM status" },
  { method: "GET", path: "/leads", module: "leads", notes: "Paginated list" },
  { method: "GET", path: "/leads/:id", module: "leads" },
  { method: "POST", path: "/leads", module: "leads" },
  { method: "PATCH", path: "/leads/:id", module: "leads" },
  { method: "PATCH", path: "/leads/:id/owner", module: "leads" },
  { method: "DELETE", path: "/leads/:id/owner", module: "leads" },
  { method: "PATCH", path: "/leads/:id/company", module: "leads" },
  { method: "DELETE", path: "/leads/:id/company", module: "leads" },
  { method: "PATCH", path: "/leads/:id/status", module: "leads" },
  { method: "PATCH", path: "/leads/:id/lifecycle-stage", module: "leads" },
  { method: "PATCH", path: "/leads/:id/rating", module: "leads" },
  { method: "PATCH", path: "/leads/:id/score", module: "leads" },
  { method: "POST", path: "/leads/bulk", module: "leads" },
  { method: "POST", path: "/leads/import", module: "leads", notes: "JSON rows, max 100" },
  { method: "POST", path: "/leads/:id/convert", module: "leads", notes: "Requires existing contact/deal/company UUID" },
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

  // Activity Timeline (workspace-scoped; requires JWT workspaceId)
  {
    method: "GET",
    path: "/workspaces/:workspaceId/activity-timeline",
    module: "activity-timeline",
    notes: "Workspace feed; query: page, limit, type, from, to",
  },
  {
    method: "GET",
    path: "/workspaces/:workspaceId/:relatedType/:relatedId/activity-timeline",
    module: "activity-timeline",
    notes: "Parent feed; relatedType=LEAD|CONTACT|COMPANY|DEAL|…",
  },
] as const;

export type EndpointEntry = (typeof ENDPOINT_CATALOG)[number];
