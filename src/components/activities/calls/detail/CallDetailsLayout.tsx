"use client";

import { toast } from "sonner";
import type { Call, CallFollowUp, CallStatus, CallType } from "@/lib/calls/types";
import type { TaskReminder } from "@/lib/tasks/types";
import {
  callHasPlayableRecording,
  callPlacedBy,
  callWasPlaced,
  updateCall,
} from "@/lib/calls/store";
import { TaskEditProvider } from "@/components/activities/tasks/detail/TaskEditContext";
import { CallHeaderSection } from "./CallHeaderSection";
import { CallMetadataCard } from "./CallMetadataCard";
import { CallNotesFields } from "./CallNotesFields";
import { CallRecordingsSection } from "./CallRecordingsSection";
import { CallTranscriptSection } from "./CallTranscriptSection";
import { ContactSidebarCard } from "./ContactSidebarCard";
import { RelatedEntitySidebarCard } from "./RelatedEntitySidebarCard";
import { CallParticipantsCard } from "./CallParticipantsCard";
import { NextStepsSidebarCard, type NextStepItem } from "./NextStepSidebarCard";
import { CallRemindersCard } from "./CallRemindersCard";

interface CallDetailsLayoutProps {
  call: Call;
  onBack: () => void;
  backLabel?: string;
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
  backLabel = "Back to Calls",
  onChange,
}: CallDetailsLayoutProps) {
  function persist(patch: Partial<Call>) {
    const next = updateCall(call.id, patch);
    if (next) onChange(next);
    return Boolean(next);
  }

  return (
    <TaskEditProvider>
      <div className="min-h-screen bg-white">
        <div className="px-6 lg:px-10">
          <CallHeaderSection
            onBack={onBack}
            backLabel={backLabel}
            canClose={call.status !== "Completed"}
            onCloseCall={() => persist({ status: "Completed" })}
            timelineHref={`/activities/calls/detail/${call.id}/timeline`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="px-6 lg:border-r lg:border-slate-100 lg:px-10">
            <CallMetadataCard
              call={call}
              onStatusChange={(status: CallStatus) => persist({ status })}
              onSaveDetails={(next: {
                subject: string;
                date: string;
                fromNumber: string;
                callType: CallType;
                purpose: string;
                assignedTo: string;
              }) => {
                persist({
                  subject: next.subject,
                  date: next.date,
                  fromNumber: next.fromNumber || undefined,
                  callType: next.callType,
                  purpose: next.purpose || undefined,
                  assignedTo: next.assignedTo,
                });
                toast.success("Call details saved");
              }}
            />
            <CallNotesFields
              agenda={call.agenda}
              onSave={({ agenda }) => {
                persist({ agenda });
                toast.success("Call details saved");
              }}
            />
            <CallRecordingsSection call={call} />
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
            <CallTranscriptSection
              hasTranscript={callHasPlayableRecording(call) || callWasPlaced(call)}
              notes={call.notes}
              assignedTo={call.calledBy || call.assignedTo}
              contactName={call.contact || call.callFor}
              attachments={call.attachments}
              onSaveNotes={(notes) => {
                const ok = persist({ notes });
                if (ok) toast.success("Notes saved");
                else toast.error("Could not save notes");
                return ok;
              }}
              onAddAttachments={(files) => {
                const next = [...(call.attachments ?? []), ...files];
                const ok = persist({
                  attachments: next,
                  attachmentsCount: next.length,
                });
                if (ok) toast.success("Attachments added");
                else toast.error("Could not add attachments");
                return ok;
              }}
            />
          </div>

          <aside className="px-6 py-6 lg:px-8">
            <ContactSidebarCard
              contactName={call.contact || call.callFor}
              relatedTo={call.relatedTo}
            />
            <RelatedEntitySidebarCard relatedTo={call.relatedTo} />
            <CallParticipantsCard
              owner={call.assignedTo}
              calledBy={
                call.calledBy ||
                (callWasPlaced(call) ? callPlacedBy(call) : undefined)
              }
              contact={call.contact || call.callFor}
            />
            <CallRemindersCard
              callId={call.id}
              reminders={call.reminders ?? []}
              dueDate={call.date}
              onChange={(reminders: TaskReminder[]) => {
                persist({ reminders });
                toast.success("Reminder updated");
              }}
            />
          </aside>
        </div>
      </div>
    </TaskEditProvider>
  );
}
