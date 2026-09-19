"use client";

/**
 * The Create Company step, built from the Create Company modal's own pieces
 * (CreateCompanyForm): its fields, icons, placeholders, status list and the
 * @-mention notes editor, in one column to fit the automation sidebar.
 *
 * It edits the step's config, not a company: every change is converted with
 * companyActionConfigFromForm, which writes the values the modal sends.
 */

import { useEffect, useRef, useState } from "react";
import { Building2, DollarSign, Globe, MapPin, Phone, Users } from "lucide-react";

import {
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import {
  companyActionConfigFromForm,
  companyActionFormFromConfig,
  companyActionProblems,
  type CompanyActionFormState,
} from "@/lib/automations/company-action-form";
import { COMPANY_STATUSES, type CompanyStatus } from "@/lib/companies/types";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  listAssignableOwnersLocal,
  loadAssignableOwners,
  type AssignableOwner,
} from "@/lib/users/assignable";

export function CreateCompanyActionForm({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState<CompanyActionFormState>(() => companyActionFormFromConfig(config));
  const [owners, setOwners] = useState<AssignableOwner[]>(() => listAssignableOwnersLocal());
  const formRef = useRef(form);

  function commit(next: CompanyActionFormState) {
    formRef.current = next;
    setForm(next);
    onChange(companyActionConfigFromForm(next));
  }
  function update<K extends keyof CompanyActionFormState>(key: K, value: CompanyActionFormState[K]) {
    commit({ ...formRef.current, [key]: value });
  }

  // Owners as the modal loads them. A new step also writes its defaults
  // (Prospect, Australia, the default owner) so they are saved as shown.
  useEffect(() => {
    let cancelled = false;
    void loadAssignableOwners().then((rows) => {
      if (cancelled || !rows.length) return;
      setOwners(rows);
      if (!formRef.current.ownerId) commit({ ...formRef.current, ownerId: defaultAssignableOwnerId(rows) });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per opened step
  }, []);

  const problems = companyActionProblems(form);

  const text = (key: keyof CompanyActionFormState, placeholder: string, icon?: React.ElementType) => (
    <InputShell icon={icon}>
      <input
        className={elevatedInputClass(Boolean(icon))}
        value={form[key] as string}
        onChange={(e) => update(key, e.target.value as never)}
        placeholder={placeholder}
      />
    </InputShell>
  );

  return (
    <div className="grid grid-cols-1 gap-y-3">
      <Field label="Company Name" required>
        <InputShell icon={Building2} error={!form.companyName.trim()}>
          <input
            className={elevatedInputClass(true)}
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            placeholder="Enter company name"
          />
        </InputShell>
      </Field>
      <Field label="Website">
        <InputShell icon={Globe} error={problems.includes("Enter a valid website")}>
          <input
            className={elevatedInputClass(true)}
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            placeholder="https://"
          />
        </InputShell>
      </Field>
      <Field label="Industry">{text("industry", "Finance, Tech…")}</Field>
      <Field label="Company Size">{text("companySize", "e.g. 11–50")}</Field>
      <Field label="Annual Revenue">{text("annualRevenue", "$0.00", DollarSign)}</Field>
      <Field label="Phone">{text("phone", "+61 400 000 000", Phone)}</Field>
      <Field label="Address">{text("address", "Street address", MapPin)}</Field>
      <Field label="City">{text("city", "Sydney")}</Field>
      <Field label="State">{text("state", "NSW")}</Field>
      <Field label="Country">{text("country", "Australia")}</Field>
      <Field label="Status" required>
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.status}
            onChange={(e) => update("status", e.target.value as CompanyStatus)}
          >
            {COMPANY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Owner" required>
        <InputShell icon={Users} error={!form.ownerId}>
          <select
            className={elevatedSelectClass(true)}
            value={form.ownerId}
            onChange={(e) => update("ownerId", e.target.value)}
          >
            {!form.ownerId && <option value="">Select owner</option>}
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {assignableOwnerLabel(owner)}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Notes">
        <MentionNotesTextarea
          value={form.notes}
          onChange={(notes) => update("notes", notes)}
          placeholder="Account context, relationship notes… Type @ to assign someone."
        />
      </Field>
    </div>
  );
}

/** Save stays off until the Create Company modal's required fields are filled. */
export function createCompanyActionProblems(config: Record<string, unknown>): string[] {
  return companyActionProblems(companyActionFormFromConfig(config));
}
