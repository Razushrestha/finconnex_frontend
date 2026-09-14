import type { SignatureFieldKind } from "./types";

export const SIGNATURE_CAPTURE_KINDS = ["signature", "initials"] as const;

export const DATE_FIELD_KINDS = ["date", "sign_date"] as const;

export const TEXT_INPUT_FIELD_KINDS = [
  "text",
  "name",
  "email",
  "company",
  "job_title",
  "payment",
] as const;

export const FILE_INPUT_FIELD_KINDS = ["attachment", "image"] as const;

export const CHOICE_FIELD_KINDS = ["dropdown", "radio"] as const;

export const DEFAULT_CHOICE_OPTIONS = ["Option 1", "Option 2", "Option 3"];

const KNOWN_KINDS = new Set<string>([
  "signature",
  "initials",
  "date",
  "name",
  "text",
  "email",
  "stamp",
  "image",
  "company",
  "sign_date",
  "job_title",
  "checkbox",
  "dropdown",
  "radio",
  "payment",
  "attachment",
]);

export function normalizeFieldKind(kind: string | undefined): SignatureFieldKind {
  const k = (kind ?? "text").toLowerCase().replace(/-/g, "_");
  if (k === "sign") return "signature";
  if (KNOWN_KINDS.has(k)) return k as SignatureFieldKind;
  return "text";
}

export function isSignatureCaptureKind(kind: string | undefined): boolean {
  const k = normalizeFieldKind(kind);
  return k === "signature" || k === "initials";
}

export function isDateFieldKind(kind: string | undefined): boolean {
  const k = normalizeFieldKind(kind);
  return k === "date" || k === "sign_date";
}

export type SigningFieldAction =
  | "signature"
  | "date"
  | "checkbox"
  | "text"
  | "choice"
  | "file"
  | "stamp";

export function signingFieldAction(kind: string | undefined): SigningFieldAction {
  const k = normalizeFieldKind(kind);
  if (isSignatureCaptureKind(k)) return "signature";
  if (isDateFieldKind(k)) return "date";
  if (k === "checkbox") return "checkbox";
  if (k === "dropdown" || k === "radio") return "choice";
  if (k === "attachment" || k === "image") return "file";
  if (k === "stamp") return "stamp";
  return "text";
}

export function signingGuidePrompt(kind: string | undefined): string {
  const k = normalizeFieldKind(kind);
  if (k === "initials") return "Enter your initials.";
  if (isSignatureCaptureKind(k)) return "Enter your signature.";
  if (isDateFieldKind(k)) return "Enter the date.";
  if (k === "name") return "Enter your name.";
  if (k === "email") return "Enter your email.";
  if (k === "company") return "Enter your company.";
  if (k === "job_title") return "Enter your job title.";
  if (k === "checkbox") return "Select this checkbox.";
  if (k === "dropdown" || k === "radio") return "Choose an option.";
  if (k === "attachment" || k === "image") return "Attach a file.";
  if (k === "stamp") return "Apply your stamp.";
  return "Complete this field.";
}

export function defaultStampValue(signerName: string): string {
  const initials = signerName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return `STAMP ${initials || "OK"}`;
}

/** Identity used to copy a filled value onto the same field in another document. */
export function fieldAutofillGroup(field: {
  kind: string;
  label?: string;
}): string | null {
  const kind = normalizeFieldKind(field.kind);
  const label = (field.label ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (isDateFieldKind(kind)) return "date";
  if (isSignatureCaptureKind(kind)) return kind;
  if (
    kind === "name" ||
    kind === "email" ||
    kind === "company" ||
    kind === "job_title" ||
    kind === "stamp" ||
    kind === "payment"
  ) {
    return kind;
  }
  if (!label) return null;
  return `${kind}:${label}`;
}

export function isSameFieldOnOtherDocument(
  source: {
    id: string;
    signerId: string;
    kind: string;
    label?: string;
    documentId?: string;
  },
  other: {
    id: string;
    signerId: string;
    kind: string;
    label?: string;
    documentId?: string;
  },
): boolean {
  if (other.id === source.id) return false;
  if (other.signerId !== source.signerId) return false;
  if ((other.documentId ?? "primary") === (source.documentId ?? "primary")) {
    return false;
  }
  const group = fieldAutofillGroup(source);
  if (!group) return false;
  return group === fieldAutofillGroup(other);
}
