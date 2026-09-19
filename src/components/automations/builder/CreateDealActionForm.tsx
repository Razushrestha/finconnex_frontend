"use client";

/**
 * The Create Deal step, built from the Create Deal modal's own pieces
 * (CreateDealForm): its fields, icons, placeholders, stage/probability
 * pairing, currencies, company list and Closed Lost fields, in one column to
 * fit the automation sidebar.
 *
 * It edits the step's config, not a deal. Contact and Expected Close Date
 * work per run: a contact is linked to the deal (a picked one, or the
 * workflow's own), and the close date can be a time after the run.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Calendar, DollarSign, Handshake, Percent, Users } from "lucide-react";

import { RecordField } from "@/components/automations/builder/RecordField";
import {
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  DEAL_OFFSET_UNITS,
  DEAL_STAGE_PROBABILITY,
  dealActionConfigFromForm,
  dealActionFormFromConfig,
  dealActionProblems,
  type DealActionFormState,
} from "@/lib/automations/deal-action-form";
import { hasLinkedContact, type AutomationEntityType } from "@/lib/automations/types";
import { listCompanyGroups } from "@/lib/companies/store";
import { useCrmCompanies } from "@/lib/companies/use-crm-companies";
import { CONTACT_SOURCES } from "@/lib/contacts/types";
import {
  DEAL_CURRENCIES,
  DEAL_STAGES,
  LOST_REASONS,
  type DealCurrency,
  type DealStageTitle,
} from "@/lib/deals/types";
import type { LeadSource } from "@/lib/leads/types";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  listAssignableOwnersLocal,
  loadAssignableOwners,
  type AssignableOwner,
} from "@/lib/users/assignable";
import { cn } from "@/lib/utils";

/** The modal's account list: CRM companies with a real id. */
function crmAccounts() {
  return listCompanyGroups()
    .flatMap((group) => group.companies)
    .filter((company) => isUuid(company.id));
}

export function CreateDealActionForm({
  config,
  entityType,
  onChange,
}: {
  config: Record<string, unknown>;
  entityType: AutomationEntityType;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const triggerHasContact = hasLinkedContact(entityType);
  const [form, setForm] = useState<DealActionFormState>(() =>
    dealActionFormFromConfig(config, triggerHasContact),
  );
  const [owners, setOwners] = useState<AssignableOwner[]>(() => listAssignableOwnersLocal());
  const crmCompanies = useCrmCompanies();
  const formRef = useRef(form);

  const accounts = useMemo(() => {
    // Recomputed when the CRM list lands; the store is read, not the hook.
    void crmCompanies.source;
    void crmCompanies.loading;
    return crmAccounts();
  }, [crmCompanies.source, crmCompanies.loading]);

  function commit(next: DealActionFormState) {
    formRef.current = next;
    setForm(next);
    onChange(dealActionConfigFromForm(next));
  }
  function update<K extends keyof DealActionFormState>(key: K, value: DealActionFormState[K]) {
    commit({ ...formRef.current, [key]: value });
  }

  // Owners as the modal loads them. A new step also writes its defaults
  // (Prospecting, 10%, AUD, the default owner) so they are saved as shown.
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

  const problems = dealActionProblems(form, { triggerHasContact, accountsExist: accounts.length > 0 });
  const relative = form.closeMode === "relative";

  return (
    <div className="grid grid-cols-1 gap-y-3">
      <Field label="Deal Name" required>
        <InputShell icon={Handshake} error={!form.dealName.trim()}>
          <input
            className={elevatedInputClass(true)}
            value={form.dealName}
            onChange={(e) => update("dealName", e.target.value)}
            placeholder="Enter deal name"
          />
        </InputShell>
      </Field>

      <Field label="Account" required={accounts.length > 0}>
        <InputShell icon={Building2} error={problems.includes("Select a CRM company")}>
          <select
            className={elevatedSelectClass(true)}
            value={form.accountId}
            onChange={(e) => update("accountId", e.target.value)}
          >
            {accounts.length === 0 ? (
              <option value="">{crmCompanies.loading ? "Loading companies…" : "No CRM companies yet"}</option>
            ) : (
              <option value="">Select account</option>
            )}
            {accounts.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Contact">
        {(triggerHasContact || form.contactFromTrigger) && (
          <label className="mb-2 flex items-start gap-2 text-[12px] text-slate-600">
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
              checked={form.contactFromTrigger}
              onChange={(e) => commit({ ...formRef.current, contactFromTrigger: e.target.checked, contactId: "" })}
            />
            <span>
              Use the contact that started this workflow
              <span className="block text-[11px] text-slate-400">
                Linked to the deal as its contact, a different one each run.
              </span>
            </span>
          </label>
        )}
        {!form.contactFromTrigger && (
          <RecordField
            target="CONTACT"
            value={form.contactId}
            onChange={(id) => update("contactId", id)}
            noun={{ one: "contact", many: "contacts" }}
          />
        )}
      </Field>

      <Field label="Lead Source">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.leadSource}
            onChange={(e) => update("leadSource", e.target.value as LeadSource | "")}
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

      <Field label="Stage" required>
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.stage}
            onChange={(e) => {
              const stage = e.target.value as DealStageTitle;
              // As on the modal: a stage brings its usual probability.
              commit({ ...formRef.current, stage, probability: String(DEAL_STAGE_PROBABILITY[stage]) });
            }}
          >
            {DEAL_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
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
        <div role="radiogroup" aria-label="When the deal is expected to close" className="mb-1.5 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-0.5">
          {(
            [
              ["relative", "After workflow runs"],
              ["date", "Specific date"],
            ] as const
          ).map(([mode, text]) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={form.closeMode === mode}
              onClick={() => update("closeMode", mode)}
              className={cn(
                "rounded px-2 py-1 text-[11px] font-medium",
                form.closeMode === mode ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {text}
            </button>
          ))}
        </div>
        {relative ? (
          <div className="flex items-center gap-1.5">
            <InputShell icon={Calendar}>
              <input
                type="number"
                min={1}
                aria-label="Closes in amount"
                className={elevatedInputClass(true)}
                value={form.closeIn.amount}
                onChange={(e) =>
                  update("closeIn", {
                    ...formRef.current.closeIn,
                    amount: e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0),
                  })
                }
                placeholder="None"
              />
            </InputShell>
            <InputShell>
              <select
                aria-label="Closes in unit"
                className={elevatedSelectClass(false)}
                value={form.closeIn.unit}
                onChange={(e) =>
                  update("closeIn", {
                    ...formRef.current.closeIn,
                    unit: e.target.value as DealActionFormState["closeIn"]["unit"],
                  })
                }
              >
                {DEAL_OFFSET_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </InputShell>
          </div>
        ) : (
          <InputShell icon={Calendar}>
            <input
              type="date"
              className={elevatedInputClass(true)}
              value={form.expectedCloseDate}
              onChange={(e) => update("expectedCloseDate", e.target.value)}
            />
          </InputShell>
        )}
        <p className="mt-1 text-[11px] text-slate-400">
          {relative
            ? "Counted from when the workflow runs. Leave blank for no close date."
            : "A fixed date is already past on later runs."}
        </p>
      </Field>

      <Field label="Deal Value" required>
        <InputShell icon={DollarSign} error={!form.dealValue.trim()}>
          <input
            type="number"
            min={0}
            step="0.01"
            className={elevatedInputClass(true)}
            value={form.dealValue}
            onChange={(e) => update("dealValue", e.target.value)}
            placeholder="0.00"
          />
        </InputShell>
      </Field>

      <Field label="Currency" required>
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.currency}
            onChange={(e) => update("currency", e.target.value as DealCurrency)}
          >
            {DEAL_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
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

      {form.stage === "Closed Lost" && (
        <>
          <Field label="Lost Reason" required>
            <InputShell error={!form.lostReason}>
              <select
                className={elevatedSelectClass(false)}
                value={form.lostReason}
                onChange={(e) => update("lostReason", e.target.value)}
              >
                <option value="">Select reason</option>
                {LOST_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
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
      )}

      <Field label="Description">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Opportunity details, next steps…"
          />
        </TextAreaShell>
      </Field>
    </div>
  );
}

/** Save stays off until the Create Deal modal's required fields are filled. */
export function createDealActionProblems(
  config: Record<string, unknown>,
  entityType: AutomationEntityType,
): string[] {
  const triggerHasContact = hasLinkedContact(entityType);
  return dealActionProblems(dealActionFormFromConfig(config, triggerHasContact), {
    triggerHasContact,
    accountsExist: crmAccounts().length > 0,
  });
}
