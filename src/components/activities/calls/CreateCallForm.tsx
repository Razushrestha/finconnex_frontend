"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, X } from "lucide-react";
import { CALL_OWNERS, CALL_PURPOSES } from "@/lib/calls/types";
import { createCall } from "@/lib/calls/store";
import { getRulesActor } from "@/lib/rules/actor";
import {
  RELATED_ENTITY_KINDS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import { liveRelatedRecords } from "@/lib/activities/related-records";
import RelatedRecordCombobox from "@/components/activities/tasks/RelatedRecordComboBox";
import { ScheduleCallForm } from "@/components/activities/calls/ScheduleCallForm";
import {
  assignedCallerIds,
  defaultCallerId,
} from "@/lib/softphone/assigned-numbers";

interface CreateCallFormProps {
  layoutId: string;
  redirect: boolean;
  mode?: "schedule" | "log";
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
  duration: string;
  assignedTo: string;
  subject: string;
  agenda: string;
  purpose: string;
}

function contactOptions(extraName?: string) {
  return liveRelatedRecords(
    "Contact",
    extraName?.trim()
      ? { kind: "Contact", name: extraName.trim() }
      : undefined,
  ).map((record) => ({ kind: "Contact" as const, name: record.name }));
}

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90 placeholder:text-foreground/50 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100";
const selectClass = inputClass + " appearance-none";
const labelClass =
  "text-[11px] font-medium uppercase tracking-wide text-gray-500";

const initialState: FormState = {
  callFor: "",
  relatedKind: "",
  relatedName: "",
  fromNumber: defaultCallerId("John Smith"),
  startTime: "",
  duration: "",
  assignedTo: "John Smith",
  subject: "",
  agenda: "",
  purpose: "",
};

export function CreateCallForm(props: CreateCallFormProps) {
  if (props.mode !== "log") {
    return <ScheduleCallForm {...props} />;
  }
  return <LogCallForm {...props} />;
}

function LogCallForm({
  layoutId,
  redirect,
  defaults,
}: CreateCallFormProps) {
  const isLog = true;
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    ...initialState,
    relatedKind: defaults?.relatedKind ?? "",
    relatedName: defaults?.relatedName ?? "",
    callFor: defaults?.contact ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const relatedOptions = liveRelatedRecords(
    form.relatedKind,
    form.relatedKind && form.relatedName
      ? { kind: form.relatedKind as RelatedEntityKind, name: form.relatedName }
      : undefined,
  );

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.callFor.trim()) next.callFor = "Contact is required";
    if (!form.startTime) next.startTime = "Call start time is required";
    if (!form.assignedTo.trim()) next.assignedTo = "Call owner is required";
    if (!form.subject.trim()) next.subject = "Subject is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    setSubmitted(true);
    if (!validate()) return;
    const relatedTo =
      form.relatedKind && form.relatedName
        ? `${form.relatedKind}: ${form.relatedName}`
        : undefined;
    const created = createCall({
      subject: form.subject.trim(),
      relatedTo,
      contact: form.callFor.trim() || undefined,
      callFor: form.callFor.trim() || undefined,
      fromNumber: form.fromNumber.trim() || undefined,
      callType: "Outbound",
      status: isLog ? "Completed" : "Scheduled",
      date: form.startTime,
      duration: isLog ? form.duration.trim() || undefined : undefined,
      assignedTo: form.assignedTo.trim(),
      calledBy: getRulesActor().name || form.assignedTo.trim(),
      agenda: form.agenda.trim() || undefined,
      purpose: form.purpose.trim() || undefined,
      notes: [form.agenda.trim(), form.purpose.trim()]
        .filter(Boolean)
        .join("\n\n") || undefined,
    });
    void layoutId;
    void redirect;
    router.push(`/activities/calls?focus=${created.id}`);
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2">
        <h1 className="text-base font-semibold text-foreground">
          {isLog ? "Log a Call" : "Schedule a Call"}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/activities/calls")}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            <Phone className="h-4 w-4" />
            {isLog ? "Log Call" : "Schedule Call"}
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-3 sm:px-6 2xl:px-8">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
            Calls
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Call To <span className="text-red-500">*</span>
              </label>
              <RelatedRecordCombobox
                value={form.callFor}
                onChange={(v) => update("callFor", v)}
                options={contactOptions(form.callFor)}
                placeholder="Select contact…"
              />
              {submitted && errors.callFor ? (
                <p className="mt-1 text-xs text-red-500">{errors.callFor}</p>
              ) : null}
            </div>

            <div>
              <label className={labelClass}>Related To</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className={selectClass}
                  value={form.relatedKind}
                  onChange={(e) => {
                    update(
                      "relatedKind",
                      e.target.value as RelatedEntityKind | "",
                    );
                    update("relatedName", "");
                  }}
                >
                  <option value="">Type</option>
                  {RELATED_ENTITY_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <RelatedRecordCombobox
                  value={form.relatedName}
                  onChange={(v) => update("relatedName", v)}
                  options={relatedOptions}
                  disabled={!form.relatedKind}
                  placeholder="Select record…"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>From Number</label>
              {assignedCallerIds(form.assignedTo).length > 1 ? (
                <select
                  className={selectClass}
                  value={form.fromNumber}
                  onChange={(e) => update("fromNumber", e.target.value)}
                >
                  {assignedCallerIds(form.assignedTo).map((number) => (
                    <option key={number} value={number}>
                      {number}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  readOnly
                  className={inputClass}
                  value={form.fromNumber || "No number assigned"}
                />
              )}
            </div>

            <div>
              <label className={labelClass}>
                {isLog ? "Call Time" : "Call Start Time"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className={
                  inputClass +
                  (submitted && errors.startTime ? " border-red-300" : "")
                }
                value={form.startTime}
                onChange={(e) => update("startTime", e.target.value)}
              />
              {submitted && errors.startTime ? (
                <p className="mt-1 text-xs text-red-500">{errors.startTime}</p>
              ) : null}
            </div>

            {isLog ? (
              <div>
                <label className={labelClass}>Duration</label>
                <input
                  className={inputClass}
                  value={form.duration}
                  onChange={(e) => update("duration", e.target.value)}
                  placeholder="e.g. 12 min"
                />
              </div>
            ) : null}

            <div>
              <label className={labelClass}>
                Call Owner <span className="text-red-500">*</span>
              </label>
              <select
                className={
                  selectClass +
                  (submitted && errors.assignedTo ? " border-red-300" : "")
                }
                value={form.assignedTo}
                onChange={(e) => {
                  const owner = e.target.value;
                  const numbers = assignedCallerIds(owner);
                  setForm((prev) => ({
                    ...prev,
                    assignedTo: owner,
                    fromNumber: numbers.includes(prev.fromNumber)
                      ? prev.fromNumber
                      : (numbers[0] ?? ""),
                  }));
                }}
              >
                {CALL_OWNERS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              {submitted && errors.assignedTo ? (
                <p className="mt-1 text-xs text-red-500">{errors.assignedTo}</p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                className={
                  inputClass +
                  (submitted && errors.subject ? " border-red-300" : "")
                }
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                placeholder="e.g. Discovery call: Anderson Finance"
              />
              {submitted && errors.subject ? (
                <p className="mt-1 text-xs text-red-500">{errors.subject}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
            {isLog ? "Notes" : "Reminder"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Agenda</label>
              <textarea
                rows={3}
                className={inputClass + " resize-none"}
                value={form.agenda}
                onChange={(e) => update("agenda", e.target.value)}
                placeholder={
                  isLog
                    ? "What was discussed on this call?"
                    : "What should be covered on this call?"
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Purpose of outgoing call</label>
              <select
                className={selectClass}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
