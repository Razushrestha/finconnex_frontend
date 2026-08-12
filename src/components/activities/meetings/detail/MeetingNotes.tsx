"use client";

import React, { useState } from "react";
import { FileText, Bold, Italic, List, Paperclip } from "lucide-react";

interface MeetingNotesProps {
  initialNotes?: string;
  onSave?: (notes: string) => void;
}

export function MeetingNotes({ initialNotes = "", onSave }: MeetingNotesProps) {
  const [notes, setNotes] = useState(initialNotes);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-card-foreground">
          Meeting Notes
        </h3>
      </div>

      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-card/60 text-muted-foreground">
          <button className="p-1.5 rounded hover:bg-secondary hover:text-secondary-foreground transition-colors cursor-pointer">
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded hover:bg-secondary hover:text-secondary-foreground transition-colors cursor-pointer">
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded hover:bg-secondary hover:text-secondary-foreground transition-colors cursor-pointer">
            <List className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded hover:bg-secondary hover:text-secondary-foreground transition-colors cursor-pointer">
            <Paperclip className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Text Area */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Start typing collaborative notes here..."
          className="w-full h-32 p-4 text-sm bg-transparent text-card-foreground focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}
