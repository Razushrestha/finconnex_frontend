"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export interface EditLeadFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  companyName: string;
  jobTitle: string;
  website: string;
  status: string;
}

export interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string; // e.g. "Edit Lead: Sarah Jenkins"
  initialValues: EditLeadFormValues;
  statusOptions: string[];
  onSave: (values: EditLeadFormValues) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">
      {children}
    </h3>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}

export function EditLeadModal({
  isOpen,
  onClose,
  title,
  initialValues,
  statusOptions,
  onSave,
}: EditLeadModalProps) {
  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    if (isOpen) setValues(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function update<K extends keyof EditLeadFormValues>(
    key: K,
    value: EditLeadFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-lead-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2
            id="edit-lead-title"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            <SectionLabel>Contact Information</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="First Name"
                value={values.firstName}
                onChange={(v) => update("firstName", v)}
              />
              <Field
                label="Last Name"
                value={values.lastName}
                onChange={(v) => update("lastName", v)}
              />
              <Field
                label="Email Address"
                value={values.email}
                onChange={(v) => update("email", v)}
              />
              <Field
                label="Phone Number"
                value={values.phone}
                onChange={(v) => update("phone", v)}
              />
            </div>
            <Field
              label="LinkedIn URL"
              value={values.linkedinUrl}
              onChange={(v) => update("linkedinUrl", v)}
            />
          </div>

          <div className="space-y-3">
            <SectionLabel>Company Details</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Company Name"
                value={values.companyName}
                onChange={(v) => update("companyName", v)}
              />
              <Field
                label="Job Title"
                value={values.jobTitle}
                onChange={(v) => update("jobTitle", v)}
              />
            </div>
            <Field
              label="Website"
              value={values.website}
              onChange={(v) => update("website", v)}
            />
          </div>

          <div className="space-y-3">
            <SectionLabel>Lead Status</SectionLabel>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                Current Status
              </span>
              <select
                value={values.status}
                onChange={(e) => update("status", e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3 bg-muted/40">
          <button
            onClick={onClose}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(values)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
