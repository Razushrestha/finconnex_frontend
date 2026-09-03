"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, Users, X } from "lucide-react";
import {
  LEAD_PIPELINE_STAGES,
  LEAD_SOURCES,
  LOAN_PURPOSES,
  OWNERS,
  type LeadPipelineStage,
  type LeadSource,
  type LoanPurpose,
} from "@/lib/leads/types";
import { api } from "@/lib/api";
import { syncCreatedLead } from "@/lib/leads/api";
import { isUuid } from "@/lib/activity-timeline/auth";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";
import { RecordTagsRow } from "@/components/shared/tags/RecordTags";
import {
  FOLLOWERS_KEY,
  LeadFollowersField,
} from "@/components/sales/leads/detail/LeadFollowersField";
import { LeadContactPicker, type LinkedLeadContact } from "@/components/sales/leads/LeadContactPicker";
import { findContactById } from "@/lib/contacts/store";
import { LEAD_FIELD_KEYS } from "@/lib/leads/detail-snapshot";
import { updateLead } from "@/lib/leads/store";
import {
  isMortgagePipelineStage,
  pipelineStageToLeadStatus,
} from "@/lib/pipeline-sla/board";
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
  formFullSpan,
  formWideSpan,
} from "@/components/sales/CreateEntityForm";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateLeadFormProps {
  layoutId?: string;
  redirect?: boolean;
  /** Prefill from Kanban column Plus (`?stage=`). */
  stage?: string;
  variant?: "page" | "modal";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
}

interface LeadFormState {
  contacts: LinkedLeadContact[];
  leadName: string;
  leadSource: LeadSource | "";
  pipelineStage: LeadPipelineStage | "";
  owner: string;
  followers: string[];
  tags: string[];
  notes: string;
  loanPurpose: LoanPurpose | "";
}

function resolveInitialStage(stage?: string): LeadPipelineStage {
  return stage && isMortgagePipelineStage(stage) ? stage : "New Lead";
}

function makeInitialState(stage?: string): LeadFormState {
  return {
    contacts: [],
    leadName: "",
    leadSource: "",
    pipelineStage: resolveInitialStage(stage),
    owner: "John Smith",
    followers: [],
    tags: [],
    notes: "",
    loanPurpose: "",
  };
}

function firstNamesLeadTitle(contacts: LinkedLeadContact[]) {
  const names = contacts
    .map((contact) => contact.firstName.trim())
    .filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  return `${names[0]} & ${names[1]}`;
}

function splitPersonName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") || firstName || "Lead";
  return { firstName: firstName || lastName, lastName };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function CreateLeadForm({
  layoutId,
  redirect,
  stage,
  variant = "page",
  open = true,
  onOpenChange,
  onCreated,
}: CreateLeadFormProps) {
  void layoutId;
  void redirect;
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LeadFormState>(() =>
    makeInitialState(stage),
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof LeadFormState | "email" | "contactId", string>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState<
    Array<{ id: string; name: string }>
  >(() => OWNERS.map((name) => ({ id: name, name })));

  useEffect(() => {
    let cancelled = false;
    void listCrmWorkspaceMembers()
      .then((members) => {
        const live = members.filter(
          (m) => m.status !== "Inactive" && (isUuid(m.userId) || isUuid(m.id)),
        );
        if (cancelled || !live.length) return;
        const options = live.map((m) => ({
          id: isUuid(m.userId) ? m.userId : m.id,
          name: m.name,
        }));
        setOwnerOptions(options);
        setForm((prev) => {
          const match = options.find(
            (o) => o.id === prev.owner || o.name === prev.owner,
          );
          return { ...prev, owner: match?.id ?? options[0]?.id ?? prev.owner };
        });
      })
      .catch(() => {
        /* keep demo owner names */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (variant !== "modal" || !open) return;
    setForm((prev) => ({
      ...makeInitialState(stage),
      owner: prev.owner,
    }));
    setErrors({});
    setSubmitted(false);
  }, [variant, open, stage]);

  const ownerLabel =
    ownerOptions.find((o) => o.id === form.owner)?.name ?? form.owner;

  function update<K extends keyof LeadFormState>(
    key: K,
    value: LeadFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyContacts(next: LinkedLeadContact[]) {
    setForm((prev) => {
      const autoName = firstNamesLeadTitle(next);
      const previousAuto = firstNamesLeadTitle(prev.contacts);
      const shouldFillName =
        !prev.leadName.trim() || prev.leadName === previousAuto;
      return {
        ...prev,
        contacts: next,
        leadName: shouldFillName ? autoName : prev.leadName,
      };
    });
  }

  function validate() {
    const primary = form.contacts[0];
    const next: Partial<Record<keyof LeadFormState | "email" | "contactId", string>> = {
      ...requiredFieldErrors(form as unknown as Record<string, unknown>, [
        "leadName",
        "pipelineStage",
        "leadSource",
        "owner",
      ]),
    };
    if (!primary) next.contactId = "Select or add a contact";
    if (primary && !isValidEmail(primary.email)) {
      next.email = "This contact needs a valid email";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function attachExtras(leadId: string, primary: LinkedLeadContact) {
    const stored = findContactById(primary.id)?.contact;
    const secondary = form.contacts[1];
    const custom: Record<string, string> = {
      contactId: primary.id,
      contactName: primary.name,
      [LEAD_FIELD_KEYS.firstName]: primary.firstName,
      [LEAD_FIELD_KEYS.middleName]: primary.middleName,
      [LEAD_FIELD_KEYS.surname]: primary.lastName,
      linkedContacts: JSON.stringify(form.contacts),
    };
    if (form.loanPurpose) {
      custom[LEAD_FIELD_KEYS.purpose] = form.loanPurpose;
    }
    if (secondary) {
      custom[LEAD_FIELD_KEYS.secondaryApplicant] = "Yes";
      custom["secondary.firstName"] = secondary.firstName;
      custom["secondary.middleName"] = secondary.middleName;
      custom["secondary.surname"] = secondary.lastName;
      custom["secondary.email"] = secondary.email;
      custom["secondary.phone"] = secondary.phone;
      custom["secondary.mobile"] = secondary.phone;
      custom["secondary.contactId"] = secondary.id;
    }
    const followers = form.followers.filter(
      (name) => name.trim().toLowerCase() !== ownerLabel.trim().toLowerCase(),
    );
    if (followers.length) {
      custom[FOLLOWERS_KEY] = JSON.stringify(followers);
    }
    updateLead(leadId, {
      name: form.leadName.trim(),
      notes: form.notes.trim() || undefined,
      tags: form.tags,
      email: primary.email,
      phone: primary.phone,
      company: stored?.company,
      custom,
    });
  }

  function afterSave(createAnother: boolean, pipelineStage: LeadPipelineStage) {
    if (createAnother) {
      setForm({
        ...makeInitialState(stage),
        owner: form.owner,
        pipelineStage,
      });
      setErrors({});
      setSubmitted(false);
      return;
    }
    if (variant === "modal") {
      onCreated?.();
      onOpenChange?.(false);
      return;
    }
    router.push("/sales/leads");
  }

  async function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    const gate = requireAction("sales.leads.create");
    if (!gate.ok) {
      window.alert(gate.message);
      return;
    }
    const primary = form.contacts[0];
    if (!primary) {
      setErrors((prev) => ({
        ...prev,
        contactId: "Select or add a contact",
      }));
      return;
    }
    const stored = findContactById(primary.id)?.contact;
    const pipelineStage = form.pipelineStage || "New Lead";
    const leadName = form.leadName.trim();
    const fromLead = splitPersonName(leadName);
    const firstName = primary.firstName || fromLead.firstName;
    const lastName = primary.lastName || fromLead.lastName;

    try {
      const live = await syncCreatedLead({
        firstName,
        lastName,
        email: primary.email.trim(),
        phone: primary.phone,
        company: stored?.company,
        ownerId: isUuid(form.owner) ? form.owner : undefined,
        ownerName: ownerLabel,
        source: form.leadSource || "Website",
        notes: form.notes,
        pipelineStage,
      });
      if (live) {
        attachExtras(live.id, primary);
        logCreate("sales.leads", ownerLabel, live.id, leadName || live.name);
        notifyOwnerAssigned({
          owner: ownerLabel,
          entityLabel: `Lead ${leadName || live.name}`,
          relatedTo: leadName || live.name,
          relatedHref: "/sales/leads",
          type: "Lead Assigned",
        });
        afterSave(createAnother, pipelineStage);
        return;
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to create lead");
      return;
    }
    const result = await api.leads.create({
      firstName,
      lastName,
      email: primary.email.trim(),
      phone: primary.phone,
      company: stored?.company,
      source: form.leadSource || "Website",
      status: pipelineStageToLeadStatus(pipelineStage),
      pipelineStage,
      owner: form.owner,
    });
    if (!result.ok) {
      if (result.error.fields?.email) {
        setErrors((prev) => ({ ...prev, email: result.error.fields!.email }));
      }
      window.alert(result.error.message);
      return;
    }
    attachExtras(result.data.id, primary);
    const label = leadName || result.data.name;
    logCreate("sales.leads", ownerLabel, result.data.id, label);
    notifyOwnerAssigned({
      owner: ownerLabel,
      entityLabel: `Lead ${label}`,
      relatedTo: label,
      relatedHref: "/sales/leads",
      type: "Lead Assigned",
    });
    afterSave(createAnother, pipelineStage);
  }

  async function runSave(createAnother: boolean) {
    if (saving) return;
    setSaving(true);
    try {
      await handleSave(createAnother);
    } finally {
      window.setTimeout(() => setSaving(false), 350);
    }
  }

  const fields = (
    <>
      <Field
        label="Contacts"
        required
        className={formWideSpan}
        error={
          submitted
            ? errors.contactId || errors.email
            : undefined
        }
      >
        <LeadContactPicker
          contacts={form.contacts}
          owner={ownerLabel}
          leadSource={form.leadSource}
          error={!!(submitted && (errors.contactId || errors.email))}
          onChange={applyContacts}
        />
      </Field>
      <Field
        label="Lead name"
        required
        error={submitted ? errors.leadName : undefined}
      >
        <InputShell error={!!(submitted && errors.leadName)}>
          <input
            className={elevatedInputClass(false)}
            value={form.leadName}
            onChange={(e) => update("leadName", e.target.value)}
            placeholder="e.g. Home loan — Alex Morgan"
          />
        </InputShell>
      </Field>
      <Field
        label="Lead Status"
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
        label="Lead source"
        required
        error={submitted ? errors.leadSource : undefined}
      >
        <InputShell error={!!(submitted && errors.leadSource)}>
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
        label="Lead owner"
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
                {o.name}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Followers" className="relative z-20 overflow-visible">
        <div className="flex h-10 items-center">
          <LeadFollowersField
            value={JSON.stringify(form.followers)}
            owner={ownerLabel}
            onChange={(next) => {
              try {
                const parsed = JSON.parse(next) as unknown;
                update(
                  "followers",
                  Array.isArray(parsed)
                    ? parsed.filter(
                        (name): name is string =>
                          typeof name === "string" && Boolean(name.trim()),
                      )
                    : [],
                );
              } catch {
                update("followers", []);
              }
            }}
          />
        </div>
      </Field>
      <Field label="Loan purpose">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.loanPurpose}
            onChange={(e) =>
              update("loanPurpose", e.target.value as LoanPurpose | "")
            }
          >
            <option value="">Select purpose</option>
            {LOAN_PURPOSES.map((purpose) => (
              <option key={purpose} value={purpose}>
                {purpose}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Add tags" className={formFullSpan}>
        <div className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
          <RecordTagsRow
            tags={form.tags}
            relatedTo={form.leadName || form.contactName}
            onChange={(tags) => update("tags", tags)}
          />
        </div>
      </Field>
      <Field label="Notes" className={formFullSpan}>
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Context, next steps, or how they found you…"
            rows={4}
          />
        </TextAreaShell>
      </Field>
    </>
  );

  if (variant === "modal") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(90vh,840px)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        >
          <DialogTitle className="sr-only">Create Lead</DialogTitle>
          <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3 dark:border-zinc-800">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white">
              <User className="h-4 w-4" />
            </div>
            <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
              Create Lead
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange?.(false)}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 dark:bg-zinc-900/40">
            <div className="grid grid-cols-1 content-start gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-2">
              {fields}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => onOpenChange?.(false)}
              disabled={saving}
              className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void runSave(true)}
              disabled={saving}
              className="h-8 rounded-md border border-violet-200 bg-violet-50 px-3 text-[12px] font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
            >
              Save &amp; New
            </button>
            <button
              type="button"
              onClick={() => void runSave(false)}
              disabled={saving}
              className="inline-flex h-8 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-md bg-violet-600 px-4 text-[12px] font-semibold text-white transition-all hover:bg-violet-700 disabled:opacity-90"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Lead"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Leads", href: "/sales/leads" }}
      badge="New lead"
      title="Create Lead"
      subtitle="Link a contact, then capture the lead details."
      tip="Tip: Pick or add a contact, then add a lead name, status, source and owner."
      cardIcon={User}
      cardTitle="Lead Information"
      cardDescription="Fields marked required are needed to save"
      listHref="/sales/leads"
      saveLabel="Save Lead"
      onSave={handleSave}
    >
      {fields}
    </CreateEntityFormShell>
  );
}
