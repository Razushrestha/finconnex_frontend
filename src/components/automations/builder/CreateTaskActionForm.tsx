"use client";

/**
 * The Create Task step, laid out like the task page
 * (/activities/tasks/create → CreateTaskForm) and fed by the same sources:
 * the assignable-owner list, the CRM contact/lead/deal/organization lists,
 * the task page's Repeat control and its storage upload. It is condensed to
 * one column to fit the automation sidebar.
 *
 * It edits the step's config, not a task: every change is converted with
 * taskActionConfigFromForm, which writes the same API values the task page
 * sends.
 */

import { useEffect, useRef, useState } from "react";
import { Calendar, ListChecks, Loader2, Paperclip, Plus, Search, User, X } from "lucide-react";

import AttachmentUpload from "@/components/activities/tasks/AttachmentUpload";
import RelatedRecordCombobox from "@/components/activities/tasks/RelatedRecordComboBox";
import {
  TaskRepeatBlock,
  turnOffReminderRepeat,
} from "@/components/activities/tasks/ReminderSettingsCard";
import { Switch } from "@/components/ui/switch";
import {
  liveRelatedRecords,
  rankRelatedRecordsByContact,
  TASK_RELATED_ENTITY_KINDS,
  type TaskRelatedEntityKind,
} from "@/lib/activities/related-records";
import type { RelatedTo } from "@/lib/activities/shared";
import { describeRelatedTarget } from "@/lib/automations/record-search";
import {
  isStoredRepeat,
  offsetMs,
  TASK_ACTION_STATUSES,
  TASK_OFFSET_UNITS,
  taskActionConfigFromForm,
  taskActionFormFromConfig,
  type TaskActionFormState,
  type TaskOffset,
  type TaskOffsetUnit,
} from "@/lib/automations/task-action-form";
import { listCrmCompanies, tryCrmCompany } from "@/lib/companies/api";
import { listCrmContacts, tryCrmContact } from "@/lib/contacts/api";
import { listCrmDeals, tryCrmDeal } from "@/lib/deals/api";
import { fetchLeadList } from "@/lib/leads/api";
import { mapCrmLeadToCard } from "@/lib/leads/api/map";
import { uploadTaskFileBlobs } from "@/lib/tasks/attach-files";
import { TASK_PRIORITIES, TASK_TYPES, type Priority, type TaskStatus, type TaskType } from "@/lib/tasks/types";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  listAssignableOwnersLocal,
  loadAssignableOwners,
  resolveAssignableOwnerName,
  type AssignableOwner,
} from "@/lib/users/assignable";
import { cn } from "@/lib/utils";

// The task page's field styles, one step smaller.
const inputClass =
  "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground/90 placeholder:text-foreground/50 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100";
const selectClass = inputClass + " appearance-none";
const labelClass = "text-[10px] font-medium uppercase tracking-wide text-gray-500";
const cardClass = "space-y-3 rounded-lg border border-border bg-white p-3";

function Required() {
  return <span className="text-red-500"> *</span>;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function parseLocal(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function nowLocal(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** The task page's date rules (validateTaskDates), or their relative equivalents. */
function dateErrors(form: TaskActionFormState) {
  const errors: { dueDate?: string; reminderDate?: string } = {};
  if (form.dueMode === "relative") {
    const due = offsetMs(form.dueIn);
    if (due < 60_000) errors.dueDate = "Due time must be at least 1 minute after the workflow runs";
    else if (due > 365 * 86_400_000) errors.dueDate = "Due time can be at most a year after the workflow runs";
    if (form.reminderOn && offsetMs(form.reminderBefore) >= due)
      errors.reminderDate = "Reminder must come before the task is due";
    return errors;
  }
  const now = parseLocal(nowLocal())!;
  const due = parseLocal(form.dueDate);
  if (!form.dueDate.trim()) errors.dueDate = "Due date is required";
  else if (!due) errors.dueDate = "Enter a valid due date and time";
  else if (due < now) errors.dueDate = "Due date cannot be before the current date and time";
  if (form.reminderOn && form.reminderDate.trim()) {
    const reminder = parseLocal(form.reminderDate);
    if (!reminder) errors.reminderDate = "Enter a valid reminder date and time";
    else if (due && reminder > due) errors.reminderDate = "Reminder cannot be after the due date";
    else if (reminder <= now) errors.reminderDate = "Reminder must be after the current date and time";
  }
  return errors;
}

/** "3 [Days]" — an amount and a unit, the task page's input style. */
function OffsetInput({
  value,
  onChange,
  label,
  invalid,
}: {
  value: TaskOffset;
  onChange: (next: TaskOffset) => void;
  label: string;
  invalid?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={1}
        aria-label={`${label} amount`}
        className={cn(inputClass, "w-20", invalid && "border-red-300")}
        value={value.amount}
        onChange={(e) => onChange({ ...value, amount: Math.max(0, Number(e.target.value) || 0) })}
      />
      <select
        aria-label={`${label} unit`}
        className={cn(selectClass, "w-24")}
        value={value.unit}
        onChange={(e) => onChange({ ...value, unit: e.target.value as TaskOffsetUnit })}
      >
        {TASK_OFFSET_UNITS.map((unit) => (
          <option key={unit.value} value={unit.value}>
            {unit.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function newItemId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Remote records for a related kind — the same lists the task page loads. */
async function loadRelated(kind: TaskRelatedEntityKind | "Contact"): Promise<RelatedTo[]> {
  if (kind === "Company") {
    const rows = await tryCrmCompany(() => listCrmCompanies({ limit: 100 }));
    return (rows ?? []).map((item) => ({ kind: "Company", name: item.company.name, id: item.company.id }));
  }
  if (kind === "Contact") {
    const rows = await tryCrmContact(() => listCrmContacts({ limit: 100 }));
    return (rows ?? []).map((item) => ({ kind: "Contact", name: item.contact.name, id: item.contact.id }));
  }
  if (kind === "Deal") {
    const rows = await tryCrmDeal(() => listCrmDeals({ limit: 100 }));
    return (rows ?? []).map((item) => ({ kind: "Deal", name: item.name, id: item.id }));
  }
  try {
    const rows = await fetchLeadList({ limit: 100 });
    return rows.map((lead) => {
      const card = mapCrmLeadToCard(lead);
      return { kind: "Lead", name: card.name, id: card.id };
    });
  } catch {
    return [];
  }
}

function dedupe(rows: RelatedTo[]): RelatedTo[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.kind}:${(row.id || row.name).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function CreateTaskActionForm({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState<TaskActionFormState>(() => taskActionFormFromConfig(config));
  const [owners, setOwners] = useState<AssignableOwner[]>(() => listAssignableOwnersLocal());
  const [contacts, setContacts] = useState<RelatedTo[]>([]);
  const [related, setRelated] = useState<{ kind: string; rows: RelatedTo[] }>({ kind: "", rows: [] });
  const [newItem, setNewItem] = useState("");
  const [pickingCollaborator, setPickingCollaborator] = useState(false);
  const [collaboratorQuery, setCollaboratorQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const collaboratorRef = useRef<HTMLDivElement>(null);
  // A fixed "now" for previews, so rendering stays pure.
  const [openedAt] = useState(() => Date.now());
  const formRef = useRef(form);

  function commit(next: TaskActionFormState) {
    formRef.current = next;
    setForm(next);
    onChange(taskActionConfigFromForm(next));
  }
  function update<K extends keyof TaskActionFormState>(key: K, value: TaskActionFormState[K]) {
    commit({ ...formRef.current, [key]: value });
  }

  // Owners, as on the task page; a new step defaults to the same owner it would.
  useEffect(() => {
    let cancelled = false;
    void loadAssignableOwners().then((rows) => {
      if (cancelled || !rows.length) return;
      setOwners(rows);
      if (!formRef.current.assignedTo) {
        commit({ ...formRef.current, assignedTo: defaultAssignableOwnerId(rows) });
      }
    });
    void loadRelated("Contact").then((rows) => !cancelled && setContacts(rows));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per opened step
  }, []);

  // A saved step stores ids only; show the records' names again.
  useEffect(() => {
    let cancelled = false;
    const { relatedKind, relatedId, contactId } = formRef.current;
    if (relatedKind && relatedId) {
      void describeRelatedTarget(relatedKind.toUpperCase() as "LEAD", relatedId).then((option) => {
        if (!cancelled && option) setForm((prev) => (formRef.current = { ...prev, relatedName: option.label }));
      });
    }
    if (contactId) {
      void describeRelatedTarget("CONTACT", contactId).then((option) => {
        if (!cancelled && option) setForm((prev) => (formRef.current = { ...prev, contactName: option.label }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const kind = form.relatedKind;
    if (!kind) return;
    let cancelled = false;
    void loadRelated(kind).then((rows) => !cancelled && setRelated({ kind, rows }));
    return () => {
      cancelled = true;
    };
  }, [form.relatedKind]);

  useEffect(() => {
    if (!pickingCollaborator) return;
    function close(event: MouseEvent) {
      if (collaboratorRef.current && !collaboratorRef.current.contains(event.target as Node)) {
        setPickingCollaborator(false);
        setCollaboratorQuery("");
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [pickingCollaborator]);

  const ownerName = (id: string) =>
    owners.find((row) => row.id === id)?.name || resolveAssignableOwnerName(id) || id;
  const contactOptions = dedupe([...contacts, ...liveRelatedRecords("Contact")]);
  const relatedOptions = rankRelatedRecordsByContact(
    dedupe([
      ...(related.kind === form.relatedKind ? related.rows : []),
      ...(form.relatedKind ? liveRelatedRecords(form.relatedKind) : []),
    ]),
    form.contactName,
  );
  const collaboratorChoices = owners
    .filter((owner) => owner.id !== form.assignedTo && !form.collaborators.includes(owner.id))
    .filter((owner) => {
      const q = collaboratorQuery.trim().toLowerCase();
      return !q || owner.name.toLowerCase().includes(q) || owner.email.toLowerCase().includes(q);
    });
  const errors = dateErrors(form);
  const relative = form.dueMode === "relative";
  // What the Repeat control previews against: for a relative task, as if
  // the workflow ran now.
  const previewDue = relative ? new Date(openedAt + offsetMs(form.dueIn)) : parseLocal(form.dueDate);
  const hasDueDate = relative ? !errors.dueDate : Boolean(parseLocal(form.dueDate));
  const doneCount = form.actionItems.filter((item) => item.done).length;

  function addItem() {
    const text = newItem.trim();
    if (!text) return;
    update("actionItems", [...formRef.current.actionItems, { id: newItemId(), text, done: false }]);
    setNewItem("");
  }

  async function upload(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const stored = await uploadTaskFileBlobs(files);
      const added = stored.filter((row) => row.key).map((row) => ({ key: row.key!, name: row.name }));
      if (added.length < files.length) setUploadError("Some files could not be uploaded. Try them again.");
      update("attachments", [...formRef.current.attachments, ...added]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Task info */}
      <div className={cardClass}>
        <div>
          <label className={labelClass}>
            Task Subject<Required />
          </label>
          <input
            className={cn(inputClass, !form.title.trim() && "border-red-300")}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g., Follow up on Q3 Proposal"
          />
        </div>
        <div>
          <label className={labelClass}>
            Task Type<Required />
          </label>
          <select
            className={selectClass}
            value={form.taskType}
            onChange={(e) => update("taskType", e.target.value as TaskType)}
          >
            {TASK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Contact Name</label>
          <RelatedRecordCombobox
            value={form.contactName}
            onChange={(name) =>
              commit({
                ...formRef.current,
                contactName: name,
                contactId: name === formRef.current.contactName ? formRef.current.contactId : "",
              })
            }
            onSelectOption={(option) =>
              commit({ ...formRef.current, contactName: option?.name ?? "", contactId: option?.id ?? "" })
            }
            options={contactOptions}
            placeholder="Search contact…"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Related Entity</label>
            <select
              className={selectClass}
              value={form.relatedKind}
              onChange={(e) =>
                commit({
                  ...formRef.current,
                  relatedKind: e.target.value as TaskRelatedEntityKind | "",
                  relatedName: "",
                  relatedId: "",
                })
              }
            >
              <option value="">None</option>
              {TASK_RELATED_ENTITY_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind === "Company" ? "Organization" : kind}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Related Record</label>
            <RelatedRecordCombobox
              value={form.relatedName}
              onChange={(name) =>
                commit({
                  ...formRef.current,
                  relatedName: name,
                  relatedId: name === formRef.current.relatedName ? formRef.current.relatedId : "",
                })
              }
              onSelectOption={(option) =>
                commit({ ...formRef.current, relatedName: option?.name ?? "", relatedId: option?.id ?? "" })
              }
              options={relatedOptions}
              disabled={!form.relatedKind}
              placeholder={
                form.relatedKind
                  ? `Search ${form.relatedKind === "Company" ? "organization" : form.relatedKind.toLowerCase()}…`
                  : "Select related entity first"
              }
            />
          </div>
        </div>
        {!form.relatedId && !form.contactId && (
          <p className="text-[11px] text-slate-400">
            With no contact or related record, the task is linked to the record that started the workflow.
          </p>
        )}
        <div>
          <label className={labelClass}>Task Description</label>
          <textarea
            className={cn(inputClass, "min-h-20 resize-y")}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Provide detailed context or instructions…"
            rows={3}
          />
        </div>
      </div>

      {/* Action items */}
      <div className={cardClass}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/90">
            <ListChecks className="h-3.5 w-3.5 text-foreground/70" />
            Action Items
          </div>
          <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-foreground/75">
            {doneCount}/{form.actionItems.length} Completed
          </span>
        </div>
        <div className="space-y-1">
          {form.actionItems.length === 0 && (
            <p className="rounded-md border border-dashed border-gray-200 px-2 py-2 text-center text-xs text-gray-400">
              No action items yet. Add your first step below.
            </p>
          )}
          {form.actionItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-md border border-gray-100 px-2 py-1.5">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() =>
                  update(
                    "actionItems",
                    formRef.current.actionItems.map((row) => (row.id === item.id ? { ...row, done: !row.done } : row)),
                  )
                }
                className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-violet-600"
                aria-label={`Mark "${item.text}" complete`}
              />
              <input
                value={item.text}
                onChange={(e) =>
                  update(
                    "actionItems",
                    formRef.current.actionItems.map((row) =>
                      row.id === item.id ? { ...row, text: e.target.value } : row,
                    ),
                  )
                }
                onBlur={() =>
                  update(
                    "actionItems",
                    formRef.current.actionItems.filter((row) => row.id !== item.id || row.text.trim()),
                  )
                }
                className={cn(
                  "min-w-0 flex-1 bg-transparent text-xs focus:outline-none",
                  item.done ? "text-foreground/50 line-through" : "text-foreground/80",
                )}
              />
              <button
                type="button"
                onClick={() =>
                  update(
                    "actionItems",
                    formRef.current.actionItems.filter((row) => row.id !== item.id),
                  )
                }
                className="shrink-0 text-gray-400 hover:text-gray-600"
                aria-label={`Remove "${item.text}"`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-md border border-dashed border-gray-200 px-2 py-1.5 focus-within:border-violet-300">
            <Plus className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onBlur={addItem}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder="Add new action item…"
              className="min-w-0 flex-1 bg-transparent text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Attachments */}
      <div className={cardClass}>
        <label className={labelClass}>Attachments</label>
        {form.attachments.length > 0 && (
          <ul className="space-y-1">
            {form.attachments.map((file) => (
              <li key={file.key} className="flex items-center gap-2 rounded-md border border-gray-100 px-2 py-1 text-xs text-slate-700">
                <Paperclip className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "attachments",
                      formRef.current.attachments.filter((row) => row.key !== file.key),
                    )
                  }
                  className="text-gray-400 hover:text-gray-600"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="origin-top-left [&_*]:text-xs">
          <AttachmentUpload files={[]} onChange={(files) => void upload(files)} />
        </div>
        {uploading && (
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Uploading…
          </p>
        )}
        {uploadError && <p className="text-[11px] text-red-600">{uploadError}</p>}
      </div>

      {/* Owner + collaborators */}
      <div className={cardClass}>
        <div>
          <label className={labelClass}>
            Task Owner<Required />
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {form.assignedTo ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white py-0.5 pl-0.5 pr-2 text-xs text-gray-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                  {initials(ownerName(form.assignedTo))}
                </span>
                {ownerName(form.assignedTo)}
                <button
                  type="button"
                  onClick={() => update("assignedTo", "")}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label={`Remove ${ownerName(form.assignedTo)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <div className="relative w-full">
                <User className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <select
                  className={cn(inputClass, "border-red-300 pl-8")}
                  value=""
                  onChange={(e) => update("assignedTo", e.target.value)}
                >
                  <option value="" disabled>
                    Select an owner
                  </option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {assignableOwnerLabel(owner)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <label className={labelClass}>Collaborators</label>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {form.collaborators.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white py-0.5 pl-0.5 pr-2 text-xs text-gray-700"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-semibold text-violet-700">
                  {initials(ownerName(id))}
                </span>
                {ownerName(id)}
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "collaborators",
                      formRef.current.collaborators.filter((row) => row !== id),
                    )
                  }
                  className="text-gray-400 hover:text-gray-600"
                  aria-label={`Remove collaborator ${ownerName(id)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <div ref={collaboratorRef} className="relative">
              <button
                type="button"
                onClick={() => setPickingCollaborator((open) => !open)}
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed",
                  pickingCollaborator
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-gray-300 text-gray-500 hover:border-violet-300 hover:text-violet-700",
                )}
                aria-label="Add collaborator"
                aria-expanded={pickingCollaborator}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              {pickingCollaborator && (
                <div className="absolute left-0 top-full z-30 mt-1 w-52 rounded-lg border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-100 p-1.5">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                      <input
                        autoFocus
                        value={collaboratorQuery}
                        onChange={(e) => setCollaboratorQuery(e.target.value)}
                        placeholder="Search collaborators…"
                        className="w-full rounded-md border border-gray-200 py-1 pl-6 pr-2 text-xs focus:border-violet-300 focus:outline-none"
                      />
                    </div>
                  </div>
                  <ul className="max-h-40 overflow-y-auto py-1">
                    {collaboratorChoices.length ? (
                      collaboratorChoices.map((owner) => (
                        <li key={owner.id}>
                          <button
                            type="button"
                            onClick={() => {
                              update("collaborators", [...formRef.current.collaborators, owner.id]);
                              setPickingCollaborator(false);
                              setCollaboratorQuery("");
                            }}
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-violet-50"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-semibold text-blue-700">
                              {initials(owner.name)}
                            </span>
                            {assignableOwnerLabel(owner)}
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-2 py-1.5 text-xs text-gray-400">
                        {collaboratorQuery.trim() ? "No collaborators match your search" : "No collaborators available"}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status / scheduling */}
      <div className={cardClass}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>
              Status<Required />
            </label>
            <select
              className={selectClass}
              value={form.status}
              onChange={(e) => update("status", e.target.value as TaskStatus)}
            >
              {TASK_ACTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Priority<Required />
            </label>
            <select
              className={selectClass}
              value={form.priority}
              onChange={(e) => update("priority", e.target.value as Priority)}
            >
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>
            Due Date<Required />
          </label>
          <div role="radiogroup" aria-label="When the task is due" className="mb-1.5 mt-1 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-0.5">
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
                onClick={() =>
                  commit({
                    ...formRef.current,
                    dueMode: mode,
                    // Reminder settings do not carry across: one is an offset, the other a date.
                    reminderOn: false,
                    reminderDate: "",
                  })
                }
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-medium",
                  form.dueMode === mode ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700",
                )}
              >
                {text}
              </button>
            ))}
          </div>
          {relative ? (
            <div className="space-y-1">
              <OffsetInput
                label="Due in"
                value={form.dueIn}
                invalid={Boolean(errors.dueDate)}
                onChange={(dueIn) => update("dueIn", dueIn)}
              />
              <p className="text-[11px] text-slate-400">
                Due this long after the workflow runs, so it works every time the workflow does.
              </p>
            </div>
          ) : (
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="datetime-local"
              min={nowLocal()}
              className={cn(inputClass, "pl-8", errors.dueDate && "border-red-300")}
              value={form.dueDate}
              onChange={(e) => {
                const dueDate = e.target.value;
                const due = parseLocal(dueDate);
                const reminder = parseLocal(formRef.current.reminderDate);
                commit({
                  ...formRef.current,
                  dueDate,
                  // As on the task page: clearing the due date clears what hangs off it.
                  ...(due ? {} : { repeatOn: false, taskRepeat: turnOffReminderRepeat(), reminderOn: false, reminderDate: "" }),
                  ...(due && reminder && reminder > due ? { reminderDate: "" } : {}),
                });
              }}
            />
          </div>
          )}
          {!relative && form.dueDate && (
            <p className="mt-1 text-[11px] text-amber-600">
              The step fails once this date has passed. Use &ldquo;After workflow runs&rdquo; for a workflow that keeps running.
            </p>
          )}
          {errors.dueDate && <p className="mt-1 text-[11px] text-red-600">{errors.dueDate}</p>}
        </div>

        {hasDueDate && (
          <div className="space-y-1">
            <TaskRepeatBlock
              compact
              enabled={form.repeatOn}
              onEnabledChange={(on) =>
                commit({
                  ...formRef.current,
                  repeatOn: on,
                  ...(on ? {} : { taskRepeat: turnOffReminderRepeat() }),
                })
              }
              value={form.taskRepeat}
              onChange={(taskRepeat) => update("taskRepeat", taskRepeat)}
              due={previewDue}
              allowAfterCompletion={false}
            />
            {form.repeatOn && !isStoredRepeat(form.taskRepeat) && (
              <p className="text-[11px] text-amber-600">
                Only daily, weekly, monthly or yearly repeats are saved to the CRM. This one will not repeat.
              </p>
            )}
          </div>
        )}

        {hasDueDate && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <p className="text-[13px] font-medium text-slate-700">Reminder</p>
              <Switch
                size="sm"
                checked={form.reminderOn}
                onCheckedChange={(on) =>
                  commit({ ...formRef.current, reminderOn: on, ...(on ? {} : { reminderDate: "" }) })
                }
                aria-label="Reminder"
              />
            </div>
            {form.reminderOn && relative && (
              <>
                <div className="flex items-center gap-1.5">
                  <OffsetInput
                    label="Remind before"
                    value={form.reminderBefore}
                    invalid={Boolean(errors.reminderDate)}
                    onChange={(reminderBefore) => update("reminderBefore", reminderBefore)}
                  />
                  <span className="text-[11px] text-slate-500">before it&apos;s due</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  The task owner gets an in-app reminder at this time.
                </p>
                {errors.reminderDate && <p className="text-[11px] text-red-600">{errors.reminderDate}</p>}
              </>
            )}
            {form.reminderOn && !relative && (
              <>
                <input
                  type="datetime-local"
                  min={nowLocal()}
                  max={form.dueDate}
                  className={cn(inputClass, errors.reminderDate && "border-red-300")}
                  value={form.reminderDate}
                  onChange={(e) => update("reminderDate", e.target.value)}
                />
                <p className="text-[11px] text-slate-400">
                  The task owner gets an in-app reminder at this time.
                </p>
                {errors.reminderDate && <p className="text-[11px] text-red-600">{errors.reminderDate}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Save stays off until the task page's required fields are filled. */
export function createTaskActionProblems(config: Record<string, unknown>): string[] {
  const form = taskActionFormFromConfig(config);
  const problems: string[] = [];
  if (!form.title.trim()) problems.push("Task Subject is required");
  if (!form.assignedTo) problems.push("Task Owner is required");
  const errors = dateErrors(form);
  if (errors.dueDate) problems.push(errors.dueDate);
  if (errors.reminderDate) problems.push(errors.reminderDate);
  return problems;
}
