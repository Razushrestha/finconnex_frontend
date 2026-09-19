/**
 * The Request Documents step's form, shaped like the three-step Create
 * Document Request page (CreateDocumentRequestForm), and its conversion to
 * and from the step config.
 *
 * The config keeps what the CRM stores: the recipient contact (picked, or the
 * workflow's own), the sender, the due time, the title, the notes, and one
 * item per ticked document. A saved step is read back by matching the item
 * names against the page's document catalogue; documents added by hand come
 * back under "Other".
 */

import type { RequestApplicant } from "@/components/documents/requests/RequestApplicantsSection";
import {
  TASK_OFFSET_UNITS,
  offsetFromMs,
  offsetMs,
  type TaskOffset,
} from "@/lib/automations/task-action-form";
import {
  REQUEST_DOC_CATEGORIES,
  type RequestDocItem,
} from "@/lib/documents/requests/catalog";

export { TASK_OFFSET_UNITS as REQUEST_OFFSET_UNITS };

/** The page's purpose; its title fallback and document type come from it. */
export const REQUEST_PURPOSE = "Property purchase";

type Slot = 1 | 2;

export interface DocumentRequestFormState {
  step: 1 | 2 | 3;
  /** Sender teammate's user id ("Send on behalf of"). */
  senderId: string;
  /** Ask the contact of the record that started the workflow. */
  applicantFromTrigger: boolean;
  /** Up to two applicants, as on the page; the first receives the request. */
  applicants: RequestApplicant[];
  selected: Record<Slot, string[]>;
  extras: Record<string, RequestDocItem[]>;
  descriptionOverrides: Record<string, string>;
  template: string;
  title: string;
  titleEdited: boolean;
  notes: string;
  dueMode: "relative" | "date";
  dueIn: TaskOffset;
  /** `datetime-local`, as on the page. */
  dueDate: string;
}

export function emptyDocumentRequestForm(applicantFromTrigger: boolean): DocumentRequestFormState {
  return {
    step: 1,
    senderId: "",
    applicantFromTrigger,
    applicants: [],
    selected: { 1: [], 2: [] },
    extras: {},
    descriptionOverrides: {},
    template: "",
    title: "",
    titleEdited: false,
    notes: "",
    dueMode: "relative",
    // The page defaults to a week out.
    dueIn: { amount: 7, unit: "days" },
    dueDate: "",
  };
}

export function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? "";
}

/** "Applicant" names as the page shows them; the workflow's contact has no name yet. */
export function applicantNames(form: DocumentRequestFormState): [string, string] {
  const first = form.applicantFromTrigger
    ? "Workflow contact"
    : form.applicants[0]?.name.trim() || "Applicant";
  const second = form.applicants[1]?.name.trim() || "Applicant 2";
  return [first, second];
}

export function hasTwoApplicants(form: DocumentRequestFormState): boolean {
  return !form.applicantFromTrigger && form.applicants.length >= 2;
}

/** The page's title fill: template and first names, else purpose and names. */
export function autoTitle(form: DocumentRequestFormState): string {
  const names = form.applicantFromTrigger
    ? ""
    : [firstName(form.applicants[0]?.name ?? ""), hasTwoApplicants(form) ? firstName(form.applicants[1]?.name ?? "") : ""]
        .filter(Boolean)
        .join(", ");
  if (form.template && names) return `${form.template} - ${names}`;
  if (form.template) return form.template;
  if (names) return `${REQUEST_PURPOSE} - ${names}`;
  return REQUEST_PURPOSE;
}

function catalogItems(extras: Record<string, RequestDocItem[]>): RequestDocItem[] {
  return REQUEST_DOC_CATEGORIES.flatMap((category) => [
    ...category.items,
    ...(extras[category.id] ?? []),
  ]);
}

/** Ticked documents per applicant, resolved to titles — the review groups. */
export function reviewGroups(form: DocumentRequestFormState) {
  const items = catalogItems(form.extras);
  const resolve = (id: string): RequestDocItem => {
    const item = items.find((row) => row.id === id);
    return {
      id,
      title: item?.title ?? id,
      description: form.descriptionOverrides[id] ?? item?.description ?? "",
    };
  };
  const [first, second] = applicantNames(form);
  const groups = [{ applicant: first, items: form.selected[1].map(resolve) }];
  if (hasTwoApplicants(form)) groups.push({ applicant: second, items: form.selected[2].map(resolve) });
  return groups.filter((group) => group.items.length > 0);
}

function toIso(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const parsed = new Date(local);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function documentRequestConfigFromForm(form: DocumentRequestFormState): Record<string, unknown> {
  const two = hasTwoApplicants(form);
  const config: Record<string, unknown> = {
    title: (form.titleEdited ? form.title : autoTitle(form)).trim(),
    documentType: "OTHER",
  };
  if (form.applicantFromTrigger) config.requestedFromTrigger = true;
  else if (form.applicants[0]?.recordId) config.requestedFromId = form.applicants[0].recordId;
  if (form.senderId) config.requestedById = form.senderId;
  if (form.dueMode === "relative") config.dueInMs = offsetMs(form.dueIn);
  else {
    const due = toIso(form.dueDate);
    if (due) config.dueDate = due;
  }
  // The CRM keeps one item per document, with no applicant of its own, so a
  // two-applicant request names whose document each one is.
  const items = reviewGroups(form).flatMap((group) =>
    group.items.map((item) => ({
      name: two ? `${item.title} — ${firstName(group.applicant)}` : item.title,
    })),
  );
  if (items.length) config.items = items;
  if (form.notes.trim()) config.notes = form.notes.trim();
  return config;
}

function toLocal(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

/**
 * The form for a saved step. The recipient comes back as an id (the form
 * resolves its name); documents are matched to the catalogue by title, and a
 * "Title — Name" suffix puts a document back under the second applicant.
 */
export function documentRequestFormFromConfig(
  config: Record<string, unknown>,
  defaultApplicantFromTrigger: boolean,
): DocumentRequestFormState {
  const str = (value: unknown) => (typeof value === "string" ? value : "");
  const saved = Object.keys(config).length > 0;
  const form = emptyDocumentRequestForm(saved ? config.requestedFromTrigger === true : defaultApplicantFromTrigger);
  const requestedFromId = str(config.requestedFromId);
  if (requestedFromId) {
    form.applicants = [
      { id: "ap-saved-1", source: "contact", email: "", name: "", deliverVia: "email", recordId: requestedFromId },
    ];
  }
  form.senderId = str(config.requestedById);
  if (typeof config.dueInMs === "number") form.dueIn = offsetFromMs(config.dueInMs);
  else if (str(config.dueDate)) {
    form.dueMode = "date";
    form.dueDate = toLocal(config.dueDate);
  }
  form.notes = str(config.notes);

  const names = Array.isArray(config.items)
    ? config.items
        .map((item) => (item && typeof item === "object" ? str((item as { name?: unknown }).name) : ""))
        .filter(Boolean)
    : [];
  const suffixes = new Set(names.map((name) => name.split(" — ")[1]).filter(Boolean));
  const [firstSuffix, secondSuffix] = [...suffixes];
  if (secondSuffix && form.applicants.length) {
    form.applicants.push({ id: "ap-saved-2", source: "contact", email: "", name: secondSuffix, deliverVia: "email" });
  }
  let customIndex = 0;
  for (const name of names) {
    const [title, owner] = name.split(" — ");
    const slot: Slot = owner && secondSuffix && owner === secondSuffix && owner !== firstSuffix ? 2 : 1;
    const known = catalogItems(form.extras).find((item) => item.title === title);
    const id = known?.id ?? `custom-${++customIndex}`;
    if (!known) {
      form.extras.other = [...(form.extras.other ?? []), { id, title, description: "" }];
    }
    if (!form.selected[slot].includes(id)) form.selected[slot] = [...form.selected[slot], id];
  }

  form.title = str(config.title);
  form.titleEdited = Boolean(form.title) && form.title !== autoTitle(form);
  return form;
}

/** The page's per-step checks (validateStep), with the workflow's contact rule. */
export function documentRequestProblems(
  form: DocumentRequestFormState,
  opts: { triggerHasContact: boolean; step?: 1 | 2 | 3 },
): string[] {
  const upTo = opts.step ?? 3;
  const problems: string[] = [];
  if (!form.senderId) problems.push("Choose who the request is sent on behalf of");
  if (form.applicantFromTrigger) {
    if (!opts.triggerHasContact) problems.push("This trigger's record has no contact — add an applicant instead");
  } else if (!form.applicants[0]?.recordId) {
    problems.push("Add an applicant from your contacts");
  }
  if (form.dueMode === "relative") {
    if (offsetMs(form.dueIn) < 60_000) problems.push("Due time must be at least 1 minute after the workflow runs");
  } else {
    const due = toIso(form.dueDate);
    if (!due) problems.push("Due date is required");
    else if (new Date(due).getTime() <= Date.now()) problems.push("Due date must be in the future");
  }
  if (upTo >= 2 && reviewGroups(form).length === 0) problems.push("Select at least one document");
  if (upTo >= 3 && !(form.titleEdited ? form.title : autoTitle(form)).trim()) {
    problems.push("Document request title is required");
  }
  return problems;
}
