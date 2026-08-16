import React, { Fragment } from "react";

export interface StepperStage {
  label: string;
  completed: boolean;
}

interface StatusStepperProps {
  stages: StepperStage[];
}

/** Generic horizontal stepper: dots connected by lines, each line colored by whether the stage to its left is complete. */
export const StatusStepper: React.FC<StatusStepperProps> = ({ stages }) => {
  return (
    <div className="flex items-start">
      {stages.map((stage, index) => (
        <Fragment key={stage.label}>
          {index > 0 && (
            <div
              className={`flex-1 h-0.5 mt-[5px] min-w-[24px] ${
                stages[index - 1].completed ? "bg-emerald-500" : "bg-slate-200"
              }`}
            />
          )}
          <div className="flex flex-col items-center gap-2 w-16 shrink-0">
            <span
              className={`w-3 h-3 rounded-full ${
                stage.completed
                  ? "bg-emerald-500"
                  : "bg-white border-2 border-slate-300"
              }`}
            />
            <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
              {stage.label}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
};
