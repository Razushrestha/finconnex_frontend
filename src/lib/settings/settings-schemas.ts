export const SETTINGS_SCHEMAS: Record<string, any> = {
  "company-profile": {
    title: "Company Profile & Corporate Identity",
    description:
      "Manage your legal entity records, tax registration numbers, registered addresses, and corporate branding assets.",
    fields: [
      {
        id: "companyName",
        label: "Display / Brand Name",
        type: "text",
        placeholder: "e.g. Meta-Tronix",
      },
      {
        id: "legalName",
        label: "Official Registered Legal Name",
        type: "text",
        placeholder: "e.g. Meta-Tronix Technologies Private Limited",
      },
      {
        id: "taxId",
        label: "Tax ID / VAT / EIN Number",
        type: "text",
        placeholder: "e.g. US-123456789",
      },
      {
        id: "industry",
        label: "Industry Sector",
        type: "select",
        options: [
          { label: "Software & SaaS", value: "tech" },
          { label: "E-Commerce & Retail", value: "retail" },
          { label: "Financial Services", value: "finance" },
          { label: "Consulting & Agency", value: "agency" },
        ],
      },
      {
        id: "companyEmail",
        label: "Corporate Support Email",
        type: "text",
        placeholder: "contact@meta-tronix.com",
      },
      {
        id: "companyPhone",
        label: "Official Phone Number",
        type: "text",
        placeholder: "+1 (555) 019-2834",
      },
      {
        id: "websiteUrl",
        label: "Official Website URL",
        type: "text",
        placeholder: "https://meta-tronix.com",
      },
      {
        id: "streetAddress",
        label: "Registered Street Address",
        type: "text",
        placeholder: "104 Innovation Drive, Suite 400",
      },
      {
        id: "cityState",
        label: "City, State / Province, Postal Code",
        type: "text",
        placeholder: "San Francisco, CA 94107",
      },
      {
        id: "country",
        label: "Country of Incorporation",
        type: "select",
        options: [
          { label: "United States", value: "us" },
          { label: "United Kingdom", value: "uk" },
          { label: "Canada", value: "ca" },
          { label: "Australia", value: "au" },
          { label: "Nepal", value: "np" },
        ],
      },
      { id: "logo", label: "Primary Vector Brand Logo", type: "file" },
      { id: "faviconAsset", label: "App Dark Mode Brand Mark", type: "file" },
    ],
  },

  "time-format": {
    title: "Time Format Configuration",
    description:
      "Choose how time values are displayed throughout the dashboard interface.",
    fields: [
      {
        id: "timeFormatChoice",
        label: "System Time Display Format",
        type: "select",
        defaultValue: "12hr",
        options: [
          { label: "12-Hour Format", value: "12hr" },
          { label: "24-Hour Format", value: "24hr" },
        ],
      },
    ],
  },

  "date-format": {
    title: "Date Format Configuration",
    description:
      "Choose how dates are displayed across the system interface and reports.",
    fields: [
      {
        id: "dateFormatChoice",
        label: "System Date Display Format",
        type: "select",
        defaultValue: "YYYY-MM-DD",
        options: [
          { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
          { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
          { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
          { label: "DD MMM YYYY", value: "DD MMM YYYY" },
          {
            label: "Month DD, YYYY",
            value: "MMMM DD, YYYY",
          },
        ],
      },
    ],
  },

  "business-hours": {
    title: "Business Hours",
    description:
      "Define the operational hours of your organization to help employees ensure activities are carried out during active working periods.",
    fields: [
      {
        id: "weekStartsOn",
        label: "Week Starts On",
        type: "select",
        defaultValue: "monday",
        options: [
          { label: "Monday", value: "monday" },
          { label: "Sunday", value: "sunday" },
        ],
      },
      {
        id: "businessDays",
        label: "Business Days",
        type: "text",
        defaultValue: "Monday - Friday",
        placeholder: "e.g. Monday - Friday",
      },
      {
        id: "startTime",
        label: "Opening Time",
        type: "text",
        defaultValue: "09:00 AM",
      },
      {
        id: "endTime",
        label: "Closing Time",
        type: "text",
        defaultValue: "06:00 PM",
      },
      {
        id: "timeZone",
        label: "Operational Time Zone",
        type: "select",
        defaultValue: "AEST",
        options: [
          {
            label: "Australian Eastern Standard Time (New South Wales)",
            value: "AEST",
          },
          { label: "Coordinated Universal Time (UTC)", value: "UTC" },
          { label: "Nepal Time (NPT)", value: "NPT" },
        ],
      },
      {
        id: "closedDays",
        label: "Closed Days",
        type: "text",
        defaultValue: "Saturday, Sunday",
      },
    ],
  },

  "email-notifications": {
    title: "Email Notifications",
    description:
      "Configure global outbound email dispatch rules and transactional triggers.",
    fields: [
      {
        id: "enableEmail",
        label: "Master Email Dispatch",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "senderName",
        label: "Default Sender Alias",
        type: "text",
        placeholder: "Acme Notifications",
      },
      {
        id: "replyToEmail",
        label: "Global Reply-To Address",
        type: "text",
        placeholder: "support@acmepartner.com",
      },
    ],
  },
  "sms-notifications": {
    title: "SMS & Text Alerts",
    description:
      "Manage cellular provider dispatch parameters and critical text messaging flags.",
    fields: [
      {
        id: "enableSms",
        label: "Enable SMS Channel Delivery",
        type: "toggle",
        defaultValue: false,
      },
      {
        id: "smsGateway",
        label: "Active SMS Provider",
        type: "select",
        options: [
          { label: "Twilio Gateway", value: "twilio" },
          { label: "AWS SNS", value: "aws" },
          { label: "Vonage API", value: "vonage" },
        ],
      },
      {
        id: "senderId",
        label: "Sender ID / Shortcode",
        type: "text",
        placeholder: "ACMEALERT",
      },
    ],
  },
  "push-notifications": {
    title: "Web & Browser Push Notifications",
    description:
      "Control web-browser notification permissions and background service worker alerts.",
    fields: [
      {
        id: "browserPush",
        label: "Enable Browser Push Prompts",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "vapidKey",
        label: "VAPID Public Key Identifier",
        type: "text",
        placeholder: "BN3x_Public_Key_String...",
      },
      {
        id: "soundAlert",
        label: "Play Audio Tone on Incoming Push",
        type: "toggle",
        defaultValue: true,
      },
    ],
  },
  "in-app-notifications": {
    title: "In-App Notification Center",
    description:
      "Customize the dropdown bell center, banner popups, and unread badge behaviors.",
    fields: [
      {
        id: "badgeCount",
        label: "Show Unread Count Badge on Nav Bell",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "autoDismiss",
        label: "Auto-Dismiss Toast Banners After (Seconds)",
        type: "select",
        options: [
          { label: "3 Seconds", value: "3" },
          { label: "5 Seconds", value: "5" },
          { label: "Manual Dismiss Only", value: "manual" },
        ],
      },
      {
        id: "soundToast",
        label: "Play Sound on In-App Banner Appearance",
        type: "toggle",
        defaultValue: false,
      },
    ],
  },
  "notification-rules": {
    title: "Conditional Notification Rules",
    description:
      "Set advanced automated triggers based on record state changes or user roles.",
    fields: [
      {
        id: "ruleName",
        label: "Rule Description",
        type: "text",
        placeholder: "e.g. Notify manager on high-value deal loss",
      },
      {
        id: "triggerEvent",
        label: "Trigger Event",
        type: "select",
        options: [
          { label: "Record Created", value: "create" },
          { label: "Status Updated", value: "update" },
          { label: "SLA Deadline Breached", value: "sla" },
        ],
      },
      {
        id: "instantAlert",
        label: "Bypass Queue for Immediate Dispatch",
        type: "toggle",
        defaultValue: true,
      },
    ],
  },
  mentions: {
    title: "@Mention & Tagging Alerts",
    description:
      "Configure how team members are alerted when tagged in comments or documentation.",
    fields: [
      {
        id: "notifyOnMention",
        label: "Instant Alert When Tagged (@username)",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "mentionChannels",
        label: "Delivery Channel for Mentions",
        type: "select",
        options: [
          { label: "In-App & Email Combined", value: "both" },
          { label: "In-App Only", value: "inapp" },
          { label: "Email Only", value: "email" },
        ],
      },
    ],
  },
  "digest-settings": {
    title: "Summary Digest Frequency",
    description:
      "Reduce notification fatigue by bundling updates into periodic rollup digests.",
    fields: [
      {
        id: "digestFrequency",
        label: "Digest Delivery Schedule",
        type: "select",
        options: [
          { label: "Real-Time (No Digest)", value: "realtime" },
          { label: "Daily Summary Rollup", value: "daily" },
          { label: "Weekly Summary Rollup", value: "weekly" },
        ],
      },
      {
        id: "digestTime",
        label: "Scheduled Delivery Time",
        type: "text",
        placeholder: "08:00 AM",
      },
    ],
  },
  "push-notification-settings": {
    title: "Advanced Push Configuration",
    description:
      "Manage APNS (Apple) and FCM (Firebase) credential handshakes for native push.",
    fields: [
      {
        id: "fcmServerKey",
        label: "Firebase Cloud Messaging (FCM) Server Key",
        type: "text",
        placeholder: "AAAA...",
      },
      {
        id: "apnsCert",
        label: "Apple Push Notification service (APNs) Certificate",
        type: "file",
      },
    ],
  },
  "mobile-app-settings": {
    title: "Mobile Application Notification Settings",
    description:
      "Fine-tune behavior rules specific to iOS and Android companion mobile apps.",
    fields: [
      {
        id: "richPreviews",
        label: "Show Rich Image Previews on Lock Screen",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "vibrateMode",
        label: "Enable Haptic Vibration Feedback",
        type: "toggle",
        defaultValue: true,
      },
      {
        id: "badgeAppIcon",
        label: "Show Badge Counter on App Launcher Icon",
        type: "toggle",
        defaultValue: true,
      },
    ],
  },
};
