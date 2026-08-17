import React from "react";
import { StatusStepper, type StepperStage } from "./StatusStepper";

export interface RecipientStatusData {
  id: string;
  order: number;
  name: string;
  email: string;
  /** e.g. "Accessed from IP address 38.175.167.106 using Web at Sep 13, 2024 08:48" */
  accessInfo?: string;
  mailed: boolean;
  viewed: boolean;
  signed: boolean;
}

interface RecipientStatusRowProps {
  recipient: RecipientStatusData;
}

export const RecipientStatusRow: React.FC<RecipientStatusRowProps> = ({
  recipient,
}) => {
  const stages: StepperStage[] = [
    { label: "Mailed", completed: recipient.mailed },
    { label: "Viewed", completed: recipient.viewed },
    { label: "Signed", completed: recipient.signed },
  ];

  return (
    <div className="flex items-stretch border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div
        className={`w-1 shrink-0 ${
          recipient.signed ? "bg-emerald-500" : "bg-slate-200"
        }`}
      />
      <div className="flex-1 flex flex-wrap items-center justify-between gap-6 py-4 px-4">
        <div className="flex items-start gap-3 min-w-[220px]">
          <span className="text-xs font-semibold text-slate-400 mt-0.5">
            {recipient.order}
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-slate-800">
              {recipient.name}
            </p>
            <p className="text-xs text-slate-500">{recipient.email}</p>
            {recipient.accessInfo && (
              <p className="text-[11px] text-slate-400">
                {recipient.accessInfo}
              </p>
            )}
          </div>
        </div>

        <StatusStepper stages={stages} />
      </div>
    </div>
  );
};
