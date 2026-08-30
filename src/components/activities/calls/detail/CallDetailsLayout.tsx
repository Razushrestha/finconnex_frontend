"use client";

import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Call, CallFollowUp, CallStatus, CallType } from "@/lib/calls/types";
import type { TaskReminder } from "@/lib/tasks/types";
import { deleteCall, parseCallDurationSeconds, updateCall } from "@/lib/calls/store";
import { CallHeaderSection } from "./CallHeaderSection";
import { CallAudioPlayerSection } from "./CallAudioPlayerSection";
import { CallTranscriptSection } from "./CallTranscriptSection";
import { ContactSidebarCard } from "./ContactSidebarCard";
import { RelatedEntitySidebarCard } from "./RelatedEntitySidebarCard";
import { NextStepsSidebarCard, type NextStepItem } from "./NextStepSidebarCard";
import { CallRemindersCard } from "./CallRemindersCard";
import { PAGE_FRAME } from "@/lib/layout";

interface CallDetailsLayoutProps {
  call: Call;
  onBack: () => void;
  onChange: (next: Call) => void;
}

function toUiSteps(steps: CallFollowUp[] = []): NextStepItem[] {
  return steps.map((step) => ({
    id: step.id,
    text: step.title,
    dueDate: step.dueDate,
    completed: step.completed,
    isOverdue: step.dueDate.toLowerCase().includes("overdue"),
  }));
}

export function CallDetailsLayout({
  call,
  onBack,
  onChange,
}: CallDetailsLayoutProps) {
  const durationSeconds = parseCallDurationSeconds(call);
  const hasRecording = Boolean(call.recording?.durationSeconds || durationSeconds);

  function persist(patch: Partial<Call>) {
    const next = updateCall(call.id, patch);
    if (next) onChange(next);
    return Boolean(next);
  }

  function handleDelete() {
    if (!window.confirm("Delete this call? This cannot be undone.")) return;
    if (deleteCall(call.id)) {
      toast.success("Call deleted");
      onBack();
    }
  }

  return (
    <div className={`${PAGE_FRAME} bg-slate-50 min-h-full`}>
      <div className="mb-4 flex items-center justify-between border-b border-slate-200/80 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#5A32A3]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Calls
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <CallHeaderSection
              call={call}
              onStatusChange={(status: CallStatus) => persist({ status })}
              onSaveDetails={(next: {
                subject: string;
                fromNumber: string;
                callType: CallType;
                assignedTo: string;
              }) => {
                persist({
                  subject: next.subject,
                  fromNumber: next.fromNumber || undefined,
                  callType: next.callType,
                  assignedTo: next.assignedTo,
                });
                toast.success("Call details saved");
              }}
              onDelete={handleDelete}
            />
            <CallAudioPlayerSection
              durationSeconds={durationSeconds}
              hasRecording={hasRecording}
            />
          </div>
          <CallTranscriptSection
            notes={call.notes}
            agenda={call.agenda}
            purpose={call.purpose}
            assignedTo={call.assignedTo}
            contactName={call.contact || call.callFor}
            onSaveNotes={(notes) => {
              const ok = persist({ notes });
              if (ok) toast.success("Notes saved");
              else toast.error("Could not save notes");
              return ok;
            }}
          />
        </div>

        <div className="flex flex-col gap-5">
          <ContactSidebarCard
            contactName={call.contact || call.callFor}
            relatedTo={call.relatedTo}
          />
          <RelatedEntitySidebarCard relatedTo={call.relatedTo} />
          <CallRemindersCard
            callId={call.id}
            reminders={call.reminders ?? []}
            dueDate={call.date}
            onChange={(reminders: TaskReminder[]) => {
              persist({ reminders });
              toast.success("Reminder updated");
            }}
          />
          <NextStepsSidebarCard
            steps={toUiSteps(call.nextSteps)}
            onToggleStep={(id) => {
              persist({
                nextSteps: (call.nextSteps ?? []).map((step) =>
                  step.id === id
                    ? { ...step, completed: !step.completed }
                    : step,
                ),
              });
            }}
            onAddStep={(text, dueDate) => {
              persist({
                nextSteps: [
                  ...(call.nextSteps ?? []),
                  {
                    id: `ns-${Date.now()}`,
                    title: text,
                    dueDate,
                    completed: false,
                  },
                ],
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
