export type SettingsNavLink = {
  title: string;
  blurb: string;
  href: string;
  /** Dedicated Nest / CRM client — not a catalog-only form. */
  live?: boolean;
};

export type SettingsNavGroup = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: SettingsNavIcon;
  links: SettingsNavLink[];
};

export type SettingsNavIcon =
  | "workspace"
  | "people"
  | "pipeline"
  | "automation"
  | "channels"
  | "data"
  | "billing"
  | "me"
  | "documents";

/** Operator control panel — the Settings home and left rail. */
export const SETTINGS_CONTROL_PANEL: SettingsNavGroup[] = [
  {
    id: "workspace",
    title: "Workspace",
    description: "Identity, brand, locale, and opening hours for this tenant.",
    href: "/settings/organization",
    icon: "workspace",
    links: [
      {
        title: "Company",
        blurb: "Name, address, and contacts",
        href: "/settings/organization/company-profile",
        live: true,
      },
      {
        title: "Branding",
        blurb: "Colours, logos, and product name",
        href: "/settings/organization/branding",
        live: true,
      },
      {
        title: "Locale",
        blurb: "Timezone, currency, and formats",
        href: "/settings/organization/regional-settings",
        live: true,
      },
      {
        title: "Hours & holidays",
        blurb: "When the office is open",
        href: "/settings/organization/business-hours",
      },
      {
        title: "Holidays",
        blurb: "Closures and public holidays",
        href: "/settings/organization/holidays",
      },
    ],
  },
  {
    id: "people",
    title: "People & access",
    description: "Who can sign in, what they see, and how sessions are locked.",
    href: "/settings/users-and-access",
    icon: "people",
    links: [
      {
        title: "Users",
        blurb: "Invite, roles, and deactivate",
        href: "/settings/users-and-access/users",
        live: true,
      },
      {
        title: "Workspaces",
        blurb: "Memberships for this account",
        href: "/settings/users-and-access/workspaces",
        live: true,
      },
      {
        title: "Permissions",
        blurb: "Field-level access",
        href: "/settings/users-and-access/permissions",
        live: true,
      },
      {
        title: "Two-factor",
        blurb: "TOTP for your account",
        href: "/settings/security/two-factor-authentication",
        live: true,
      },
      {
        title: "IP & sessions",
        blurb: "Allow-list and active logins",
        href: "/settings/security/ip-restrictions",
        live: true,
      },
      {
        title: "Login history",
        blurb: "Failed and recent sign-ins",
        href: "/settings/security/login-history",
        live: true,
      },
      {
        title: "Audit log",
        blurb: "Who changed what",
        href: "/settings/security/audit-logs",
        live: true,
      },
    ],
  },
  {
    id: "pipeline",
    title: "Pipeline & fields",
    description: "How leads and deals move, and which fields sit on the card.",
    href: "/settings/crm-configuration",
    icon: "pipeline",
    links: [
      {
        title: "Pipelines & SLA",
        blurb: "Mortgage stage clocks",
        href: "/settings/crm-configuration/pipelines",
        live: true,
      },
      {
        title: "Lead card",
        blurb: "Kanban card layout",
        href: "/settings/crm-configuration/lead-card",
        live: true,
      },
      {
        title: "Custom fields",
        blurb: "Workspace field catalog",
        href: "/settings/crm-configuration/custom-fields",
        live: true,
      },
      {
        title: "Lost reasons",
        blurb: "Closed-lost values",
        href: "/settings/crm-configuration/lost-reasons",
        live: true,
      },
      {
        title: "Lead statuses",
        blurb: "CRM LeadStatus list",
        href: "/settings/crm-configuration/lead-statuses",
        live: true,
      },
      {
        title: "Deal stages",
        blurb: "CRM DealStage list",
        href: "/settings/crm-configuration/deal-stages",
        live: true,
      },
      {
        title: "Lead sources",
        blurb: "CRM LeadSource list",
        href: "/settings/crm-configuration/lead-sources",
        live: true,
      },
    ],
  },
  {
    id: "automation",
    title: "Automation & SLA",
    description: "Routing, ticket deadlines, and workflow runs.",
    href: "/settings/workflow-and-automation",
    icon: "automation",
    links: [
      {
        title: "Workflows",
        blurb: "Builder and rules",
        href: "/settings/workflow-and-automation/workflow-builder",
        live: true,
      },
      {
        title: "Assignment",
        blurb: "Round-robin and territory",
        href: "/settings/workflow-and-automation/assignment-rules",
        live: true,
      },
      {
        title: "Ticket SLA",
        blurb: "Response and resolve clocks",
        href: "/settings/workflow-and-automation/sla-rules",
        live: true,
      },
      {
        title: "Automation logs",
        blurb: "Recent runs",
        href: "/settings/workflow-and-automation/automation-logs",
        live: true,
      },
    ],
  },
  {
    id: "channels",
    title: "Email & calendar",
    description: "Outbound mail, signatures, and calendar sync.",
    href: "/settings/communication",
    icon: "channels",
    links: [
      {
        title: "SMTP",
        blurb: "Workspace outbound mail",
        href: "/settings/communication/smtp",
        live: true,
      },
      {
        title: "Email signatures",
        blurb: "Default send-from footer",
        href: "/settings/communication/email-signatures",
        live: true,
      },
      {
        title: "Google Calendar",
        blurb: "Connect Google",
        href: "/settings/integrations/google-calendar",
        live: true,
      },
      {
        title: "Outlook Calendar",
        blurb: "Connect Outlook",
        href: "/settings/integrations/outlook-calendar",
        live: true,
      },
      {
        title: "Calendly",
        blurb: "Booking links",
        href: "/settings/integrations/calendly",
        live: true,
      },
    ],
  },
  {
    id: "documents",
    title: "Documents",
    description: "Library packs, requests, and e-signature.",
    href: "/documents/library",
    icon: "documents",
    links: [
      {
        title: "Library",
        blurb: "Stored files and packs",
        href: "/documents/library",
        live: true,
      },
      {
        title: "Requests",
        blurb: "Ask clients for documents",
        href: "/documents/requests",
        live: true,
      },
      {
        title: "E-signature",
        blurb: "Send and track signing",
        href: "/signature",
        live: true,
      },
      {
        title: "Templates",
        blurb: "Reusable signing packs",
        href: "/signature/templates",
        live: true,
      },
    ],
  },
  {
    id: "data",
    title: "Data",
    description: "Backups, recycle bin, and notifications.",
    href: "/settings/data-management",
    icon: "data",
    links: [
      {
        title: "Backup & restore",
        blurb: "Workspace snapshots",
        href: "/settings/data-management/backup-and-restore",
        live: true,
      },
      {
        title: "Recycle bin",
        blurb: "Restore deleted records",
        href: "/settings/data-management/recycle-bin",
        live: true,
      },
      {
        title: "Notifications",
        blurb: "In-app and email defaults",
        href: "/settings/notifications/in-app-notifications",
        live: true,
      },
    ],
  },
  {
    id: "billing",
    title: "Plan & modules",
    description: "Subscription, invoices, and which CRM modules are on.",
    href: "/settings/subscription-and-billing",
    icon: "billing",
    links: [
      {
        title: "Subscription",
        blurb: "Plan and invoices",
        href: "/settings/subscription-and-billing/subscription-plan",
        live: true,
      },
      {
        title: "Modules",
        blurb: "Leads, deals, projects, posts",
        href: "/settings/system/enable-disable-modules",
        live: true,
      },
    ],
  },
  {
    id: "me",
    title: "My preferences",
    description: "Your profile, signature, password, and theme.",
    href: "/settings/my-preferences",
    icon: "me",
    links: [
      {
        title: "Profile & theme",
        blurb: "Personal overrides only",
        href: "/settings/my-preferences",
        live: true,
      },
    ],
  },
];

export function settingsControlPanelPaths(): string[] {
  return SETTINGS_CONTROL_PANEL.flatMap((group) =>
    group.links.map((link) => link.href),
  );
}

export function settingsGroupForPath(pathname: string): SettingsNavGroup | undefined {
  const path = pathname.replace(/\/$/, "") || "/settings";
  if (path === "/settings") return undefined;
  return SETTINGS_CONTROL_PANEL.find((group) => {
    if (path === group.href || path.startsWith(`${group.href}/`)) return true;
    return group.links.some(
      (link) => path === link.href || path.startsWith(`${link.href}/`),
    );
  });
}

export function settingsFeaturedHrefs(): Set<string> {
  return new Set(
    SETTINGS_CONTROL_PANEL.flatMap((group) => [
      group.href,
      ...group.links.map((link) => link.href),
    ]),
  );
}

export function settingsSubnav(
  categorySlug: string,
  currentHref: string,
): SettingsNavLink[] {
  const featured = SETTINGS_CONTROL_PANEL.flatMap((group) =>
    group.links.filter((link) =>
      link.href.startsWith(`/settings/${categorySlug}/`),
    ),
  );
  if (featured.some((link) => link.href === currentHref)) return featured;
  const extra = SETTINGS_CONTROL_PANEL.flatMap((g) => g.links).find(
    (link) => link.href === currentHref,
  );
  return extra ? [...featured, extra] : featured;
}

export function searchSettingsNav(query: string): SettingsNavLink[] {
  const q = query.trim().toLowerCase();
  const links = SETTINGS_CONTROL_PANEL.flatMap((group) =>
    group.links.map((link) => ({
      ...link,
      blurb: `${group.title} · ${link.blurb}`,
    })),
  );
  if (!q) return links;
  return links.filter(
    (link) =>
      link.title.toLowerCase().includes(q) ||
      link.blurb.toLowerCase().includes(q) ||
      link.href.toLowerCase().includes(q),
  );
}
