"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StickyNote, User, Link2, Lock } from "lucide-react";
import { NOTE_TYPES, type NoteType } from "@/lib/notes/types";
import {
  ACTIVITY_OWNERS,
  RELATED_ENTITY_KINDS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import { isUuid } from "@/lib/activity-timeline/auth";
import { useCrmRelatedRecords } from "@/lib/activities/use-crm-related-records";
import RelatedRecordCombobox from "@/components/activities/tasks/RelatedRecordComboBox";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";

import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import { defaultActorName } from "@/lib/rules/actor";
import {
  createCrmNote,
  isCrmNoteId,
  persistRemoteNote,
} from "@/lib/notes/api";

interface CreateNoteFormProps {
  layoutId: string;
  redirect: boolean;
  defaults?: {
    relatedKind?: RelatedEntityKind;
    relatedName?: string;
    relatedId?: string;
  };
}

interface FormState {
  title: string;
  body: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  relatedId: string;
  noteType: NoteType | "";
  isPrivate: boolean;
  createdBy: string;
}

const initialState: FormState = {
  title: "",
  body: "",
  relatedKind: "",
  relatedName: "",
  relatedId: "",
  noteType: "General",
  isPrivate: false,
  createdBy: defaultActorName(),
};

export function CreateNoteForm({
  layoutId,
  redirect,
  defaults,
}: CreateNoteFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    ...initialState,
    relatedKind: defaults?.relatedKind ?? "",
    relatedName: defaults?.relatedName ?? "",
    relatedId: defaults?.relatedId ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const extra =
    form.relatedKind && form.relatedName
      ? { kind: form.relatedKind, name: form.relatedName }
      : undefined;
  const { options: relatedOptions, loading: relatedLoading } =
    useCrmRelatedRecords(form.relatedKind, extra);

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.body.trim()) next.body = "Body is required";
    if (!form.relatedKind || !form.relatedName) {
      next.relatedName = "Related To is required";
    } else if (!isUuid(form.relatedId)) {
      next.relatedName = "Pick a live CRM record";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const created = persistRemoteNote(
        await createCrmNote({
          title: form.title.trim() || form.body.trim().slice(0, 60),
          body: form.body.trim(),
          relatedTo: `${form.relatedKind}: ${form.relatedName}`,
          relatedType: form.relatedKind.toUpperCase(),
          relatedId: form.relatedId,
          noteType: (form.noteType || "General") as NoteType,
          createdBy: form.createdBy.trim() || defaultActorName(),
          isPrivate: form.isPrivate,
        }),
      );
      if (!created?.id || !isCrmNoteId(created.id)) {
        throw new Error("CRM did not save the note");
      }
      if (createAnother) {
        setForm({
          ...initialState,
          createdBy: form.createdBy,
          relatedKind: form.relatedKind,
          relatedName: form.relatedName,
          relatedId: form.relatedId,
        });
        setErrors({});
        setSubmitted(false);
        return;
      }
      void layoutId;
      void redirect;
      router.push(`/activities/notes/detail/${created.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Notes", href: "/activities/notes" }}
      badge="New note"
      title="Create Note"
      subtitle="Capture context against a related record: body and related to are required."
      tip="Tip: Body & Related To are required to save."
      cardIcon={StickyNote}
      cardTitle="Note Information"
      cardDescription="Fields marked required are needed to save (SRS §7.6)"
      listHref="/activities/notes"
      saveLabel="Save Note"
      onSave={handleSave}
    >
      {saveError ? (
        <p className="col-span-full text-[12px] text-rose-600">{saveError}</p>
      ) : null}
      {saving ? (
        <p className="col-span-full text-[12px] text-slate-500">Saving…</p>
      ) : null}
      <Field label="Title" className="col-span-full">
        <InputShell icon={StickyNote}>
          <input
            className={elevatedInputClass(true)}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Optional title"
          />
        </InputShell>
      </Field>

      <Field label="Related Entity">
        <InputShell icon={Link2}>
          <select
            className={elevatedSelectClass(true)}
            value={form.relatedKind}
            onChange={(e) => {
              update("relatedKind", e.target.value as RelatedEntityKind | "");
              update("relatedName", "");
              update("relatedId", "");
            }}
          >
            <option value="">Select entity</option>
            {RELATED_ENTITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field
        label="Related To"
        required
        error={submitted ? errors.relatedName : undefined}
      >
        <RelatedRecordCombobox
          value={form.relatedName}
          onChange={(name) => update("relatedName", name)}
          onSelectOption={(option) => update("relatedId", option?.id ?? "")}
          options={relatedOptions}
          disabled={!form.relatedKind}
          placeholder={
            relatedLoading
              ? "Loading CRM records…"
              : form.relatedKind
                ? "Search record…"
                : "Select related entity first"
          }
        />
      </Field>
      <Field label="Note Type">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.noteType}
            onChange={(e) => update("noteType", e.target.value as NoteType)}
          >
            {NOTE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Created By">
        <InputShell icon={User}>
          <select
            className={elevatedSelectClass(true)}
            value={form.createdBy}
            onChange={(e) => update("createdBy", e.target.value)}
          >
            {ACTIVITY_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Is Private" className="sm:col-span-2">
        <label className="flex h-10 cursor-pointer items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-3 shadow-sm transition-all hover:border-violet-300">
          <input
            type="checkbox"
            checked={form.isPrivate}
            onChange={(e) => update("isPrivate", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
          />
          <span className="flex items-center gap-1.5 text-[13px] text-slate-700">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            Only visible to you
          </span>
        </label>
      </Field>

      <Field
        label="Body"
        required
        error={submitted ? errors.body : undefined}
        className="col-span-full"
      >
        <MentionNotesTextarea
          error={!!(submitted && errors.body)}
          className={`${elevatedTextareaClass} min-h-[140px]`}
          value={form.body}
          onChange={(body) => update("body", body)}
          placeholder="Write your note… Type @ to assign someone."
        />
      </Field>
    </CreateEntityFormShell>
  );
}
