"use client";

/**
 * The Request Documents step, built from the Create Document Request page's
 * own pieces (CreateDocumentRequestForm): its stepper, "Send on behalf of"
 * field, applicants section, documents picker and quick review, as the same
 * three steps inside the automation sidebar.
 *
 * It edits the step's config, not a request. Two things differ for a
 * workflow: the applicant can be the contact that started it, and the due
 * date can be a time after it runs. The page's reminder settings are not
 * offered — the CRM does not store them for a request.
 */

import { useEffect, useRef, useState } from "react";
import { Calendar, Loader2 } from "lucide-react";

import {
  SenderOnBehalfField,
  Stepper,
  resolveApplicantContactId,
} from "@/components/documents/requests/CreateDocumentRequestForm";
import { RequestApplicantsSection } from "@/components/documents/requests/RequestApplicantsSection";
import { RequestDocumentsPicker } from "@/components/documents/requests/RequestDocumentsPicker";
import { RequestQuickReview } from "@/components/documents/requests/RequestQuickReview";
import { Button } from "@/components/ui/button";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  REQUEST_OFFSET_UNITS,
  applicantNames,
  autoTitle,
  documentRequestConfigFromForm,
  documentRequestFormFromConfig,
  documentRequestProblems,
  hasTwoApplicants,
  reviewGroups,
  type DocumentRequestFormState,
} from "@/lib/automations/document-request-form";
import { describeRelatedTarget } from "@/lib/automations/record-search";
import { hasLinkedContact, type AutomationEntityType } from "@/lib/automations/types";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  loadAssignableOwners,
  type AssignableOwner,
} from "@/lib/users/assignable";
import { cn } from "@/lib/utils";

function dueLabel(form: DocumentRequestFormState): string {
  if (form.dueMode === "relative") {
    const unit = REQUEST_OFFSET_UNITS.find((u) => u.value === form.dueIn.unit)?.label.toLowerCase() ?? "";
    return `${form.dueIn.amount} ${unit} after the workflow runs`;
  }
  if (!form.dueDate) return "Not set";
  return new Date(form.dueDate).toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RequestDocumentsActionForm({
  config,
  entityType,
  onChange,
}: {
  config: Record<string, unknown>;
  entityType: AutomationEntityType;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const triggerHasContact = hasLinkedContact(entityType);
  const [form, setForm] = useState<DocumentRequestFormState>(() =>
    documentRequestFormFromConfig(config, triggerHasContact),
  );
  const [senders, setSenders] = useState<AssignableOwner[]>([]);
  const [resolving, setResolving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const formRef = useRef(form);

  function commit(next: DocumentRequestFormState) {
    formRef.current = next;
    setForm(next);
    onChange(documentRequestConfigFromForm(next));
  }
  function update<K extends keyof DocumentRequestFormState>(key: K, value: DocumentRequestFormState[K]) {
    commit({ ...formRef.current, [key]: value });
  }

  // Senders as the page loads them; a new step defaults to the page's choice.
  useEffect(() => {
    let cancelled = false;
    void loadAssignableOwners().then((rows) => {
      if (cancelled) return;
      setSenders(rows);
      if (!formRef.current.senderId && rows.length) {
        commit({ ...formRef.current, senderId: defaultAssignableOwnerId(rows) });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per opened step
  }, []);

  // A saved step stores the applicant's contact id; show the name again.
  useEffect(() => {
    let cancelled = false;
    const first = formRef.current.applicants[0];
    if (first?.recordId && !first.name) {
      void describeRelatedTarget("CONTACT", first.recordId).then((option) => {
        if (cancelled || !option) return;
        setForm((prev) => {
          const applicants = [...prev.applicants];
          applicants[0] = { ...applicants[0], name: option.label, email: option.sublabel ?? "" };
          return (formRef.current = { ...prev, applicants });
        });
      });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const sender = senders.find((row) => row.id === form.senderId);
  const [applicant1, applicant2] = applicantNames(form);
  const title = form.titleEdited ? form.title : autoTitle(form);

  async function next() {
    const problems = documentRequestProblems(formRef.current, { triggerHasContact, step: form.step });
    if (problems.length) {
      setStepError(problems[0]);
      return;
    }
    setStepError(null);
    // As on the page: an applicant from a lead, deal or organization is
    // turned into a CRM contact, since a request is sent to a contact.
    if (form.step === 1 && !formRef.current.applicantFromTrigger) {
      const first = formRef.current.applicants[0];
      if (first && !isUuid(first.recordId ?? "")) {
        setResolving(true);
        try {
          const recordId = await resolveApplicantContactId(first);
          const applicants = [...formRef.current.applicants];
          applicants[0] = { ...first, source: "contact", recordId };
          commit({ ...formRef.current, applicants });
        } catch (err) {
          setStepError(err instanceof Error ? err.message : "Pick or add a live CRM contact");
          return;
        } finally {
          setResolving(false);
        }
      }
    }
    update("step", (form.step + 1) as 2 | 3);
  }

  return (
    <div className="space-y-4">
      <div className="[&_li_span:last-child]:hidden [&_li_span:last-child]:sm:hidden">
        <Stepper step={form.step} />
      </div>
      <p className="text-[12px] font-medium text-slate-700">
        {["Document Request details", "Documents", "Quick review"][form.step - 1]}
      </p>

      {form.step === 1 && (
        <div className="space-y-4">
          <SenderOnBehalfField
            value={sender?.name ?? ""}
            options={senders}
            invalid={!form.senderId}
            onChange={(name) => {
              const row = senders.find((s) => s.name === name || assignableOwnerLabel(s) === name);
              if (row) update("senderId", row.id);
            }}
          />

          {triggerHasContact && (
            <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-[12px] text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
                checked={form.applicantFromTrigger}
                onChange={(e) =>
                  commit({
                    ...formRef.current,
                    applicantFromTrigger: e.target.checked,
                    applicants: [],
                    selected: { 1: formRef.current.selected[1], 2: [] },
                  })
                }
              />
              <span>
                Send to the contact that started this workflow
                <span className="block text-[11px] text-slate-400">
                  Each run asks that contact for the documents.
                </span>
              </span>
            </label>
          )}
          {!form.applicantFromTrigger && (
            <RequestApplicantsSection
              applicants={form.applicants}
              onChange={(applicants) => update("applicants", applicants.slice(0, 2))}
            />
          )}

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Due date<span className="text-rose-500"> *</span>
            </label>
            <div role="radiogroup" aria-label="When the documents are due" className="mt-1 mb-1.5 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-0.5">
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
                  aria-checked={form.dueMode === mode}
                  onClick={() => update("dueMode", mode)}
                  className={cn(
                    "rounded px-2 py-1 text-[11px] font-medium",
                    form.dueMode === mode ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {text}
                </button>
              ))}
            </div>
            {form.dueMode === "relative" ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  aria-label="Due in amount"
                  className="h-10 w-20 rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#5A32A3]/45"
                  value={form.dueIn.amount}
                  onChange={(e) =>
                    update("dueIn", { ...formRef.current.dueIn, amount: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
                <select
                  aria-label="Due in unit"
                  className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-[13px] outline-none"
                  value={form.dueIn.unit}
                  onChange={(e) =>
                    update("dueIn", {
                      ...formRef.current.dueIn,
                      unit: e.target.value as DocumentRequestFormState["dueIn"]["unit"],
                    })
                  }
                >
                  {REQUEST_OFFSET_UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500">after it runs</span>
              </div>
            ) : (
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="datetime-local"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#5A32A3]/45"
                  value={form.dueDate}
                  onChange={(e) => update("dueDate", e.target.value)}
                />
              </div>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              {form.dueMode === "relative"
                ? "Counted from when the workflow runs."
                : "A fixed date is already past on later runs."}
            </p>
          </div>
        </div>
      )}

      {form.step === 2 && (
        <div className="space-y-4">
          <RequestDocumentsPicker
            applicant1={applicant1}
            applicant2={applicant2}
            twoApplicants={hasTwoApplicants(form)}
            selected={form.selected}
            onChange={(selected) => update("selected", selected)}
            extras={form.extras}
            onExtrasChange={(extras) => update("extras", extras)}
            descriptionOverrides={form.descriptionOverrides}
            onDescriptionOverridesChange={(overrides) => update("descriptionOverrides", overrides)}
            template={form.template}
            onTemplateChange={(template) => update("template", template)}
          />
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">Notes for the client</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Anything they should know before uploading…"
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12"
            />
          </div>
        </div>
      )}

      {form.step === 3 && (
        <RequestQuickReview
          compact
          clientName={form.applicantFromTrigger ? "The contact that started this workflow" : applicant1}
          sendOnBehalfOf={sender ? assignableOwnerLabel(sender) : "—"}
          requestTitle={title}
          onRequestTitleChange={(value) => commit({ ...formRef.current, title: value, titleEdited: true })}
          groups={reviewGroups(form)}
          dueDate={dueLabel(form)}
          reminderDate="Not set"
          repeatLabel="Off"
          notifyBy={[]}
          notes={form.notes}
          onNotesChange={(notes) => update("notes", notes)}
        />
      )}

      {stepError && <p className="text-[12px] font-medium text-rose-600">{stepError}</p>}

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={form.step === 1}
          onClick={() => {
            setStepError(null);
            update("step", (form.step - 1) as 1 | 2);
          }}
        >
          Back
        </Button>
        {form.step < 3 ? (
          <Button type="button" size="sm" disabled={resolving} onClick={() => void next()} className="gap-1.5">
            {resolving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Next
          </Button>
        ) : (
          <span className="text-[11px] text-slate-400">Save the step to keep this request.</span>
        )}
      </div>
    </div>
  );
}

/** Save stays off until every step of the page's form is complete. */
export function requestDocumentsActionProblems(
  config: Record<string, unknown>,
  entityType: AutomationEntityType,
): string[] {
  const triggerHasContact = hasLinkedContact(entityType);
  return documentRequestProblems(documentRequestFormFromConfig(config, triggerHasContact), {
    triggerHasContact,
  });
}
