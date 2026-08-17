"use client";

import React from "react";

interface ReminderDetailsCardProps {
  subject: string;
  onSubjectChange: (val: string) => void;
  notes: string;
  onNotesChange: (val: string) => void;
}

export const ReminderDetailsCard: React.FC<ReminderDetailsCardProps> = ({
  subject,
  onSubjectChange,
  notes,
  onNotesChange,
}) => {
  return (
    <div className="bg-white text-card-foreground rounded-xl border border-border p-6 shadow-sm space-y-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Reminder Details
      </h2>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-muted-foreground">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="e.g., Q3 Follow-up with Acme Corp"
          className="w-full bg-input/50 border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-muted-foreground">
          Notes
        </label>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Additional context for this reminder..."
          className="w-full bg-input/50 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none"
        />
      </div>
    </div>
  );
};
