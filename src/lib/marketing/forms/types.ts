/** SRS §21 Forms */

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

export interface FormFieldDef {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
}

export interface MarketingForm {
  id: string;
  formId: string;
  name: string;
  status: FormStatus;
  submissions: number;
  fields: number;
  fieldDefs: FormFieldDef[];
  createdBy: string;
  updatedAt: string;
  embedSlug: string;
  description?: string;
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
  { id: "f6", label: "Notes", type: "Textarea", required: false },
  { id: "f7", label: "Preferred suburb", type: "Text", required: false },
  { id: "f8", label: "Approx. loan amount", type: "Text", required: false },
];

export const marketingForms: MarketingForm[] = [
  {
    id: "mf1",
    formId: "FR-6001",
    name: "Lead capture — home loan",
    status: "Published",
    submissions: 312,
    fields: 8,
    fieldDefs: DEFAULT_LEAD_FIELDS,
    createdBy: "John Smith",
    updatedAt: "18/07/2026",
    embedSlug: "home-loan-lead",
    description: "Capture new mortgage enquiries from your website.",
  },
  {
    id: "mf2",
    formId: "FR-6002",
    name: "Document upload intake",
    status: "Published",
    submissions: 94,
    fields: 5,
    fieldDefs: [
      { id: "d1", label: "Full name", type: "Text", required: true },
      { id: "d2", label: "Email", type: "Email", required: true },
      {
        id: "d3",
        label: "Document type",
        type: "Select",
        required: true,
        options: ["ID Proof", "Financial", "Contract", "Other"],
      },
      { id: "d4", label: "Upload file", type: "File", required: true },
      { id: "d5", label: "Comments", type: "Textarea", required: false },
    ],
    createdBy: "Roshna Abraham",
    updatedAt: "15/07/2026",
    embedSlug: "doc-intake",
  },
  {
    id: "mf3",
    formId: "FR-6003",
    name: "Event RSVP — broker breakfast",
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
    createdBy: "Tejas Gokhe",
    updatedAt: "20/07/2026",
    embedSlug: "broker-breakfast",
  },
];

const STORE_KEY = "marketing:forms";

function readStore(): MarketingForm[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as MarketingForm[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: MarketingForm[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listMarketingForms(): MarketingForm[] {
  return readStore() ?? marketingForms.map((f) => ({ ...f }));
}

export function upsertMarketingForm(f: MarketingForm) {
  const list = listMarketingForms();
  const i = list.findIndex((x) => x.id === f.id);
  if (i >= 0) list[i] = f;
  else list.unshift(f);
  writeStore(list);
  return f;
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

export function bumpFormSubmission(slug: string) {
  const form = getFormBySlug(slug);
  if (!form) return;
  upsertMarketingForm({
    ...form,
    submissions: form.submissions + 1,
    updatedAt: new Date().toLocaleDateString("en-AU"),
  });
}
