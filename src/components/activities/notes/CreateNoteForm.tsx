"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StickyNote, User, Link2, Lock } from "lucide-react";
import { NOTE_TYPES, type NoteType } from "@/lib/notes/types";
import {
  ACTIVITY_OWNERS,
  RELATED_ENTITY_KINDS,
  RELATED_RECORD_OPTIONS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";

interface CreateNoteFormProps {
  layoutId: string;
  redirect: boolean;
}

interface FormState {
  title: string;
  body: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  noteType: NoteType | "";
  isPrivate: boolean;
  createdBy: string;
}

const initialState: FormState = {
  title: "",
  body: "",
  relatedKind: "",
  relatedName: "",
  noteType: "General",
  isPrivate: false,
  createdBy: "John Smith",
};

export function CreateNoteForm({ layoutId, redirect }: CreateNoteFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const relatedOptions = form.relatedKind
    ? RELATED_RECORD_OPTIONS.filter((r) => r.kind === form.relatedKind)
    : RELATED_RECORD_OPTIONS;

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.body.trim()) next.body = "Body is required";
    if (!form.relatedKind || !form.relatedName) {
      next.relatedName = "Related To is required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    console.log("Saving note", { layoutId, redirect, ...form });
    if (createAnother) {
      setForm({ ...initialState, createdBy: form.createdBy });
      setErrors({});
      setSubmitted(false);
      return;
    }
    router.push("/activities/notes");
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Notes", href: "/activities/notes" }}
      badge="New note"
      title="Create Note"
      subtitle="Capture context against a related record — body and related to are required."
      tip="Tip: Body & Related To are required to save."
      cardIcon={StickyNote}
      cardTitle="Note Information"
      cardDescription="Fields marked required are needed to save (SRS §7.6)"
      listHref="/activities/notes"
      saveLabel="Save Note"
      onSave={handleSave}
    >
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
        <InputShell error={!!(submitted && errors.relatedName)}>
          <select
            className={elevatedSelectClass(false)}
            value={form.relatedName}
            onChange={(e) => update("relatedName", e.target.value)}
            disabled={!form.relatedKind}
          >
            <option value="">Select record</option>
            {relatedOptions.map((r) => (
              <option key={`${r.kind}-${r.name}`} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </InputShell>
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
        <TextAreaShell error={!!(submitted && errors.body)}>
          <textarea
            className={`${elevatedTextareaClass} min-h-[140px]`}
            value={form.body}
            onChange={(e) => update("body", e.target.value)}
            placeholder="Write your note…"
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
