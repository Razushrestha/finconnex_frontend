"use client";

import { MentionTextarea } from "@/components/shared/MentionTextarea";
import RelatedRecordCombobox from "@/components/activities/tasks/RelatedRecordComboBox";
import { NOTE_TYPES, type NoteType } from "@/lib/notes/types";
import {
  RELATED_ENTITY_KINDS,
  ACTIVITY_OWNERS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import { useCrmRelatedRecords } from "@/lib/activities/use-crm-related-records";
import { Lock } from "lucide-react";

interface NoteEditorCardProps {
  title: string;
  onTitleChange: (val: string) => void;
  relatedKind: RelatedEntityKind | "";
  onRelatedKindChange: (val: RelatedEntityKind | "") => void;
  relatedName: string;
  onRelatedNameChange: (val: string) => void;
  onRelatedIdChange?: (id: string) => void;
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
  onRelatedIdChange,
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
  const extra =
    relatedKind && relatedName
      ? { kind: relatedKind, name: relatedName }
      : undefined;
  const { options: relatedOptions, loading } = useCrmRelatedRecords(
    relatedKind,
    extra,
  );

  return (
    <div className="bg-white text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 border-b border-border space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Note Title (Optional)..."
          className="w-full text-lg font-semibold text-foreground bg-transparent placeholder:text-muted-foreground/50 focus:outline-none"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Related Entity
            </label>
            <select
              value={relatedKind}
              onChange={(e) => {
                onRelatedKindChange(e.target.value as RelatedEntityKind | "");
                onRelatedNameChange("");
                onRelatedIdChange?.("");
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

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Related Record <span className="text-destructive">*</span>
            </label>
            <RelatedRecordCombobox
              value={relatedName}
              onChange={onRelatedNameChange}
              onSelectOption={(option) => onRelatedIdChange?.(option?.id ?? "")}
              options={relatedOptions}
              disabled={!relatedKind}
              placeholder={
                loading
                  ? "Loading CRM records…"
                  : relatedKind
                    ? "Search record…"
                    : "Select related entity first"
              }
            />
            {submitted && errors.relatedName ? (
              <span className="text-[10px] text-destructive mt-0.5 block">
                {errors.relatedName}
              </span>
            ) : null}
          </div>

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

      <div className="bg-muted/50 px-5 py-2.5 border-b border-border flex items-center justify-between text-muted-foreground text-sm">
        <div className="flex items-center space-x-1">
          <button
            type="button"
            className="px-2.5 py-1 hover:bg-accent hover:text-accent-foreground rounded font-bold text-foreground"
          >
            B
          </button>
          <button
            type="button"
            className="px-2.5 py-1 hover:bg-accent hover:text-accent-foreground rounded italic text-foreground"
          >
            I
          </button>
          <button
            type="button"
            className="px-2.5 py-1 hover:bg-accent hover:text-accent-foreground rounded underline text-foreground"
          >
            U
          </button>
          <span className="text-border mx-1">|</span>
          <button
            type="button"
            className="px-2.5 py-1 hover:bg-accent hover:text-accent-foreground rounded text-foreground"
          >
            ≡ List
          </button>
          <button
            type="button"
            className="px-2.5 py-1 hover:bg-accent hover:text-accent-foreground rounded text-foreground"
          >
            📎 Attach
          </button>
        </div>

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

      <div className="p-5 space-y-1">
        <label className="block text-[11px] font-medium text-muted-foreground">
          Body <span className="text-destructive">*</span>
        </label>
        <MentionTextarea
          rows={8}
          value={body}
          onChange={onBodyChange}
          placeholder="Start typing your notes here... Type @ to assign someone."
          className={`w-full text-sm text-foreground bg-transparent focus:outline-none resize-none leading-relaxed placeholder:text-muted-foreground/50 ${
            submitted && errors.body ? "border-destructive" : ""
          }`}
        />
        {submitted && errors.body ? (
          <span className="text-[10px] text-destructive block">
            {errors.body}
          </span>
        ) : null}
      </div>
    </div>
  );
};
