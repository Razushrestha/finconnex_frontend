"use client";

import { ArrowLeft, Clock, Link2, Lock, Pin } from "lucide-react";
import type { Note, NoteType } from "@/lib/notes/types";
import { RelatedToLink } from "@/components/activities/RelatedToLink";
import { CardOwnerRow } from "@/components/shared/CardInitialsAvatar";
import { cn } from "@/lib/utils";

const TYPE_META: Record<NoteType, { soft: string; text: string }> = {
  General: { soft: "bg-slate-100", text: "text-slate-600" },
  "Call Summary": { soft: "bg-sky-50", text: "text-sky-700" },
  "Meeting Notes": { soft: "bg-violet-50", text: "text-violet-700" },
  "Follow-up": { soft: "bg-amber-50", text: "text-amber-800" },
  Other: { soft: "bg-emerald-50", text: "text-emerald-700" },
};

interface NoteDetailsViewProps {
  note: Note;
  onBack: () => void;
}

export function NoteDetailsView({ note, onBack }: NoteDetailsViewProps) {
  const meta = TYPE_META[note.noteType];

  return (
    <div className="min-h-screen bg-background px-4 py-2">
      <div className="mb-4 flex items-center gap-4 border-b border-border px-2 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Notes
        </button>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {note.title || "Untitled note"}
              </h1>
              <div className="flex shrink-0 items-center gap-1.5">
                {note.isPinned ? (
                  <Pin className="h-4 w-4 fill-amber-400 text-amber-500" />
                ) : null}
                {note.isPrivate ? (
                  <Lock className="h-4 w-4 text-slate-400" />
                ) : null}
              </div>
            </div>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                meta.soft,
                meta.text,
              )}
            >
              {note.noteType}
            </span>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {note.body}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="mb-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Related to
            </h4>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
              <RelatedToLink
                relatedTo={note.relatedTo}
                className="font-semibold text-slate-800"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="mb-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Created
            </h4>
            <div className="space-y-3">
              <CardOwnerRow name={note.createdBy} />
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{note.createdAt}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
