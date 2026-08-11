import React from "react";

interface LogActivityHeaderProps {
  onDiscard: () => void;
  onQuickSave: () => void;
}

export const LogActivityHeader: React.FC<LogActivityHeaderProps> = ({
  onDiscard,
  onQuickSave,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Log Activity</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Record details of your recent communication to maintain accurate
          relationship history and trigger automated follow-ups.
        </p>
      </div>

      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onDiscard}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center space-x-1.5"
        >
          <span>✕</span>
          <span>Discard</span>
        </button>
        <button
          type="button"
          onClick={onQuickSave}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center space-x-1.5"
        >
          <span>💾</span>
          <span>Quick Save</span>
        </button>
      </div>
    </div>
  );
};
