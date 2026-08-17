"use client";

import { useEffect, useState } from "react";
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
  Mail,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BRAND = "#5A32A3";

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

export type BookingFormField = {
  id: string;
  label: string;
  required: boolean;
  hidden: boolean;
  badge?: string;
  type?: BookingFormFieldType;
};

export type BookingFormValues = {
  fields: BookingFormField[];
  terms: boolean;
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
  emailVerification: true,
  freeButton: "Schedule Appointment",
  paidButton: "Pay and Schedule an Appointment",
};

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
        on ? "bg-[#5A32A3]" : "bg-slate-300",
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
  onSelect: (type: BookingFormFieldType, label: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
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

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close add field panel"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-slate-900/30 transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-field-title"
        className={cn(
          "relative flex h-full w-full max-w-[380px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
          visible ? "translate-x-0" : "translate-x-full",
        )}
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
                  onClick={() => onSelect(fieldType.id, fieldType.label)}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-5 text-center transition hover:border-[#5A32A3]/35 hover:bg-[#F3ECFB]"
                >
                  <Icon className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
                  <span className="text-[12px] font-medium text-slate-700">
                    {fieldType.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

export function BookingFormStep({
  initial,
  onBack,
  onNext,
}: {
  initial?: BookingFormValues;
  onBack: () => void;
  onNext: (values: BookingFormValues) => void;
}) {
  const [fields, setFields] = useState<BookingFormField[]>(
    initial?.fields ?? DEFAULT_FIELDS,
  );
  const [terms, setTerms] = useState(initial?.terms ?? false);
  const [emailVerification, setEmailVerification] = useState(
    initial?.emailVerification ?? true,
  );
  const [freeButton, setFreeButton] = useState(
    initial?.freeButton ?? DEFAULT_BOOKING_FORM.freeButton,
  );
  const [paidButton, setPaidButton] = useState(
    initial?.paidButton ?? DEFAULT_BOOKING_FORM.paidButton,
  );
  const [activeId, setActiveId] = useState("guests");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [editingButtons, setEditingButtons] = useState(false);

  function move(from: number, to: number) {
    if (to < 0 || to >= fields.length) return;
    setFields((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function addFieldOfType(type: BookingFormFieldType, label: string) {
    const id = `field-${Date.now()}`;
    setFields((prev) => [
      ...prev,
      { id, label, required: false, hidden: false, type },
    ]);
    setActiveId(id);
    setEditingId(id);
    setEditLabel(label);
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
    <div className="mx-auto w-full max-w-[920px] pb-8">
      <div className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-8 sm:py-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-[18px] font-bold text-slate-900">Booking Form</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAddFieldOpen(true)}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#5A32A3]/30 px-3 text-[13px] font-semibold text-[#5A32A3] hover:bg-[#F3ECFB]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Field
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

        <h2 className="mb-2 text-[14px] font-bold text-slate-800">Fields</h2>
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
          {fields.map((field, index) => {
            const active = activeId === field.id;
            return (
              <div
                key={field.id}
                onClick={() => setActiveId(field.id)}
                className={cn(
                  "group flex items-center gap-2 border-b border-[#F3F4F6] px-3 py-3 last:border-0 hover:bg-[#F3ECFB]",
                  active && "bg-[#F3ECFB]",
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
                      className="h-8 w-full rounded border border-[#5A32A3]/30 px-2 text-[13px] outline-none"
                    />
                  ) : (
                    <p className="text-[13px] font-medium text-slate-800">
                      {field.label}
                      {field.required ? (
                        <span className="ml-0.5 text-rose-500">*</span>
                      ) : null}
                      {field.badge ? (
                        <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {emailVerification
                            ? "Verification enabled"
                            : field.badge}
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
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-[#5A32A3]"
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
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-[#5A32A3]"
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

        <h2 className="mt-7 mb-2 text-[14px] font-bold text-slate-800">
          Consent and Verification
        </h2>
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
          <div className="flex items-center justify-between gap-3 border-b border-[#F3F4F6] px-3 py-3.5">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-slate-300" />
              <span className="text-[13px] font-medium text-slate-800">
                Terms and Conditions
              </span>
            </div>
            <Toggle on={terms} onChange={setTerms} />
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-3.5">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-slate-300" />
              <span className="text-[13px] font-medium text-slate-800">
                Email verification
              </span>
            </div>
            <Toggle on={emailVerification} onChange={setEmailVerification} />
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between gap-3">
          <h2 className="text-[14px] font-bold text-slate-800">
            Booking Confirmation Button
          </h2>
          <button
            type="button"
            onClick={() => setEditingButtons((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-[#5A32A3]"
            aria-label={
              editingButtons
                ? "Hide confirmation button labels"
                : "Edit confirmation button labels"
            }
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
        {editingButtons ? (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                Free Appointments<span className="text-rose-500">*</span>
              </span>
              <input
                value={freeButton}
                onChange={(e) => setFreeButton(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#E5E7EB] px-3 text-[13px] text-slate-800 outline-none focus:border-[#5A32A3]/40"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                Paid Appointments<span className="text-rose-500">*</span>
              </span>
              <input
                value={paidButton}
                onChange={(e) => setPaidButton(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#E5E7EB] px-3 text-[13px] text-slate-800 outline-none focus:border-[#5A32A3]/40"
              />
            </label>
          </div>
        ) : null}

        <div className="mt-7 flex justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              onNext({
                fields,
                terms,
                emailVerification,
                freeButton,
                paidButton,
              })
            }
            className="h-9 rounded-lg px-5 text-[13px] font-semibold text-white hover:brightness-110"
            style={{ backgroundColor: BRAND }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onBack}
            className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>

      <AddFieldDrawer
        open={addFieldOpen}
        onClose={() => setAddFieldOpen(false)}
        onSelect={addFieldOfType}
      />
    </div>
  );
}
