/** SRS §21 Forms: embeddable intake → CRM + optional Journey (§19) */

import {
  appendTicketAudit,
  formatTicketAt,
  formatTicketDate,
  nextTicketIds,
  upsertTicket,
} from "@/lib/support/types";
import {
  formatJourneyAt,
  getJourneyById,
  listJourneys,
  upsertJourney,
  type LifecycleJourney,
} from "@/lib/journeys/types";

export type FormStatus = "Draft" | "Published" | "Paused" | "Archived";

export const FORM_STATUSES: FormStatus[] = [
  "Draft",
  "Published",
  "Paused",
  "Archived",
];

export type FormFieldType =
  | "Text"
  | "Email"
  | "Phone"
  | "Select"
  | "Textarea"
  | "File";

export const FORM_FIELD_TYPES: FormFieldType[] = [
  "Text",
  "Email",
  "Phone",
  "Select",
  "Textarea",
  "File",
];

/** Where submissions land in the CRM */
export type FormDestination = "Lead" | "Contact" | "Ticket";

export const FORM_DESTINATIONS: FormDestination[] = [
  "Lead",
  "Contact",
  "Ticket",
];

export const FORM_DESTINATION_HREF: Record<FormDestination, string> = {
  Lead: "/sales/leads",
  Contact: "/sales/contacts",
  Ticket: "/support",
};

export interface FormFieldCondition {
  fieldId: string;
  equals: string;
}

export interface FormFieldDef {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  /** Show this field only when another field equals a value */
  showWhen?: FormFieldCondition;
}

export interface MarketingForm {
  id: string;
  formId: string;
  name: string;
  status: FormStatus;
  submissions: number;
  fields: number;
  fieldDefs: FormFieldDef[];
  destination: FormDestination;
  /** Optional §19 journey to enroll on submit */
  journeyId?: string;
  journeyName?: string;
  createdBy: string;
  updatedAt: string;
  embedSlug: string;
  description?: string;
  thankYouMessage?: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  formRef: string;
  formName: string;
  destination: FormDestination;
  values: Record<string, string>;
  submittedAt: string;
  createdRecordRef: string;
  createdRecordHref: string;
  journeyEnrollmentId?: string;
  journeyId?: string;
  contactName: string;
  contactEmail: string;
}

export const FORM_STATUS_STYLE: Record<FormStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Published: "bg-emerald-50 text-emerald-700",
  Paused: "bg-amber-50 text-amber-800",
  Archived: "bg-slate-100 text-slate-500",
};

const STORE_KEY = "marketing:forms:v2";
const SUB_STORE_KEY = "marketing:form-submissions:v1";

export function formatFormAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isFieldVisible(
  field: FormFieldDef,
  values: Record<string, string>,
  allFields: FormFieldDef[],
) {
  if (!field.showWhen) return true;
  const parent = allFields.find((f) => f.id === field.showWhen!.fieldId);
  if (!parent) return true;
  return (values[field.showWhen.fieldId] ?? "") === field.showWhen.equals;
}

export function visibleFields(
  fieldDefs: FormFieldDef[],
  values: Record<string, string>,
) {
  return fieldDefs.filter((f) => isFieldVisible(f, values, fieldDefs));
}

const DEFAULT_LEAD_FIELDS: FormFieldDef[] = [
  { id: "f1", label: "First name", type: "Text", required: true },
  { id: "f2", label: "Last name", type: "Text", required: true },
  { id: "f3", label: "Email", type: "Email", required: true },
  { id: "f4", label: "Phone", type: "Phone", required: false },
  {
    id: "f5",
    label: "Loan purpose",
    type: "Select",
    required: true,
    options: ["Purchase", "Refinance", "Investment"],
  },
  {
    id: "f5b",
    label: "Current lender",
    type: "Text",
    required: true,
    showWhen: { fieldId: "f5", equals: "Refinance" },
  },
  { id: "f6", label: "Notes", type: "Textarea", required: false },
  { id: "f7", label: "Preferred suburb", type: "Text", required: false },
  { id: "f8", label: "Approx. loan amount", type: "Text", required: false },
];

function normalizeForm(raw: MarketingForm): MarketingForm {
  return {
    ...raw,
    destination: raw.destination ?? "Lead",
    fieldDefs: (raw.fieldDefs ?? []).map((f) => ({ ...f })),
    fields: raw.fieldDefs?.length ?? raw.fields ?? 0,
  };
}

export const marketingForms: MarketingForm[] = [
  {
    id: "mf1",
    formId: "FR-6001",
    name: "Lead capture: home loan",
    status: "Published",
    submissions: 312,
    fields: DEFAULT_LEAD_FIELDS.length,
    fieldDefs: DEFAULT_LEAD_FIELDS,
    destination: "Lead",
    journeyId: "lj3",
    journeyName: "Form → booked call (draft)",
    createdBy: "John Smith",
    updatedAt: "18/07/2026",
    embedSlug: "home-loan-lead",
    description: "Capture new mortgage enquiries from your website.",
    thankYouMessage: "Thanks: a broker will be in touch shortly.",
  },
  {
    id: "mf2",
    formId: "FR-6002",
    name: "Support intake: document issue",
    status: "Published",
    submissions: 94,
    fields: 5,
    fieldDefs: [
      { id: "d1", label: "Full name", type: "Text", required: true },
      { id: "d2", label: "Email", type: "Email", required: true },
      {
        id: "d3",
        label: "Issue type",
        type: "Select",
        required: true,
        options: ["Upload failed", "Missing file", "Wrong document", "Other"],
      },
      {
        id: "d3b",
        label: "Describe the issue",
        type: "Textarea",
        required: true,
        showWhen: { fieldId: "d3", equals: "Other" },
      },
      { id: "d4", label: "Upload file", type: "File", required: false },
    ],
    destination: "Ticket",
    createdBy: "Roshna Abraham",
    updatedAt: "15/07/2026",
    embedSlug: "doc-intake",
    description: "Routes into Support as a new ticket.",
  },
  {
    id: "mf3",
    formId: "FR-6003",
    name: "Event RSVP: broker breakfast",
    status: "Draft",
    submissions: 0,
    fields: 6,
    fieldDefs: [
      { id: "e1", label: "Name", type: "Text", required: true },
      { id: "e2", label: "Email", type: "Email", required: true },
      { id: "e3", label: "Company", type: "Text", required: false },
      { id: "e4", label: "Guests", type: "Text", required: false },
      {
        id: "e5",
        label: "Dietary",
        type: "Select",
        required: false,
        options: ["None", "Vegetarian", "Vegan", "Gluten-free"],
      },
      { id: "e6", label: "Questions", type: "Textarea", required: false },
    ],
    destination: "Contact",
    createdBy: "Tejas Gokhe",
    updatedAt: "20/07/2026",
    embedSlug: "broker-breakfast",
  },
];

function readStore(): MarketingForm[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) return (JSON.parse(raw) as MarketingForm[]).map(normalizeForm);
    const legacy = sessionStorage.getItem("marketing:forms");
    if (legacy) {
      const list = (JSON.parse(legacy) as MarketingForm[]).map(normalizeForm);
      sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
      return list;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStore(list: MarketingForm[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listMarketingForms(): MarketingForm[] {
  return readStore() ?? marketingForms.map((f) => normalizeForm({ ...f }));
}

export function upsertMarketingForm(f: MarketingForm) {
  const list = listMarketingForms();
  const normalized = normalizeForm({
    ...f,
    fields: f.fieldDefs.length,
  });
  const i = list.findIndex((x) => x.id === normalized.id);
  if (i >= 0) list[i] = normalized;
  else list.unshift(normalized);
  writeStore(list);
  return normalized;
}

export function getFormBySlug(slug: string) {
  return listMarketingForms().find((f) => f.embedSlug === slug);
}

export function getFormById(id: string) {
  return listMarketingForms().find((f) => f.id === id);
}

export function nextFormIds(slugHint: string) {
  const list = listMarketingForms();
  const nums = list
    .map((f) => Number(f.formId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 6000) + 1;
  const base =
    slugHint
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || `form-${n}`;
  let slug = base;
  let i = 2;
  while (list.some((f) => f.embedSlug === slug)) {
    slug = `${base}-${i++}`;
  }
  return { id: `mf-${Date.now()}`, formId: `FR-${n}`, embedSlug: slug };
}

function readSubs(): FormSubmission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SUB_STORE_KEY);
    return raw ? (JSON.parse(raw) as FormSubmission[]) : [];
  } catch {
    return [];
  }
}

function writeSubs(list: FormSubmission[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SUB_STORE_KEY, JSON.stringify(list));
}

export function listFormSubmissions(formId?: string) {
  const all = readSubs();
  return formId ? all.filter((s) => s.formId === formId) : all;
}

function findValue(
  values: Record<string, string>,
  fieldDefs: FormFieldDef[],
  ...labels: string[]
) {
  const lower = labels.map((l) => l.toLowerCase());
  for (const f of fieldDefs) {
    if (lower.some((l) => f.label.toLowerCase().includes(l))) {
      const v = values[f.id]?.trim();
      if (v) return v;
    }
    if (f.type === "Email" && values[f.id]?.trim()) return values[f.id].trim();
  }
  return "";
}

function buildContactName(
  values: Record<string, string>,
  fieldDefs: FormFieldDef[],
) {
  const first = findValue(values, fieldDefs, "first name", "first");
  const last = findValue(values, fieldDefs, "last name", "last");
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return (
    findValue(values, fieldDefs, "full name", "name") ||
    findValue(values, fieldDefs, "email") ||
    "Form contact"
  );
}

function enrollInJourney(
  journeyId: string,
  contactName: string,
  email: string,
): { enrollmentId: string; journey: LifecycleJourney } | null {
  const journey = getJourneyById(journeyId);
  if (!journey || journey.status === "Paused") return null;
  const firstStep = journey.steps[0];
  if (!firstStep) return null;
  const enrollmentId = `enr-${Date.now()}`;
  const next: LifecycleJourney = {
    ...journey,
    updatedAt: formatJourneyAt(),
    enrollments: [
      {
        id: enrollmentId,
        contactName,
        email,
        currentStepId: firstStep.id,
        enteredAt: formatJourneyAt(),
        status: "Active",
      },
      ...journey.enrollments,
    ],
    steps: journey.steps.map((s, i) =>
      i === 0 ? { ...s, enrolledCount: s.enrolledCount + 1 } : s,
    ),
  };
  upsertJourney(next);
  return { enrollmentId, journey: next };
}

export function journeyOptionsForForms() {
  return listJourneys().map((j) => ({
    id: j.id,
    label: `${j.journeyId} · ${j.name}`,
    trigger: j.trigger,
    status: j.status,
  }));
}

export type ProcessResult = {
  submission: FormSubmission;
  thankYou: string;
};

/** Validate visible required fields, route into CRM, optional journey enroll. */
export function processFormSubmission(
  slug: string,
  values: Record<string, string>,
):
  | { ok: true; result: ProcessResult }
  | { ok: false; errors: Record<string, string> } {
  const form = getFormBySlug(slug);
  if (!form || form.status !== "Published") {
    return { ok: false, errors: { _form: "Form not available" } };
  }

  const visible = visibleFields(form.fieldDefs, values);
  const errors: Record<string, string> = {};
  for (const f of visible) {
    if (f.required && !values[f.id]?.trim()) {
      errors[f.id] = "Required";
    }
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  const contactName = buildContactName(values, form.fieldDefs);
  const contactEmail =
    findValue(values, form.fieldDefs, "email") || "unknown@example.com";
  const notes =
    findValue(
      values,
      form.fieldDefs,
      "notes",
      "comment",
      "describe",
      "question",
    ) ||
    Object.entries(values)
      .filter(([, v]) => v.trim())
      .map(([id, v]) => {
        const label = form.fieldDefs.find((f) => f.id === id)?.label ?? id;
        return `${label}: ${v}`;
      })
      .join("\n");

  let createdRecordRef = "";
  let createdRecordHref = FORM_DESTINATION_HREF[form.destination];

  if (form.destination === "Ticket") {
    const ids = nextTicketIds();
    const ticket = upsertTicket(
      appendTicketAudit(
        {
          id: ids.id,
          ticketId: ids.ticketId,
          subject: `${form.name}: ${contactName}`,
          requester: contactName,
          relatedAccount: contactEmail,
          priority: "Medium",
          status: "New",
          category: "General",
          description: notes || `Submitted via form ${form.formId}`,
          createdBy: "Form intake",
          createdAt: formatTicketDate(),
          modifiedAt: formatTicketAt(),
          notes: [],
          audit: [],
        },
        `Created from form ${form.formId}`,
        "Form intake",
      ),
    );
    createdRecordRef = ticket.ticketId;
    createdRecordHref = `/support/${ticket.id}`;
  } else if (form.destination === "Lead") {
    const n = 8000 + (listFormSubmissions().length % 900);
    createdRecordRef = `LD-${n}`;
    createdRecordHref = "/sales/leads";
  } else {
    const n = 9000 + (listFormSubmissions().length % 900);
    createdRecordRef = `CT-${n}`;
    createdRecordHref = "/sales/contacts";
  }

  let journeyEnrollmentId: string | undefined;
  if (form.journeyId) {
    const enrolled = enrollInJourney(
      form.journeyId,
      contactName,
      contactEmail,
    );
    if (enrolled) journeyEnrollmentId = enrolled.enrollmentId;
  }

  const submission: FormSubmission = {
    id: `sub-${Date.now()}`,
    formId: form.id,
    formRef: form.formId,
    formName: form.name,
    destination: form.destination,
    values: { ...values },
    submittedAt: formatFormAt(),
    createdRecordRef,
    createdRecordHref,
    journeyEnrollmentId,
    journeyId: form.journeyId,
    contactName,
    contactEmail,
  };

  writeSubs([submission, ...readSubs()]);
  upsertMarketingForm({
    ...form,
    submissions: form.submissions + 1,
    updatedAt: new Date().toLocaleDateString("en-AU"),
  });

  return {
    ok: true,
    result: {
      submission,
      thankYou:
        form.thankYouMessage ||
        `Thanks: your ${form.destination.toLowerCase()} was created (${createdRecordRef}).`,
    },
  };
}

export function embedSnippet(origin: string, slug: string) {
  const url = `${origin}/f/${slug}`;
  return `<iframe src="${url}" title="FinConnex form" style="width:100%;min-height:640px;border:0;border-radius:12px;" loading="lazy"></iframe>`;
}
