import React from "react";

interface NextStepsCardProps {
  enabled: boolean;
  onToggleEnabled: (val: boolean) => void;
  dueDate: string;
  assignee: string;
}

export const NextStepsCard: React.FC<NextStepsCardProps> = ({
  enabled,
  onToggleEnabled,
  dueDate,
  assignee,
}) => {
  return (
    <div className="bg-slate-900 text-white rounded-xl p-5 shadow-md space-y-4">
      <div className="flex items-center space-x-2 text-slate-300">
        <span className="text-base">🔄</span>
        <h3 className="text-sm font-semibold tracking-wide">Next Steps</h3>
      </div>

      <div className="space-y-3 bg-slate-800/60 p-3.5 rounded-lg border border-slate-800">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggleEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
          />
          <div>
            <span className="block text-xs font-medium text-white">
              Create Follow-up Task
            </span>
            <span className="block text-[11px] text-slate-400">
              Automatically generated based on notes
            </span>
          </div>
        </label>

        <div className="pt-2 border-t border-slate-700/60 grid grid-cols-2 text-xs text-slate-300">
          <div>
            <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
              Due Date
            </span>
            <span className="font-medium text-slate-200">{dueDate}</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
              Assignee
            </span>
            <span className="inline-flex items-center space-x-1.5 font-medium text-slate-200">
              <span className="h-4 w-4 rounded-full bg-blue-600 text-[9px] flex items-center justify-center text-white">
                AS
              </span>
              <span>{assignee}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
