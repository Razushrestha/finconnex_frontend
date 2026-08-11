"use client";

import React from "react";

interface NoteHeaderProps {
  lastEdited?: string;
  onDiscard: () => void;
  onSave: (createAnother: boolean) => void;
}

export const NoteHeader: React.FC<NoteHeaderProps> = ({
  lastEdited = "Last edited just now",
  onDiscard,
  onSave,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Create Note</h1>
        <div className="flex items-center space-x-1.5 text-xs text-muted-foreground mt-0.5">
          <span>🕒</span>
          <span>{lastEdited}</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onDiscard}
          className="px-4 py-2 text-xs font-semibold text-secondary-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border border-border"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={() => onSave(false)}
          className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm flex items-center space-x-1.5"
        >
          <span>💾</span>
          <span>Save Note</span>
        </button>
      </div>
    </div>
  );
};
