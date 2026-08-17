"use client";

import React from "react";

interface ReminderHeaderProps {
  onCancel: () => void;
  onSave: () => void;
}

export const ReminderHeader: React.FC<ReminderHeaderProps> = ({
  onCancel,
  onSave,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border gap-4">
      <div className="flex items-start space-x-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Add Reminders</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Schedule multiple reminders with Web Push, email, SMS, or in-app
            alerts.
          </p>
        </div>
      </div>

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
          className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm flex items-center space-x-1.5"
        >
          <span>💾</span>
          <span>Save Reminders</span>
        </button>
      </div>
    </div>
  );
};
