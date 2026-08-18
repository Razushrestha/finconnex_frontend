"use client";

import { useEffect, useState, type ElementType, type ReactNode } from "react";
import {
  Calendar,
  Clock,
  Copy,
  MoreVertical,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Share2,
  User,
  Voicemail,
  Check,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  CALL_OWNERS,
  CALL_STATUSES,
  CALL_TYPES,
  type Call,
  type CallStatus,
  type CallType,
} from "@/lib/calls/types";
import { cn } from "@/lib/utils";
import { RelatedToLink } from "@/components/activities/RelatedToLink";
import { initials, avatarColor } from "@/lib/activities/shared";

const TYPE_ICON: Record<CallType, ElementType> = {
  Outbound: PhoneOutgoing,
  Inbound: PhoneIncoming,
  Missed: PhoneMissed,
  Voicemail: Voicemail,
};

const STATUS_TONE: Record<string, string> = {
  Scheduled: "bg-rose-50 text-rose-600",
  Completed: "bg-emerald-50 text-emerald-700",
  "No Answer": "bg-amber-50 text-amber-800",
  "Voicemail Left": "bg-violet-50 text-violet-700",
  "Left Voicemail": "bg-violet-50 text-violet-700",
  Cancelled: "bg-slate-100 text-slate-600",
  Busy: "bg-orange-50 text-orange-700",
  "Wrong Number": "bg-slate-100 text-slate-600",
};

interface CallHeaderProps {
  call: Call;
  onStatusChange: (status: CallStatus) => void;
  onSaveDetails: (next: {
    subject: string;
    fromNumber: string;
    callType: CallType;
    assignedTo: string;
  }) => void;
  onDelete: () => void;
}

export function CallHeaderSection({
  call,
  onStatusChange,
  onSaveDetails,
  onDelete,
}: CallHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    subject: call.subject,
    fromNumber: call.fromNumber ?? "",
    callType: call.callType,
    assignedTo: call.assignedTo,
  });

  useEffect(() => {
    setDraft({
      subject: call.subject,
      fromNumber: call.fromNumber ?? "",
      callType: call.callType,
      assignedTo: call.assignedTo,
    });
  }, [call]);

  const TypeIcon = TYPE_ICON[call.callType] ?? Phone;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Call link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3ECFB] px-2.5 py-1 text-[11px] font-bold tracking-wider text-[#5A32A3] uppercase">
            <TypeIcon className="h-3.5 w-3.5" />
            {call.callType} call
          </span>
          <select
            value={call.status}
            onChange={(e) => onStatusChange(e.target.value as CallStatus)}
            className={cn(
              "cursor-pointer rounded-full border-0 px-2.5 py-1 text-[10px] font-semibold outline-none focus:ring-2 focus:ring-[#5A32A3]/25",
              STATUS_TONE[call.status] ?? "bg-slate-100 text-slate-600",
            )}
            aria-label="Call status"
          >
            {CALL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#5A32A3]/20 bg-[#F3ECFB] px-2.5 text-xs font-semibold text-[#5A32A3] hover:bg-[#EDE0F8]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
            title="Copy link"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            title="More"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void copyLink();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  Copy link
                </button>
                {call.status !== "Completed" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onStatusChange("Completed");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Check className="h-3.5 w-3.5 text-slate-400" />
                    Mark completed
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete call
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <h1 className="text-[22px] font-bold leading-snug tracking-tight text-slate-900">
        {call.subject}
      </h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Fact
          icon={Phone}
          label="From number"
          value={call.fromNumber || "Not recorded"}
        />
        <Fact
          icon={TypeIcon}
          label="Call type"
          value={`${call.callType} call`}
        />
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
          <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
            <User className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Call owner
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold",
                  avatarColor(call.assignedTo),
                )}
              >
                {initials(call.assignedTo)}
              </span>
              {call.assignedTo}
            </p>
          </div>
        </div>
        <Fact icon={Calendar} label="When" value={call.date} />
        <Fact
          icon={Clock}
          label="Duration"
          value={call.duration || "Not started"}
        />
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
          <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
            <Phone className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Related to
            </p>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-800">
              {call.relatedTo ? (
                <RelatedToLink relatedTo={call.relatedTo} />
              ) : (
                "None"
              )}
            </div>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Edit call</h3>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Subject">
                <input
                  value={draft.subject}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, subject: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]/40 focus:ring-2 focus:ring-[#5A32A3]/15"
                />
              </Field>
              <Field label="From number">
                <input
                  value={draft.fromNumber}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, fromNumber: e.target.value }))
                  }
                  placeholder="+1 415 555 0142"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]/40 focus:ring-2 focus:ring-[#5A32A3]/15"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Call type">
                  <select
                    value={draft.callType}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        callType: e.target.value as CallType,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]/40"
                  >
                    {CALL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Call owner">
                  <select
                    value={draft.assignedTo}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, assignedTo: e.target.value }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]/40"
                  >
                    {CALL_OWNERS.map((owner) => (
                      <option key={owner} value={owner}>
                        {owner}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-9 rounded-lg px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!draft.subject.trim()) {
                    toast.error("Subject is required");
                    return;
                  }
                  onSaveDetails({
                    subject: draft.subject.trim(),
                    fromNumber: draft.fromNumber.trim(),
                    callType: draft.callType,
                    assignedTo: draft.assignedTo,
                  });
                  setEditing(false);
                }}
                className="h-9 rounded-lg bg-[#5A32A3] px-4 text-xs font-semibold text-white hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
