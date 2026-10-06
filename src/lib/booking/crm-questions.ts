import type { BookingAddressPart, BookingQuestion } from "@/lib/booking/types";

/**
 * Booking form fields ↔ the CRM event type's `questions`.
 *
 * The CRM keeps a consultation's form so it reads back the same in any
 * browser and on the guest's page, and turns each custom question into a
 * Lead custom field. Its own `type` is coarse (TEXT, TEXTAREA, PHONE,
 * SELECT); `uiType` carries the form builder's exact field type.
 */

export type CrmBookingQuestion = {
  key: string;
  label: string;
  type: "TEXT" | "TEXTAREA" | "PHONE" | "SELECT";
  required?: boolean;
  options?: string[];
  uiType?: string;
  hidden?: boolean;
  settings?: Record<string, unknown>;
};

const UI_TYPES = new Set([
  "single_line",
  "multiline",
  "email",
  "checkbox",
  "radio",
  "dropdown",
  "date",
  "address",
  "number",
]);

function crmType(question: BookingQuestion, options: string[]): CrmBookingQuestion["type"] {
  const ui = question.fieldType ?? "single_line";
  if ((ui === "radio" || ui === "dropdown") && options.length) return "SELECT";
  if (ui === "multiline" || ui === "address") return "TEXTAREA";
  if (question.id === "phone") return "PHONE";
  return "TEXT";
}

/** The form's fields as the CRM stores them (limits match its validation). */
export function toCrmQuestions(questions: BookingQuestion[] | undefined): CrmBookingQuestion[] {
  const seen = new Set<string>();
  const out: CrmBookingQuestion[] = [];
  for (const question of questions ?? []) {
    const key = question.id.trim().slice(0, 60);
    const label = question.label.trim().slice(0, 255) || key;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const options = (question.options ?? [])
      .map((option) => option.trim().slice(0, 255))
      .filter(Boolean)
      .slice(0, 25);
    const settings: Record<string, unknown> = {};
    if (question.ephi) settings.ephi = true;
    if (question.addressParts?.length) settings.addressParts = question.addressParts;
    out.push({
      key,
      label,
      type: crmType(question, options),
      required: Boolean(question.required),
      ...(options.length ? { options } : {}),
      ...(question.fieldType && UI_TYPES.has(question.fieldType)
        ? { uiType: question.fieldType }
        : {}),
      ...(question.hidden ? { hidden: true } : {}),
      ...(Object.keys(settings).length ? { settings } : {}),
    });
  }
  return out;
}

/** The CRM's questions as booking form fields; anything malformed is skipped. */
export function fromCrmQuestions(raw: unknown): BookingQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: BookingQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const key = typeof row.key === "string" ? row.key.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!key || !label) continue;
    const settings =
      row.settings && typeof row.settings === "object"
        ? (row.settings as Record<string, unknown>)
        : {};
    const options = Array.isArray(row.options)
      ? row.options.filter((option): option is string => typeof option === "string")
      : undefined;
    const uiType = typeof row.uiType === "string" && UI_TYPES.has(row.uiType) ? row.uiType : "";
    out.push({
      id: key,
      label,
      required: row.required === true,
      ...(row.hidden === true ? { hidden: true } : {}),
      fieldType:
        uiType ||
        (row.type === "SELECT" ? "dropdown" : row.type === "TEXTAREA" ? "multiline" : "single_line"),
      ...(options?.length ? { options } : {}),
      ...(settings.ephi === true ? { ephi: true } : {}),
      ...(Array.isArray(settings.addressParts)
        ? { addressParts: settings.addressParts as BookingAddressPart[] }
        : {}),
    });
  }
  return out;
}
