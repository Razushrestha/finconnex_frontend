// import { CreateCallForm } from "@/components/activities/calls/CreateCallForm";
// import { asRelatedKind } from "@/lib/activities/create-defaults";

// interface CreateCallPageProps {
//   searchParams: Promise<{
//     layoutid?: string;
//     redirect?: string;
//     relatedKind?: string;
//     relatedName?: string;
//     contact?: string;
//   }>;
// }

// export default async function CreateCallPage({
//   searchParams,
// }: CreateCallPageProps) {
//   const params = await searchParams;
//   return (
//     <CreateCallForm
//       layoutId={params.layoutid ?? "standard"}
//       redirect={params.redirect === "true"}
//       defaults={{
//         relatedKind: asRelatedKind(params.relatedKind),
//         relatedName: params.relatedName,
//         contact: params.contact,
//       }}
//     />
//   );
// }

"use client";

import React, { useState } from "react";
import { CallType } from "@/lib/calls/types";
import { LogActivityHeader } from "@/components/activities/calls/create/LogActivityHeader";
import { ConnectionDetailsCard } from "@/components/activities/calls/create/ConnectionDetailsCard";
import { CallNotesEditor } from "@/components/activities/calls/create/CallNotesEditor";
import { CallRecordingWidget } from "@/components/activities/calls/create/CallRecordingWidget";
import { NextStepsCard } from "@/components/activities/calls/create/NextStepsCard";

export default function LogCallPage() {
  const [contactName, setContactName] = useState("Elena Rostova - TechFlow");
  const [direction, setDirection] = useState<CallType>("Outbound");
  const [outcome, setOutcome] = useState("Left Voicemail");
  const [notes, setNotes] = useState(
    "Discussed Q3 expansion plans. Elena confirmed budget approval is pending final board review next Tuesday. Key concern remains implementation timeline for the EMEA region.\n\nAction Items:\n- Send revised EMEA deployment schedule.",
  );
  const [taskEnabled, setTaskEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="w-full mx-auto px-4 py-2 space-y-6 bg-slate-50 min-h-screen">
      <LogActivityHeader
        onDiscard={() => console.log("Discarded")}
        onQuickSave={() => console.log("Saved")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left / Main Column */}
        <div className="lg:col-span-2 space-y-4">
          <ConnectionDetailsCard
            contactName={contactName}
            onContactChange={setContactName}
            direction={direction}
            onDirectionChange={setDirection}
            outcome={outcome}
            onOutcomeChange={setOutcome}
          />

          <CallNotesEditor notes={notes} onNotesChange={setNotes} />
        </div>

        {/* Right Sidebar Column */}
        <div className="space-y-4">
          <CallRecordingWidget
            durationFormatted="14:22"
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
          />

          <NextStepsCard
            enabled={taskEnabled}
            onToggleEnabled={setTaskEnabled}
            dueDate="Tomorrow"
            assignee="Me"
          />

          {/* Related Deal Section integrated directly without external component */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl p-4 border border-slate-200 shadow-sm space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Related Deal
            </span>
            <h4 className="text-xs font-semibold text-slate-800">
              Project Titan - Q3 Expansion
            </h4>
            <div className="flex items-center justify-between pt-1">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 text-[11px] font-medium">
                Stage: Negotiation
              </span>
              <span className="text-xs font-bold text-slate-700">
                $250k Value
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
