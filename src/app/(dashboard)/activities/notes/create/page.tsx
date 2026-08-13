// import { CreateNoteForm } from "@/components/activities/notes/CreateNoteForm";
// import { asRelatedKind } from "@/lib/activities/create-defaults";

// interface PageProps {
//   searchParams: Promise<{
//     layoutid?: string;
//     redirect?: string;
//     relatedKind?: string;
//     relatedName?: string;
//   }>;
// }

// export default async function CreateNotePage({ searchParams }: PageProps) {
//   const params = await searchParams;
//   return (
//     <CreateNoteForm
//       layoutId={params.layoutid ?? "standard"}
//       redirect={params.redirect === "true"}
//       defaults={{
//         relatedKind: asRelatedKind(params.relatedKind),
//         relatedName: params.relatedName,
//       }}
//     />
//   );
// }

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { type NoteType } from "@/lib/notes/types";
import { type RelatedEntityKind } from "@/lib/activities/shared";
import { createNote } from "@/lib/notes/store";

import { NoteHeader } from "@/components/activities/notes/create/NoteHeader";
import { NoteEditorCard } from "@/components/activities/notes/create/NoteEditorCard";
import { SuggestedTagsCard } from "@/components/activities/notes/create/SuggestedTagsCard";

interface NewNotePageProps {
  defaults?: {
    relatedKind?: RelatedEntityKind;
    relatedName?: string;
    noteType?: NoteType;
  };
}

export default function NewNotePage({ defaults }: NewNotePageProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [relatedKind, setRelatedKind] = useState<RelatedEntityKind | "">(
    defaults?.relatedKind ?? "",
  );
  const [relatedName, setRelatedName] = useState(defaults?.relatedName ?? "");
  const [noteType, setNoteType] = useState<NoteType>(
    defaults?.noteType ?? "General",
  );
  const [createdBy, setCreatedBy] = useState("John Smith");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const [errors, setErrors] = useState<{ body?: string; relatedName?: string }>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);

  const handleTagSelect = (tag: string) => {
    setBody((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  const validate = () => {
    const nextErrors: { body?: string; relatedName?: string } = {};
    if (!body.trim()) nextErrors.body = "Body is required";
    if (!relatedKind || !relatedName.trim()) {
      nextErrors.relatedName = "Related To record is required";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    setSubmitted(true);
    if (!validate()) return;

    const formattedRelatedTo = `${relatedKind}: ${relatedName}`;
    const created = createNote({
      title: title.trim() || body.trim().slice(0, 60),
      body: body.trim(),
      relatedTo: formattedRelatedTo,
      noteType: noteType || "General",
      createdBy: createdBy.trim() || "John Smith",
      isPrivate,
      isPinned,
    });

    router.push(`/activities/notes?focus=${created.id}`);
  };

  return (
    <div className="mx-auto min-h-full w-full max-w-[1920px] space-y-4 bg-background px-4 py-3 text-foreground sm:px-6 2xl:px-8">
      <NoteHeader
        onDiscard={() => router.push("/activities/notes")}
        onSave={handleSave}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:gap-6">
        {/* Main Editor Column */}
        <div>
          <NoteEditorCard
            title={title}
            onTitleChange={setTitle}
            relatedKind={relatedKind}
            onRelatedKindChange={setRelatedKind}
            relatedName={relatedName}
            onRelatedNameChange={setRelatedName}
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

        {/* Right Sidebar Column */}
        <div className="space-y-6">
          <SuggestedTagsCard onSelectTag={handleTagSelect} />
        </div>
      </div>
    </div>
  );
}
