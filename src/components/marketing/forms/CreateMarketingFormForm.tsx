"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, User, Type, Plus, Trash2 } from "lucide-react";
import {
  FORM_FIELD_TYPES,
  FORM_STATUSES,
  nextFormIds,
  upsertMarketingForm,
  type FormFieldDef,
  type FormFieldType,
  type FormStatus,
} from "@/lib/marketing/forms/types";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";

interface Props {
  layoutId: string;
  redirect: boolean;
}

export function CreateMarketingFormForm({
  layoutId: _l,
  redirect: _r,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<FormStatus>("Draft");
  const [createdBy, setCreatedBy] = useState<string>(ACTIVITY_OWNERS[0]);
  const [fieldDefs, setFieldDefs] = useState<FormFieldDef[]>([
    { id: "nf1", label: "Full name", type: "Text", required: true },
    { id: "nf2", label: "Email", type: "Email", required: true },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Form name is required";
    if (fieldDefs.length === 0) next.fields = "Add at least one field";
    if (fieldDefs.some((f) => !f.label.trim()))
      next.fields = "Every field needs a label";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function addField() {
    setFieldDefs((prev) => [
      ...prev,
      {
        id: `nf-${Date.now()}`,
        label: "",
        type: "Text",
        required: false,
      },
    ]);
  }

  function updateField(id: string, patch: Partial<FormFieldDef>) {
    setFieldDefs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  }

  function removeField(id: string) {
    setFieldDefs((prev) => prev.filter((f) => f.id !== id));
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextFormIds(name);
    const created = upsertMarketingForm({
      id: ids.id,
      formId: ids.formId,
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      submissions: 0,
      fields: fieldDefs.length,
      fieldDefs,
      createdBy,
      updatedAt: new Date().toLocaleDateString("en-AU"),
      embedSlug: ids.embedSlug,
    });
    if (createAnother) {
      setName("");
      setDescription("");
      setFieldDefs([
        { id: "nf1", label: "Full name", type: "Text", required: true },
        { id: "nf2", label: "Email", type: "Email", required: true },
      ]);
      setErrors({});
      return;
    }
    router.push(`/marketing/forms/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Forms", href: "/marketing/forms" }}
      badge="Embed"
      title="Create Form"
      subtitle="Build a lead or intake form with fields staff can embed."
      tip="Name and at least one field are required."
      cardIcon={ClipboardList}
      cardTitle="Form builder"
      cardDescription="SRS §21 — public embed at /f/[slug]"
      listHref="/marketing/forms"
      saveLabel="Save form"
      onSave={onSave}
    >
      <Field
        label="Form name"
        required
        error={errors.name}
        className="sm:col-span-2 lg:col-span-3"
      >
        <InputShell icon={Type} error={!!errors.name}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lead capture — home loan"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field label="Status">
        <InputShell>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as FormStatus)}
            className={elevatedSelectClass()}
          >
            {FORM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Created by">
        <InputShell icon={User}>
          <select
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            className={elevatedSelectClass(true)}
          >
            {ACTIVITY_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field
        label="Description"
        className="sm:col-span-2 lg:col-span-3"
      >
        <TextAreaShell>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Shown above the public form…"
            className={elevatedTextareaClass}
            rows={2}
          />
        </TextAreaShell>
      </Field>

      <div className="sm:col-span-2 lg:col-span-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            Fields
            {errors.fields ? (
              <span className="normal-case text-rose-600">
                {" "}
                · {errors.fields}
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={addField}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700"
          >
            <Plus className="h-3 w-3" />
            Add field
          </button>
        </div>
        <div className="space-y-2">
          {fieldDefs.map((f) => (
            <div
              key={f.id}
              className="grid gap-2 rounded-xl border border-slate-200/80 bg-slate-50/40 p-2.5 sm:grid-cols-[1fr_140px_auto_auto]"
            >
              <input
                value={f.label}
                onChange={(e) => updateField(f.id, { label: e.target.value })}
                placeholder="Field label"
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-violet-500"
              />
              <select
                value={f.type}
                onChange={(e) =>
                  updateField(f.id, {
                    type: e.target.value as FormFieldType,
                  })
                }
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none"
              >
                {FORM_FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <label className="flex h-9 items-center gap-1.5 px-1 text-[11px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) =>
                    updateField(f.id, { required: e.target.checked })
                  }
                  className="rounded border-slate-300"
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => removeField(f.id)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Remove field"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </CreateEntityFormShell>
  );
}
