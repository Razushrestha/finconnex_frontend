"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Building2,
  Mail,
  Phone,
  Smartphone,
  Users,
  Briefcase,
  Link2,
} from "lucide-react";
import {
  CONTACT_SOURCES,
  CONTACT_STATUSES,
  OWNERS,
  type ContactSource,
  type ContactStatus,
} from "@/lib/contacts/types";
import { COMPANY_NAMES } from "@/lib/companies/types";
import { findContactById, updateContact } from "@/lib/contacts/store";
import { logEdit, requireAction, requiredFieldErrors } from "@/lib/rules";
import { emitRulesChange } from "@/lib/rules/storage";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  leadSource: ContactSource | "";
  status: ContactStatus | "";
  owner: string;
  company: string;
  jobTitle: string;
  department: string;
  linkedinUrl: string;
  lifecycleStage: string;
  doNotContact: boolean;
  notes: string;
}

function splitName(name: string, firstName?: string, lastName?: string) {
  if (firstName || lastName) {
    return {
      firstName: firstName?.trim() || name.trim().split(/\s+/)[0] || "",
      lastName:
        lastName?.trim() ||
        name.trim().split(/\s+/).slice(1).join(" ") ||
        "",
    };
  }
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function EditContactForm({ contactId }: { contactId: string }) {
  const router = useRouter();
  const found = useMemo(() => findContactById(contactId), [contactId]);
  const initial = useMemo(() => {
    if (!found) return null;
    const { firstName, lastName } = splitName(
      found.contact.name,
      found.contact.firstName,
      found.contact.lastName,
    );
    return {
      firstName,
      lastName,
      email: found.contact.email,
      phone: found.contact.phone,
      mobile: found.contact.mobile ?? "",
      leadSource: found.contact.source,
      status: found.status,
      owner: found.contact.owner,
      company: found.contact.company,
      jobTitle: found.contact.jobTitle ?? "",
      department: found.contact.department ?? "",
      linkedinUrl: found.contact.linkedinUrl ?? "",
      lifecycleStage: found.contact.lifecycleStage ?? "",
      doNotContact: found.contact.doNotContact ?? false,
      notes: found.contact.notes ?? "",
    } satisfies FormState;
  }, [found]);

  const [form, setForm] = useState<FormState | null>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);

  if (!found || !form) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Contact not found.
      </div>
    );
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function validate(current: FormState) {
    const next: Partial<Record<keyof FormState, string>> = {
      ...requiredFieldErrors(current as unknown as Record<string, unknown>, [
        "firstName",
        "lastName",
        "email",
        "status",
        "owner",
      ]),
    };
    if (current.email.trim() && !next.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email.trim())) {
        next.email = "Enter a valid email";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!form || !found) return;
    setSubmitted(true);
    if (!validate(form)) return;
    const gate = requireAction("sales.contacts.edit");
    if (!gate.ok) {
      window.alert(gate.message);
      return;
    }
    const name = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const updated = updateContact(contactId, {
      name,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone,
      mobile: form.mobile || undefined,
      company: form.company,
      owner: form.owner,
      source: form.leadSource || found.contact.source,
      status: form.status || found.status,
      jobTitle: form.jobTitle || undefined,
      department: form.department || undefined,
      linkedinUrl: form.linkedinUrl || undefined,
      lifecycleStage: form.lifecycleStage || undefined,
      doNotContact: form.doNotContact,
      notes: form.notes || undefined,
    });
    if (!updated) {
      window.alert("Could not save contact.");
      return;
    }
    logEdit("sales.contacts", form.owner, contactId, name, [
      { field: "name", from: found.contact.name, to: name },
    ]);
    emitRulesChange("all");
    router.push(`/sales/contacts/detail/${contactId}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Contacts", href: "/sales/contacts" }}
      badge="Edit contact"
      title={`Edit ${found.contact.name}`}
      subtitle="Update contact details and preferences."
      tip="Changes sync to CRM when signed in with a UUID contact."
      cardIcon={User}
      cardTitle="Contact Information"
      cardDescription="Changes sync to CRM when signed in."
      listHref={`/sales/contacts/detail/${contactId}`}
      saveLabel="Save Changes"
      onSave={handleSave}
    >
      <Field
        label="First Name"
        required
        error={submitted ? errors.firstName : undefined}
      >
        <InputShell icon={User} error={!!(submitted && errors.firstName)}>
          <input
            className={elevatedInputClass(true)}
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field
        label="Last Name"
        required
        error={submitted ? errors.lastName : undefined}
      >
        <InputShell icon={User} error={!!(submitted && errors.lastName)}>
          <input
            className={elevatedInputClass(true)}
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field
        label="Email"
        required
        error={submitted ? errors.email : undefined}
      >
        <InputShell icon={Mail} error={!!(submitted && errors.email)}>
          <input
            type="email"
            className={elevatedInputClass(true)}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Phone">
        <InputShell icon={Phone}>
          <input
            className={elevatedInputClass(true)}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Mobile">
        <InputShell icon={Smartphone}>
          <input
            className={elevatedInputClass(true)}
            value={form.mobile}
            onChange={(e) => update("mobile", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Job Title">
        <InputShell icon={Briefcase}>
          <input
            className={elevatedInputClass(true)}
            value={form.jobTitle}
            onChange={(e) => update("jobTitle", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Department">
        <InputShell icon={Building2}>
          <input
            className={elevatedInputClass(true)}
            value={form.department}
            onChange={(e) => update("department", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="LinkedIn URL">
        <InputShell icon={Link2}>
          <input
            className={elevatedInputClass(true)}
            value={form.linkedinUrl}
            onChange={(e) => update("linkedinUrl", e.target.value)}
            placeholder="https://linkedin.com/in/…"
          />
        </InputShell>
      </Field>
      <Field label="Lifecycle Stage">
        <InputShell>
          <input
            className={elevatedInputClass(true)}
            value={form.lifecycleStage}
            onChange={(e) => update("lifecycleStage", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Company">
        <InputShell icon={Building2}>
          <select
            className={elevatedSelectClass(true)}
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
          >
            <option value="">Select company</option>
            {COMPANY_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
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
            onChange={(e) =>
              update("leadSource", e.target.value as ContactSource | "")
            }
          >
            <option value="">Select source</option>
            {CONTACT_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field
        label="Status"
        required
        error={submitted ? errors.status : undefined}
      >
        <InputShell error={!!(submitted && errors.status)}>
          <select
            className={elevatedSelectClass(false)}
            value={form.status}
            onChange={(e) => update("status", e.target.value as ContactStatus)}
          >
            {CONTACT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field
        label="Owner"
        required
        error={submitted ? errors.owner : undefined}
      >
        <InputShell icon={Users} error={!!(submitted && errors.owner)}>
          <select
            className={elevatedSelectClass(true)}
            value={form.owner}
            onChange={(e) => update("owner", e.target.value)}
          >
            {OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Do not contact">
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.doNotContact}
            onChange={(e) => update("doNotContact", e.target.checked)}
            className="rounded border-slate-300"
          />
          Opted out of outreach
        </label>
      </Field>
      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </Field>
    </CreateEntityFormShell>
  );
}
