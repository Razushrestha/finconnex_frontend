"use client";

import React from "react";

interface ReminderHeaderProps {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
}

export const ReminderHeader: React.FC<ReminderHeaderProps> = ({
  onCancel,
  onSave,
  saving,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-b border-border pb-2">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-semibold text-secondary-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border border-border"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
        >
          <span>💾</span>
          <span>{saving ? "Saving…" : "Save Reminders"}</span>
        </button>
      </div>
    </div>
  );
};
