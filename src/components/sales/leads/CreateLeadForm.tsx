"use client";

import { useEffect, useState } from "react";
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
  LEAD_PIPELINE_STAGES,
  LEAD_SOURCES,
  type LeadPipelineStage,
  type LeadSource,
} from "@/lib/leads/types";
import { localLeadsApi } from "@/lib/api/local/leads";
import { findContactByEmail } from "@/lib/contacts/store";
import { findLeadByEmail } from "@/lib/leads/store";
import {
  CRM_COMPANY_SIZE_LABELS,
  CRM_COMPANY_SIZES,
  syncCreatedLead,
} from "@/lib/leads/api";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  listAssignableOwnersLocal,
  loadAssignableOwners,
} from "@/lib/users/assignable";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import {
  isMortgagePipelineStage,
  pipelineStageToLeadStatus,
} from "@/lib/pipeline-sla/board";
import {
  logCreate,
  notifyOwnerAssigned,
  requireAction,
  requiredFieldErrors,
  canField,
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
  /** Prefill from Kanban column Plus (`?stage=`). */
  stage?: string;
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
  pipelineStage: LeadPipelineStage | "";
  owner: string;
  notes: string;
  productInterest: string;
  budgetRange: string;
  estimatedValue: string;
}

function resolveInitialStage(stage?: string): LeadPipelineStage {
  return stage && isMortgagePipelineStage(stage) ? stage : "New Lead";
}

function makeInitialState(stage?: string): LeadFormState {
  return {
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
    pipelineStage: resolveInitialStage(stage),
    owner: "",
    notes: "",
    productInterest: "",
    budgetRange: "",
    estimatedValue: "",
  };
}

export function CreateLeadForm(props: CreateLeadFormProps) {
  void props.layoutId;
  void props.redirect;
  const router = useRouter();
  const [form, setForm] = useState<LeadFormState>(() => {
    const initial = makeInitialState(props.stage);
    const owners = listAssignableOwnersLocal();
    return {
      ...initial,
      owner: defaultAssignableOwnerId(owners, initial.owner),
    };
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof LeadFormState, string>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState(() =>
    listAssignableOwnersLocal(),
  );

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      owner: defaultAssignableOwnerId(ownerOptions, prev.owner),
    }));
    let cancelled = false;
    void loadAssignableOwners().then((options) => {
      if (cancelled || !options.length) return;
      setOwnerOptions(options);
      setForm((prev) => ({
        ...prev,
        owner: defaultAssignableOwnerId(options, prev.owner),
      }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        "pipelineStage",
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
    const pipelineStage = form.pipelineStage || "New Lead";
    const ownerLabel =
      ownerOptions.find((o) => o.id === form.owner)?.name ?? form.owner;
    try {
      const live = await syncCreatedLead({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone,
        company: form.company,
        companyWebsite: form.companyWebsite,
        industry: form.industry,
        companySize: form.companySize,
        jobTitle: form.jobTitle,
        ownerId: isUuid(form.owner) ? form.owner : undefined,
        ownerName:
          ownerOptions.find((o) => o.id === form.owner)?.name ?? form.owner,
        source: form.leadSource || undefined,
        productInterest: form.productInterest,
        budgetRange: form.budgetRange,
        estimatedValue: form.estimatedValue || undefined,
        notes: form.notes,
        pipelineStage,
      });
      if (live) {
        logCreate("sales.leads", ownerLabel, live.id, live.name);
        notifyOwnerAssigned({
          owner: ownerLabel,
          entityLabel: `Lead ${live.name}`,
          relatedTo: live.name,
          relatedHref: "/sales/leads",
          type: "Lead Assigned",
        });
        if (createAnother) {
          setForm({
            ...makeInitialState(props.stage),
            owner: form.owner,
            pipelineStage,
          });
          setErrors({});
          setSubmitted(false);
          return;
        }
        router.push("/sales/leads");
        return;
      }
    } catch {
      /* CRM 4xx still falls through to a device copy below */
    }
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone,
      company: form.company,
      source: form.leadSource || "Website",
      status: pipelineStageToLeadStatus(pipelineStage),
      pipelineStage,
      owner: ownerLabel,
      estimatedValue: form.estimatedValue || undefined,
    };
    let result = await localLeadsApi.create(payload);
    if (!result.ok) {
      const existing = findLeadByEmail(form.email);
      if (existing) {
        result = await localLeadsApi.update(existing.card.id, payload);
        if (result.ok) {
          router.push("/sales/leads");
          return;
        }
      }
      const contact = findContactByEmail(form.email);
      const emailError =
        !result.ok
          ? (result.error.fields?.email ??
            "This email is already used. Change it, or open All Leads.")
          : "This email is already used. Change it, or open All Leads.";
      setErrors((prev) => ({
        ...prev,
        email: contact
          ? "This email already belongs to a contact. Use a different address."
          : emailError,
      }));
      return;
    }
    const card = result.data;
    const label = card.name;
    logCreate("sales.leads", ownerLabel, card.id, label);
    notifyOwnerAssigned({
      owner: ownerLabel,
      entityLabel: `Lead ${label}`,
      relatedTo: label,
      relatedHref: "/sales/leads",
      type: "Lead Assigned",
    });
    if (createAnother) {
      setForm({
        ...makeInitialState(props.stage),
        owner: form.owner,
        pipelineStage,
      });
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
      subtitle="Capture a new prospect in a few quick fields: you can always enrich the record later."
      tip="Tip: First name, last name, email, pipeline stage & owner are enough to start."
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
          <select
            className={elevatedSelectClass(false)}
            value={form.companySize}
            onChange={(e) => update("companySize", e.target.value)}
          >
            <option value="">Select size</option>
            {CRM_COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {CRM_COMPANY_SIZE_LABELS[size]}
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
        label="Pipeline stage"
        required
        error={submitted ? errors.pipelineStage : undefined}
      >
        <InputShell error={!!(submitted && errors.pipelineStage)}>
          <select
            className={elevatedSelectClass(false)}
            value={form.pipelineStage}
            onChange={(e) =>
              update("pipelineStage", e.target.value as LeadPipelineStage)
            }
          >
            {LEAD_PIPELINE_STAGES.map((s) => (
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
            {ownerOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {assignableOwnerLabel(o)}
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
      {canField("sales.leads.estimatedValue") ? (
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
      ) : (
        <Field label="Estimated Value">
          <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[12px] text-slate-500">
            Hidden by field permissions for your role
          </p>
        </Field>
      )}
      <Field label="Notes" className="col-span-full">
        <MentionNotesTextarea
          value={form.notes}
          onChange={(notes) => update("notes", notes)}
          placeholder="Context, next steps, or how they found you… Type @ to assign someone."
        />
      </Field>
    </CreateEntityFormShell>
  );
}
