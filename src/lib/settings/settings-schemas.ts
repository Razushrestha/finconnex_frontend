/**
 * Settings field schemas: keyed by `${category}/${subpage}`.
 * Every SRS page gets a concrete form (curated override or generated defaults).
 */

import {
  SETTINGS_CATEGORIES,
  settingsSchemaKey,
  type SettingsCategory,
  type SettingsSubItem,
} from "@/lib/settings/settings-config";

export type SettingsFieldType =
  | "text"
  | "textarea"
  | "select"
  | "toggle"
  | "file"
  | "number";

export interface SettingsFieldOption {
  label: string;
  value: string;
}

export interface SettingsField {
  id: string;
  label: string;
  type: SettingsFieldType;
  placeholder?: string;
  defaultValue?: string | boolean | number;
  options?: SettingsFieldOption[];
  help?: string;
}

export interface SettingsSchema {
  title: string;
  description: string;
  fields: SettingsField[];
}

const YES_NO = [
  { label: "Enabled", value: "enabled" },
  { label: "Disabled", value: "disabled" },
];

function slugToLabel(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Sensible defaults by page title keywords / section. */
function generateSchema(
  category: SettingsCategory,
  item: SettingsSubItem,
): SettingsSchema {
  const title = item.title;
  const description =
    item.blurb ??
    `${category.section} · Configure ${title.toLowerCase()} for this tenant.`;
  const baseId = item.slug.replace(/-/g, "_");

  // Integration / connect surfaces
  if (
    category.slug === "integrations" ||
    [
      "facebook-page",
      "instagram-business",
      "whatsapp-business",
      "stripe",
      "twilio",
      "xero",
      "myob",
      "quickbooks",
      "zapier",
      "make",
    ].includes(item.slug)
  ) {
    return {
      title,
      description,
      fields: [
        {
          id: `${baseId}_connected`,
          label: "Connection status",
          type: "toggle",
          defaultValue: false,
          help: "Toggle to simulate connect / disconnect in this demo.",
        },
        {
          id: `${baseId}_account`,
          label: "Account / workspace",
          type: "text",
          placeholder: "e.g. finconnex-prod",
        },
        {
          id: `${baseId}_sync`,
          label: "Sync frequency",
          type: "select",
          defaultValue: "15m",
          options: [
            { label: "Every 5 minutes", value: "5m" },
            { label: "Every 15 minutes", value: "15m" },
            { label: "Hourly", value: "1h" },
            { label: "Manual only", value: "manual" },
          ],
        },
        {
          id: `${baseId}_notes`,
          label: "Admin notes",
          type: "textarea",
          placeholder: "Internal notes about this connection…",
        },
      ],
    };
  }

  // Template libraries
  if (category.slug === "templates" || item.slug.includes("template")) {
    return {
      title,
      description,
      fields: [
        {
          id: `${baseId}_default_name`,
          label: "Default template name",
          type: "text",
          placeholder: `Default ${title}`,
        },
        {
          id: `${baseId}_active`,
          label: "Templates enabled",
          type: "toggle",
          defaultValue: true,
        },
        {
          id: `${baseId}_locale`,
          label: "Default language",
          type: "select",
          defaultValue: "en-AU",
          options: [
            { label: "English (AU)", value: "en-AU" },
            { label: "English (US)", value: "en-US" },
            { label: "English (UK)", value: "en-GB" },
          ],
        },
        {
          id: `${baseId}_body`,
          label: "Sample body / merge fields",
          type: "textarea",
          placeholder: "Hi {{first_name}}, …",
        },
      ],
    };
  }

  // Log / monitor / history style pages
  if (
    /log|history|monitor|queue|usage|activity|session/i.test(item.slug) ||
    /Logs|History|Monitor|Queue|Usage|Activity|Sessions/.test(title)
  ) {
    return {
      title,
      description,
      fields: [
        {
          id: `${baseId}_retention_days`,
          label: "Retention (days)",
          type: "number",
          defaultValue: 90,
        },
        {
          id: `${baseId}_level`,
          label: "Detail level",
          type: "select",
          defaultValue: "standard",
          options: [
            { label: "Errors only", value: "errors" },
            { label: "Standard", value: "standard" },
            { label: "Verbose", value: "verbose" },
          ],
        },
        {
          id: `${baseId}_export`,
          label: "Allow CSV export",
          type: "toggle",
          defaultValue: true,
        },
        {
          id: `${baseId}_alert_email`,
          label: "Alert email",
          type: "text",
          placeholder: "ops@finconnex.example",
        },
      ],
    };
  }

  // Generic configurable page
  return {
    title,
    description,
    fields: [
      {
        id: `${baseId}_enabled`,
        label: `${title} enabled`,
        type: "toggle",
        defaultValue: true,
      },
      {
        id: `${baseId}_name`,
        label: `${title} label`,
        type: "text",
        placeholder: title,
        defaultValue: title,
      },
      {
        id: `${baseId}_mode`,
        label: "Mode",
        type: "select",
        defaultValue: "standard",
        options: [
          { label: "Standard", value: "standard" },
          { label: "Strict", value: "strict" },
          { label: "Custom", value: "custom" },
        ],
      },
      {
        id: `${baseId}_notes`,
        label: "Notes",
        type: "textarea",
        placeholder: `Configuration notes for ${title.toLowerCase()}…`,
      },
    ],
  };
}

/** Hand-tuned schemas for high-visibility SRS pages. */
const CURATED: Record<string, SettingsSchema> = {
  "crm-configuration/pipelines": {
    title: "Pipelines",
    description:
      "Mortgage pipeline Stage SLA + Milestone SLA (Session 16). Prefer the dedicated editor on this page.",
    fields: [
      {
        id: "pipelineName",
        label: "Pipeline name",
        type: "text",
        defaultValue: "Mortgage Pipeline",
      },
      {
        id: "configJson",
        label: "SLA config (JSON)",
        type: "textarea",
        help: "Managed by the Pipelines SLA editor — do not edit by hand unless necessary.",
      },
    ],
  },
  "crm-configuration/lead-card": {
    title: "Lead Card",
    description:
      "Kanban lead card layout (spec v3): owner avatar, dynamic Lead Details fields (hard cap 4), and unreplied SMS/email threshold. Prefer the dedicated editor on this page.",
    fields: [
      {
        id: "showOwnerAvatar",
        label: "Show owner avatar on cards",
        type: "toggle",
        defaultValue: false,
        help: "Off by default. Small initials only — no permanent “owner” label.",
      },
      {
        id: "dynamicFields",
        label: "Dynamic fields (comma-separated keys)",
        type: "text",
        defaultValue: "company,email,phone",
        help: "Max 4. Use the Lead Card settings editor for a guided picker.",
      },
      {
        id: "unrepliedThresholdHours",
        label: "Unreplied SMS/email threshold (hours)",
        type: "number",
        defaultValue: 24,
        help: "After this many hours, unreplied inbound messages count as broken (red).",
      },
    ],
  },

  "organization/company-profile": {
    title: "Company Profile",
    description: "Legal entity, contacts, and primary brand identity.",
    fields: [
      {
        id: "companyName",
        label: "Display / brand name",
        type: "text",
        defaultValue: "FinConnex",
        placeholder: "FinConnex",
      },
      {
        id: "legalName",
        label: "Registered legal name",
        type: "text",
        defaultValue: "Finconnex Financial Services Pty Ltd",
      },
      {
        id: "abn",
        label: "ABN / Tax ID",
        type: "text",
        placeholder: "12 345 678 901",
      },
      {
        id: "industry",
        label: "Primary industry",
        type: "select",
        defaultValue: "mortgage",
        options: [
          { label: "Mortgage / Finance", value: "mortgage" },
          { label: "Accounting", value: "accounting" },
          { label: "Real Estate", value: "real-estate" },
          { label: "Legal", value: "legal" },
          { label: "Insurance", value: "insurance" },
          { label: "Agency", value: "agency" },
        ],
      },
      {
        id: "email",
        label: "Company email",
        type: "text",
        defaultValue: "hello@finconnex.example",
      },
      {
        id: "phone",
        label: "Phone",
        type: "text",
        defaultValue: "+61 2 9000 0000",
      },
      {
        id: "website",
        label: "Website",
        type: "text",
        defaultValue: "https://finconnex.example",
      },
      {
        id: "address",
        label: "Registered address",
        type: "textarea",
        defaultValue: "Level 12, 100 Pitt Street, Sydney NSW 2000",
      },
      { id: "logo", label: "Company logo", type: "file" },
    ],
  },

  "organization/regional-settings": {
    title: "Regional Settings",
    description: "Date, time, and number formats used across FinConnex.",
    fields: [
      {
        id: "dateFormat",
        label: "Date format",
        type: "select",
        defaultValue: "DD/MM/YYYY",
        options: [
          { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
          { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
          { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
          { label: "DD MMM YYYY", value: "DD MMM YYYY" },
        ],
      },
      {
        id: "timeFormat",
        label: "Time format",
        type: "select",
        defaultValue: "24hr",
        options: [
          { label: "24-hour", value: "24hr" },
          { label: "12-hour", value: "12hr" },
        ],
      },
      {
        id: "numberFormat",
        label: "Number format",
        type: "select",
        defaultValue: "1,234.56",
        options: [
          { label: "1,234.56", value: "1,234.56" },
          { label: "1.234,56", value: "1.234,56" },
          { label: "1 234.56", value: "1 234.56" },
        ],
      },
      {
        id: "firstDayOfWeek",
        label: "First day of week",
        type: "select",
        defaultValue: "monday",
        options: [
          { label: "Monday", value: "monday" },
          { label: "Sunday", value: "sunday" },
        ],
      },
    ],
  },

  "organization/business-hours": {
    title: "Business Hours",
    description: "Operational hours used by booking, SLA, and digests.",
    fields: [
      {
        id: "weekStartsOn",
        label: "Week starts on",
        type: "select",
        defaultValue: "monday",
        options: [
          { label: "Monday", value: "monday" },
          { label: "Sunday", value: "sunday" },
        ],
      },
      {
        id: "businessDays",
        label: "Business days",
        type: "text",
        defaultValue: "Monday – Friday",
      },
      {
        id: "startTime",
        label: "Opening time",
        type: "text",
        defaultValue: "09:00",
      },
      {
        id: "endTime",
        label: "Closing time",
        type: "text",
        defaultValue: "17:30",
      },
      {
        id: "timezone",
        label: "Operational time zone",
        type: "select",
        defaultValue: "Australia/Sydney",
        options: [
          { label: "Australia/Sydney", value: "Australia/Sydney" },
          { label: "UTC", value: "UTC" },
          { label: "Asia/Kathmandu", value: "Asia/Kathmandu" },
        ],
      },
    ],
  },

  "crm-configuration/industry-preset": {
    title: "Industry Preset",
    description:
      "Edit the Section 3 industry template applied at signup (pipelines, fields, KPIs).",
    fields: [
      {
        id: "preset",
        label: "Active industry preset",
        type: "select",
        defaultValue: "mortgage",
        options: [
          { label: "Mortgage / Finance (FinConnex)", value: "mortgage" },
          { label: "Accounting", value: "accounting" },
          { label: "Real Estate", value: "real-estate" },
          { label: "Legal", value: "legal" },
          { label: "Insurance", value: "insurance" },
          { label: "Recruitment (WorkConnex)", value: "recruitment" },
          { label: "Migration / Education (EduConnex)", value: "education" },
          { label: "Trades", value: "trades" },
          { label: "Agency", value: "agency" },
          { label: "Custom", value: "custom" },
        ],
      },
      {
        id: "applyPipelines",
        label: "Re-apply industry pipelines",
        type: "toggle",
        defaultValue: false,
      },
      {
        id: "applyFields",
        label: "Re-apply industry custom fields",
        type: "toggle",
        defaultValue: false,
      },
      {
        id: "notes",
        label: "Change notes",
        type: "textarea",
        placeholder: "Why this preset was changed…",
      },
    ],
  },

  "system/queue-monitor": {
    title: "Queue Monitor",
    description: "Email, SMS, and workflow queue health in one place.",
    fields: [
      {
        id: "emailQueuePaused",
        label: "Pause email queue",
        type: "toggle",
        defaultValue: false,
      },
      {
        id: "smsQueuePaused",
        label: "Pause SMS queue",
        type: "toggle",
        defaultValue: false,
      },
      {
        id: "workflowQueuePaused",
        label: "Pause workflow queue",
        type: "toggle",
        defaultValue: false,
      },
      {
        id: "maxRetries",
        label: "Max retries",
        type: "number",
        defaultValue: 3,
      },
      {
        id: "alertThreshold",
        label: "Alert when depth exceeds",
        type: "number",
        defaultValue: 500,
      },
    ],
  },

  "notifications/in-app-notifications": {
    title: "In-App Notifications",
    description: "Bell center, badges, and toast behaviour (§18 / §27.12).",
    fields: [
      {
        id: "badgeCount",
        label: "Show unread badge on nav bell",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "autoDismiss",
        label: "Auto-dismiss toasts",
        type: "select",
        defaultValue: "5",
        options: [
          { label: "3 seconds", value: "3" },
          { label: "5 seconds", value: "5" },
          { label: "Manual only", value: "manual" },
        ],
      },
      {
        id: "soundToast",
        label: "Play sound on toast",
        type: "toggle",
        defaultValue: false,
      },
    ],
  },

  "my-preferences/profile": {
    title: "Profile",
    description: "Your display name, contact details, and job title.",
    fields: [
      {
        id: "displayName",
        label: "Display name",
        type: "text",
        defaultValue: "John Smith",
      },
      {
        id: "email",
        label: "Email",
        type: "text",
        defaultValue: "admin@finconnex.example",
      },
      {
        id: "phone",
        label: "Phone",
        type: "text",
        defaultValue: "+61 400 000 000",
      },
      {
        id: "jobTitle",
        label: "Job title",
        type: "text",
        defaultValue: "Senior Broker",
      },
      { id: "avatar", label: "Profile photo", type: "file" },
    ],
  },

  "my-preferences/signature": {
    title: "Signature",
    description: "Personal email / message signature used in outbound sends.",
    fields: [
      {
        id: "signatureHtml",
        label: "Email signature",
        type: "textarea",
        defaultValue: "John Smith\nSenior Broker · FinConnex\nSydney",
      },
      {
        id: "includeLogo",
        label: "Include company logo",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "includeMobile",
        label: "Include mobile number",
        type: "toggle",
        defaultValue: true,
      },
    ],
  },

  "my-preferences/password": {
    title: "Password",
    description: "Change your password (subject to organisation password policy).",
    fields: [
      {
        id: "currentPassword",
        label: "Current password",
        type: "text",
        placeholder: "••••••••",
      },
      {
        id: "newPassword",
        label: "New password",
        type: "text",
        placeholder: "Min 12 characters",
      },
      {
        id: "confirmPassword",
        label: "Confirm new password",
        type: "text",
        placeholder: "Repeat new password",
      },
      {
        id: "forceLogout",
        label: "Sign out other sessions after change",
        type: "toggle",
        defaultValue: true,
      },
    ],
  },

  "my-preferences/notifications": {
    title: "Notifications",
    description: "Personal channel preferences for mentions and digests.",
    fields: [
      {
        id: "emailMentions",
        label: "Email me for @mentions",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "inAppMentions",
        label: "In-app for @mentions",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "taskAssigned",
        label: "Notify when a task is assigned to me",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "digest",
        label: "Personal digest",
        type: "select",
        defaultValue: "daily",
        options: [
          { label: "Real-time", value: "realtime" },
          { label: "Daily", value: "daily" },
          { label: "Weekly", value: "weekly" },
          { label: "Off", value: "off" },
        ],
      },
    ],
  },

  "my-preferences/theme": {
    title: "Theme",
    description: "Personal appearance overrides (does not change tenant branding).",
    fields: [
      {
        id: "theme",
        label: "Colour mode",
        type: "select",
        defaultValue: "system",
        options: [
          { label: "System", value: "system" },
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
        ],
      },
      {
        id: "density",
        label: "UI density",
        type: "select",
        defaultValue: "comfortable",
        options: [
          { label: "Comfortable", value: "comfortable" },
          { label: "Compact", value: "compact" },
        ],
      },
      {
        id: "accent",
        label: "Accent preference",
        type: "select",
        defaultValue: "violet",
        options: [
          { label: "Violet (default)", value: "violet" },
          { label: "Indigo", value: "indigo" },
          { label: "Teal", value: "teal" },
        ],
      },
    ],
  },

  "security/password-policy": {
    title: "Password Policy",
    description: "Minimum strength and rotation rules for all users.",
    fields: [
      {
        id: "minLength",
        label: "Minimum length",
        type: "number",
        defaultValue: 12,
      },
      {
        id: "requireUpper",
        label: "Require uppercase",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "requireNumber",
        label: "Require number",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "requireSymbol",
        label: "Require symbol",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "expiryDays",
        label: "Password expiry (days, 0 = never)",
        type: "number",
        defaultValue: 90,
      },
    ],
  },

  "security/session-timeout": {
    title: "Session Timeout",
    description: "Idle and absolute session limits for CRM users.",
    fields: [
      {
        id: "idleMinutes",
        label: "Idle timeout (minutes)",
        type: "number",
        defaultValue: 30,
      },
      {
        id: "absoluteHours",
        label: "Absolute session length (hours)",
        type: "number",
        defaultValue: 12,
      },
      {
        id: "rememberMe",
        label: "Allow “Remember me”",
        type: "toggle",
        defaultValue: true,
      },
    ],
  },

  "security/single-sign-on": {
    title: "Single Sign-On (SSO)",
    description: "SAML / OIDC identity provider for the tenant.",
    fields: [
      {
        id: "ssoEnabled",
        label: "SSO enabled",
        type: "toggle",
        defaultValue: false,
      },
      {
        id: "protocol",
        label: "Protocol",
        type: "select",
        defaultValue: "oidc",
        options: [
          { label: "OIDC", value: "oidc" },
          { label: "SAML 2.0", value: "saml" },
        ],
      },
      {
        id: "issuer",
        label: "Issuer / Entity ID",
        type: "text",
        placeholder: "https://login.example.com/…",
      },
      {
        id: "enforceSso",
        label: "Enforce SSO (disable password login)",
        type: "toggle",
        defaultValue: false,
      },
    ],
  },

  "finance/payment-gateways": {
    title: "Payment Gateways",
    description: "Card / bank gateways used for invoice collection.",
    fields: [
      {
        id: "stripeEnabled",
        label: "Stripe",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "stripeMode",
        label: "Stripe mode",
        type: "select",
        defaultValue: "test",
        options: [
          { label: "Test", value: "test" },
          { label: "Live", value: "live" },
        ],
      },
      {
        id: "defaultGateway",
        label: "Default gateway",
        type: "select",
        defaultValue: "stripe",
        options: [
          { label: "Stripe", value: "stripe" },
          { label: "Manual / bank transfer", value: "manual" },
        ],
      },
      {
        id: "receiptEmail",
        label: "Send payment receipts by email",
        type: "toggle",
        defaultValue: true,
      },
    ],
  },

  "finance/taxes": {
    title: "Taxes",
    description: "Default tax rates for quotes and invoices.",
    fields: [
      {
        id: "defaultTaxName",
        label: "Default tax name",
        type: "text",
        defaultValue: "GST",
      },
      {
        id: "defaultTaxRate",
        label: "Default rate (%)",
        type: "number",
        defaultValue: 10,
      },
      {
        id: "pricesIncludeTax",
        label: "Prices include tax",
        type: "toggle",
        defaultValue: false,
      },
      {
        id: "taxIdLabel",
        label: "Tax ID label on invoices",
        type: "text",
        defaultValue: "ABN",
      },
    ],
  },

  "organization/branding": {
    title: "Branding",
    description: "Primary brand colours and logos for the CRM shell.",
    fields: [
      {
        id: "primaryColor",
        label: "Primary colour",
        type: "text",
        defaultValue: "#7C3AED",
      },
      {
        id: "secondaryColor",
        label: "Secondary colour",
        type: "text",
        defaultValue: "#0F172A",
      },
      { id: "logoLight", label: "Logo (light backgrounds)", type: "file" },
      { id: "logoDark", label: "Logo (dark backgrounds)", type: "file" },
      {
        id: "appName",
        label: "Product name in nav",
        type: "text",
        defaultValue: "FinConnex",
      },
    ],
  },

  "organization/favicon": {
    title: "Favicon",
    description: "Browser tab icon for CRM and public pages.",
    fields: [
      { id: "favicon", label: "Favicon (.ico / .png)", type: "file" },
      { id: "appleTouch", label: "Apple touch icon", type: "file" },
    ],
  },

  "communication/whatsapp-business": {
    title: "WhatsApp Business",
    description: "WhatsApp Business API connection for Unified Inbox (§10.4).",
    fields: [
      {
        id: "connected",
        label: "Connected",
        type: "toggle",
        defaultValue: false,
      },
      {
        id: "businessId",
        label: "WhatsApp Business Account ID",
        type: "text",
        placeholder: "WABA-…",
      },
      {
        id: "phoneNumberId",
        label: "Phone number ID",
        type: "text",
      },
      {
        id: "displayName",
        label: "Display name",
        type: "text",
        defaultValue: "FinConnex Brokers",
      },
    ],
  },
};

/** Build full registry once. */
function buildRegistry(): Record<string, SettingsSchema> {
  const map: Record<string, SettingsSchema> = { ...CURATED };
  for (const category of SETTINGS_CATEGORIES) {
    for (const item of category.items) {
      const key = settingsSchemaKey(category.slug, item.slug);
      if (!map[key]) {
        map[key] = generateSchema(category, item);
      }
    }
  }
  return map;
}

export const SETTINGS_SCHEMAS = buildRegistry();

export function getSettingsSchema(categorySlug: string, subpageSlug: string) {
  const key = settingsSchemaKey(categorySlug, subpageSlug);
  return (
    SETTINGS_SCHEMAS[key] ?? {
      title: slugToLabel(subpageSlug),
      description: "Manage this setting.",
      fields: [
        {
          id: "enabled",
          label: "Enabled",
          type: "toggle" as const,
          defaultValue: true,
        },
      ],
    }
  );
}

export function assertFullSchemaCoverage() {
  const missing: string[] = [];
  for (const category of SETTINGS_CATEGORIES) {
    for (const item of category.items) {
      const key = settingsSchemaKey(category.slug, item.slug);
      if (!SETTINGS_SCHEMAS[key]) missing.push(key);
    }
  }
  return missing;
}

void YES_NO;
