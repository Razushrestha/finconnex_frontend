import type { FieldSettings, FieldType, FormField, FormPage } from "./types";

/** Content tone options shown in the AI Forms dropdowns. */
export const CONTENT_TONES = [
  "Professional",
  "Casual",
  "Friendly",
  "Formal",
  "Persuasive",
] as const;

export type ContentTone = (typeof CONTENT_TONES)[number];

const CASUAL_TONES = new Set<ContentTone>(["Casual", "Friendly", "Persuasive"]);

/** "Try a Sample Prompt" chips shown in step 1. */
export interface AiSamplePrompt {
  id: string;
  label: string;
  prompt: string;
}

export const AI_SAMPLE_PROMPTS: AiSamplePrompt[] = [
  {
    id: "event-registration",
    label: "Event Registration Form",
    prompt:
      "Create an event registration form to collect attendee name, email, phone, mailing address, guest count and dietary needs.",
  },
  {
    id: "contact-us",
    label: "Contact Us Form",
    prompt:
      "Create a contact us form so website visitors can send us a message with their name, email, phone and subject.",
  },
  {
    id: "newsletter-subscription",
    label: "Newsletter Subscription Form",
    prompt:
      "Create a newsletter subscription form to capture name, email and topics of interest, with a marketing consent checkbox.",
  },
  {
    id: "volunteer-signup",
    label: "Volunteer Signup Form",
    prompt:
      "Create a volunteer signup form collecting contact details, area of interest and availability.",
  },
  {
    id: "appointment-booking",
    label: "Appointment Booking Form",
    prompt:
      "Create an appointment booking form to collect contact details, a preferred date and time, and the reason for the visit.",
  },
  {
    id: "job-application",
    label: "Job Application Form",
    prompt:
      "Create a job application form collecting contact details, the position applied for, a resume upload and a short pitch.",
  },
  {
    id: "personal-information",
    label: "Personal Information Form",
    prompt:
      "Create a personal information form to collect full name, date of birth, email, phone and mailing address.",
  },
  {
    id: "online-order",
    label: "Online Order Form",
    prompt:
      "Create an online order form collecting contact details, shipping address, product selection, quantity and order notes.",
  },
];

// ---------------------------------------------------------------------------
// Template field specs
// ---------------------------------------------------------------------------

interface AiFieldSpec {
  type: FieldType;
  formalLabel: string;
  casualLabel: string;
  required?: boolean;
  settings?: FieldSettings;
  options?: string[];
}

interface AiFormTemplate {
  id: string;
  title: string;
  keywords: string[];
  /** Each row groups fields that sit side by side when multi-column layout is on. */
  rows: AiFieldSpec[][];
}

const NAME_SETTINGS: FieldSettings = { showElementsLabel: true };

const TEMPLATES: AiFormTemplate[] = [
  {
    id: "event-registration",
    title: "Event Registration Form",
    keywords: ["event", "registration", "register", "conference", "rsvp"],
    rows: [
      [
        {
          type: "name",
          formalLabel: "Enter your full legal name",
          casualLabel: "What's your name?",
          required: true,
          settings: NAME_SETTINGS,
        },
      ],
      [
        {
          type: "email",
          formalLabel: "Enter a valid email address",
          casualLabel: "Your email",
          required: true,
        },
        {
          type: "phone",
          formalLabel: "Enter your 10-digit phone number",
          casualLabel: "Your phone number",
          required: true,
        },
      ],
      [
        {
          type: "address",
          formalLabel: "Enter your complete mailing address",
          casualLabel: "Your mailing address",
          required: true,
        },
      ],
      [
        {
          type: "dropdown",
          formalLabel: "Select number of guests attending",
          casualLabel: "How many guests?",
          required: false,
          options: ["1", "2", "3", "4+"],
        },
      ],
      [
        {
          type: "multi-line",
          formalLabel: "Any dietary restrictions or special requests",
          casualLabel: "Anything we should know?",
          required: false,
        },
      ],
    ],
  },
  {
    id: "contact-us",
    title: "Contact Us Form",
    keywords: ["contact us", "contact"],
    rows: [
      [
        {
          type: "name",
          formalLabel: "Enter your full name",
          casualLabel: "Your name",
          required: true,
          settings: NAME_SETTINGS,
        },
      ],
      [
        {
          type: "email",
          formalLabel: "Enter a valid email address",
          casualLabel: "Your email",
          required: true,
        },
        {
          type: "phone",
          formalLabel: "Enter your phone number",
          casualLabel: "Phone (optional)",
          required: false,
        },
      ],
      [
        {
          type: "single-line",
          formalLabel: "Subject",
          casualLabel: "What's this about?",
          required: true,
        },
      ],
      [
        {
          type: "multi-line",
          formalLabel: "Enter your message",
          casualLabel: "Your message",
          required: true,
        },
      ],
    ],
  },
  {
    id: "newsletter-subscription",
    title: "Newsletter Subscription Form",
    keywords: ["newsletter", "subscri"],
    rows: [
      [
        {
          type: "name",
          formalLabel: "Enter your full name",
          casualLabel: "Your name",
          required: false,
          settings: NAME_SETTINGS,
        },
      ],
      [
        {
          type: "email",
          formalLabel: "Enter a valid email address",
          casualLabel: "Your email",
          required: true,
        },
      ],
      [
        {
          type: "checkbox",
          formalLabel: "Select topics of interest",
          casualLabel: "What do you want to hear about?",
          required: false,
          options: ["Product updates", "Company news", "Promotions"],
        },
      ],
      [
        {
          type: "consent-checkbox",
          formalLabel: "I agree to receive marketing emails",
          casualLabel: "Yes, sign me up!",
          required: true,
        },
      ],
    ],
  },
  {
    id: "volunteer-signup",
    title: "Volunteer Signup Form",
    keywords: ["volunteer"],
    rows: [
      [
        {
          type: "name",
          formalLabel: "Enter your full legal name",
          casualLabel: "Your name",
          required: true,
          settings: NAME_SETTINGS,
        },
      ],
      [
        {
          type: "email",
          formalLabel: "Enter a valid email address",
          casualLabel: "Your email",
          required: true,
        },
        {
          type: "phone",
          formalLabel: "Enter your phone number",
          casualLabel: "Your phone",
          required: true,
        },
      ],
      [
        {
          type: "dropdown",
          formalLabel: "Select your area of interest",
          casualLabel: "What would you like to help with?",
          required: true,
          options: ["Events", "Fundraising", "Outreach", "Admin support"],
        },
      ],
      [
        {
          type: "dropdown",
          formalLabel: "Select your availability",
          casualLabel: "When are you free?",
          required: false,
          options: ["Weekdays", "Weekends", "Evenings", "Flexible"],
        },
      ],
    ],
  },
  {
    id: "appointment-booking",
    title: "Appointment Booking Form",
    keywords: ["appointment", "booking", "book a", "schedule"],
    rows: [
      [
        {
          type: "name",
          formalLabel: "Enter your full name",
          casualLabel: "Your name",
          required: true,
          settings: NAME_SETTINGS,
        },
      ],
      [
        {
          type: "email",
          formalLabel: "Enter a valid email address",
          casualLabel: "Your email",
          required: true,
        },
        {
          type: "phone",
          formalLabel: "Enter your phone number",
          casualLabel: "Your phone",
          required: true,
        },
      ],
      [
        {
          type: "date",
          formalLabel: "Select a preferred date",
          casualLabel: "Pick a date",
          required: true,
        },
        {
          type: "time",
          formalLabel: "Select a preferred time",
          casualLabel: "Pick a time",
          required: true,
        },
      ],
      [
        {
          type: "multi-line",
          formalLabel: "Reason for appointment",
          casualLabel: "What's this appointment for?",
          required: false,
        },
      ],
    ],
  },
  {
    id: "job-application",
    title: "Job Application Form",
    keywords: ["job", "application", "applicant", "career", "resume"],
    rows: [
      [
        {
          type: "name",
          formalLabel: "Enter your full legal name",
          casualLabel: "Your name",
          required: true,
          settings: NAME_SETTINGS,
        },
      ],
      [
        {
          type: "email",
          formalLabel: "Enter a valid email address",
          casualLabel: "Your email",
          required: true,
        },
        {
          type: "phone",
          formalLabel: "Enter your phone number",
          casualLabel: "Your phone",
          required: true,
        },
      ],
      [
        {
          type: "single-line",
          formalLabel: "Position applying for",
          casualLabel: "Which role?",
          required: true,
        },
      ],
      [
        {
          type: "file-upload",
          formalLabel: "Upload your resume",
          casualLabel: "Attach your resume",
          required: true,
        },
      ],
      [
        {
          type: "multi-line",
          formalLabel: "Why are you a good fit for this role",
          casualLabel: "Tell us about yourself",
          required: false,
        },
      ],
    ],
  },
  {
    id: "personal-information",
    title: "Personal Information Form",
    keywords: ["personal information", "personal details", "personal"],
    rows: [
      [
        {
          type: "name",
          formalLabel: "Enter your full legal name",
          casualLabel: "Your name",
          required: true,
          settings: NAME_SETTINGS,
        },
      ],
      [
        {
          type: "date",
          formalLabel: "Enter your date of birth",
          casualLabel: "Your birthday",
          required: true,
        },
      ],
      [
        {
          type: "email",
          formalLabel: "Enter a valid email address",
          casualLabel: "Your email",
          required: true,
        },
        {
          type: "phone",
          formalLabel: "Enter your 10-digit phone number",
          casualLabel: "Your phone number",
          required: true,
        },
      ],
      [
        {
          type: "address",
          formalLabel: "Enter your complete mailing address",
          casualLabel: "Your mailing address",
          required: true,
        },
      ],
    ],
  },
  {
    id: "online-order",
    title: "Online Order Form",
    keywords: ["order", "purchase", "buy"],
    rows: [
      [
        {
          type: "name",
          formalLabel: "Enter your full name",
          casualLabel: "Your name",
          required: true,
          settings: NAME_SETTINGS,
        },
      ],
      [
        {
          type: "email",
          formalLabel: "Enter a valid email address",
          casualLabel: "Your email",
          required: true,
        },
        {
          type: "phone",
          formalLabel: "Enter your phone number",
          casualLabel: "Your phone",
          required: true,
        },
      ],
      [
        {
          type: "address",
          formalLabel: "Enter your shipping address",
          casualLabel: "Where should we ship it?",
          required: true,
        },
      ],
      [
        {
          type: "dropdown",
          formalLabel: "Select product",
          casualLabel: "What are you ordering?",
          required: true,
          options: ["Product A", "Product B", "Product C"],
        },
      ],
      [
        {
          type: "number",
          formalLabel: "Enter quantity",
          casualLabel: "How many?",
          required: true,
        },
      ],
      [
        {
          type: "multi-line",
          formalLabel: "Order notes or special instructions",
          casualLabel: "Anything else?",
          required: false,
        },
      ],
    ],
  },
];

const GENERIC_TEMPLATE: AiFormTemplate = {
  id: "generic",
  title: "Untitled Form",
  keywords: [],
  rows: [
    [
      {
        type: "name",
        formalLabel: "Enter your full name",
        casualLabel: "Your name",
        required: true,
        settings: NAME_SETTINGS,
      },
    ],
    [
      {
        type: "email",
        formalLabel: "Enter a valid email address",
        casualLabel: "Your email",
        required: true,
      },
      {
        type: "phone",
        formalLabel: "Enter your phone number",
        casualLabel: "Your phone",
        required: false,
      },
    ],
    [
      {
        type: "multi-line",
        formalLabel: "Enter additional details",
        casualLabel: "Tell us more",
        required: false,
      },
    ],
  ],
};

function matchTemplate(description: string): AiFormTemplate {
  const text = description.toLowerCase();
  let best: AiFormTemplate | null = null;
  let bestHits = 0;
  for (const template of TEMPLATES) {
    const hits = template.keywords.filter((k) => text.includes(k)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = template;
    }
  }
  return best ?? GENERIC_TEMPLATE;
}

function titleFromDescription(description: string): string {
  const words = description
    .replace(/^create (an?|the)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join(" ");
  if (!words) return "Untitled Form";
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  return /form$/i.test(capitalized) ? capitalized : `${capitalized} Form`;
}

function specLabel(spec: AiFieldSpec, tone: ContentTone): string {
  return CASUAL_TONES.has(tone) ? spec.casualLabel : spec.formalLabel;
}

function buildField(spec: AiFieldSpec, tone: ContentTone): FormField {
  return {
    id: crypto.randomUUID(),
    type: spec.type,
    label: specLabel(spec, tone),
    required: spec.required,
    ...(spec.options ? { options: spec.options } : {}),
    ...(spec.settings ? { settings: spec.settings } : {}),
  };
}

export interface AiFormResult {
  title: string;
  pages: FormPage[];
}

/**
 * Deterministically "generates" a form from a free-text description.
 * Matches the description against a small set of common form templates and
 * falls back to a generic contact-style form when nothing matches.
 */
export function generateAiForm(
  description: string,
  tone: ContentTone,
  multiColumn: boolean,
): AiFormResult {
  const template = matchTemplate(description);
  const title =
    template.id === "generic"
      ? titleFromDescription(description)
      : template.title;

  const fields: FormField[] = template.rows.flatMap((row) => {
    // Single-field rows always render as one standalone field.
    if (row.length === 1) return [buildField(row[0], tone)];

    // Multi-field rows (e.g. email + phone) either sit side by side inside a
    // column-layout field, or get flattened into sequential fields.
    if (!multiColumn) return row.map((spec) => buildField(spec, tone));

    const columnType: FieldType = row.length >= 3 ? "col-3" : "col-2";
    const columns = row.map((spec) => [buildField(spec, tone)]);
    const columnWidths =
      columnType === "col-3"
        ? [33, 34, 33]
        : Array(row.length).fill(Math.round(100 / row.length));

    return [
      {
        id: crypto.randomUUID(),
        type: columnType,
        label: columnType === "col-3" ? "3-Column" : "2-Column",
        columns,
        columnWidths,
      },
    ];
  });

  return {
    title,
    pages: [
      {
        id: crypto.randomUUID(),
        title: "General Information",
        fields,
      },
    ],
  };
}
