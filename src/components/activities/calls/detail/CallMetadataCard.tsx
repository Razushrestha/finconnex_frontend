"use client";

import { useState } from "react";
import { Clock, Phone, User } from "lucide-react";
import {
  CALL_OWNERS,
  CALL_PURPOSES,
  CALL_STAGES,
  CALL_TYPES,
  type Call,
  type CallStatus,
  type CallType,
} from "@/lib/calls/types";
import { isCallOverdue } from "@/lib/calls/store";
import { assignedCallerIds } from "@/lib/softphone/assigned-numbers";
import { avatarColor, initials } from "@/lib/activities/shared";
import { RelatedToLink } from "@/components/activities/RelatedToLink";
import { useTaskSectionEdit } from "@/components/activities/tasks/detail/TaskEditContext";
import { cn } from "@/lib/utils";

const TYPE_TONE: Record<CallType, string> = {
  Outbound: "bg-violet-50 text-violet-700",
  Inbound: "bg-sky-50 text-sky-700",
  Missed: "bg-rose-50 text-rose-700",
  Voicemail: "bg-amber-50 text-amber-800",
};

interface CallMetadataCardProps {
  call: Call;
  onStatusChange: (status: CallStatus) => void;
  onSaveDetails: (next: {
    subject: string;
    date: string;
    fromNumber: string;
    callType: CallType;
    purpose: string;
    assignedTo: string;
  }) => void;
}

function toDateInput(value: string): string {
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return "";
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function toTimeInput(value: string): string {
  const m = value.trim().match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);
  if (!m) return "09:00";
  let hours = Number(m[1]);
  const minutes = m[2];
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && hours < 12) hours += 12;
  if (ap === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function fromDateTime(date: string, time: string, fallback: string): string {
  const d = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!d) return fallback;
  const t = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!t) return `${d[3]}/${d[2]}/${d[1]}`;
  let hours = Number(t[1]);
  const minutes = t[2];
  const ap = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 || 12;
  return `${d[3]}/${d[2]}/${d[1]} ${display}:${minutes} ${ap}`;
}

export function CallMetadataCard({
  call,
  onStatusChange,
  onSaveDetails,
}: CallMetadataCardProps) {
  const [subject, setSubject] = useState(call.subject);
  const [date, setDate] = useState(toDateInput(call.date));
  const [time, setTime] = useState(toTimeInput(call.date));
  const [fromNumber, setFromNumber] = useState(call.fromNumber ?? "");
  const [callType, setCallType] = useState<CallType>(call.callType);
  const [purpose, setPurpose] = useState(call.purpose ?? "");
  const [assignedTo, setAssignedTo] = useState(call.assignedTo);
  const purposeChoices =
    purpose &&
    !(CALL_PURPOSES as readonly string[]).includes(purpose)
      ? [purpose, ...CALL_PURPOSES]
      : [...CALL_PURPOSES];
  const overdue = isCallOverdue(call);
  const numbers = assignedCallerIds(assignedTo);

  const editing = useTaskSectionEdit({
    start() {
      setSubject(call.subject);
      setDate(toDateInput(call.date));
      setTime(toTimeInput(call.date));
      setFromNumber(call.fromNumber ?? "");
      setCallType(call.callType);
      setPurpose(call.purpose ?? "");
      setAssignedTo(call.assignedTo);
    },
    save() {
      onSaveDetails({
        subject: subject.trim() || call.subject,
        date: fromDateTime(date, time, call.date),
        fromNumber,
        callType,
        purpose: purpose.trim(),
        assignedTo,
      });
    },
    cancel() {
      setSubject(call.subject);
      setDate(toDateInput(call.date));
      setTime(toTimeInput(call.date));
      setFromNumber(call.fromNumber ?? "");
      setCallType(call.callType);
      setPurpose(call.purpose ?? "");
      setAssignedTo(call.assignedTo);
    },
  });

  return (
    <section className="border-b border-slate-100 py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border-b border-slate-200 bg-transparent text-2xl font-semibold tracking-tight text-slate-900 outline-none focus:border-violet-400"
            />
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {call.subject}
            </h1>
          )}
          {call.relatedTo ? (
            <p className="mt-1.5 text-sm text-slate-500">
              Related:{" "}
              <RelatedToLink
                relatedTo={call.relatedTo}
                className="font-medium text-slate-800"
              />
            </p>
          ) : null}
        </div>
        {editing ? (
          <select
            value={callType}
            onChange={(e) => setCallType(e.target.value as CallType)}
            className={cn(
              "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold outline-none",
              TYPE_TONE[callType],
            )}
          >
            {CALL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type} call
              </option>
            ))}
          </select>
        ) : (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              TYPE_TONE[call.callType],
            )}
          >
            <Phone className="h-3 w-3" />
            {call.callType} call
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            When
          </p>
          {editing ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-b border-slate-200 bg-transparent py-0.5 text-sm font-medium text-slate-800 outline-none focus:border-violet-400"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="border-b border-slate-200 bg-transparent py-0.5 text-sm font-medium text-slate-800 outline-none focus:border-violet-400"
              />
            </div>
          ) : (
            <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <Clock
                className={`h-3.5 w-3.5 ${overdue ? "text-rose-500" : "text-slate-400"}`}
              />
              <span className={overdue ? "text-rose-600" : undefined}>
                {call.date}
              </span>
              {overdue ? (
                <span className="font-semibold text-rose-500">Overdue</span>
              ) : null}
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Assigned To
          </p>
          {editing ? (
            <select
              value={assignedTo}
              onChange={(e) => {
                const owner = e.target.value;
                const nextNumbers = assignedCallerIds(owner);
                setAssignedTo(owner);
                setFromNumber((current) =>
                  nextNumbers.includes(current)
                    ? current
                    : (nextNumbers[0] ?? ""),
                );
              }}
              className="mt-1.5 bg-transparent py-0.5 text-sm font-medium text-slate-800 outline-none"
            >
              {CALL_OWNERS.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                  avatarColor(call.assignedTo),
                )}
              >
                {initials(call.assignedTo)}
              </span>
              <span className="text-sm font-medium text-slate-800">
                {call.assignedTo}
              </span>
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Status
          </p>
          <select
            value={call.status}
            onChange={(e) => onStatusChange(e.target.value as CallStatus)}
            className="mt-1.5 bg-transparent py-0.5 text-sm font-medium text-slate-800 outline-none"
          >
            {(CALL_STAGES.includes(call.status as (typeof CALL_STAGES)[number])
              ? CALL_STAGES
              : [call.status, ...CALL_STAGES]
            ).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            From number
          </p>
          {editing ? (
            numbers.length > 1 ? (
              <select
                value={fromNumber}
                onChange={(e) => setFromNumber(e.target.value)}
                className="mt-1.5 bg-transparent py-0.5 text-sm font-medium text-slate-800 outline-none"
              >
                {numbers.map((number) => (
                  <option key={number} value={number}>
                    {number}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1.5 text-sm font-medium text-slate-800">
                {fromNumber || numbers[0] || "—"}
              </p>
            )
          ) : (
            <p className="mt-1.5 text-sm font-medium text-slate-800">
              {call.fromNumber || "—"}
            </p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Duration
          </p>
          <p className="mt-1.5 text-sm font-medium text-slate-800">
            {call.duration || "Not started"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Purpose
          </p>
          {editing ? (
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="mt-1.5 bg-transparent py-0.5 text-sm font-medium text-slate-800 outline-none"
            >
              <option value="">Select purpose</option>
              {purposeChoices.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1.5 text-sm font-medium text-slate-800">
              {call.purpose || "—"}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <AuditLine
          label="Created by"
          by={call.createdBy || call.assignedTo}
          on={call.createdOn}
        />
        <AuditLine
          label="Modified by"
          by={call.modifiedBy || call.createdBy || call.assignedTo}
          on={call.modifiedOn || call.createdOn}
        />
        <AuditLine
          label="Contact"
          by={call.contact || call.callFor}
        />
      </div>
    </section>
  );
}

function splitStamp(on?: string): { date: string; time: string } {
  if (!on) return { date: "", time: "" };
  const cleaned = on.replace(",", " ").replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s*(.*)$/);
  if (match) return { date: match[1], time: match[2].trim() };
  return { date: cleaned, time: "" };
}

function AuditLine({
  label,
  by,
  on,
}: {
  label: string;
  by?: string;
  on?: string;
}) {
  const { date, time } = splitStamp(on);
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-700">
        <User className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-medium">{by || "—"}</span>
        {date ? <span className="text-slate-500">{date}</span> : null}
        {time ? <span className="text-slate-500">{time}</span> : null}
      </div>
    </div>
  );
}
