"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { type NoteType } from "@/lib/notes/types";
import { asRelatedKind } from "@/lib/activities/create-defaults";
import { type RelatedEntityKind } from "@/lib/activities/shared";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  createCrmNote,
  isCrmNoteId,
  persistRemoteNote,
} from "@/lib/notes/api";
import { NoteHeader } from "@/components/activities/notes/create/NoteHeader";
import { NoteEditorCard } from "@/components/activities/notes/create/NoteEditorCard";
import { SuggestedTagsCard } from "@/components/activities/notes/create/SuggestedTagsCard";
import { defaultActorName } from "@/lib/rules/actor";

export default function NewNotePage() {
  const router = useRouter();
  const params = useSearchParams();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [relatedKind, setRelatedKind] = useState<RelatedEntityKind | "">(
    asRelatedKind(params.get("relatedKind") ?? undefined) ?? "",
  );
  const [relatedName, setRelatedName] = useState(params.get("relatedName") ?? "");
  const [relatedId, setRelatedId] = useState(params.get("relatedId") ?? "");
  const [noteType, setNoteType] = useState<NoteType>("General");
  const [createdBy, setCreatedBy] = useState(defaultActorName());
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [errors, setErrors] = useState<{ body?: string; relatedName?: string }>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTagSelect = (tag: string) => {
    setBody((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  const validate = () => {
    const nextErrors: { body?: string; relatedName?: string } = {};
    if (!body.trim()) nextErrors.body = "Body is required";
    if (!relatedKind || !relatedName.trim()) {
      nextErrors.relatedName = "Related To record is required";
    } else if (!isUuid(relatedId)) {
      nextErrors.relatedName = "Pick a live CRM record";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    setSubmitted(true);
    if (!validate()) return;
    setSaving(true);
    try {
      const created = persistRemoteNote(
        await createCrmNote({
          title: title.trim() || body.trim().slice(0, 60),
          body: body.trim(),
          relatedTo: `${relatedKind}: ${relatedName.trim()}`,
          relatedType: relatedKind.toUpperCase(),
          relatedId,
          noteType,
          createdBy: createdBy.trim() || defaultActorName(),
          isPrivate,
          isPinned,
        }),
      );
      if (!created?.id || !isCrmNoteId(created.id)) {
        throw new Error("CRM did not save the note");
      }
      toast.success("Note saved");
      router.push(`/activities/notes/detail/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto min-h-full w-full max-w-[1920px] space-y-4 bg-background px-4 py-3 text-foreground sm:px-6 2xl:px-8">
      <NoteHeader
        onDiscard={() => router.push("/activities/notes")}
        onSave={() => void handleSave()}
        saving={saving}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:gap-6">
        <div>
          <NoteEditorCard
            title={title}
            onTitleChange={setTitle}
            relatedKind={relatedKind}
            onRelatedKindChange={(kind) => {
              setRelatedKind(kind);
              setRelatedId("");
            }}
            relatedName={relatedName}
            onRelatedNameChange={setRelatedName}
            onRelatedIdChange={setRelatedId}
            noteType={noteType}
            onNoteTypeChange={setNoteType}
            createdBy={createdBy}
            onCreatedByChange={setCreatedBy}
            isPrivate={isPrivate}
            onIsPrivateChange={setIsPrivate}
            body={body}
            onBodyChange={setBody}
            isPinned={isPinned}
            onTogglePin={() => setIsPinned(!isPinned)}
            submitted={submitted}
            errors={errors}
          />
        </div>

        <div className="space-y-6">
          <SuggestedTagsCard onSelectTag={handleTagSelect} />
        </div>
      </div>
    </div>
  );
}
