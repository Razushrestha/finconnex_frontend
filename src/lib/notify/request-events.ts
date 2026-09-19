/**
 * Names the event behind a browser request, for the app-wide toasts
 * (fetch-notifier.ts): `POST /v1/leads` is "Lead created", `POST
 * /v1/tasks/:id/complete` is "Task completed", `DELETE /v1/deals/:id` is
 * "Deal deleted".
 *
 * Only writes the user made are named. Reads, background sync (KV, board
 * backups, read receipts, autosaved progress), auth flows that show their own
 * messages, and look-ups sent as POST (search, preview, validate) return
 * null and stay silent.
 */

export type RequestEvent = {
  /** Groups repeats of the same event (a bulk loop) into one toast. */
  key: string;
  /** "Lead created". */
  success: string;
  /** "Couldn't create lead" — the failure toast's title. */
  failure: string;
};

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Resource segments → how the toast names one of them. */
const RESOURCE_LABELS: Record<string, string> = {
  leads: "Lead",
  contacts: "Contact",
  companies: "Company",
  deals: "Deal",
  tasks: "Task",
  calls: "Call",
  meetings: "Meeting",
  messages: "Message",
  emails: "Email",
  notes: "Note",
  reminders: "Reminder",
  documents: "Document",
  "document-requests": "Document request",
  "signature-requests": "Signature request",
  "signature-templates": "Signature template",
  invoices: "Invoice",
  quotes: "Quote",
  estimates: "Estimate",
  "credit-notes": "Credit note",
  payments: "Payment",
  products: "Product",
  tickets: "Ticket",
  campaigns: "Campaign",
  "custom-fields": "Custom field",
  "workflow-rules": "Workflow rule",
  automations: "Automation",
  "automation-folders": "Folder",
  folders: "Folder",
  members: "Member",
  "members-admin": "Member",
  invitations: "Invitation",
  tags: "Tag",
  pipelines: "Pipeline",
  stages: "Stage",
  reports: "Report",
  dashboard: "Dashboard",
  widgets: "Widget",
  "client-portals": "Client portal",
  resources: "Resource",
  attachments: "Attachment",
  followers: "Follower",
  collaborators: "Collaborator",
  assignees: "Assignee",
  attendees: "Attendee",
  replies: "Reply",
  comments: "Comment",
  "work-queue": "Work queue item",
  journeys: "Journey",
  "journey-templates": "Journey template",
  "smart-hubs": "Smart hub",
  "smart-short-links": "Short link",
  "workspace-backups": "Backup",
  "lead-assignment-rules": "Assignment rule",
  webhooks: "Webhook",
  layouts: "Layout",
  settings: "Settings",
  "company-profile": "Company profile",
  profile: "Profile",
  "notification-preferences": "Notification preferences",
  "field-permissions": "Field permissions",
  integrations: "Integration",
  connections: "Connection",
  calendly: "Calendly",
  calendar: "Calendar event",
  events: "Event",
  workspaces: "Workspace",
  user: "User",
  mortgage: "Mortgage details",
  "credit-report": "Credit report",
  recipients: "Recipient",
  records: "Record",
  "recycle-bin": "Record",
  "ownership-transfer": "Ownership transfer",
};

/** Resources that read better as "saved" than "created" or "updated". */
const SAVED_RESOURCES = new Set([
  "settings",
  "company-profile",
  "profile",
  "notification-preferences",
  "field-permissions",
  "mortgage",
  "layouts",
]);

/** A POST to these collections sends something rather than creating it. */
const SENT_ON_CREATE = new Set(["messages", "emails", "invitations", "replies"]);

/** Action segments (`/tasks/:id/complete`) → the past tense the toast uses. */
const ACTION_WORDS: Record<string, string> = {
  send: "sent",
  resend: "resent",
  remind: "reminder sent",
  restore: "restored",
  "bulk-restore": "restored",
  "bulk-delete": "deleted",
  cancel: "cancelled",
  complete: "completed",
  start: "started",
  reopen: "reopened",
  reschedule: "rescheduled",
  snooze: "snoozed",
  dismiss: "dismissed",
  convert: "converted",
  merge: "merged",
  duplicate: "duplicated",
  clone: "duplicated",
  archive: "archived",
  unarchive: "unarchived",
  approve: "approved",
  reject: "rejected",
  accept: "accepted",
  decline: "declined",
  expire: "expired",
  receive: "marked received",
  publish: "published",
  unpublish: "unpublished",
  activate: "activated",
  deactivate: "deactivated",
  enable: "enabled",
  disable: "disabled",
  launch: "launched",
  pause: "paused",
  resume: "resumed",
  run: "run started",
  retry: "retried",
  assign: "assigned",
  owner: "owner changed",
  status: "status changed",
  "pipeline-stage": "stage changed",
  "lifecycle-stage": "stage changed",
  move: "moved",
  reorder: "reordered",
  import: "imported",
  export: "exported",
  upload: "uploaded",
  "log-outcome": "outcome logged",
  dial: "call started",
  charge: "charged",
  connect: "connected",
  reconnect: "reconnected",
  disconnect: "disconnected",
  "set-default": "set as default",
  "apply-template": "template applied",
  share: "shared",
  "public-link": "link created",
  leave: "left",
  "self-sign": "signed",
  sign: "signed",
  "smtp-test": "test email sent",
  "health-check": "checked",
  rating: "rated",
  score: "scored",
  confirm: "confirmed",
  sync: "synced",
  "clear-read": "cleared",
  bulk: "updated",
};

/** Actions that name no resource of their own: "Link copied", not "Lead link copied". */
const STANDALONE_ACTIONS: Record<string, string> = {
  "smtp-test": "Test email sent",
  "clear-read": "Read notifications cleared",
};

/**
 * Segments that mark a request as a read, a look-up sent as POST, or
 * background sync. Any of these anywhere in the path keeps it silent.
 */
const SILENT_SEGMENTS = new Set([
  "kv",
  "search",
  "value-search",
  "query",
  "validate",
  "preview",
  "count",
  "unread-count",
  "stats",
  "analytics",
  "kpis",
  "forecast",
  "calculations",
  "activity-timeline",
  "activity-extras",
  "read",
  "read-all",
  "unread",
  "view",
  "seen",
  "typing",
  "presence",
  "heartbeat",
  "reactions",
  "suggest",
  "suggest-reply",
  "refresh",
  "refresh-token",
  "token",
  "public",
  "auth",
  "health",
  "capabilities",
  "sync-status",
  "download",
  "pdf",
  "chat",
  "conversations",
  "storage",
  "pay-intent",
  "initiate",
  "authorize",
  "register",
  "two-factor",
  "security",
  "usage",
  "preferences",
  "table-preferences",
  "tables",
]);

/** Next routes the browser writes to that aren't the CRM proxy. */
const APP_ROUTES: Array<{ method: string; pattern: RegExp; event: Omit<RequestEvent, "key"> }> = [
  {
    method: "POST",
    pattern: /^\/api\/auth\/workspace\/create$/,
    event: { success: "Workspace created", failure: "Couldn't create workspace" },
  },
  {
    method: "DELETE",
    pattern: /^\/api\/auth\/sessions\/[^/]+$/,
    event: { success: "Session signed out", failure: "Couldn't sign out that session" },
  },
  {
    method: "DELETE",
    pattern: /^\/api\/auth\/sessions$/,
    event: { success: "Other sessions signed out", failure: "Couldn't sign out other sessions" },
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/mail\/deliver$/,
    event: { success: "Email sent", failure: "Couldn't send email" },
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/sms$/,
    event: { success: "SMS sent", failure: "Couldn't send SMS" },
  },
  {
    method: "POST",
    pattern: /^\/api\/sign\/publish$/,
    event: { success: "Sent for signature", failure: "Couldn't send for signature" },
  },
  {
    method: "POST",
    pattern: /^\/api\/sign\/[^/]+\/sign$/,
    event: { success: "Document signed", failure: "Couldn't sign the document" },
  },
  {
    method: "POST",
    pattern: /^\/api\/sign\/[^/]+\/decline$/,
    event: { success: "Signing declined", failure: "Couldn't decline signing" },
  },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An id-like segment: a UUID, a number, an upper-case type, or a long token. */
function isId(segment: string): boolean {
  return (
    UUID.test(segment) ||
    /^\d+$/.test(segment) ||
    /^[A-Z][A-Z_]+$/.test(segment) ||
    (segment.length >= 16 && /\d/.test(segment) && !segment.includes("-"))
  );
}

function humanize(segment: string): string {
  const words = segment.replace(/[-_]+/g, " ").trim();
  const singular = words.endsWith("ies")
    ? `${words.slice(0, -3)}y`
    : words.endsWith("ses") || words.endsWith("xes")
      ? words.slice(0, -2)
      : words.endsWith("s") && !words.endsWith("ss")
        ? words.slice(0, -1)
        : words;
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

function labelFor(segment: string): string {
  return RESOURCE_LABELS[segment] ?? humanize(segment);
}

function lower(label: string): string {
  // Keep product names as written ("Calendly"); lower the rest.
  return label === "Calendly" ? label : label.charAt(0).toLowerCase() + label.slice(1);
}

/** The CRM path after `/v1/`, from a direct call or the Next CRM proxy. */
function crmSegments(pathname: string): string[] | null {
  const proxied = pathname.match(/^\/api\/auth\/crm\/(.*)$/);
  const direct = pathname.match(/\/v1\/(.*)$/);
  const rest = proxied?.[1] ?? direct?.[1];
  if (rest === undefined) return null;
  const segments = rest.split("/").filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  // `/workspaces/:id/tasks/...` is the tasks API; the prefix only scopes it.
  if (segments[0] === "workspaces" && segments.length > 2 && isId(segments[1] ?? "")) {
    return segments.slice(2);
  }
  return segments;
}

export function describeRequestEvent(method: string, url: string): RequestEvent | null {
  const verb = method.toUpperCase();
  if (!MUTATING.has(verb)) return null;

  let pathname: string;
  try {
    pathname = new URL(url, "http://local").pathname;
  } catch {
    return null;
  }

  const route = APP_ROUTES.find((r) => r.method === verb && r.pattern.test(pathname));
  if (route) return { key: `${verb} ${route.pattern.source}`, ...route.event };

  const segments = crmSegments(pathname);
  if (!segments?.length) return null;
  if (segments.some((s) => SILENT_SEGMENTS.has(s) || s.startsWith("__"))) return null;

  const words = segments.filter((s) => !isId(s));
  if (!words.length) return null;
  const last = segments[segments.length - 1];
  const lastWord = words[words.length - 1];
  const key = `${verb} ${words.join("/")}`;

  // `/tasks/:id/complete` — an action on the resource before it.
  const action = !isId(last) ? ACTION_WORDS[lastWord] : undefined;
  if (action && words.length >= 1) {
    if (STANDALONE_ACTIONS[lastWord]) {
      return { key, success: STANDALONE_ACTIONS[lastWord], failure: "Couldn't complete that" };
    }
    const resource = words.length >= 2 ? words[words.length - 2] : "records";
    const label = labelFor(resource);
    const bulk = lastWord.startsWith("bulk-") || lastWord === "bulk" || lastWord === "import";
    const noun = bulk ? `${label}s`.replace(/ys$/, "ies").replace(/ss$/, "s") : label;
    return {
      key,
      success: `${noun} ${action}`,
      failure: `Couldn't ${lastWord.replace(/^bulk-/, "").replace(/-/g, " ")} ${lower(noun)}`,
    };
  }

  // A resource itself: its collection (`/leads`) or one record (`/leads/:id`).
  const resource = lastWord;
  const label = labelFor(resource);
  const child = words.length > 1;
  if (SAVED_RESOURCES.has(resource) || (verb === "PUT" && !isId(last))) {
    return { key, success: `${label} saved`, failure: `Couldn't save ${lower(label)}` };
  }
  if (verb === "DELETE") {
    // Taken off a record (`/leads/:id/followers/:id`) rather than deleted.
    return child
      ? { key, success: `${label} removed`, failure: `Couldn't remove ${lower(label)}` }
      : { key, success: `${label} deleted`, failure: `Couldn't delete ${lower(label)}` };
  }
  if (verb === "POST" && !isId(last)) {
    if (SENT_ON_CREATE.has(resource)) {
      return { key, success: `${label} sent`, failure: `Couldn't send ${lower(label)}` };
    }
    return child
      ? { key, success: `${label} added`, failure: `Couldn't add ${lower(label)}` }
      : { key, success: `${label} created`, failure: `Couldn't create ${lower(label)}` };
  }
  return { key, success: `${label} updated`, failure: `Couldn't update ${lower(label)}` };
}

/**
 * A server error made readable: the CRM's i18n keys
 * (`automation.error.linkedContactNotFound`) become a sentence.
 */
export function readableErrorMessage(message: string): string {
  const text = message.trim();
  const key = text.match(/^[a-z][a-zA-Z]*(?:\.[a-zA-Z]+)+$/);
  if (!key) return text;
  const tail = text.split(".").pop() ?? text;
  const sentence = tail.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
