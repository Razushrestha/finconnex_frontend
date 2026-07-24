/** Mock Templates Library seeds until SRS §25 ships */

export interface EmailTemplateSeed {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  bodyHtml: string;
}

export interface SmsTemplateSeed {
  id: string;
  name: string;
  body: string;
}

export interface WhatsAppTemplateSeed {
  id: string;
  name: string;
  category: "Marketing" | "Utility" | "Authentication";
  approvalStatus: "Draft" | "Pending Meta" | "Approved" | "Rejected";
  body: string;
  header?: string;
  buttons?: string[];
}

export const EMAIL_TEMPLATE_SEEDS: EmailTemplateSeed[] = [
  {
    id: "et1",
    name: "Rate lock nurture",
    subject: "Lock in today's home loan rate",
    previewText: "Rates moved overnight: here's what it means for you.",
    bodyHtml:
      "Hi {{first_name}},\n\nMarkets moved overnight. Reply to this email if you'd like us to lock a rate this week.\n\n FinConnex",
  },
  {
    id: "et2",
    name: "Proposal ready",
    subject: "Your proposal is ready to review",
    previewText: "We've prepared options tailored to your goals.",
    bodyHtml:
      "Hi {{first_name}},\n\nYour proposal pack is ready. Open the link in this email to review and book a walkthrough.\n\n FinConnex",
  },
  {
    id: "et3",
    name: "Document reminder",
    subject: "We're still waiting on your documents",
    previewText: "A quick nudge so we can keep your application moving.",
    bodyHtml:
      "Hi {{first_name}},\n\nWe're still missing a few documents. Upload them in the portal when you can so we can keep things moving.\n\n FinConnex",
  },
  {
    id: "et4",
    name: "Quarterly newsletter",
    subject: "FinConnex insights: this quarter",
    previewText: "Market notes, tips, and what's new at FinConnex.",
    bodyHtml:
      "Hi {{first_name}},\n\nHere's what's happening in lending this quarter, plus a few tips from our brokers.\n\n The FinConnex team",
  },
];

export const SMS_TEMPLATE_SEEDS: SmsTemplateSeed[] = [
  {
    id: "st1",
    name: "Appointment reminder",
    body: "Hi {{first_name}}, reminder: your FinConnex consult is {{time}}. Reply STOP to opt out.",
  },
  {
    id: "st2",
    name: "Docs nudge",
    body: "Quick nudge: please upload your ID proof in the portal when you can. Thanks! FinConnex",
  },
];

export const WHATSAPP_TEMPLATE_SEEDS: WhatsAppTemplateSeed[] = [
  {
    id: "wt1",
    name: "appointment_reminder_v1",
    category: "Utility",
    approvalStatus: "Approved",
    header: "Appointment reminder",
    body: "Hi {{1}}, your FinConnex appointment is on {{2}} at {{3}}. Reply if you need to reschedule.",
    buttons: ["Confirm", "Reschedule"],
  },
  {
    id: "wt2",
    name: "promo_rate_alert_v1",
    category: "Marketing",
    approvalStatus: "Pending Meta",
    body: "Hi {{1}}, special rate window this week for {{2}}. Tap below to book a call.",
    buttons: ["Book call"],
  },
  {
    id: "wt3",
    name: "doc_request_v1",
    category: "Utility",
    approvalStatus: "Draft",
    body: "Hi {{1}}, please upload {{2}} so we can continue your application.",
  },
];

export const AUDIENCE_OPTIONS = [
  "Leads · Mortgage · Warm",
  "Leads · Real Estate",
  "Contacts · Active",
  "Document Requests · Pending",
  "Meetings · Tomorrow",
  "Deal: Greystone Realty",
  "All opted-in contacts",
] as const;
