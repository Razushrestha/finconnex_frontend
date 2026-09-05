"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Hash,
  Link2,
  ListChecks,
  Phone,
  Plus,
  User,
  Users,
  X,
} from "lucide-react";
import { CALL_PURPOSES } from "@/lib/calls/types";
import { createCall, formatCallDate } from "@/lib/calls/store";
import {
  RELATED_ENTITY_KINDS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import { liveRelatedRecords } from "@/lib/activities/related-records";
import RelatedRecordCombobox from "@/components/activities/tasks/RelatedRecordComboBox";
import {
  formatTaskTimestamp,
  notifyToMethod,
  type ReminderNotifyOption,
  type TaskActionItem,
} from "@/lib/tasks/types";
import {
  ReminderSettingsCard,
  TaskRepeatBlock,
  turnOffReminderRepeat,
} from "@/components/activities/tasks/ReminderSettingsCard";
import { TaskAuditCard } from "@/components/activities/tasks/TaskAuditCard";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import AttachmentUpload from "@/components/activities/tasks/AttachmentUpload";
import { getUploadAdapter } from "@/lib/attachments/upload";
import type { CallAttachment } from "@/lib/calls/types";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";
import { cn } from "@/lib/utils";
import { getRulesActor } from "@/lib/rules/actor";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  listAssignableOwnersLocal,
  loadAssignableOwners,
  type AssignableOwner,
} from "@/lib/users/assignable";
import {
  assignedCallerIds,
  defaultCallerId,
} from "@/lib/softphone/assigned-numbers";
import { type NotificationMethod } from "@/lib/reminders/types";
import {
  defaultReminderRepeatRule,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";
import { buildRemindersFromSchedule } from "@/lib/tasks/reminder-series";

interface ScheduleCallFormProps {
  layoutId: string;
  redirect: boolean;
  defaults?: {
    relatedKind?: RelatedEntityKind;
    relatedName?: string;
    contact?: string;
  };
}

interface FormState {
  callFor: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  fromNumber: string;
  startTime: string;
  assignedTo: string;
  subject: string;
  reminderDate: string;
  purpose: string;
  agenda: string;
  notes: string;
  actionItems: TaskActionItem[];
  attachments: File[];
  notifyBy: NotificationMethod[];
  taskRepeat: ReminderRepeatRule;
  reminderRepeat: ReminderRepeatRule;
}

const initialState: FormState = {
  callFor: "",
  relatedKind: "",
  relatedName: "",
  fromNumber: defaultCallerId("John Smith"),
  startTime: "",
  assignedTo: defaultAssignableOwnerId(listAssignableOwnersLocal()),
  subject: "",
  reminderDate: "",
  purpose: "Follow-up",
  agenda: "",
  notes: "",
  actionItems: [],
  attachments: [],
  notifyBy: ["Email"],
  taskRepeat: defaultReminderRepeatRule,
  reminderRepeat: defaultReminderRepeatRule,
};

function contactOptions(extraName?: string) {
  return liveRelatedRecords(
    "Contact",
    extraName?.trim()
      ? { kind: "Contact", name: extraName.trim() }
      : undefined,
  ).map((record) => ({ kind: "Contact" as const, name: record.name }));
}

function parseDatetimeLocal(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfMinute(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  return next;
}

function toStoredDate(value: string): string {
  const parsed = parseDatetimeLocal(value);
  if (!parsed) return value;
  return formatCallDate(parsed);
}

function reminderNotifyFromMethods(
  methods: NotificationMethod[],
): ReminderNotifyOption {
  const hasEmail = methods.includes("Email");
  const hasPopup =
    methods.includes("In-app") ||
    methods.includes("Web Push") ||
    methods.includes("SMS");
  if (hasEmail && hasPopup) return "Both";
  if (hasEmail) return "Email";
  return "Pop Up";
}

function remindersFromForm(
  reminderDate: string,
  notifyBy: NotificationMethod[],
  rule: ReminderRepeatRule,
  startTime: string,
) {
  const parsed = parseDatetimeLocal(reminderDate);
  if (!parsed) return undefined;
  const notify = reminderNotifyFromMethods(notifyBy);
  return buildRemindersFromSchedule({
    first: parsed,
    due: parseDatetimeLocal(startTime),
    rule,
    notify,
    notificationMethod: notifyToMethod(notify),
    type: "Follow-up",
  });
}

function validateCallDates(
  startTime: string,
  reminderDate: string,
): Partial<Record<"startTime" | "reminderDate", string>> {
  const errors: Partial<Record<"startTime" | "reminderDate", string>> = {};
  const now = startOfMinute(new Date());
  const due = parseDatetimeLocal(startTime);

  if (startTime.trim()) {
    if (!due) {
      errors.startTime = "Enter a valid start time";
    } else if (due.getTime() < now.getTime()) {
      errors.startTime = "Start time cannot be before now";
    }
  }

  if (reminderDate.trim()) {
    const reminder = parseDatetimeLocal(reminderDate);
    if (!reminder) {
      errors.reminderDate = "Enter a valid reminder date and time";
    } else if (due && reminder.getTime() > due.getTime()) {
      errors.reminderDate = "Reminder cannot be after the call start time";
    } else if (reminder.getTime() <= now.getTime()) {
      errors.reminderDate = "Reminder must be after the current date and time";
    }
  }

  return errors;
}

function newActionItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ScheduleCallForm({
  layoutId,
  redirect,
  defaults,
}: ScheduleCallFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    ...initialState,
    relatedKind: defaults?.relatedKind ?? "",
    relatedName: defaults?.relatedName ?? "",
    callFor: defaults?.contact ?? "",
    fromNumber: defaultCallerId("John Smith"),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);
  const [repeatOn, setRepeatOn] = useState(false);
  const [reminderOn, setReminderOn] = useState(false);
  const [newActionItem, setNewActionItem] = useState("");
  const newActionItemRef = useRef<HTMLInputElement>(null);
  const [ownerOptions, setOwnerOptions] = useState<AssignableOwner[]>(() =>
    listAssignableOwnersLocal(),
  );

  useEffect(() => {
    let cancelled = false;
    void loadAssignableOwners().then((rows) => {
      if (cancelled || !rows.length) return;
      setOwnerOptions(rows);
      setForm((prev) => {
        const assignedTo = defaultAssignableOwnerId(rows, prev.assignedTo);
        const owner = rows.find((row) => row.id === assignedTo);
        const numbers = assignedCallerIds(owner?.name ?? assignedTo);
        return {
          ...prev,
          assignedTo,
          fromNumber: numbers.includes(prev.fromNumber)
            ? prev.fromNumber
            : (numbers[0] ?? prev.fromNumber),
        };
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOwnerChange(ownerId: string) {
    const owner = ownerOptions.find((row) => row.id === ownerId);
    const numbers = assignedCallerIds(owner?.name ?? ownerId);
    setForm((prev) => ({
      ...prev,
      assignedTo: ownerId,
      fromNumber: numbers.includes(prev.fromNumber)
        ? prev.fromNumber
        : (numbers[0] ?? ""),
    }));
  }

  function syncDateErrors(nextStart: string, nextReminder: string) {
    const dateErrors = validateCallDates(nextStart, nextReminder);
    setErrors((prev) => {
      const next = { ...prev };
      if (dateErrors.startTime) next.startTime = dateErrors.startTime;
      else if (nextStart.trim()) delete next.startTime;
      if (dateErrors.reminderDate) next.reminderDate = dateErrors.reminderDate;
      else delete next.reminderDate;
      return next;
    });
  }

  function handleStartTimeChange(value: string) {
    let nextReminder = form.reminderDate;
    if (!value.trim()) {
      nextReminder = "";
      setReminderOn(false);
      setRepeatOn(false);
    } else {
      const due = parseDatetimeLocal(value);
      const reminder = parseDatetimeLocal(nextReminder);
      if (due && reminder && reminder.getTime() > due.getTime()) {
        nextReminder = "";
      }
    }
    setForm((prev) => ({
      ...prev,
      startTime: value,
      reminderDate: nextReminder,
      reminderRepeat:
        nextReminder.trim() || prev.reminderRepeat.preset !== "afterCompletion"
          ? prev.reminderRepeat
          : defaultReminderRepeatRule,
      taskRepeat: value.trim() ? prev.taskRepeat : defaultReminderRepeatRule,
    }));
    syncDateErrors(value, nextReminder);
  }

  function handleReminderDateChange(value: string) {
    setForm((prev) => ({
      ...prev,
      reminderDate: value,
      reminderRepeat:
        value.trim() || prev.reminderRepeat.preset !== "afterCompletion"
          ? prev.reminderRepeat
          : defaultReminderRepeatRule,
    }));
    syncDateErrors(form.startTime, value);
  }

  function toggleNotifyBy(method: NotificationMethod) {
    setForm((prev) => {
      const selected = prev.notifyBy.includes(method);
      return {
        ...prev,
        notifyBy: selected
          ? prev.notifyBy.filter((item) => item !== method)
          : [...prev.notifyBy, method],
      };
    });
  }

  const ownerLabel =
    ownerOptions.find((row) => row.id === form.assignedTo)?.name ??
    form.assignedTo;
  const ownerNumbers = assignedCallerIds(ownerLabel);
  const minStart = toDatetimeLocalValue(startOfMinute(new Date()));
  const hasStartTime = Boolean(form.startTime.trim());
  const actor = getRulesActor().name || ownerLabel || "Admin";
  const auditPreviewOn = formatTaskTimestamp(new Date());
  const callToOptions = contactOptions(form.callFor);

  const relatedOptions = liveRelatedRecords(
    form.relatedKind,
    form.relatedKind && form.relatedName
      ? { kind: form.relatedKind as RelatedEntityKind, name: form.relatedName }
      : undefined,
  );

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {
      ...validateCallDates(form.startTime, form.reminderDate),
    };
    if (!form.callFor.trim()) next.callFor = "Contact is required";
    if (!form.startTime) next.startTime = "Call start time is required";
    if (!form.assignedTo.trim()) next.assignedTo = "Call owner is required";
    if (!form.subject.trim()) next.subject = "Subject is required";
    if (ownerNumbers.length && !form.fromNumber.trim()) {
      next.fromNumber = "From number is required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function addActionItem(options?: { focusAfter?: boolean }) {
    const text = newActionItem.trim();
    if (!text) {
      if (options?.focusAfter) newActionItemRef.current?.focus();
      return;
    }
    setForm((prev) => ({
      ...prev,
      actionItems: [
        ...prev.actionItems,
        { id: newActionItemId(), text, done: false },
      ],
    }));
    setNewActionItem("");
    if (options?.focusAfter) {
      requestAnimationFrame(() => newActionItemRef.current?.focus());
    }
  }

  function toggleActionItem(id: string) {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    }));
  }

  function updateActionItemText(id: string, text: string) {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((item) =>
        item.id === id ? { ...item, text } : item,
      ),
    }));
  }

  function finalizeActionItemText(id: string) {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.filter(
        (item) => item.id !== id || item.text.trim().length > 0,
      ),
    }));
  }

  function removeActionItem(id: string) {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.filter((item) => item.id !== id),
    }));
  }

  const completedCount = form.actionItems.filter((item) => item.done).length;

  async function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;

    const relatedMatch =
      form.relatedKind && form.relatedName
        ? liveRelatedRecords(form.relatedKind as RelatedEntityKind).find(
            (item) => item.name === form.relatedName,
          )
        : undefined;
    const contactMatch = liveRelatedRecords("Contact").find(
      (item) => item.name === form.callFor.trim(),
    );
    const relatedTo =
      form.relatedKind && form.relatedName
        ? `${form.relatedKind}: ${form.relatedName}`
        : undefined;
    const createdOn = formatTaskTimestamp(new Date());

    const uploaded: CallAttachment[] = [];
    if (form.attachments.length > 0) {
      const adapter = getUploadAdapter();
      for (const file of form.attachments) {
        const result = await adapter.upload({
          fileName: file.name,
          data: await file.arrayBuffer(),
          contentType: file.type || "application/octet-stream",
          relatedTo: form.subject.trim() || "Call",
        });
        if (!result.ok) {
          window.alert(`Failed to upload "${file.name}": ${result.message}`);
          return;
        }
        uploaded.push({
          name: result.fileName,
          sizeLabel: result.sizeLabel,
          storageUrl: result.storageUrl,
          contentType: result.contentType,
        });
      }
    }

    const created = createCall({
      subject: form.subject.trim(),
      relatedTo,
      contact: form.callFor.trim() || undefined,
      callFor: form.callFor.trim() || undefined,
      fromNumber: form.fromNumber.trim() || undefined,
      callType: "Outbound",
      status: "Scheduled",
      date: toStoredDate(form.startTime),
      assignedTo: form.assignedTo.trim(),
      relatedType: form.relatedKind || undefined,
      relatedId:
        relatedMatch?.id && isUuid(relatedMatch.id) ? relatedMatch.id : undefined,
      contactId:
        contactMatch?.id && isUuid(contactMatch.id) ? contactMatch.id : undefined,
      agenda: form.agenda.trim() || undefined,
      purpose: form.purpose.trim() || undefined,
      notes: form.notes.trim() || form.agenda.trim() || undefined,
      reminders:
        reminderOn && form.reminderDate.trim()
          ? remindersFromForm(
              form.reminderDate,
              form.notifyBy,
              form.reminderRepeat,
              form.startTime,
            )
          : undefined,
      reminderDate:
        reminderOn && form.reminderDate.trim()
          ? toStoredDate(form.reminderDate)
          : undefined,
      reminderRepeat:
        reminderOn && form.reminderDate.trim()
          ? form.reminderRepeat
          : undefined,
      repeatRule:
        repeatOn && form.taskRepeat.preset !== "none"
          ? form.taskRepeat
          : undefined,
      actionItems: form.actionItems.length ? form.actionItems : undefined,
      nextSteps: form.actionItems.map((item) => ({
        id: item.id,
        title: item.text,
        dueDate: toStoredDate(form.startTime),
        completed: item.done,
      })),
      createdBy: actor,
      createdOn,
      attachments: uploaded.length ? uploaded : undefined,
    });

    if (createAnother) {
      setForm({
        ...initialState,
        assignedTo: form.assignedTo,
        fromNumber: defaultCallerId(form.assignedTo),
        relatedKind: form.relatedKind,
        relatedName: form.relatedName,
      });
      setErrors({});
      setSubmitted(false);
      setNewActionItem("");
      setRepeatOn(false);
      setReminderOn(false);
      return;
    }

    void layoutId;
    void redirect;
    router.push(`/activities/calls?focus=${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Calls", href: "/activities/calls" }}
      badge="Schedule call"
      title="Schedule a Call"
      subtitle="Set who you are calling, when it happens, and what to cover."
      tip="Tip: Contact, start time, owner and subject are required."
      cardIcon={Phone}
      cardTitle="Call Information"
      cardDescription="Schedule an outbound call"
      listHref="/activities/calls"
      saveLabel="Schedule Call"
      onSave={handleSave}
    >
      <div className="col-span-full grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
            <Field
              label="Subject"
              required
              error={submitted ? errors.subject : undefined}
              className="sm:col-span-2"
            >
              <InputShell icon={Phone} error={!!(submitted && errors.subject)}>
                <input
                  className={elevatedInputClass(true)}
                  value={form.subject}
                  onChange={(e) => update("subject", e.target.value)}
                  placeholder="e.g. Follow-up call: Anderson Finance"
                />
              </InputShell>
            </Field>

            <Field
              label="Call To"
              required
              error={submitted ? errors.callFor : undefined}
            >
              <RelatedRecordCombobox
                value={form.callFor}
                onChange={(v) => update("callFor", v)}
                options={callToOptions}
                placeholder="Select contact…"
              />
            </Field>

            <Field
              label="From Number"
              required={ownerNumbers.length > 0}
              error={submitted ? errors.fromNumber : undefined}
            >
              {ownerNumbers.length > 1 ? (
                <InputShell icon={Hash}>
                  <select
                    className={elevatedSelectClass(true)}
                    value={form.fromNumber}
                    onChange={(e) => update("fromNumber", e.target.value)}
                  >
                    {ownerNumbers.map((number) => (
                      <option key={number} value={number}>
                        {number}
                      </option>
                    ))}
                  </select>
                </InputShell>
              ) : (
                <InputShell icon={Hash}>
                  <input
                    readOnly
                    className={elevatedInputClass(true)}
                    value={form.fromNumber || "No number assigned"}
                  />
                </InputShell>
              )}
            </Field>

            <Field label="Related Entity">
              <InputShell icon={Link2}>
                <select
                  className={elevatedSelectClass(true)}
                  value={form.relatedKind}
                  onChange={(e) => {
                    update("relatedKind", e.target.value as RelatedEntityKind | "");
                    update("relatedName", "");
                  }}
                >
                  <option value="">None</option>
                  {RELATED_ENTITY_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </InputShell>
            </Field>

            <Field label="Related To">
              <RelatedRecordCombobox
                value={form.relatedName}
                onChange={(v) => update("relatedName", v)}
                options={relatedOptions}
                disabled={!form.relatedKind}
                placeholder="Select record…"
              />
            </Field>

            <Field label="Purpose of outgoing call">
              <InputShell icon={User}>
                <select
                  className={elevatedSelectClass(true)}
                  value={form.purpose}
                  onChange={(e) => update("purpose", e.target.value)}
                >
                  <option value="">Select purpose</option>
                  {CALL_PURPOSES.map((purpose) => (
                    <option key={purpose} value={purpose}>
                      {purpose}
                    </option>
                  ))}
                </select>
              </InputShell>
            </Field>

            <Field label="Call agenda" className="sm:col-span-2">
              <TextAreaShell>
                <textarea
                  className={elevatedTextareaClass}
                  value={form.agenda}
                  onChange={(e) => update("agenda", e.target.value)}
                  placeholder="What should be covered on this call?"
                />
              </TextAreaShell>
            </Field>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <ListChecks className="h-4 w-4 text-slate-500" />
                Action Items
              </div>
              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
                {completedCount}/{form.actionItems.length} Completed
              </span>
            </div>

            {form.actionItems.length > 0 ? (
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-600 transition-all duration-300"
                  style={{
                    width: `${
                      form.actionItems.length
                        ? (completedCount / form.actionItems.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              {form.actionItems.length === 0 ? (
                <p className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-400">
                  No action items yet. Add your first step below.
                </p>
              ) : (
                form.actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2.5 rounded-md border border-gray-100 bg-white px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleActionItem(item.id)}
                      className="h-4 w-4 shrink-0 rounded border-gray-300 text-violet-600 focus:ring-violet-400"
                      aria-label={`Mark "${item.text}" complete`}
                    />
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) =>
                        updateActionItemText(item.id, e.target.value)
                      }
                      onBlur={() => finalizeActionItemText(item.id)}
                      className={cn(
                        "min-w-0 flex-1 bg-transparent text-sm focus:outline-none",
                        item.done
                          ? "text-foreground/50 line-through"
                          : "text-foreground/80",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => removeActionItem(item.id)}
                      className="shrink-0 text-gray-400 hover:text-gray-600 md:opacity-0 md:group-hover:opacity-100"
                      aria-label={`Remove "${item.text}"`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}

              <div className="flex items-center gap-2.5 rounded-md border border-dashed border-gray-200 px-3 py-2 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
                <Plus className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  ref={newActionItemRef}
                  value={newActionItem}
                  onChange={(e) => setNewActionItem(e.target.value)}
                  onBlur={() => addActionItem()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addActionItem({ focusAfter: true });
                    }
                  }}
                  placeholder="Add new action item…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => addActionItem({ focusAfter: true })}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:text-violet-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          <Field label="Internal notes" className="col-span-full">
            <MentionNotesTextarea
              value={form.notes}
              onChange={(notes) => update("notes", notes)}
              placeholder="Internal notes… Type @ to assign someone."
            />
          </Field>

          <Field label="Attachments" className="col-span-full">
            <AttachmentUpload
              files={form.attachments}
              onChange={(files) => update("attachments", files)}
            />
          </Field>
        </div>

        <div className="space-y-6">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Field
              label="Call Start Time"
              required
              error={
                submitted || form.startTime ? errors.startTime : undefined
              }
            >
              <InputShell
                icon={Calendar}
                error={!!((submitted || form.startTime) && errors.startTime)}
              >
                <input
                  type="datetime-local"
                  min={minStart}
                  className={elevatedInputClass(true)}
                  value={form.startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                />
              </InputShell>
            </Field>

            {hasStartTime ? (
              <TaskRepeatBlock
                enabled={repeatOn}
                onEnabledChange={(on) => {
                  setRepeatOn(on);
                  if (!on) update("taskRepeat", turnOffReminderRepeat());
                }}
                value={form.taskRepeat}
                onChange={(taskRepeat) => update("taskRepeat", taskRepeat)}
                due={parseDatetimeLocal(form.startTime)}
                subtitle="Repeat this call on a schedule"
                fieldDescription="How often this call repeats."
              />
            ) : null}

            {hasStartTime ? (
              <ReminderSettingsCard
                enabled={reminderOn}
                onEnabledChange={(on) => {
                  setReminderOn(on);
                  if (!on) {
                    handleReminderDateChange("");
                    update("reminderRepeat", turnOffReminderRepeat());
                  }
                }}
                reminderDate={form.reminderDate}
                onReminderDateChange={handleReminderDateChange}
                min={minStart}
                max={form.startTime}
                error={
                  submitted || form.reminderDate
                    ? errors.reminderDate
                    : undefined
                }
                helper="Choose a time after now and no later than the start time."
                notifyBy={form.notifyBy}
                onToggleNotify={toggleNotifyBy}
                repeat={form.reminderRepeat}
                onRepeatChange={(reminderRepeat) =>
                  update("reminderRepeat", reminderRepeat)
                }
                due={parseDatetimeLocal(form.startTime)}
                anchorLabel="start time"
              />
            ) : null}

            <Field
              label="Call Owner"
              required
              error={submitted ? errors.assignedTo : undefined}
            >
              <InputShell icon={Users} error={!!(submitted && errors.assignedTo)}>
                <select
                  className={elevatedSelectClass(true)}
                  value={form.assignedTo}
                  onChange={(e) => handleOwnerChange(e.target.value)}
                >
                  {ownerOptions.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {assignableOwnerLabel(owner)}
                    </option>
                  ))}
                </select>
              </InputShell>
            </Field>
          </div>

          <TaskAuditCard
            createdBy={actor}
            createdOn={auditPreviewOn}
            modifiedBy={actor}
            modifiedOn={auditPreviewOn}
          />
        </div>
      </div>
    </CreateEntityFormShell>
  );
}
