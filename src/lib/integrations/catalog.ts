/**
 * Every integration the Settings → Integrations page offers, and how each
 * one connects. The flow follows what the CRM supports for it:
 *
 * - "calendar"   Google / Outlook calendar sync — the provider's consent screen
 * - "stripe"     API keys on /payments/stripe/connection
 * - "equifax"    OAuth client credentials on /equifax/connection
 * - "messaging"  SendGrid / Twilio keys on /messaging-credentials
 * - "webhook"    an inbound URL + signing secret (Zapier, Make, custom)
 * - "oauth"      the generic OAuth2 framework on /integrations/connections,
 *                with the provider's token endpoint and scopes filled in
 * - "link"       a feature that lives on its own page (client portals)
 */

export type IntegrationCategory =
  | "Calendar & meetings"
  | "Email & messaging"
  | "Payments & accounting"
  | "Credit & compliance"
  | "Documents & storage"
  | "Marketing & CRM"
  | "Automation & developers"
  | "Client experience";

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  "Calendar & meetings",
  "Email & messaging",
  "Payments & accounting",
  "Credit & compliance",
  "Documents & storage",
  "Marketing & CRM",
  "Automation & developers",
  "Client experience",
];

export type OAuthPreset = {
  tokenEndpoint: string;
  scopes: string[];
  /** Where the workspace registers its OAuth app with the provider. */
  developerUrl: string;
};

export type IntegrationFlow =
  | { kind: "calendar"; provider: "google" | "outlook" }
  | { kind: "stripe" }
  | { kind: "equifax" }
  | { kind: "messaging"; provider: "SENDGRID" | "TWILIO"; whatsapp?: boolean }
  | { kind: "webhook" }
  | { kind: "oauth"; preset: OAuthPreset | null }
  | { kind: "link"; href: string; cta: string };

export type IntegrationDefinition = {
  id: string;
  name: string;
  category: IntegrationCategory;
  blurb: string;
  /** Simple Icons slug (cdn.simpleicons.org), when the brand is listed there. */
  icon?: string;
  /** Tile colour and initials when there is no icon (or it fails to load). */
  color: string;
  initials: string;
  flow: IntegrationFlow;
  /**
   * The app's own page where it is set up (dashboard, console, developer
   * portal). "Integrate" opens it in a new tab; consent-screen flows
   * (calendars) fetch their address instead.
   */
  integrateUrl?: string;
};

const MICROSOFT_TOKEN =
  "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MICROSOFT_APPS =
  "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_APPS = "https://console.cloud.google.com/apis/credentials";

export const INTEGRATIONS: IntegrationDefinition[] = [
  // Calendar & meetings
  {
    id: "google-calendar",
    name: "Google Calendar",
    category: "Calendar & meetings",
    blurb: "Two-way sync of meetings and bookings with your Google Calendar.",
    icon: "googlecalendar",
    color: "#4285F4",
    initials: "GC",
    flow: { kind: "calendar", provider: "google" },
  },
  {
    id: "outlook-calendar",
    name: "Outlook Calendar",
    category: "Calendar & meetings",
    blurb: "Two-way sync with your Microsoft 365 / Outlook calendar.",
    color: "#0F6CBD",
    initials: "OL",
    flow: { kind: "calendar", provider: "outlook" },
  },
  {
    id: "microsoft-teams",
    name: "Microsoft Teams",
    category: "Calendar & meetings",
    blurb: "Teams meeting links for appointments and client calls.",
    color: "#5059C9",
    initials: "MT",
    flow: {
      kind: "oauth",
      preset: {
        tokenEndpoint: MICROSOFT_TOKEN,
        scopes: ["OnlineMeetings.ReadWrite", "User.Read", "offline_access"],
        developerUrl: MICROSOFT_APPS,
      },
    },
  },
  {
    id: "zoom",
    name: "Zoom Meetings",
    category: "Calendar & meetings",
    blurb: "Zoom links for video appointments.",
    icon: "zoom",
    color: "#0B5CFF",
    initials: "ZM",
    flow: {
      kind: "oauth",
      preset: {
        tokenEndpoint: "https://zoom.us/oauth/token",
        scopes: ["meeting:write", "user:read"],
        developerUrl: "https://marketplace.zoom.us/develop/create",
      },
    },
  },

  // Email & messaging
  {
    id: "sendgrid",
    name: "SendGrid",
    category: "Email & messaging",
    blurb: "Send workspace email from your own SendGrid account and sender.",
    color: "#1A82E2",
    initials: "SG",
    integrateUrl: "https://app.sendgrid.com/settings/api_keys",
    flow: { kind: "messaging", provider: "SENDGRID" },
  },
  {
    id: "twilio",
    name: "Twilio SMS & Voice",
    category: "Email & messaging",
    blurb: "Texts and calls from your own Twilio number.",
    color: "#F22F46",
    initials: "TW",
    integrateUrl: "https://console.twilio.com/",
    flow: { kind: "messaging", provider: "TWILIO" },
  },
  {
    id: "whatsapp",
    name: "WhatsApp (via Twilio)",
    category: "Email & messaging",
    blurb: "WhatsApp messages through your Twilio WhatsApp sender.",
    icon: "whatsapp",
    color: "#25D366",
    initials: "WA",
    integrateUrl:
      "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders",
    flow: { kind: "messaging", provider: "TWILIO", whatsapp: true },
  },
  {
    id: "slack",
    name: "Slack",
    category: "Email & messaging",
    blurb: "Post deal, booking and task alerts to Slack channels.",
    color: "#4A154B",
    initials: "SL",
    flow: {
      kind: "oauth",
      preset: {
        tokenEndpoint: "https://slack.com/api/oauth.v2.access",
        scopes: ["chat:write", "channels:read"],
        developerUrl: "https://api.slack.com/apps",
      },
    },
  },

  // Payments & accounting
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments & accounting",
    blurb:
      "Take card payments on invoices; payments are recorded automatically.",
    icon: "stripe",
    color: "#635BFF",
    initials: "ST",
    integrateUrl: "https://dashboard.stripe.com/apikeys",
    flow: { kind: "stripe" },
  },
  {
    id: "xero",
    name: "Xero",
    category: "Payments & accounting",
    blurb: "Sync contacts, invoices and payments with Xero.",
    icon: "xero",
    color: "#13B5EA",
    initials: "XE",
    flow: {
      kind: "oauth",
      preset: {
        tokenEndpoint: "https://identity.xero.com/connect/token",
        scopes: [
          "offline_access",
          "accounting.transactions",
          "accounting.contacts",
        ],
        developerUrl: "https://developer.xero.com/app/manage",
      },
    },
  },
  {
    id: "myob",
    name: "MYOB",
    category: "Payments & accounting",
    blurb: "Sync contacts and invoices with MYOB AccountRight.",
    icon: "myob",
    color: "#6100A5",
    initials: "MY",
    flow: {
      kind: "oauth",
      preset: {
        tokenEndpoint: "https://secure.myob.com/oauth2/v1/authorize",
        scopes: ["CompanyFile"],
        developerUrl: "https://my.myob.com.au/Bd/Default.aspx",
      },
    },
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    category: "Payments & accounting",
    blurb: "Sync customers, invoices and payments with QuickBooks Online.",
    icon: "quickbooks",
    color: "#2CA01C",
    initials: "QB",
    flow: {
      kind: "oauth",
      preset: {
        tokenEndpoint:
          "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        scopes: ["com.intuit.quickbooks.accounting"],
        developerUrl: "https://developer.intuit.com/app/developer/dashboard",
      },
    },
  },

  // Credit & compliance
  {
    id: "equifax",
    name: "Equifax",
    category: "Credit & compliance",
    blurb: "Pull credit reports for leads and applicants.",
    color: "#9E1B32",
    initials: "EQ",
    integrateUrl: "https://developer.equifax.com/",
    flow: { kind: "equifax" },
  },

  // Documents & storage
  {
    id: "docusign",
    name: "DocuSign",
    category: "Documents & storage",
    blurb: "Send documents for signature through your DocuSign account.",
    color: "#4C00FF",
    initials: "DS",
    flow: {
      kind: "oauth",
      preset: {
        tokenEndpoint: "https://account.docusign.com/oauth/token",
        scopes: ["signature", "extended"],
        developerUrl: "https://admindemo.docusign.com/apps-and-keys",
      },
    },
  },
  {
    id: "google-drive",
    name: "Google Drive",
    category: "Documents & storage",
    blurb: "Store and attach client documents from Google Drive.",
    icon: "googledrive",
    color: "#1FA463",
    initials: "GD",
    flow: {
      kind: "oauth",
      preset: {
        tokenEndpoint: GOOGLE_TOKEN,
        scopes: ["https://www.googleapis.com/auth/drive.file"],
        developerUrl: GOOGLE_APPS,
      },
    },
  },
  {
    id: "onedrive",
    name: "OneDrive & SharePoint",
    category: "Documents & storage",
    blurb: "Store and attach client documents from OneDrive or SharePoint.",
    color: "#0364B8",
    initials: "OD",
    flow: {
      kind: "oauth",
      preset: {
        tokenEndpoint: MICROSOFT_TOKEN,
        scopes: ["Files.ReadWrite", "offline_access"],
        developerUrl: MICROSOFT_APPS,
      },
    },
  },
  {
    id: "dropbox",
    name: "Dropbox",
    category: "Documents & storage",
    blurb: "Store and attach client documents from Dropbox.",
    icon: "dropbox",
    color: "#0061FF",
    initials: "DB",
    flow: {
      kind: "oauth",
      preset: {
        tokenEndpoint: "https://api.dropboxapi.com/oauth2/token",
        scopes: ["files.content.read", "files.content.write"],
        developerUrl: "https://www.dropbox.com/developers/apps",
      },
    },
  },

  // Marketing & CRM
  {
    id: "mailchimp",
    name: "Mailchimp",
    category: "Marketing & CRM",
    blurb: "Sync contacts and segments to Mailchimp audiences.",
    icon: "mailchimp",
    color: "#241C15",
    initials: "MC",
    flow: {
      kind: "oauth",
      preset: {
        tokenEndpoint: "https://login.mailchimp.com/oauth2/token",
        scopes: [],
        developerUrl: "https://admin.mailchimp.com/account/oauth2/",
      },
    },
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "Marketing & CRM",
    blurb: "Keep contacts and companies in step with HubSpot.",
    icon: "hubspot",
    color: "#FF7A59",
    initials: "HS",
    flow: {
      kind: "oauth",
      preset: {
        tokenEndpoint: "https://api.hubapi.com/oauth/v1/token",
        scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write"],
        developerUrl: "https://developers.hubspot.com/",
      },
    },
  },

  // Automation & developers
  {
    id: "zapier",
    name: "Zapier",
    category: "Automation & developers",
    blurb: "Send events from thousands of apps into FinConnex with a webhook.",
    icon: "zapier",
    color: "#FF4F00",
    initials: "ZA",
    integrateUrl: "https://zapier.com/app/zaps",
    flow: { kind: "webhook" },
  },
  {
    id: "make",
    name: "Make",
    category: "Automation & developers",
    blurb: "Trigger FinConnex from Make scenarios with a webhook.",
    icon: "make",
    color: "#6D00CC",
    initials: "MK",
    integrateUrl: "https://www.make.com/en/login",
    flow: { kind: "webhook" },
  },
  {
    id: "webhooks",
    name: "Webhooks",
    category: "Automation & developers",
    blurb: "A signed inbound URL for any system that can send webhooks.",
    color: "#334155",
    initials: "WH",
    flow: { kind: "webhook" },
  },
  {
    id: "custom-oauth",
    name: "Custom OAuth2 app",
    category: "Automation & developers",
    blurb: "Connect any other service that uses OAuth2.",
    color: "#0F172A",
    initials: "OA",
    flow: { kind: "oauth", preset: null },
  },

  // Client experience
  {
    id: "client-portal",
    name: "Client Portal",
    category: "Client experience",
    blurb: "A branded portal where clients see their documents and progress.",
    color: "#5A32A3",
    initials: "CP",
    flow: { kind: "link", href: "/portals", cta: "Manage client portals" },
  },
];

export function findIntegration(id: string): IntegrationDefinition | undefined {
  return INTEGRATIONS.find((item) => item.id === id);
}

/** The label an OAuth connection is saved under, so its tile can find it again. */
export function oauthConnectionLabel(
  integration: Pick<IntegrationDefinition, "name">,
) {
  return integration.name;
}
