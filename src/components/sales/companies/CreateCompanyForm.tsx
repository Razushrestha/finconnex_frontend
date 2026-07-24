"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  Phone,
  MapPin,
  Users,
  DollarSign,
} from "lucide-react";
import {
  COMPANY_STATUSES,
  OWNERS,
  type CompanyStatus,
} from "@/lib/companies/types";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";

interface CreateCompanyFormProps {
  layoutId: string;
  redirect: boolean;
}

interface FormState {
  companyName: string;
  website: string;
  industry: string;
  companySize: string;
  annualRevenue: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: CompanyStatus | "";
  owner: string;
  notes: string;
}

const initialState: FormState = {
  companyName: "",
  website: "",
  industry: "",
  companySize: "",
  annualRevenue: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "Australia",
  status: "Prospect",
  owner: "John Smith",
  notes: "",
};

export function CreateCompanyForm({
  layoutId,
  redirect,
}: CreateCompanyFormProps) {
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
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.companyName.trim())
      next.companyName = "Company Name is required";
    if (!form.status) next.status = "Status is required";
    if (!form.owner.trim()) next.owner = "Owner is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    console.log("Saving company", { layoutId, redirect, ...form });
    if (createAnother) {
      setForm({ ...initialState, owner: form.owner, status: "Prospect" });
      setErrors({});
      setSubmitted(false);
      return;
    }
    router.push("/sales/companies");
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Companies", href: "/sales/companies" }}
      badge="New company"
      title="Create Company"
      subtitle="Add an account once: link contacts and deals to it as the relationship grows."
      tip="Tip: Company name, status & owner are enough to start."
      cardIcon={Building2}
      cardTitle="Company Information"
      cardDescription="Fields marked required are needed to save (SRS §6.3)"
      listHref="/sales/companies"
      saveLabel="Save Company"
      onSave={handleSave}
    >
      <Field
        label="Company Name"
        required
        error={submitted ? errors.companyName : undefined}
        className="col-span-full"
      >
        <InputShell
          icon={Building2}
          error={!!(submitted && errors.companyName)}
        >
          <input
            className={elevatedInputClass(true)}
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            placeholder="Enter company name"
          />
        </InputShell>
      </Field>
      <Field label="Website">
        <InputShell icon={Globe}>
          <input
            className={elevatedInputClass(true)}
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
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
      <Field label="Annual Revenue">
        <InputShell icon={DollarSign}>
          <input
            className={elevatedInputClass(true)}
            value={form.annualRevenue}
            onChange={(e) => update("annualRevenue", e.target.value)}
            placeholder="$0.00"
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
      <Field label="Address" className="col-span-full">
        <InputShell icon={MapPin}>
          <input
            className={elevatedInputClass(true)}
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="Street address"
          />
        </InputShell>
      </Field>
      <Field label="City">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Sydney"
          />
        </InputShell>
      </Field>
      <Field label="State">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            placeholder="NSW"
          />
        </InputShell>
      </Field>
      <Field label="Country">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            placeholder="Australia"
          />
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
              update("status", e.target.value as CompanyStatus)
            }
          >
            {COMPANY_STATUSES.map((s) => (
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
      <Field label="Notes" className="col-span-full">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Account context, relationship notes…"
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
