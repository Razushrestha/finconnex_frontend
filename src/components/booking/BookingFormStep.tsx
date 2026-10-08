"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleDot,
  Eye,
  EyeOff,
  FormInput,
  GripVertical,
  Hash,
  HelpCircle,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspacePortal } from "@/components/shared/WorkspacePortal";

const BRAND = "var(--brand-primary)";

export type BookingFormFieldType =
  | "single_line"
  | "multiline"
  | "email"
  | "checkbox"
  | "radio"
  | "dropdown"
  | "date"
  | "address"
  | "number";

const BOOKING_FIELD_TYPES: BookingFormFieldType[] = [
  "single_line",
  "multiline",
  "email",
  "checkbox",
  "radio",
  "dropdown",
  "date",
  "address",
  "number",
];

function isBookingFieldType(
  value: string | undefined,
): value is BookingFormFieldType {
  return BOOKING_FIELD_TYPES.includes(value as BookingFormFieldType);
}

function fieldHasOptions(type: BookingFormFieldType | null) {
  return type === "radio" || type === "checkbox" || type === "dropdown";
}

/** Trimmed, non-blank options, each once (case and spacing ignored). */
export function cleanFieldOptions(
  options: readonly string[] | undefined,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of options ?? []) {
    const option = raw.trim();
    const key = option.toLowerCase().replace(/\s+/g, " ");
    if (!option || seen.has(key)) continue;
    seen.add(key);
    out.push(option);
  }
  return out;
}

type AddressPart = { id: string; label: string; enabled: boolean };

function defaultAddressParts(): AddressPart[] {
  return [
    { id: "line1", label: "Address Line 1", enabled: true },
    { id: "line2", label: "Address Line 2", enabled: false },
    { id: "city", label: "City/ District", enabled: false },
    { id: "state", label: "State", enabled: false },
    { id: "postal", label: "Postal Code", enabled: false },
    { id: "country", label: "Country", enabled: false },
  ];
}

export type BookingFormField = {
  id: string;
  label: string;
  required: boolean;
  hidden: boolean;
  badge?: string;
  type?: BookingFormFieldType;
  ephi?: boolean;
  options?: string[];
  addressParts?: AddressPart[];
};

export const DEFAULT_TERMS_HTML =
  'I have read and agree to your <a href="#">terms and conditions</a>.';

export type BookingFormValues = {
  fields: BookingFormField[];
  terms: boolean;
  termsText: string;
  captcha: boolean;
  emailVerification: boolean;
  freeButton: string;
  paidButton: string;
};

const DEFAULT_FIELDS: BookingFormField[] = [
  { id: "name", label: "Name", required: true, hidden: false },
  {
    id: "email",
    label: "Email",
    required: true,
    hidden: false,
    badge: "Verification disabled",
  },
  { id: "phone", label: "Contact Number", required: true, hidden: false },
  { id: "guests", label: "Invite Guest(s)", required: false, hidden: false },
];

export const DEFAULT_BOOKING_FORM: BookingFormValues = {
  fields: DEFAULT_FIELDS,
  terms: false,
  termsText: DEFAULT_TERMS_HTML,
  captcha: false,
  emailVerification: false,
  freeButton: "Schedule Appointment",
  paidButton: "Pay and Schedule Appointment",
};

export function bookingFormFromQuestions(
  questions?: {
    id: string;
    label: string;
    required: boolean;
    hidden?: boolean;
    fieldType?: string;
    ephi?: boolean;
    options?: string[];
    addressParts?: AddressPart[];
  }[],
  page?: { termsEnabled?: boolean; termsHtml?: string },
): BookingFormValues {
  const terms = Boolean(page?.termsEnabled);
  const termsText = page?.termsHtml?.trim() || DEFAULT_TERMS_HTML;
  if (!questions?.length) {
    return {
      ...DEFAULT_BOOKING_FORM,
      fields: [...DEFAULT_FIELDS],
      terms,
      termsText,
    };
  }
  const fields = DEFAULT_FIELDS.map((field) => {
    const hit =
      questions.find((row) => row.id === field.id) ??
      questions.find((row) => row.label === field.label);
    return hit
      ? {
          ...field,
          label: hit.label,
          required: hit.required,
          hidden: Boolean(hit.hidden),
          ephi: hit.ephi,
          options: hit.options ? cleanFieldOptions(hit.options) : undefined,
          addressParts: hit.addressParts,
          type: isBookingFieldType(hit.fieldType) ? hit.fieldType : field.type,
        }
      : field;
  });
  for (const row of questions) {
    if (
      fields.some((field) => field.id === row.id || field.label === row.label)
    ) {
      continue;
    }
    fields.push({
      id: row.id,
      label: row.label,
      required: row.required,
      hidden: Boolean(row.hidden),
      ephi: row.ephi,
      options: row.options ? cleanFieldOptions(row.options) : undefined,
      addressParts: row.addressParts,
      type: isBookingFieldType(row.fieldType) ? row.fieldType : "single_line",
    });
  }
  return { ...DEFAULT_BOOKING_FORM, fields, terms, termsText };
}

const FIELD_TYPES: {
  id: BookingFormFieldType;
  label: string;
  icon: typeof FormInput;
}[] = [
  { id: "single_line", label: "Single Line", icon: FormInput },
  { id: "multiline", label: "MultiLine", icon: AlignLeft },
  { id: "email", label: "Email", icon: Mail },
  { id: "checkbox", label: "Checkbox", icon: CheckSquare },
  { id: "radio", label: "Radio Button", icon: CircleDot },
  { id: "dropdown", label: "Drop-down", icon: ChevronDown },
  { id: "date", label: "Date", icon: Calendar },
  { id: "address", label: "Address", icon: MapPin },
  { id: "number", label: "Number", icon: Hash },
];

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-[var(--brand-primary)]" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          on && "translate-x-5",
        )}
      />
    </button>
  );
}

function AddFieldDrawer({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (field: {
    type: BookingFormFieldType;
    label: string;
    required: boolean;
    ephi: boolean;
    options?: string[];
    addressParts?: AddressPart[];
  }) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [picked, setPicked] = useState<BookingFormFieldType | null>(null);
  const [label, setLabel] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [ephi, setEphi] = useState(false);
  const [options, setOptions] = useState<string[]>([""]);
  const [optionsError, setOptionsError] = useState("");
  const [addressParts, setAddressParts] =
    useState<AddressPart[]>(defaultAddressParts);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setPicked(null);
      setLabel("");
      setMandatory(false);
      setEphi(false);
      setOptions([""]);
      setOptionsError("");
      setAddressParts(defaultAddressParts());
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function submitField() {
    if (!picked) return;
    const nextLabel = label.trim();
    if (!nextLabel) return;
    const nextOptions = cleanFieldOptions(options);
    // A choice field needs real choices; never invent a placeholder option.
    if (fieldHasOptions(picked) && !nextOptions.length) {
      setOptionsError("Add at least one option.");
      return;
    }
    onSelect({
      type: picked,
      label: nextLabel,
      required: mandatory,
      ephi: picked === "address" ? false : ephi,
      options: fieldHasOptions(picked) ? nextOptions : undefined,
      addressParts:
        picked === "address"
          ? addressParts.map((part) => ({
              ...part,
              label: part.label.trim() || part.id,
              enabled:
                part.enabled ||
                (addressParts.every((item) => !item.enabled) &&
                  part.id === "line1"),
            }))
          : undefined,
    });
  }

  if (!mounted) return null;

  return (
    <WorkspacePortal>
      <div className="fixed inset-0 z-50 flex justify-end pt-4 pb-8">
        <button
          type="button"
          aria-label="Close add field panel"
          onClick={onClose}
          className={cn(
            "absolute inset-0 bg-slate-900/30 transition-opacity duration-300",
            visible ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "@container h-auto min-h-0 w-full max-w-[380px] self-stretch transition-transform duration-300 ease-out",
            visible ? "translate-x-0" : "translate-x-full",
          )}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-field-title"
            className="relative flex h-full w-full flex-col overflow-hidden rounded-tl-[5cqw] rounded-bl-[5cqw] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
              <h2
                id="add-field-title"
                className="text-[15px] font-bold text-slate-900"
              >
                Add New Field
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {picked ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                  <label className="block">
                    <span className="mb-2 block text-[13px] font-medium text-slate-800">
                      Field Label <span className="text-rose-500">*</span>
                    </span>
                    <input
                      autoFocus
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        submitField();
                      }}
                      className="h-10 w-full rounded-md border border-[#D6D3E0] px-3 text-[13px] text-slate-800 outline-none focus:border-[var(--brand-primary)]/50"
                    />
                  </label>
                  {fieldHasOptions(picked) ? (
                    <div className="mt-4 space-y-2">
                      {options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            value={option}
                            placeholder="Option"
                            onChange={(e) => {
                              setOptionsError("");
                              setOptions((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index ? e.target.value : item,
                                ),
                              );
                            }}
                            className="h-10 min-w-0 flex-1 rounded-md border border-[#D6D3E0] px-3 text-[13px] text-slate-800 outline-none focus:border-[var(--brand-primary)]/50"
                          />
                          {index === options.length - 1 ? (
                            <button
                              type="button"
                              aria-label="Add option"
                              onClick={() =>
                                setOptions((prev) => [...prev, ""])
                              }
                              className="flex h-10 w-10 shrink-0 items-center justify-center text-[20px] leading-none text-slate-700 hover:text-[var(--brand-primary)]"
                            >
                              +
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-label="Remove option"
                              onClick={() =>
                                setOptions((prev) =>
                                  prev.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                )
                              }
                              className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-400 hover:text-slate-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {optionsError ? (
                        <p
                          role="alert"
                          className="text-[12px] font-medium text-rose-600"
                        >
                          {optionsError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {picked === "address" ? (
                    <div className="mt-5">
                      <p className="mb-2 text-[13px] text-slate-500">
                        Display Fields
                      </p>
                      <div className="space-y-2">
                        {addressParts.map((part) => (
                          <label
                            key={part.id}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              checked={part.enabled}
                              onChange={(e) =>
                                setAddressParts((prev) =>
                                  prev.map((item) =>
                                    item.id === part.id
                                      ? { ...item, enabled: e.target.checked }
                                      : item,
                                  ),
                                )
                              }
                              className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[var(--brand-primary)]"
                            />
                            <input
                              value={part.label}
                              onChange={(e) =>
                                setAddressParts((prev) =>
                                  prev.map((item) =>
                                    item.id === part.id
                                      ? { ...item, label: e.target.value }
                                      : item,
                                  ),
                                )
                              }
                              className={cn(
                                "h-10 min-w-0 flex-1 rounded-md border px-3 text-[13px] text-slate-800 outline-none",
                                part.enabled
                                  ? "border-[#D8CCEE] bg-[#F4F0FA]"
                                  : "border-[#D6D3E0] bg-white",
                              )}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {picked === "number" ? (
                    <p className="mt-3 text-[13px] italic text-slate-500">
                      This field allows numeric input only, with a maximum limit
                      of 9 digits.
                    </p>
                  ) : null}
                  <label className="mt-5 flex items-center gap-2 text-[13px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={mandatory}
                      onChange={(e) => setMandatory(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[var(--brand-primary)]"
                    />
                    Mandatory
                  </label>
                  {picked === "address" ? null : (
                    <label className="mt-3 flex items-center gap-2 text-[13px] text-slate-700">
                      <input
                        type="checkbox"
                        checked={ephi}
                        onChange={(e) => setEphi(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-[var(--brand-primary)]"
                      />
                      Mark as ePHI/PII
                    </label>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 border-t border-[#E5E7EB] bg-white px-5 py-4">
                  <button
                    type="button"
                    onClick={submitField}
                    className="h-9 rounded-md px-5 text-[13px] font-semibold text-white hover:brightness-110"
                    style={{ backgroundColor: BRAND }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(null);
                      setLabel("");
                      setMandatory(false);
                      setEphi(false);
                      setOptions([""]);
                      setAddressParts(defaultAddressParts());
                    }}
                    className="h-9 rounded-md border border-[#E5E7EB] bg-white px-5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <h3 className="mb-4 text-[13px] font-bold text-slate-800">
                  Field Types
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {FIELD_TYPES.map((fieldType) => {
                    const Icon = fieldType.icon;
                    return (
                      <button
                        key={fieldType.id}
                        type="button"
                        onClick={() => {
                          setPicked(fieldType.id);
                          setLabel("");
                          setMandatory(false);
                          setEphi(false);
                          setOptions([""]);
                          setAddressParts(defaultAddressParts());
                        }}
                        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-5 text-center transition hover:border-[var(--brand-primary)]/35 hover:bg-[var(--brand-primary-soft)]"
                      >
                        <Icon
                          className="h-5 w-5 text-slate-500"
                          strokeWidth={1.75}
                        />
                        <span className="text-[12px] font-medium text-slate-700">
                          {fieldType.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </WorkspacePortal>
  );
}

function TermsDrawer({
  open,
  initialHtml,
  onCancel,
  onDraft,
  onUpdate,
}: {
  open: boolean;
  initialHtml: string;
  onCancel: () => void;
  onDraft: (html: string) => void;
  onUpdate: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");

  useEffect(() => {
    if (open) {
      setMounted(true);
      setLinkOpen(false);
      setLinkUrl("https://");
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;
    const html = initialHtml || DEFAULT_TERMS_HTML;
    const frame = requestAnimationFrame(() => {
      if (editorRef.current) editorRef.current.innerHTML = html;
    });
    return () => cancelAnimationFrame(frame);
  }, [open, mounted, initialHtml]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  function rememberSelection() {
    const sel = window.getSelection();
    if (!sel?.rangeCount || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  }

  function restoreSelection() {
    const range = savedRange.current;
    const sel = window.getSelection();
    if (!range || !sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function publishDraft() {
    const html = editorRef.current?.innerHTML?.trim();
    if (html) onDraft(html);
  }

  function applyBold() {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("bold");
    publishDraft();
  }

  function applyLink() {
    const raw = linkUrl.trim();
    if (!raw || raw === "https://" || raw === "http://") return;
    const href =
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("mailto:")
        ? raw
        : `https://${raw}`;
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("createLink", false, href);
    const root = editorRef.current;
    root?.querySelectorAll("a").forEach((anchor) => {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    });
    publishDraft();
    setLinkOpen(false);
  }

  if (!mounted) return null;

  return (
    <WorkspacePortal>
      <div className="fixed inset-0 z-50 flex justify-end pt-4 pb-8">
        <button
          type="button"
          aria-label="Close terms panel"
          onClick={onCancel}
          className={cn(
            "absolute inset-0 bg-slate-900/25 transition-opacity duration-300",
            visible ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "@container h-auto min-h-0 w-full max-w-[420px] self-stretch transition-transform duration-300 ease-out",
            visible ? "translate-x-0" : "translate-x-full",
          )}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-panel-title"
            className="relative flex h-full w-full flex-col overflow-hidden rounded-tl-[5cqw] rounded-bl-[5cqw] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <h2
                id="terms-panel-title"
                className="text-[15px] font-semibold text-slate-900"
              >
                Terms and Conditions
              </h2>
              <button
                type="button"
                onClick={onCancel}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 px-5">
              <div className="rounded-md border border-[#E5E7EB]">
                <div className="flex items-center gap-1 border-b border-[#E5E7EB] px-2 py-1.5">
                  <button
                    type="button"
                    aria-label="Bold"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      rememberSelection();
                    }}
                    onClick={applyBold}
                    className="flex h-7 w-7 items-center justify-center rounded text-[13px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    aria-label="Insert link"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      rememberSelection();
                    }}
                    onClick={() => setLinkOpen((openLink) => !openLink)}
                    className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {linkOpen ? (
                  <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-2 py-2">
                    <input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://"
                      className="h-8 min-w-0 flex-1 rounded border border-[#E5E7EB] px-2 text-[12px] outline-none focus:border-[var(--brand-primary)]/40"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={applyLink}
                      className="h-8 rounded px-2 text-[12px] font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)]"
                    >
                      Add
                    </button>
                  </div>
                ) : null}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-label="Terms and conditions"
                  onMouseUp={rememberSelection}
                  onKeyUp={rememberSelection}
                  onInput={() => {
                    const html = editorRef.current?.innerHTML?.trim();
                    if (html) onDraft(html);
                  }}
                  className="min-h-[220px] px-3 py-3 text-[13px] leading-6 text-slate-800 outline-none [&_a]:underline [&_b]:font-bold [&_strong]:font-bold"
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 border-t border-[#E5E7EB] bg-white px-5 py-4">
              <button
                type="button"
                onClick={() =>
                  onUpdate(
                    editorRef.current?.innerHTML?.trim() || DEFAULT_TERMS_HTML,
                  )
                }
                className="h-9 rounded-md px-4 text-[13px] font-semibold text-white hover:brightness-110"
                style={{ backgroundColor: BRAND }}
              >
                Update
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="h-9 rounded-md border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </aside>
        </div>
      </div>
    </WorkspacePortal>
  );
}

export function BookingFormStep({
  initial,
  onBack,
  onNext,
  onDraftChange,
  embedded,
}: {
  initial?: BookingFormValues;
  onBack?: () => void;
  onNext: (values: BookingFormValues) => void;
  /** Every change in the wizard, so it can be kept as a draft. */
  onDraftChange?: (values: BookingFormValues) => void;
  embedded?: boolean;
}) {
  const [fields, setFields] = useState<BookingFormField[]>(
    initial?.fields ?? DEFAULT_FIELDS,
  );
  const [terms, setTerms] = useState(initial?.terms ?? false);
  const [termsText, setTermsText] = useState(
    initial?.termsText || DEFAULT_TERMS_HTML,
  );
  const [termsOpen, setTermsOpen] = useState(false);
  const termsWasOn = useRef(false);
  const termsSnapshot = useRef(initial?.termsText || DEFAULT_TERMS_HTML);
  const [emailVerification] = useState(initial?.emailVerification ?? false);
  const [freeButton, setFreeButton] = useState(
    initial?.freeButton ?? DEFAULT_BOOKING_FORM.freeButton,
  );
  const [paidButton, setPaidButton] = useState(
    initial?.paidButton ?? DEFAULT_BOOKING_FORM.paidButton,
  );
  const [activeId, setActiveId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  // The button labels are locked until the user switches editing on.
  const [buttonsEditable, setButtonsEditable] = useState(false);

  const captcha = initial?.captcha ?? false;
  const draftChange = useRef(onDraftChange);
  useEffect(() => {
    draftChange.current = onDraftChange;
  });
  useEffect(() => {
    draftChange.current?.({
      fields,
      terms,
      termsText,
      captcha,
      emailVerification,
      freeButton,
      paidButton,
    });
  }, [fields, terms, termsText, captcha, emailVerification, freeButton, paidButton]);

  function commit() {
    onNext({
      fields,
      terms,
      termsText,
      captcha,
      emailVerification,
      freeButton,
      paidButton,
    });
  }

  function openTerms(wasOn: boolean) {
    termsWasOn.current = wasOn;
    termsSnapshot.current = termsText;
    setTerms(true);
    setTermsOpen(true);
  }

  function cancelTerms() {
    setTermsText(termsSnapshot.current);
    setTermsOpen(false);
    if (!termsWasOn.current) setTerms(false);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= fields.length) return;
    setFields((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function addFieldOfType(field: {
    type: BookingFormFieldType;
    label: string;
    required: boolean;
    ephi: boolean;
    options?: string[];
    addressParts?: AddressPart[];
  }) {
    const id = `field-${Date.now()}`;
    setFields((prev) => [
      ...prev,
      {
        id,
        label: field.label,
        required: field.required,
        hidden: false,
        type: field.type,
        ephi: field.ephi,
        options: field.options,
        addressParts: field.addressParts,
      },
    ]);
    setActiveId(id);
    setAddFieldOpen(false);
  }

  function deleteField(id: string) {
    if (fields.length <= 1) return;
    const next = fields.filter((f) => f.id !== id);
    setFields(next);
    if (activeId === id) setActiveId(next[0]?.id ?? "");
    if (editingId === id) setEditingId(null);
  }

  return (
    <div className={embedded ? "" : "mx-auto w-full max-w-[920px] pb-8"}>
      <div
        className={
          embedded
            ? ""
            : "rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
        }
      >
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3",
            embedded
              ? "border-b border-[#E5E7EB] px-5 py-4"
              : "px-5 pt-6 sm:px-8",
          )}
        >
          <h2 className="text-[16px] font-bold text-slate-900">Booking Form</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAddFieldOpen(true)}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--brand-primary)] px-3 text-[13px] font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add field
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              aria-label="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className={embedded ? "px-5 py-5" : "px-5 pt-5 pb-6 sm:px-8 sm:pb-7"}
        >
          <h3 className="mb-2 text-[14px] font-bold text-slate-800">Fields</h3>
          <div className="divide-y divide-[#E5E7EB] border-y border-[#E5E7EB]">
            {fields.map((field, index) => {
              const active = activeId === field.id;
              return (
                <div
                  key={field.id}
                  onClick={() => setActiveId(field.id)}
                  className={cn(
                    "group flex items-center gap-2 px-1 py-3.5 hover:bg-slate-50",
                    field.hidden && "opacity-50",
                  )}
                >
                  <button
                    type="button"
                    className="cursor-grab text-slate-300 hover:text-slate-500"
                    aria-label="Reorder"
                    onClick={(e) => {
                      e.stopPropagation();
                      move(index, index - 1);
                    }}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    {editingId === field.id ? (
                      <input
                        autoFocus
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={() => {
                          setFields((prev) =>
                            prev.map((f) =>
                              f.id === field.id
                                ? { ...f, label: editLabel.trim() || f.label }
                                : f,
                            ),
                          );
                          setEditingId(null);
                        }}
                        className="h-8 w-full rounded border border-[var(--brand-primary)]/30 px-2 text-[13px] outline-none"
                      />
                    ) : (
                      <p className="flex flex-wrap items-center gap-x-3 text-[13px] font-medium text-slate-800">
                        <span>
                          {field.label}
                          {field.required ? (
                            <span className="ml-0.5 text-rose-500">*</span>
                          ) : null}
                        </span>
                        {field.badge ? (
                          <span className="text-[11px] font-normal text-slate-400">
                            {emailVerification
                              ? "Verification enabled"
                              : "Verification disabled"}
                          </span>
                        ) : null}
                        {field.ephi ? (
                          <span className="text-[11px] font-normal text-slate-400">
                            ePHI/PII
                          </span>
                        ) : null}
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100",
                      active && "opacity-100",
                    )}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(field.id);
                        setEditLabel(field.label);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-[var(--brand-primary)]"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFields((prev) =>
                          prev.map((f) =>
                            f.id === field.id ? { ...f, hidden: !f.hidden } : f,
                          ),
                        );
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-[var(--brand-primary)]"
                      aria-label={field.hidden ? "Show" : "Hide"}
                    >
                      {field.hidden ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteField(field.id);
                      }}
                      disabled={fields.length <= 1}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-rose-600 disabled:pointer-events-none disabled:opacity-30"
                      aria-label="Delete field"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className="mt-8 mb-2 text-[14px] font-bold text-slate-800">
            Consent and Verification
          </h3>
          <div className="divide-y divide-[#E5E7EB] border-y border-[#E5E7EB]">
            <div
              className={cn(
                "flex items-center justify-between gap-3 px-1 py-3.5",
                terms && "cursor-pointer",
                termsOpen && "bg-[#F3EEF8]",
              )}
              onClick={() => {
                if (terms && !termsOpen) openTerms(true);
              }}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-slate-300" />
                <span className="text-[13px] font-medium text-slate-800">
                  Terms and Conditions
                </span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Toggle
                  on={terms}
                  onChange={(next) => {
                    if (next) openTerms(false);
                    else {
                      setTerms(false);
                      setTermsOpen(false);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 mb-3 flex items-center justify-between gap-3">
            <h3 className="text-[14px] font-bold text-slate-800">
              Booking Confirmation Button
            </h3>
            <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-medium text-slate-600">
              Edit
              <Toggle on={buttonsEditable} onChange={setButtonsEditable} />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-slate-600">
                Free Appointments<span className="text-rose-500"> *</span>
              </span>
              <input
                value={freeButton}
                onChange={(e) => setFreeButton(e.target.value)}
                disabled={!buttonsEditable}
                className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-[13px] text-slate-800 outline-none focus:border-[var(--brand-primary)]/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-slate-600">
                Paid Appointments<span className="text-rose-500"> *</span>
              </span>
              <input
                value={paidButton}
                onChange={(e) => setPaidButton(e.target.value)}
                disabled={!buttonsEditable}
                className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-[13px] text-slate-800 outline-none focus:border-[var(--brand-primary)]/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              />
            </label>
          </div>

          <div className="mt-8 flex justify-end gap-2">
            <button
              type="button"
              onClick={commit}
              className="h-9 rounded-md px-5 text-[13px] font-semibold text-white hover:brightness-110"
              style={{ backgroundColor: BRAND }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setFields(initial?.fields ?? DEFAULT_FIELDS);
                setTerms(initial?.terms ?? false);
                setTermsText(initial?.termsText || DEFAULT_TERMS_HTML);
                termsSnapshot.current =
                  initial?.termsText || DEFAULT_TERMS_HTML;
                setTermsOpen(false);
                setFreeButton(
                  initial?.freeButton ?? DEFAULT_BOOKING_FORM.freeButton,
                );
                setPaidButton(
                  initial?.paidButton ?? DEFAULT_BOOKING_FORM.paidButton,
                );
                setEditingId(null);
                onBack?.();
              }}
              className="h-9 rounded-md border border-[#E5E7EB] bg-white px-5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <AddFieldDrawer
        open={addFieldOpen}
        onClose={() => setAddFieldOpen(false)}
        onSelect={addFieldOfType}
      />
      <TermsDrawer
        open={termsOpen}
        initialHtml={termsSnapshot.current}
        onCancel={cancelTerms}
        onDraft={setTermsText}
        onUpdate={(html) => {
          setTermsText(html);
          termsSnapshot.current = html;
          setTerms(true);
          setTermsOpen(false);
        }}
      />
    </div>
  );
}
