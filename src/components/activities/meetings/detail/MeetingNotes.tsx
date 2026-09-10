"use client";

import { useState } from "react";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import { FileText } from "lucide-react";

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

      <MentionNotesTextarea
        value={notes}
        onChange={(next) => {
          setNotes(next);
          onSave?.(next);
        }}
        placeholder="Start typing collaborative notes here... Type @ to assign someone."
      />
    </div>
  );
}
