/**
 * SRS §27 Settings — source of truth for all 19 sections.
 * Routes: /settings/{category.slug}/{item.slug}
 * Schema keys: `${category.slug}/${item.slug}` (avoids collisions like users, themes, api-keys)
 */

export interface SettingsSubItem {
  title: string;
  slug: string;
  /** Short hint shown on section hub / search */
  blurb?: string;
  /** Optional deep-link into a live CRM module */
  moduleHref?: string;
  moduleLabel?: string;
}

export interface SettingsCategory {
  /** SRS subsection e.g. "27.1" */
  section: string;
  title: string;
  slug: string;
  icon: string;
  description: string;
  items: SettingsSubItem[];
}

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    section: "27.1",
    title: "Organization",
    slug: "organization",
    icon: "Building2",
    description:
      "Company identity, regional defaults, branding, and white-label surfaces.",
    items: [
      { title: "Company Profile", slug: "company-profile" },
      { title: "Branding", slug: "branding" },
      { title: "Business Information", slug: "business-information" },
      { title: "Business Hours", slug: "business-hours" },
      { title: "Holidays", slug: "holidays" },
      { title: "Time Zone", slug: "time-zone" },
      { title: "Language", slug: "language" },
      { title: "Currency", slug: "currency" },
      {
        title: "Regional Settings",
        slug: "regional-settings",
        blurb: "Date / Time / Number format",
      },
      { title: "Multi-Currency", slug: "multi-currency" },
      { title: "Multi-Language", slug: "multi-language" },
      { title: "Themes", slug: "themes" },
      { title: "Dark Mode", slug: "dark-mode" },
      { title: "Accent Colors", slug: "accent-colors" },
      { title: "Sidebar Layout", slug: "sidebar-layout" },
      { title: "White Label", slug: "white-label" },
      { title: "Email Branding", slug: "email-branding" },
      { title: "Login Page Branding", slug: "login-page-branding" },
      { title: "Favicon", slug: "favicon" },
    ],
  },
  {
    section: "27.2",
    title: "Users & Access",
    slug: "users-and-access",
    icon: "Users",
    description: "People, teams, roles, permissions, and access activity.",
    items: [
      { title: "Users", slug: "users" },
      { title: "Teams", slug: "teams" },
      { title: "Departments", slug: "departments" },
      { title: "Roles", slug: "roles" },
      { title: "Permissions", slug: "permissions" },
      { title: "Reporting Hierarchy", slug: "reporting-hierarchy" },
      { title: "User Groups", slug: "user-groups" },
      { title: "Login Sessions", slug: "login-sessions" },
      { title: "User Activity", slug: "user-activity" },
    ],
  },
  {
    section: "27.3",
    title: "CRM Configuration",
    slug: "crm-configuration",
    icon: "Briefcase",
    description:
      "Pipelines, statuses, custom fields/objects, and industry presets (§3).",
    items: [
      { title: "Pipelines", slug: "pipelines" },
      { title: "Lead Statuses", slug: "lead-statuses" },
      { title: "Deal Stages", slug: "deal-stages" },
      { title: "Lead Sources", slug: "lead-sources" },
      { title: "Lost Reasons", slug: "lost-reasons" },
      { title: "Tags", slug: "tags" },
      { title: "Labels", slug: "labels" },
      { title: "Custom Fields", slug: "custom-fields" },
      { title: "Custom Objects", slug: "custom-objects" },
      { title: "Record Layouts", slug: "record-layouts" },
      { title: "Record Types", slug: "record-types" },
      { title: "Number Sequences", slug: "number-sequences" },
      { title: "Duplicate Rules", slug: "duplicate-rules" },
      { title: "Field Validation Rules", slug: "field-validation-rules" },
      {
        title: "Industry Preset",
        slug: "industry-preset",
        blurb: "Edit Section 3 industry template after setup",
      },
    ],
  },
  {
    section: "27.4",
    title: "Workflow & Automation",
    slug: "workflow-and-automation",
    icon: "GitBranch",
    description:
      "Automation engine underneath Customer Journeys (§19).",
    items: [
      {
        title: "Workflow Builder",
        slug: "workflow-builder",
        moduleHref: "/journeys",
        moduleLabel: "Open Journeys (§19)",
      },
      { title: "Workflow Templates", slug: "workflow-templates" },
      { title: "Approval Workflows", slug: "approval-workflows" },
      { title: "Assignment Rules", slug: "assignment-rules" },
      { title: "Round Robin", slug: "round-robin" },
      { title: "SLA Rules", slug: "sla-rules" },
      { title: "Escalation Rules", slug: "escalation-rules" },
      { title: "Scheduled Jobs", slug: "scheduled-jobs" },
      { title: "Automation Logs", slug: "automation-logs" },
    ],
  },
  {
    section: "27.5",
    title: "Communication",
    slug: "communication",
    icon: "MessageSquare",
    description:
      "Email/SMS/WhatsApp channels plus social connections for Unified Inbox (§10.4).",
    items: [
      { title: "Email Accounts", slug: "email-accounts" },
      { title: "SMTP", slug: "smtp" },
      { title: "IMAP", slug: "imap" },
      { title: "Email Signatures", slug: "email-signatures" },
      { title: "Sender Profiles", slug: "sender-profiles" },
      { title: "Sending Domains", slug: "sending-domains" },
      { title: "Phone Numbers", slug: "phone-numbers" },
      { title: "SMS Providers", slug: "sms-providers" },
      { title: "WhatsApp", slug: "whatsapp" },
      { title: "Call Settings", slug: "call-settings" },
      { title: "Calendar Settings", slug: "calendar-settings" },
      {
        title: "Facebook Page",
        slug: "facebook-page",
        moduleHref: "/marketing/inbox",
        moduleLabel: "Open Unified Inbox",
      },
      {
        title: "Instagram Business",
        slug: "instagram-business",
        moduleHref: "/marketing/inbox",
        moduleLabel: "Open Unified Inbox",
      },
      {
        title: "WhatsApp Business",
        slug: "whatsapp-business",
        moduleHref: "/marketing/inbox",
        moduleLabel: "Open Unified Inbox",
      },
    ],
  },
  {
    section: "27.6",
    title: "Templates",
    slug: "templates",
    icon: "FileText",
    description: "Central template library (§25).",
    items: [
      { title: "Email Templates", slug: "email-templates" },
      { title: "SMS Templates", slug: "sms-templates" },
      { title: "WhatsApp Templates", slug: "whatsapp-templates" },
      { title: "Message Templates", slug: "message-templates" },
      { title: "Document Templates", slug: "document-templates" },
      { title: "Proposal Templates", slug: "proposal-templates" },
      { title: "Quote Templates", slug: "quote-templates" },
      { title: "Invoice Templates", slug: "invoice-templates" },
      { title: "Task Templates", slug: "task-templates" },
      { title: "Workflow Templates", slug: "workflow-templates" },
    ],
  },
  {
    section: "27.7",
    title: "Forms & Client Experience",
    slug: "forms-and-client-experience",
    icon: "Layout",
    description: "Public capture surfaces, broker pages, portal, and domains.",
    items: [
      {
        title: "Forms",
        slug: "forms",
        moduleHref: "/marketing/forms",
        moduleLabel: "Open Forms module",
      },
      { title: "Form Themes", slug: "form-themes" },
      {
        title: "Linktree",
        slug: "linktree",
        moduleHref: "/marketing/linktree",
        moduleLabel: "Open Broker pages",
      },
      {
        title: "Client Portal",
        slug: "client-portal",
        moduleHref: "/portals",
        moduleLabel: "Open Client Portal",
      },
      { title: "Public Pages", slug: "public-pages" },
      { title: "Custom Domains", slug: "custom-domains" },
    ],
  },
  {
    section: "27.8",
    title: "Finance",
    slug: "finance",
    icon: "DollarSign",
    description: "Tax, quote/invoice defaults, gateways, and pricing rules.",
    items: [
      { title: "Taxes", slug: "taxes" },
      {
        title: "Invoice Settings",
        slug: "invoice-settings",
        moduleHref: "/finance/invoices",
        moduleLabel: "Open Invoices",
      },
      {
        title: "Quote Settings",
        slug: "quote-settings",
        moduleHref: "/finance/quotations",
        moduleLabel: "Open Quotations",
      },
      { title: "Payment Gateways", slug: "payment-gateways" },
      { title: "Commission Rules", slug: "commission-rules" },
      {
        title: "Product Categories",
        slug: "product-categories",
        moduleHref: "/finance/products",
        moduleLabel: "Open Items / Services",
      },
      { title: "Pricing Rules", slug: "pricing-rules" },
    ],
  },
  {
    section: "27.9",
    title: "AI",
    slug: "ai",
    icon: "Cpu",
    description: "Providers, models, prompts, permissions, usage & logs (§24.6).",
    items: [
      { title: "AI Providers", slug: "ai-providers" },
      { title: "AI Models", slug: "ai-models" },
      { title: "AI Prompts", slug: "ai-prompts" },
      { title: "AI Templates", slug: "ai-templates" },
      { title: "AI Permissions", slug: "ai-permissions" },
      { title: "AI Usage / Credits", slug: "ai-usage-credits" },
      { title: "AI Logs", slug: "ai-logs" },
    ],
  },
  {
    section: "27.10",
    title: "Integrations",
    slug: "integrations",
    icon: "Puzzle",
    description:
      "Productivity, calendar, accounting, storage, automation, and API access.",
    items: [
      { title: "Google", slug: "google" },
      { title: "Microsoft 365", slug: "microsoft-365" },
      { title: "Outlook", slug: "outlook" },
      { title: "Gmail", slug: "gmail" },
      { title: "Google Calendar", slug: "google-calendar" },
      { title: "Outlook Calendar", slug: "outlook-calendar" },
      { title: "Zoom", slug: "zoom" },
      { title: "Microsoft Teams", slug: "microsoft-teams" },
      { title: "Twilio", slug: "twilio" },
      { title: "Stripe", slug: "stripe" },
      { title: "Xero", slug: "xero" },
      { title: "MYOB", slug: "myob" },
      { title: "QuickBooks", slug: "quickbooks" },
      { title: "Google Drive", slug: "google-drive" },
      { title: "OneDrive", slug: "onedrive" },
      { title: "Dropbox", slug: "dropbox" },
      { title: "Zapier", slug: "zapier" },
      { title: "Make", slug: "make" },
      { title: "Webhooks", slug: "webhooks" },
      { title: "API Keys", slug: "api-keys" },
      { title: "OAuth Apps", slug: "oauth-apps" },
    ],
  },
  {
    section: "27.11",
    title: "Security",
    slug: "security",
    icon: "Shield",
    description: "Auth, session, audit, encryption, privacy, and consent.",
    items: [
      { title: "Password Policy", slug: "password-policy" },
      { title: "Two-Factor Authentication", slug: "two-factor-authentication" },
      { title: "Single Sign-On (SSO)", slug: "single-sign-on" },
      { title: "IP Restrictions", slug: "ip-restrictions" },
      { title: "Device Management", slug: "device-management" },
      { title: "Session Timeout", slug: "session-timeout" },
      { title: "Login History", slug: "login-history" },
      { title: "Audit Logs", slug: "audit-logs" },
      { title: "Encryption", slug: "encryption" },
      { title: "Data Retention", slug: "data-retention" },
      { title: "GDPR Settings", slug: "gdpr-settings" },
      { title: "Privacy & Consent", slug: "privacy-and-consent" },
      { title: "Cookie Management", slug: "cookie-management" },
      { title: "Data Residency", slug: "data-residency" },
      { title: "Consent Management", slug: "consent-management" },
    ],
  },
  {
    section: "27.12",
    title: "Notifications",
    slug: "notifications",
    icon: "Bell",
    description: "Channel defaults, rules, digests, and mobile push.",
    items: [
      { title: "Email", slug: "email-notifications" },
      { title: "SMS", slug: "sms-notifications" },
      { title: "Push", slug: "push-notifications" },
      {
        title: "In-App Notifications",
        slug: "in-app-notifications",
        moduleHref: "/notifications",
        moduleLabel: "Open Notifications center",
      },
      { title: "Notification Rules", slug: "notification-rules" },
      { title: "Mentions", slug: "mentions" },
      { title: "Digest Settings", slug: "digest-settings" },
      { title: "Push Notification Settings", slug: "push-notification-settings" },
      { title: "Mobile App Settings", slug: "mobile-app-settings" },
    ],
  },
  {
    section: "27.13",
    title: "Reports & Analytics",
    slug: "reports-and-analytics",
    icon: "BarChart3",
    description: "Dashboards, report templates, schedules, and KPI targets.",
    items: [
      { title: "Dashboard Builder", slug: "dashboard-builder" },
      { title: "Report Templates", slug: "report-templates" },
      { title: "Scheduled Reports", slug: "scheduled-reports" },
      { title: "KPI Targets", slug: "kpi-targets" },
      { title: "Forecast Settings", slug: "forecast-settings" },
      { title: "Dashboard Layout", slug: "dashboard-layout" },
    ],
  },
  {
    section: "27.14",
    title: "Data Management",
    slug: "data-management",
    icon: "Database",
    description: "Import/export, backup, archive, recycle, and storage.",
    items: [
      { title: "Import Data", slug: "import-data" },
      { title: "Export Data", slug: "export-data" },
      { title: "Backup & Restore", slug: "backup-and-restore" },
      { title: "Archive", slug: "archive" },
      { title: "Recycle Bin", slug: "recycle-bin" },
      { title: "Merge Records", slug: "merge-records" },
      { title: "Storage Usage", slug: "storage-usage" },
      { title: "Scheduled Backups", slug: "scheduled-backups" },
      { title: "Restore Points", slug: "restore-points" },
    ],
  },
  {
    section: "27.15",
    title: "Marketplace",
    slug: "marketplace",
    icon: "Store",
    description: "Installed apps, extensions, themes, and template marketplace (§25.6).",
    items: [
      { title: "Installed Apps", slug: "installed-apps" },
      { title: "Marketplace", slug: "marketplace" },
      { title: "Extensions", slug: "extensions" },
      { title: "Themes", slug: "themes" },
      { title: "Template Marketplace", slug: "template-marketplace" },
    ],
  },
  {
    section: "27.16",
    title: "Subscription & Billing",
    slug: "subscription-and-billing",
    icon: "CreditCard",
    description: "Plan, seats, storage, usage, payment methods, and invoices.",
    items: [
      { title: "Subscription Plan", slug: "subscription-plan" },
      { title: "Users", slug: "users" },
      { title: "Storage", slug: "storage" },
      { title: "Usage", slug: "usage" },
      { title: "Billing", slug: "billing" },
      { title: "Payment Methods", slug: "payment-methods" },
      { title: "Invoices", slug: "invoices" },
      { title: "Add-ons", slug: "add-ons" },
    ],
  },
  {
    section: "27.17",
    title: "Developer",
    slug: "developer",
    icon: "Code",
    description: "API keys, OAuth apps, webhooks, SDK, and event logs.",
    items: [
      { title: "API Keys", slug: "api-keys" },
      { title: "OAuth Apps", slug: "oauth-apps" },
      { title: "Webhooks", slug: "webhooks" },
      { title: "SDK", slug: "sdk" },
      { title: "Event Logs", slug: "event-logs" },
      { title: "API Usage", slug: "api-usage" },
      { title: "Custom Scripts", slug: "custom-scripts" },
    ],
  },
  {
    section: "27.18",
    title: "System",
    slug: "system",
    icon: "Settings",
    description:
      "Feature flags, queues, health, modules, and search index.",
    items: [
      { title: "Feature Flags", slug: "feature-flags" },
      { title: "Maintenance Mode", slug: "maintenance-mode" },
      {
        title: "Queue Monitor",
        slug: "queue-monitor",
        blurb: "Email / SMS / Workflow queues",
      },
      { title: "Background Jobs", slug: "background-jobs" },
      { title: "System Health", slug: "system-health" },
      { title: "Error Logs", slug: "error-logs" },
      { title: "Version", slug: "version" },
      { title: "Enable/Disable Modules", slug: "enable-disable-modules" },
      { title: "Beta Features", slug: "beta-features" },
      { title: "Experimental Features", slug: "experimental-features" },
      { title: "Global Search Settings", slug: "global-search-settings" },
      { title: "Search Index", slug: "search-index" },
    ],
  },
  {
    section: "27.19",
    title: "Help & Support",
    slug: "help-and-support",
    icon: "HelpCircle",
    description: "Knowledge base, training, tickets, and release notes.",
    items: [
      { title: "Knowledge Base", slug: "knowledge-base" },
      { title: "Product Updates", slug: "product-updates" },
      { title: "Training", slug: "training" },
      {
        title: "Support Tickets",
        slug: "support-tickets",
        moduleHref: "/support",
        moduleLabel: "Open Support module",
      },
      { title: "Contact Support", slug: "contact-support" },
      { title: "Release Notes", slug: "release-notes" },
    ],
  },
];

/** Top-right Settings chrome (SRS “Top Right of Settings”). */
export const SETTINGS_TOOLBAR = [
  { id: "search", label: "Search Settings" },
  { id: "favorites", label: "Favorites" },
  { id: "audit", label: "Audit History" },
  { id: "quick-create", label: "Quick Create" },
  { id: "help", label: "Help" },
  { id: "preferences", label: "My Preferences" },
] as const;

/** My Preferences facets (profile, signature, password, notifications, theme). */
export const MY_PREFERENCES_TABS = [
  { id: "profile", title: "Profile", slug: "profile" },
  { id: "signature", title: "Signature", slug: "signature" },
  { id: "password", title: "Password", slug: "password" },
  { id: "notifications", title: "Notifications", slug: "notifications" },
  { id: "theme", title: "Theme", slug: "theme" },
] as const;

/** Legacy slugs → current SRS destinations (bookmarks / old smoke). */
export const SETTINGS_REDIRECTS: Record<string, { category: string; subpage: string }> = {
  "organization/date-format": {
    category: "organization",
    subpage: "regional-settings",
  },
  "organization/time-format": {
    category: "organization",
    subpage: "regional-settings",
  },
  "organization/number-format": {
    category: "organization",
    subpage: "regional-settings",
  },
  "ai/ai-usage": { category: "ai", subpage: "ai-usage-credits" },
  "ai/ai-credits": { category: "ai", subpage: "ai-usage-credits" },
  "system/email-queue": { category: "system", subpage: "queue-monitor" },
  "system/sms-queue": { category: "system", subpage: "queue-monitor" },
  "system/workflow-queue": { category: "system", subpage: "queue-monitor" },
};

export function settingsSchemaKey(categorySlug: string, subpageSlug: string) {
  return `${categorySlug}/${subpageSlug}`;
}

export function findSettingsCategory(slug: string) {
  return SETTINGS_CATEGORIES.find((c) => c.slug === slug);
}

export function findSettingsPage(categorySlug: string, subpageSlug: string) {
  const category = findSettingsCategory(categorySlug);
  if (!category) return null;
  const item = category.items.find((i) => i.slug === subpageSlug);
  if (!item) return null;
  return { category, item };
}

export function allSettingsPaths() {
  return SETTINGS_CATEGORIES.flatMap((c) =>
    c.items.map((i) => ({
      href: `/settings/${c.slug}/${i.slug}`,
      category: c,
      item: i,
      key: settingsSchemaKey(c.slug, i.slug),
    })),
  );
}

export function settingsCoverageStats() {
  const sections = SETTINGS_CATEGORIES.length;
  const pages = SETTINGS_CATEGORIES.reduce((n, c) => n + c.items.length, 0);
  return { sections, pages };
}
