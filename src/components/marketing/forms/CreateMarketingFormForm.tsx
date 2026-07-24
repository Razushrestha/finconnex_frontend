"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, User, Type, Plus, Trash2, Route } from "lucide-react";
import {
  FORM_DESTINATIONS,
  FORM_FIELD_TYPES,
  FORM_STATUSES,
  journeyOptionsForForms,
  nextFormIds,
  upsertMarketingForm,
  type FormDestination,
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
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [status, setStatus] = useState<FormStatus>("Draft");
  const [destination, setDestination] = useState<FormDestination>("Lead");
  const [journeyId, setJourneyId] = useState("");
  const [journeys, setJourneys] = useState<
    ReturnType<typeof journeyOptionsForForms>
  >([]);
  const [createdBy, setCreatedBy] = useState<string>(ACTIVITY_OWNERS[0]);
  const [fieldDefs, setFieldDefs] = useState<FormFieldDef[]>([
    { id: "nf1", label: "Full name", type: "Text", required: true },
    { id: "nf2", label: "Email", type: "Email", required: true },
    {
      id: "nf3",
      label: "Interest",
      type: "Select",
      required: true,
      options: ["Purchase", "Refinance"],
    },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setJourneys(journeyOptionsForForms());
  }, []);

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
      prev.map((f) => {
        if (f.id !== id) return f;
        const next = { ...f, ...patch };
        if (patch.type === "Select" && !next.options?.length) {
          next.options = ["Option A", "Option B"];
        }
        return next;
      }),
    );
  }

  function removeField(id: string) {
    setFieldDefs((prev) =>
      prev
        .filter((f) => f.id !== id)
        .map((f) =>
          f.showWhen?.fieldId === id ? { ...f, showWhen: undefined } : f,
        ),
    );
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextFormIds(name);
    const journey = journeys.find((j) => j.id === journeyId);
    const created = upsertMarketingForm({
      id: ids.id,
      formId: ids.formId,
      name: name.trim(),
      description: description.trim() || undefined,
      thankYouMessage: thankYouMessage.trim() || undefined,
      status,
      destination,
      journeyId: journeyId || undefined,
      journeyName: journey?.label,
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
      setThankYouMessage("");
      setJourneyId("");
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
      badge="§21"
      title="Create Form"
      subtitle="Embeddable form with routing, conditions, and optional journey."
      tip="Name, destination, and at least one field are required."
      cardIcon={ClipboardList}
      cardTitle="Form builder"
      cardDescription="Public embed at /f/[slug] · routes to CRM on submit"
      listHref="/marketing/forms"
      saveLabel="Save form"
      onSave={onSave}
    >
      <Field
        label="Form name"
        required
        error={errors.name}
        className="col-span-full"
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

      <Field label="Route to" required>
        <InputShell>
          <select
            value={destination}
            onChange={(e) =>
              setDestination(e.target.value as FormDestination)
            }
            className={elevatedSelectClass()}
          >
            {FORM_DESTINATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
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
        label="Trigger journey on submit (optional)"
        className="sm:col-span-2"
      >
        <InputShell icon={Route}>
          <select
            value={journeyId}
            onChange={(e) => setJourneyId(e.target.value)}
            className={elevatedSelectClass(true)}
          >
            <option value="">None</option>
            {journeys.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label} ({j.status})
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Description" className="col-span-full">
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

      <Field
        label="Thank-you message"
        className="col-span-full"
      >
        <input
          value={thankYouMessage}
          onChange={(e) => setThankYouMessage(e.target.value)}
          placeholder="Thanks — we'll be in touch."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-violet-500"
        />
      </Field>

      <div className="col-span-full">
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
              className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/40 p-2.5"
            >
              <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto_auto]">
                <input
                  value={f.label}
                  onChange={(e) =>
                    updateField(f.id, { label: e.target.value })
                  }
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
              {f.type === "Select" ? (
                <input
                  value={(f.options ?? []).join(", ")}
                  onChange={(e) =>
                    updateField(f.id, {
                      options: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Options (comma-separated)"
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] outline-none"
                />
              ) : null}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-semibold text-slate-500">Show when</span>
                <select
                  value={f.showWhen?.fieldId ?? ""}
                  onChange={(e) => {
                    const fieldId = e.target.value;
                    if (!fieldId) {
                      updateField(f.id, { showWhen: undefined });
                      return;
                    }
                    updateField(f.id, {
                      showWhen: {
                        fieldId,
                        equals: f.showWhen?.equals ?? "",
                      },
                    });
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 outline-none"
                >
                  <option value="">Always</option>
                  {fieldDefs
                    .filter((x) => x.id !== f.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label || x.id}
                      </option>
                    ))}
                </select>
                {f.showWhen ? (
                  <>
                    <span className="text-slate-400">equals</span>
                    <input
                      value={f.showWhen.equals}
                      onChange={(e) =>
                        updateField(f.id, {
                          showWhen: {
                            fieldId: f.showWhen!.fieldId,
                            equals: e.target.value,
                          },
                        })
                      }
                      placeholder="value"
                      className="h-8 w-36 rounded-lg border border-slate-200 bg-white px-2 outline-none"
                    />
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </CreateEntityFormShell>
  );
}
