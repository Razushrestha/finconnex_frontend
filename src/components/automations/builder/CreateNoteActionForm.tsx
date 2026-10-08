"use client";

import { NoteEditorCard } from "@/components/activities/notes/create/NoteEditorCard";
import { NOTE_TYPES, type NoteType } from "@/lib/notes/types";
import { entityNoun } from "@/lib/automations/trigger-scope";
import type { AutomationEntityType } from "@/lib/automations/types";

/** Keys that point a note at a specific record instead of the trigger's. */
const RECORD_KEYS = [
  "leadId",
  "contactId",
  "companyId",
  "dealId",
  "quoteId",
  "estimateId",
  "invoiceId",
  "creditNoteId",
];

/**
 * Create Note, as the Notes page's own editor card. The note goes on the
 * record the workflow ran for and is written by the workflow, so the card's
 * Related To pickers and Created By are replaced by that.
 *
 * Config keys: title, body, noteType, isPinned, isPrivate. A step that was
 * given a specific record earlier (relatedType + an id) keeps it.
 */
export function CreateNoteActionForm({
  config,
  entityType,
  onChange,
}: {
  config: Record<string, unknown>;
  entityType: AutomationEntityType;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const str = (key: string) => (typeof config[key] === "string" ? (config[key] as string) : "");
  const noteType = (NOTE_TYPES as readonly string[]).includes(str("noteType"))
    ? (str("noteType") as NoteType)
    : "General";
  const pinned = config.isPinned === true;
  const specific = RECORD_KEYS.some((key) => str(key));

  function set(patch: Record<string, unknown>) {
    onChange({ ...config, ...patch });
  }

  const noun = entityNoun(entityType).one;

  return (
    <NoteEditorCard
      title={str("title")}
      onTitleChange={(title) => set({ title })}
      relatedKind=""
      onRelatedKindChange={() => {}}
      relatedName=""
      onRelatedNameChange={() => {}}
      relatedSlot={
        <div>
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Related To
          </span>
          <p className="rounded-lg border border-border bg-input/30 px-3 py-2 text-foreground">
            {specific
              ? "The record chosen for this step"
              : `The ${noun} the workflow ran for`}
          </p>
        </div>
      }
      hideCreatedBy
      wrapToolbar
      noteType={noteType}
      onNoteTypeChange={(type) => set({ noteType: type })}
      createdBy=""
      onCreatedByChange={() => {}}
      isPrivate={config.isPrivate === true}
      onIsPrivateChange={(isPrivate) => set({ isPrivate })}
      body={str("body")}
      onBodyChange={(body) => set({ body })}
      isPinned={pinned}
      onTogglePin={() => set({ isPinned: !pinned })}
      submitted={false}
      errors={{}}
    />
  );
}
