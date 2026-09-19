"use client";

/**
 * The Create Contact step, built from the Create Contact modal's own pieces
 * (CreateContactForm): its fields, icons, option lists and company list, in
 * one column to fit the automation sidebar.
 *
 * It edits the step's config, not a contact. The one addition is, on a lead
 * trigger, copying the lead's name, email and phone — a fixed email would
 * create the contact on the first run and fail on every run after it.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Mail, Phone, Smartphone, User, Users } from "lucide-react";

import {
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  CONTACT_ACTION_STATUSES,
  contactActionConfigFromForm,
  contactActionFormFromConfig,
  contactActionProblems,
  type ContactActionFormState,
  type ContactActionStatus,
} from "@/lib/automations/contact-action-form";
import type { AutomationEntityType } from "@/lib/automations/types";
import { listCompanyGroups } from "@/lib/companies/store";
import { useCrmCompanies } from "@/lib/companies/use-crm-companies";
import { CONTACT_SOURCES, type ContactSource } from "@/lib/contacts/types";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  listAssignableOwnersLocal,
  loadAssignableOwners,
  type AssignableOwner,
} from "@/lib/users/assignable";

export function CreateContactActionForm({
  config,
  entityType,
  onChange,
}: {
  config: Record<string, unknown>;
  entityType: AutomationEntityType;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const triggerIsLead = entityType === "LEAD";
  const [form, setForm] = useState<ContactActionFormState>(() =>
    contactActionFormFromConfig(config, triggerIsLead),
  );
  const [owners, setOwners] = useState<AssignableOwner[]>(() => listAssignableOwnersLocal());
  const crmCompanies = useCrmCompanies();
  const formRef = useRef(form);

  // The modal's company list: CRM organizations with a real id.
  const companies = useMemo(() => {
    // Recomputed when the CRM list lands; the store is read, not the hook.
    void crmCompanies.source;
    void crmCompanies.loading;
    return listCompanyGroups()
      .flatMap((group) => group.companies)
      .filter((company) => isUuid(company.id));
  }, [crmCompanies.source, crmCompanies.loading]);

  function commit(next: ContactActionFormState) {
    formRef.current = next;
    setForm(next);
    onChange(contactActionConfigFromForm(next));
  }
  function update<K extends keyof ContactActionFormState>(key: K, value: ContactActionFormState[K]) {
    commit({ ...formRef.current, [key]: value });
  }

  // Owners as the modal loads them; a new step defaults its owner the same way.
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

  const problems = contactActionProblems(form, triggerIsLead);
  const copying = form.copyFromTrigger;

  return (
    <div className="grid grid-cols-1 gap-y-3">
      {(triggerIsLead || copying) && (
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-[12px] text-slate-600">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
            checked={copying}
            onChange={(e) => update("copyFromTrigger", e.target.checked)}
          />
          <span>
            Use the name, email and phone of the lead that started this workflow
            <span className="block text-[11px] text-slate-400">
              Each run creates that lead&apos;s contact. A fixed email only works once — emails are unique.
            </span>
          </span>
        </label>
      )}

      {!copying && (
        <>
          <Field label="First Name" required>
            <InputShell icon={User} error={!form.firstName.trim()}>
              <input
                className={elevatedInputClass(true)}
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                placeholder="Alex"
              />
            </InputShell>
          </Field>
          <Field label="Last Name" required>
            <InputShell icon={User} error={!form.lastName.trim()}>
              <input
                className={elevatedInputClass(true)}
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                placeholder="Morgan"
              />
            </InputShell>
          </Field>
          <Field label="Email" required>
            <InputShell icon={Mail} error={problems.some((p) => /email/i.test(p))}>
              <input
                type="email"
                className={elevatedInputClass(true)}
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="alex@company.com"
              />
            </InputShell>
          </Field>
          <Field label="Phone">
            <InputShell icon={Phone} error={problems.includes("Enter a valid phone number")}>
              <input
                type="tel"
                inputMode="tel"
                className={elevatedInputClass(true)}
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+61 400 000 000"
              />
            </InputShell>
          </Field>
          <Field label="Mobile">
            <InputShell icon={Smartphone} error={problems.includes("Enter a valid mobile number")}>
              <input
                type="tel"
                inputMode="tel"
                className={elevatedInputClass(true)}
                value={form.mobile}
                onChange={(e) => update("mobile", e.target.value)}
                placeholder="+61 400 000 000"
              />
            </InputShell>
          </Field>
        </>
      )}

      <Field label="Company">
        <InputShell icon={Building2}>
          <select
            className={elevatedSelectClass(true)}
            value={form.companyId}
            onChange={(e) => update("companyId", e.target.value)}
          >
            <option value="">Select company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Lead Source">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.leadSource}
            onChange={(e) => update("leadSource", e.target.value as ContactSource | "")}
          >
            <option value="">Select source</option>
            {CONTACT_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Status" required>
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.status}
            onChange={(e) => update("status", e.target.value as ContactActionStatus)}
          >
            {CONTACT_ACTION_STATUSES.map((status) => (
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
    </div>
  );
}

/** Save stays off until the Create Contact modal's required fields are filled. */
export function createContactActionProblems(
  config: Record<string, unknown>,
  entityType: AutomationEntityType,
): string[] {
  const triggerIsLead = entityType === "LEAD";
  return contactActionProblems(contactActionFormFromConfig(config, triggerIsLead), triggerIsLead);
}
