"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Building2,
  Mail,
  Phone,
  Smartphone,
  Users,
} from "lucide-react";
import {
  CONTACT_SOURCES,
  CONTACT_STATUSES,
  OWNERS,
  type ContactSource,
  type ContactStatus,
} from "@/lib/contacts/types";
import { COMPANY_NAMES } from "@/lib/companies/types";
import { api } from "@/lib/api";
import {
  logCreate,
  notifyOwnerAssigned,
  requireAction,
  requiredFieldErrors,
} from "@/lib/rules";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";

interface CreateContactFormProps {
  layoutId: string;
  redirect: boolean;
}

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
}

const initialState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  mobile: "",
  leadSource: "",
  status: "Active",
  owner: "John Smith",
  company: "",
};

export function CreateContactForm({
  layoutId,
  redirect,
}: CreateContactFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {
      ...requiredFieldErrors(form as unknown as Record<string, unknown>, [
        "firstName",
        "lastName",
        "email",
        "status",
        "owner",
      ]),
    };
    if (form.email.trim() && !next.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        next.email = "Enter a valid email";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    const gate = requireAction("sales.contacts.create");
    if (!gate.ok) {
      window.alert(gate.message);
      return;
    }
    const result = await api.contacts.create({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone,
      mobile: form.mobile,
      company: form.company,
      source: form.leadSource || "Website",
      status: form.status || "Active",
      owner: form.owner,
    });
    if (!result.ok) {
      if (result.error.fields?.email) {
        setErrors((prev) => ({ ...prev, email: result.error.fields!.email }));
      }
      window.alert(result.error.message);
      return;
    }
    const contact = result.data;
    const label = contact.name;
    logCreate("sales.contacts", form.owner, contact.id, label);
    notifyOwnerAssigned({
      owner: form.owner,
      entityLabel: `Contact ${label}`,
      relatedTo: label,
      relatedHref: "/sales/contacts",
      type: "Lead Assigned",
    });
    if (createAnother) {
      setForm({ ...initialState, owner: form.owner, status: "Active" });
      setErrors({});
      setSubmitted(false);
      return;
    }
    router.push("/sales/contacts");
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Contacts", href: "/sales/contacts" }}
      badge="New contact"
      title="Create Contact"
      subtitle="Add someone you work with: link them to a company and keep the relationship warm."
      tip="Tip: First name, last name, email, status & owner are enough to start."
      cardIcon={User}
      cardTitle="Contact Information"
      cardDescription="Fields marked required are needed to save (SRS §6.2)"
      listHref="/sales/contacts"
      saveLabel="Save Contact"
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
            placeholder="Alex"
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
            placeholder="Morgan"
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
            placeholder="alex@company.com"
          />
        </InputShell>
      </Field>
      <Field label="Phone">
        <InputShell icon={Phone}>
          <input
            className={elevatedInputClass(true)}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+61 400 000 000"
          />
        </InputShell>
      </Field>
      <Field label="Mobile">
        <InputShell icon={Smartphone}>
          <input
            className={elevatedInputClass(true)}
            value={form.mobile}
            onChange={(e) => update("mobile", e.target.value)}
            placeholder="+61 400 000 000"
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
            onChange={(e) =>
              update("status", e.target.value as ContactStatus)
            }
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
    </CreateEntityFormShell>
  );
}
