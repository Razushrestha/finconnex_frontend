"use client";

/**
 * The Create Lead step, built from the Create Lead modal's own pieces
 * (CreateLeadForm): its contact picker, followers field, tags row, fields and
 * option lists, in one column to fit the automation sidebar.
 *
 * It edits the step's config, not a lead: every change is converted with
 * leadActionConfigFromForm. The one thing the modal does not have is
 * "Use the contact that started this workflow", which lets the lead be built
 * for whichever contact the workflow runs for.
 */

import { useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";

import { RecordField } from "@/components/automations/builder/RecordField";
import {
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";
import { LeadFollowersField } from "@/components/sales/leads/detail/LeadFollowersField";
import { LeadContactPicker } from "@/components/sales/leads/LeadContactPicker";
import { RecordTagsRow } from "@/components/shared/tags/RecordTags";
import { describeRelatedTarget } from "@/lib/automations/record-search";
import {
  leadActionConfigFromForm,
  leadActionFormFromConfig,
  leadActionProblems,
  type LeadActionFormState,
} from "@/lib/automations/lead-action-form";
import { hasLinkedContact, type AutomationEntityType } from "@/lib/automations/types";
import {
  LEAD_PIPELINE_STAGES,
  LEAD_SOURCES,
  LOAN_PURPOSES,
  type LeadPipelineStage,
  type LeadSource,
  type LoanPurpose,
} from "@/lib/leads/types";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  listAssignableOwnersLocal,
  loadAssignableOwners,
  type AssignableOwner,
} from "@/lib/users/assignable";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";
import type { WorkspaceMember } from "@/lib/workspace-members/types";

export function CreateLeadActionForm({
  config,
  entityType,
  onChange,
}: {
  config: Record<string, unknown>;
  entityType: AutomationEntityType;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const triggerHasContact = hasLinkedContact(entityType);
  const [form, setForm] = useState<LeadActionFormState>(() =>
    leadActionFormFromConfig(config, triggerHasContact),
  );
  const [owners, setOwners] = useState<AssignableOwner[]>(() => listAssignableOwnersLocal());
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const formRef = useRef(form);

  function commit(next: LeadActionFormState) {
    formRef.current = next;
    setForm(next);
    onChange(leadActionConfigFromForm(next));
  }
  function update<K extends keyof LeadActionFormState>(key: K, value: LeadActionFormState[K]) {
    commit({ ...formRef.current, [key]: value });
  }

  // Owners and followers from the same lists the modal uses; a new step
  // defaults its owner the way the modal does.
  useEffect(() => {
    let cancelled = false;
    void loadAssignableOwners().then((rows) => {
      if (cancelled || !rows.length) return;
      setOwners(rows);
      if (!formRef.current.ownerId) commit({ ...formRef.current, ownerId: defaultAssignableOwnerId(rows) });
    });
    void listCrmWorkspaceMembers()
      .then((rows) => !cancelled && setMembers(rows))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per opened step
  }, []);

  // A saved step stores contact ids only; show the contacts' names again.
  useEffect(() => {
    let cancelled = false;
    const { contacts, secondaryContactId } = formRef.current;
    contacts.forEach((contact, index) => {
      void describeRelatedTarget("CONTACT", contact.id).then((option) => {
        if (cancelled || !option) return;
        setForm((prev) => {
          const next = [...prev.contacts];
          if (next[index]?.id === contact.id) {
            next[index] = { ...next[index], name: option.label, email: option.sublabel ?? "" };
          }
          return (formRef.current = { ...prev, contacts: next });
        });
      });
    });
    if (secondaryContactId) {
      void describeRelatedTarget("CONTACT", secondaryContactId).then((option) => {
        if (!cancelled && option) {
          setForm((prev) => (formRef.current = { ...prev, secondaryContactName: option.label }));
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const ownerLabel = owners.find((o) => o.id === form.ownerId)?.name ?? "";
  const followerNames = form.followerIds
    .map((id) => members.find((m) => m.userId === id)?.name)
    .filter((name): name is string => Boolean(name));
  const problems = leadActionProblems(form, triggerHasContact);

  return (
    <div className="grid grid-cols-1 gap-y-3">
      <Field label="Contacts" required>
        <label className="mb-2 flex items-start gap-2 text-[12px] text-slate-600">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
            checked={form.useTriggerContact}
            disabled={!triggerHasContact && !form.useTriggerContact}
            onChange={(e) =>
              commit({
                ...formRef.current,
                useTriggerContact: e.target.checked,
                contacts: [],
                secondaryContactId: "",
                secondaryContactName: "",
              })
            }
          />
          <span>
            Use the contact that started this workflow
            {!triggerHasContact && (
              <span className="block text-[11px] text-slate-400">
                This trigger&apos;s record has no contact, so pick one below.
              </span>
            )}
          </span>
        </label>
        {form.useTriggerContact ? (
          <div className="space-y-1.5">
            <p className="text-[11px] text-slate-400">
              The lead takes that contact&apos;s email and phone. Add a secondary contact if there is one.
            </p>
            <RecordField
              target="CONTACT"
              value={form.secondaryContactId}
              onChange={(id) => commit({ ...formRef.current, secondaryContactId: id, secondaryContactName: "" })}
              noun={{ one: "secondary contact", many: "contacts" }}
            />
          </div>
        ) : (
          <LeadContactPicker
            contacts={form.contacts}
            owner={ownerLabel}
            leadSource={form.leadSource}
            error={problems.some((p) => /contact/i.test(p))}
            onChange={(contacts) => update("contacts", contacts.slice(0, 2))}
          />
        )}
      </Field>

      <Field label="Lead name" required>
        <InputShell error={!form.leadName.trim()}>
          <input
            className={elevatedInputClass(false)}
            value={form.leadName}
            onChange={(e) => update("leadName", e.target.value)}
            placeholder="e.g. Home loan — Alex Morgan"
          />
        </InputShell>
      </Field>

      <Field label="Lead Status" required>
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.pipelineStage}
            onChange={(e) => update("pipelineStage", e.target.value as LeadPipelineStage)}
          >
            {LEAD_PIPELINE_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Lead source" required>
        <InputShell error={!form.leadSource}>
          <select
            className={elevatedSelectClass(false)}
            value={form.leadSource}
            onChange={(e) => update("leadSource", e.target.value as LeadSource | "")}
          >
            <option value="">Select source</option>
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Lead owner" required>
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

      <Field label="Lead Followers" className="relative z-20 overflow-visible">
        <div className="flex h-10 items-center">
          <LeadFollowersField
            value={JSON.stringify(followerNames)}
            owner={ownerLabel}
            onChange={(next) => {
              let names: string[] = [];
              try {
                const parsed = JSON.parse(next) as unknown;
                names = Array.isArray(parsed)
                  ? parsed.filter((name): name is string => typeof name === "string")
                  : [];
              } catch {
                names = [];
              }
              const ids = names
                .map((name) =>
                  members.find((m) => m.name.trim().toLowerCase() === name.trim().toLowerCase())?.userId,
                )
                .filter((id): id is string => Boolean(id));
              update("followerIds", [...new Set(ids)]);
            }}
          />
        </div>
      </Field>

      <Field label="Loan purpose">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.loanPurpose}
            onChange={(e) => update("loanPurpose", e.target.value as LoanPurpose | "")}
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

      <Field label="Add tags">
        <div className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <RecordTagsRow
            tags={form.tags}
            relatedTo={form.leadName || form.contacts[0]?.name}
            onChange={(tags) => update("tags", tags)}
          />
        </div>
      </Field>

      <Field label="Notes">
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
    </div>
  );
}

/** Save stays off until the Create Lead modal's required fields are filled. */
export function createLeadActionProblems(
  config: Record<string, unknown>,
  entityType: AutomationEntityType,
): string[] {
  const triggerHasContact = hasLinkedContact(entityType);
  return leadActionProblems(leadActionFormFromConfig(config, triggerHasContact), triggerHasContact);
}
