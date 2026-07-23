"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Handshake,
  Building2,
  User,
  Users,
  Calendar,
  DollarSign,
  Percent,
} from "lucide-react";
import {
  DEAL_CURRENCIES,
  DEAL_STAGES,
  LOST_REASONS,
  OWNERS,
  type DealCurrency,
  type DealStageTitle,
} from "@/lib/deals/types";
import { COMPANY_NAMES } from "@/lib/companies/types";
import { CONTACT_SOURCES } from "@/lib/contacts/types";
import { api } from "@/lib/api";
import {
  getOrgManager,
  logCreate,
  notifyDealClosed,
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

interface CreateDealFormProps {
  layoutId: string;
  redirect: boolean;
}

interface FormState {
  dealName: string;
  account: string;
  contact: string;
  leadSource: string;
  stage: DealStageTitle | "";
  probability: string;
  expectedCloseDate: string;
  dealValue: string;
  currency: DealCurrency;
  owner: string;
  description: string;
  lostReason: string;
  competitor: string;
}

const STAGE_PROBABILITY: Record<DealStageTitle, number> = {
  Prospecting: 10,
  Qualification: 25,
  Proposal: 50,
  Negotiation: 75,
  "Closed Won": 100,
  "Closed Lost": 0,
};

const initialState: FormState = {
  dealName: "",
  account: "",
  contact: "",
  leadSource: "",
  stage: "Prospecting",
  probability: "10",
  expectedCloseDate: "",
  dealValue: "",
  currency: "AUD",
  owner: "John Smith",
  description: "",
  lostReason: "",
  competitor: "",
};

export function CreateDealForm({ layoutId, redirect }: CreateDealFormProps) {
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
        "dealName",
        "account",
        "stage",
        "dealValue",
        "currency",
        "owner",
      ]),
    };
    if (form.stage === "Closed Lost" && !form.lostReason) {
      next.lostReason = "Lost Reason is required for Closed Lost";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    const gate = requireAction("sales.deals.create");
    if (!gate.ok) {
      window.alert(gate.message);
      return;
    }
    const result = await api.deals.create({
      dealName: form.dealName.trim(),
      account: form.account.trim(),
      contact: form.contact || undefined,
      stage: form.stage,
      dealValue: form.dealValue.trim(),
      currency: form.currency,
      probability: form.probability ? Number(form.probability) : undefined,
      owner: form.owner,
      closeDate: form.expectedCloseDate || undefined,
    });
    if (!result.ok) {
      if (result.error.fields?.dealName) {
        setErrors((prev) => ({
          ...prev,
          dealName: result.error.fields!.dealName,
        }));
      }
      window.alert(result.error.message);
      return;
    }
    const deal = result.data;
    logCreate("sales.deals", form.owner, deal.id, form.dealName);
    notifyOwnerAssigned({
      owner: form.owner,
      entityLabel: `Deal ${form.dealName}`,
      relatedTo: form.dealName,
      relatedHref: "/sales/deals",
      type: "Lead Assigned",
    });
    if (form.stage === "Closed Won" || form.stage === "Closed Lost") {
      notifyDealClosed({
        owner: form.owner,
        manager: getOrgManager(),
        dealName: form.dealName,
        stage: form.stage,
        relatedTo: form.dealName,
        relatedHref: "/sales/deals",
      });
    }
    if (createAnother) {
      setForm({ ...initialState, owner: form.owner, currency: form.currency });
      setErrors({});
      setSubmitted(false);
      return;
    }
    router.push("/sales/deals");
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Deals", href: "/sales/deals" }}
      badge="New deal"
      title="Create Deal"
      subtitle="Track an opportunity from first interest through close — value, stage, and owner in one place."
      tip="Tip: Name, account, stage, value, currency & owner are required."
      cardIcon={Handshake}
      cardTitle="Deal Information"
      cardDescription="Fields marked required are needed to save (SRS §6.4)"
      listHref="/sales/deals"
      saveLabel="Save Deal"
      onSave={handleSave}
    >
      <Field
        label="Deal Name"
        required
        error={submitted ? errors.dealName : undefined}
        className="col-span-full"
      >
        <InputShell
          icon={Handshake}
          error={!!(submitted && errors.dealName)}
        >
          <input
            className={elevatedInputClass(true)}
            value={form.dealName}
            onChange={(e) => update("dealName", e.target.value)}
            placeholder="Enter deal name"
          />
        </InputShell>
      </Field>
      <Field
        label="Account"
        required
        error={submitted ? errors.account : undefined}
      >
        <InputShell
          icon={Building2}
          error={!!(submitted && errors.account)}
        >
          <select
            className={elevatedSelectClass(true)}
            value={form.account}
            onChange={(e) => update("account", e.target.value)}
          >
            <option value="">Select account</option>
            {COMPANY_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Contact">
        <InputShell icon={User}>
          <input
            className={elevatedInputClass(true)}
            value={form.contact}
            onChange={(e) => update("contact", e.target.value)}
            placeholder="Contact name"
          />
        </InputShell>
      </Field>
      <Field label="Lead Source">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.leadSource}
            onChange={(e) => update("leadSource", e.target.value)}
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
        label="Stage"
        required
        error={submitted ? errors.stage : undefined}
      >
        <InputShell error={!!(submitted && errors.stage)}>
          <select
            className={elevatedSelectClass(false)}
            value={form.stage}
            onChange={(e) => {
              const stage = e.target.value as DealStageTitle;
              update("stage", stage);
              update("probability", String(STAGE_PROBABILITY[stage]));
            }}
          >
            {DEAL_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Probability (%)">
        <InputShell icon={Percent}>
          <input
            type="number"
            min={0}
            max={100}
            className={elevatedInputClass(true)}
            value={form.probability}
            onChange={(e) => update("probability", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Expected Close Date">
        <InputShell icon={Calendar}>
          <input
            type="date"
            className={elevatedInputClass(true)}
            value={form.expectedCloseDate}
            onChange={(e) => update("expectedCloseDate", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field
        label="Deal Value"
        required
        error={submitted ? errors.dealValue : undefined}
      >
        <InputShell
          icon={DollarSign}
          error={!!(submitted && errors.dealValue)}
        >
          <input
            className={elevatedInputClass(true)}
            value={form.dealValue}
            onChange={(e) => update("dealValue", e.target.value)}
            placeholder="0.00"
          />
        </InputShell>
      </Field>
      <Field
        label="Currency"
        required
        error={submitted ? errors.currency : undefined}
      >
        <InputShell error={!!(submitted && errors.currency)}>
          <select
            className={elevatedSelectClass(false)}
            value={form.currency}
            onChange={(e) =>
              update("currency", e.target.value as DealCurrency)
            }
          >
            {DEAL_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
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
      {form.stage === "Closed Lost" ? (
        <>
          <Field
            label="Lost Reason"
            required
            error={submitted ? errors.lostReason : undefined}
          >
            <InputShell error={!!(submitted && errors.lostReason)}>
              <select
                className={elevatedSelectClass(false)}
                value={form.lostReason}
                onChange={(e) => update("lostReason", e.target.value)}
              >
                <option value="">Select reason</option>
                {LOST_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </InputShell>
          </Field>
          <Field label="Competitor">
            <InputShell>
              <input
                className={elevatedInputClass(false)}
                value={form.competitor}
                onChange={(e) => update("competitor", e.target.value)}
                placeholder="Competitor name"
              />
            </InputShell>
          </Field>
        </>
      ) : null}
      <Field label="Description" className="col-span-full">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Opportunity details, next steps…"
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
