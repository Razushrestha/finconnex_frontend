"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  Briefcase,
  Users,
  DollarSign,
} from "lucide-react";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  OWNERS,
  type LeadSource,
  type LeadStatus,
} from "@/lib/leads/types";
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
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";

interface CreateLeadFormProps {
  layoutId: string;
  redirect: boolean;
}

interface LeadFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  companyWebsite: string;
  industry: string;
  companySize: string;
  jobTitle: string;
  leadSource: LeadSource | "";
  status: LeadStatus | "";
  owner: string;
  notes: string;
  productInterest: string;
  budgetRange: string;
  estimatedValue: string;
}

const initialState: LeadFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  companyWebsite: "",
  industry: "",
  companySize: "",
  jobTitle: "",
  leadSource: "",
  status: "New",
  owner: "John Smith",
  notes: "",
  productInterest: "",
  budgetRange: "",
  estimatedValue: "",
};

export function CreateLeadForm({ layoutId, redirect }: CreateLeadFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<LeadFormState>(initialState);
  const [errors, setErrors] = useState<
    Partial<Record<keyof LeadFormState, string>>
  >({});
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof LeadFormState>(
    key: K,
    value: LeadFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    const next: Partial<Record<keyof LeadFormState, string>> = {
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
    const gate = requireAction("sales.leads.create");
    if (!gate.ok) {
      window.alert(gate.message);
      return;
    }
    const result = await api.leads.create({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone,
      company: form.company,
      source: form.leadSource || "Website",
      status: form.status || "New",
      owner: form.owner,
      estimatedValue: form.estimatedValue || undefined,
    });
    if (!result.ok) {
      if (result.error.fields?.email) {
        setErrors((prev) => ({ ...prev, email: result.error.fields!.email }));
      }
      window.alert(result.error.message);
      return;
    }
    const card = result.data;
    const label = card.name;
    logCreate("sales.leads", form.owner, card.id, label);
    notifyOwnerAssigned({
      owner: form.owner,
      entityLabel: `Lead ${label}`,
      relatedTo: label,
      relatedHref: "/sales/leads",
      type: "Lead Assigned",
    });
    if (createAnother) {
      setForm({ ...initialState, owner: form.owner, status: "New" });
      setErrors({});
      setSubmitted(false);
      return;
    }
    router.push("/sales/leads");
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Leads", href: "/sales/leads" }}
      badge="New lead"
      title="Create Lead"
      subtitle="Capture a new prospect in a few quick fields — you can always enrich the record later."
      tip="Tip: First name, last name, email, status & owner are enough to start."
      cardIcon={User}
      cardTitle="Lead Information"
      cardDescription="Fields marked required are needed to save (SRS §6.1)"
      listHref="/sales/leads"
      saveLabel="Save Lead"
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
      <Field label="Company">
        <InputShell icon={Building2}>
          <input
            className={elevatedInputClass(true)}
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
            placeholder="Company name"
          />
        </InputShell>
      </Field>
      <Field label="Company Website">
        <InputShell icon={Globe}>
          <input
            className={elevatedInputClass(true)}
            value={form.companyWebsite}
            onChange={(e) => update("companyWebsite", e.target.value)}
            placeholder="https://"
          />
        </InputShell>
      </Field>
      <Field label="Industry">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={form.industry}
            onChange={(e) => update("industry", e.target.value)}
            placeholder="Finance, Tech…"
          />
        </InputShell>
      </Field>
      <Field label="Company Size">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={form.companySize}
            onChange={(e) => update("companySize", e.target.value)}
            placeholder="e.g. 11–50"
          />
        </InputShell>
      </Field>
      <Field label="Job Title">
        <InputShell icon={Briefcase}>
          <input
            className={elevatedInputClass(true)}
            value={form.jobTitle}
            onChange={(e) => update("jobTitle", e.target.value)}
            placeholder="e.g. CFO"
          />
        </InputShell>
      </Field>
      <Field label="Lead Source">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.leadSource}
            onChange={(e) =>
              update("leadSource", e.target.value as LeadSource | "")
            }
          >
            <option value="">Select source</option>
            {LEAD_SOURCES.map((s) => (
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
            onChange={(e) => update("status", e.target.value as LeadStatus)}
          >
            {LEAD_STATUSES.map((s) => (
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
      <Field label="Product Interest">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={form.productInterest}
            onChange={(e) => update("productInterest", e.target.value)}
            placeholder="What are they interested in?"
          />
        </InputShell>
      </Field>
      <Field label="Budget Range">
        <InputShell icon={DollarSign}>
          <input
            className={elevatedInputClass(true)}
            value={form.budgetRange}
            onChange={(e) => update("budgetRange", e.target.value)}
            placeholder="e.g. $50k–$100k"
          />
        </InputShell>
      </Field>
      <Field label="Estimated Value">
        <InputShell icon={DollarSign}>
          <input
            className={elevatedInputClass(true)}
            value={form.estimatedValue}
            onChange={(e) => update("estimatedValue", e.target.value)}
            placeholder="$0.00"
          />
        </InputShell>
      </Field>
      <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Context, next steps, or how they found you…"
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
