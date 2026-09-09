"use client";

import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import { NOTE_TYPES, type NoteType } from "@/lib/notes/types";
import {
  RELATED_ENTITY_KINDS,
  RELATED_RECORD_OPTIONS,
  ACTIVITY_OWNERS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import { Lock } from "lucide-react";

interface NoteEditorCardProps {
  title: string;
  onTitleChange: (val: string) => void;
  relatedKind: RelatedEntityKind | "";
  onRelatedKindChange: (val: RelatedEntityKind | "") => void;
  relatedName: string;
  onRelatedNameChange: (val: string) => void;
  noteType: NoteType | "";
  onNoteTypeChange: (type: NoteType) => void;
  createdBy: string;
  onCreatedByChange: (val: string) => void;
  isPrivate: boolean;
  onIsPrivateChange: (val: boolean) => void;
  body: string;
  onBodyChange: (val: string) => void;
  isPinned: boolean;
  onTogglePin: () => void;
  submitted: boolean;
  errors: { body?: string; relatedName?: string };
}

export const NoteEditorCard: React.FC<NoteEditorCardProps> = ({
  title,
  onTitleChange,
  relatedKind,
  onRelatedKindChange,
  relatedName,
  onRelatedNameChange,
  noteType,
  onNoteTypeChange,
  createdBy,
  onCreatedByChange,
  isPrivate,
  onIsPrivateChange,
  body,
  onBodyChange,
  isPinned,
  onTogglePin,
  submitted,
  errors,
}) => {
  const relatedOptions = relatedKind
    ? RELATED_RECORD_OPTIONS.filter((r) => r.kind === relatedKind)
    : RELATED_RECORD_OPTIONS;

  return (
    <div className="bg-white text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Top Meta & Title Section */}
      <div className="p-5 border-b border-border space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Note Title (Optional)..."
          className="w-full text-lg font-semibold text-foreground bg-transparent placeholder:text-muted-foreground/50 focus:outline-none"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Related Entity Kind */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Related Entity
            </label>
            <select
              value={relatedKind}
              onChange={(e) => {
                onRelatedKindChange(e.target.value as RelatedEntityKind | "");
                onRelatedNameChange("");
              }}
              className="w-full bg-input/50 hover:bg-input px-3 py-2 rounded-lg border border-border text-foreground focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-popover text-popover-foreground">
                Select entity
              </option>
              {RELATED_ENTITY_KINDS.map((k) => (
                <option
                  key={k}
                  value={k}
                  className="bg-popover text-popover-foreground"
                >
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Related To Record */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Related Record <span className="text-destructive">*</span>
            </label>
            <select
              value={relatedName}
              onChange={(e) => onRelatedNameChange(e.target.value)}
              disabled={!relatedKind}
              className={`w-full bg-input/50 hover:bg-input px-3 py-2 rounded-lg border text-foreground focus:outline-none cursor-pointer ${
                submitted && errors.relatedName
                  ? "border-destructive bg-destructive/10"
                  : "border-border"
              }`}
            >
              <option value="" className="bg-popover text-popover-foreground">
                Select record
              </option>
              {relatedOptions.map((r) => (
                <option
                  key={`${r.kind}-${r.name}`}
                  value={r.name}
                  className="bg-popover text-popover-foreground"
                >
                  {r.name}
                </option>
              ))}
            </select>
            {submitted && errors.relatedName && (
              <span className="text-[10px] text-destructive mt-0.5 block">
                {errors.relatedName}
              </span>
            )}
          </div>

          {/* Note Type Selector */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Note Type
            </label>
            <select
              value={noteType}
              onChange={(e) => onNoteTypeChange(e.target.value as NoteType)}
              className="w-full bg-input/50 hover:bg-input px-3 py-2 rounded-lg border border-border text-foreground focus:outline-none cursor-pointer font-medium"
            >
              {NOTE_TYPES.map((type) => (
                <option
                  key={type}
                  value={type}
                  className="bg-popover text-popover-foreground"
                >
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Created By Owner */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Created By
            </label>
            <select
              value={createdBy}
              onChange={(e) => onCreatedByChange(e.target.value)}
              className="w-full bg-input/50 hover:bg-input px-3 py-2 rounded-lg border border-border text-foreground focus:outline-none cursor-pointer"
            >
              {ACTIVITY_OWNERS.map((o) => (
                <option
                  key={o}
                  value={o}
                  className="bg-popover text-popover-foreground"
                >
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Private Toggle Checkbox */}
        <div className="pt-1">
          <label className="inline-flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => onIsPrivateChange(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            />
            <span className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              Only visible to you (Private)
            </span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end border-b border-border bg-muted/50 px-5 py-2.5">
        <button
          type="button"
          onClick={onTogglePin}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            isPinned
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80"
          }`}
        >
          <span>📌</span>
          <span>{isPinned ? "Pinned" : "Pin Note"}</span>
        </button>
      </div>

      {/* Main Body Textarea */}
      <div className="p-5 space-y-1">
        <label className="block text-[11px] font-medium text-muted-foreground">
          Body <span className="text-destructive">*</span>
        </label>
        <MentionNotesTextarea
          value={body}
          onChange={onBodyChange}
          error={submitted && Boolean(errors.body)}
          placeholder="Start typing your notes here... Type @ to assign someone."
        />
        {submitted && errors.body && (
          <span className="text-[10px] text-destructive block">
            {errors.body}
          </span>
        )}
      </div>
    </div>
  );
};
