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

  // Companies (JWT; workspace via token claim)
  { method: "GET", path: "/companies", module: "companies", notes: "List workspace companies" },
  { method: "GET", path: "/companies/:id", module: "companies" },
  { method: "POST", path: "/companies", module: "companies" },
  { method: "PATCH", path: "/companies/:id", module: "companies" },
  { method: "DELETE", path: "/companies/:id", module: "companies", notes: "Soft-delete → recycle bin" },
  { method: "POST", path: "/companies/bulk", module: "companies", notes: "Bounded atomic bulk ops" },
  { method: "POST", path: "/companies/import", module: "companies", notes: "Queue JSON import" },
  { method: "POST", path: "/companies/export", module: "companies", notes: "Queue export task" },
  { method: "POST", path: "/companies/:id/merge", module: "companies", notes: "Merge source into survivor" },
  {
    method: "GET",
    path: "/companies/transfers/:transferId",
    module: "companies",
    notes: "Transfer job status",
  },

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

  // Calls (workspace JWT preferred; lifecycle POSTs on /calls/:id/*)
  { method: "GET", path: "/calls", module: "calls", notes: "Paginated call list" },
  { method: "GET", path: "/calls/upcoming", module: "calls" },
  { method: "GET", path: "/calls/history", module: "calls" },
  { method: "GET", path: "/calls/:id", module: "calls" },
  { method: "POST", path: "/calls", module: "calls", notes: "Schedule or log a call" },
  { method: "PATCH", path: "/calls/:id", module: "calls" },
  { method: "DELETE", path: "/calls/:id", module: "calls", notes: "Soft-delete" },
  { method: "POST", path: "/calls/:id/start", module: "calls" },
  { method: "POST", path: "/calls/:id/complete", module: "calls" },
  { method: "POST", path: "/calls/:id/cancel", module: "calls" },
  { method: "POST", path: "/calls/:id/reschedule", module: "calls" },
  { method: "POST", path: "/calls/:id/log-outcome", module: "calls" },
  { method: "GET", path: "/workspaces/:workspaceId/calls", module: "calls" },
  { method: "GET", path: "/workspaces/:workspaceId/calls/upcoming", module: "calls" },
  { method: "GET", path: "/workspaces/:workspaceId/calls/history", module: "calls" },
  { method: "GET", path: "/workspaces/:workspaceId/calls/:id", module: "calls" },
  {
    method: "GET",
    path: "/workspaces/:workspaceId/:relatedType/:relatedId/calls",
    module: "calls",
  },
  { method: "PATCH", path: "/workspaces/:workspaceId/calls/:id", module: "calls" },
  { method: "DELETE", path: "/workspaces/:workspaceId/calls/:id", module: "calls" },
  { method: "POST", path: "/workspaces/:workspaceId/calls/:id/start", module: "calls" },
  {
    method: "POST",
    path: "/workspaces/:workspaceId/calls/:id/complete",
    module: "calls",
  },
  { method: "POST", path: "/workspaces/:workspaceId/calls/:id/cancel", module: "calls" },
  {
    method: "POST",
    path: "/workspaces/:workspaceId/calls/:id/reschedule",
    module: "calls",
  },
  {
    method: "POST",
    path: "/workspaces/:workspaceId/calls/:id/log-outcome",
    module: "calls",
  },

  // Work Queue (workspace-scoped; current member, read-only)
  {
    method: "GET",
    path: "/workspaces/:workspaceId/work-queue",
    module: "work-queue",
    notes: "Bounded normalized queue; query: page, limit, type, status, priority, assigneeId, from, to",
  },

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
  { method: "GET", path: "/audit-logs", module: "audit-logs", notes: "Paginated audit trail; query: page, limit, search, action, entityType" },

  // Workspace settings (JWT; workspace via token claim)
  { method: "GET", path: "/settings", module: "settings", notes: "Get workspace settings" },
  { method: "PATCH", path: "/settings", module: "settings", notes: "Update workspace settings" },
  { method: "GET", path: "/settings/security", module: "settings", notes: "Safe security subset" },
  { method: "GET", path: "/settings/capabilities", module: "settings", notes: "Enabled modules" },
  { method: "POST", path: "/settings/smtp-test", module: "settings", notes: "Queue SMTP connectivity test" },
  { method: "GET", path: "/settings/smtp-test/:jobId", module: "settings", notes: "SMTP test job status" },

  // Campaigns (email/SMS; JWT required)
  { method: "GET", path: "/campaigns", module: "campaigns", notes: "List email/SMS campaigns" },
  { method: "GET", path: "/campaigns/:id", module: "campaigns" },
  { method: "POST", path: "/campaigns", module: "campaigns", notes: "Create email or SMS campaign" },
  { method: "PATCH", path: "/campaigns/:id", module: "campaigns" },
  { method: "DELETE", path: "/campaigns/:id", module: "campaigns", notes: "Soft-delete" },
  { method: "POST", path: "/campaigns/:id/launch", module: "campaigns" },

  // Team Chat (workspace-scoped)
  {
    method: "GET",
    path: "/workspaces/:workspaceId/chat/conversations",
    module: "team-chat",
    notes: "List participant conversations",
  },
  {
    method: "POST",
    path: "/workspaces/:workspaceId/chat/conversations",
    module: "team-chat",
    notes: "Create or reuse conversation",
  },
  {
    method: "GET",
    path: "/workspaces/:workspaceId/chat/conversations/:conversationId",
    module: "team-chat",
  },
  {
    method: "PATCH",
    path: "/workspaces/:workspaceId/chat/conversations/:conversationId",
    module: "team-chat",
    notes: "Update group as owner",
  },
  {
    method: "DELETE",
    path: "/workspaces/:workspaceId/chat/conversations/:conversationId",
    module: "team-chat",
    notes: "Soft-delete as owner",
  },
  {
    method: "POST",
    path: "/workspaces/:workspaceId/chat/conversations/:conversationId/members",
    module: "team-chat",
  },
  {
    method: "DELETE",
    path: "/workspaces/:workspaceId/chat/conversations/:conversationId/members/:userId",
    module: "team-chat",
  },
  {
    method: "GET",
    path: "/workspaces/:workspaceId/chat/conversations/:conversationId/messages",
    module: "team-chat",
    notes: "Cursor-paginated messages",
  },
  {
    method: "POST",
    path: "/workspaces/:workspaceId/chat/conversations/:conversationId/messages",
    module: "team-chat",
  },
  {
    method: "POST",
    path: "/workspaces/:workspaceId/chat/conversations/:conversationId/read",
    module: "team-chat",
  },
  {
    method: "PATCH",
    path: "/workspaces/:workspaceId/chat/messages/:messageId",
    module: "team-chat",
    notes: "Edit within policy window",
  },
  {
    method: "DELETE",
    path: "/workspaces/:workspaceId/chat/messages/:messageId",
    module: "team-chat",
  },
  {
    method: "POST",
    path: "/workspaces/:workspaceId/chat/messages/:messageId/read",
    module: "team-chat",
  },
  {
    method: "POST",
    path: "/workspaces/:workspaceId/chat/messages/:messageId/reactions",
    module: "team-chat",
  },
  {
    method: "DELETE",
    path: "/workspaces/:workspaceId/chat/messages/:messageId/reactions/:reaction",
    module: "team-chat",
  },
  {
    method: "GET",
    path: "/workspaces/:workspaceId/chat/unread-count",
    module: "team-chat",
  },

  // Client portals
  { method: "GET", path: "/client-portals", module: "client-portals" },
  { method: "GET", path: "/client-portals/:id", module: "client-portals" },
  { method: "POST", path: "/client-portals", module: "client-portals" },
  { method: "PATCH", path: "/client-portals/:id", module: "client-portals" },
  { method: "DELETE", path: "/client-portals/:id", module: "client-portals", notes: "Soft-delete" },
  {
    method: "POST",
    path: "/client-portals/:id/reset-password",
    module: "client-portals",
    notes: "Email password reset to primary contact",
  },

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

  // Analytics (workspace JWT required; query widget= enum)
  {
    method: "GET",
    path: "/analytics",
    module: "analytics",
    notes:
      "Widget KPI; query: widget, startDate, endDate, comparePeriod=previous_period|previous_year",
  },

  // Platform admin
  {
    method: "GET",
    path: "/admin/workspaces",
    module: "admin",
    notes: "ADMIN only; paginated workspace list",
  },
  {
    method: "DELETE",
    path: "/admin/user/:id",
    module: "admin",
    notes: "ADMIN only; delete a user",
  },

  // Calendar (GET-only; JWT required; prefer workspace-scoped so claim matches URL)
  {
    method: "GET",
    path: "/calendar",
    module: "calendar",
    notes: "Normalized events in a bounded from/to range",
  },
  {
    method: "GET",
    path: "/calendar/events",
    module: "calendar",
    notes: "Alias of /calendar (bounded range)",
  },
  {
    method: "GET",
    path: "/calendar/day",
    module: "calendar",
    notes: "Timezone-aware day view; query: date, timezone",
  },
  {
    method: "GET",
    path: "/calendar/week",
    module: "calendar",
    notes: "Monday–Sunday week; query: date, timezone",
  },
  {
    method: "GET",
    path: "/calendar/month",
    module: "calendar",
    notes: "Timezone-aware month; query: year, month, timezone",
  },
  {
    method: "GET",
    path: "/calendar/upcoming",
    module: "calendar",
    notes: "Next 30 calendar days",
  },
  {
    method: "GET",
    path: "/calendar/conflicts",
    module: "calendar",
    notes: "Overlapping accessible non-cancelled events",
  },
  {
    method: "GET",
    path: "/workspaces/:workspaceId/calendar",
    module: "calendar",
  },
  {
    method: "GET",
    path: "/workspaces/:workspaceId/calendar/events",
    module: "calendar",
  },
  {
    method: "GET",
    path: "/workspaces/:workspaceId/calendar/day",
    module: "calendar",
  },
  {
    method: "GET",
    path: "/workspaces/:workspaceId/calendar/week",
    module: "calendar",
  },
  {
    method: "GET",
    path: "/workspaces/:workspaceId/calendar/month",
    module: "calendar",
  },
  {
    method: "GET",
    path: "/workspaces/:workspaceId/calendar/upcoming",
    module: "calendar",
  },
  {
    method: "GET",
    path: "/workspaces/:workspaceId/calendar/conflicts",
    module: "calendar",
  },
] as const;

/** Screenshot APIs from live Swagger (Activity Timeline + admin + analytics). */
export const SCREENSHOT_ENDPOINTS = [
  {
    key: "workspaceTimeline",
    method: "GET",
    path: "/v1/workspaces/:workspaceId/activity-timeline",
    module: "activity-timeline",
  },
  {
    key: "parentTimeline",
    method: "GET",
    path: "/v1/workspaces/:workspaceId/:relatedType/:relatedId/activity-timeline",
    module: "activity-timeline",
  },
  {
    key: "adminWorkspaces",
    method: "GET",
    path: "/v1/admin/workspaces",
    module: "admin",
  },
  {
    key: "adminDeleteUser",
    method: "DELETE",
    path: "/v1/admin/user/:id",
    module: "admin",
  },
  {
    key: "analyticsWidget",
    method: "GET",
    path: "/v1/analytics",
    module: "analytics",
  },
] as const;

export type EndpointEntry = (typeof ENDPOINT_CATALOG)[number];
