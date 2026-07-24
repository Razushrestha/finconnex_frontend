"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Upload } from "lucide-react";
import {
  getSettingsSchema,
  type SettingsField,
  type SettingsSchema,
} from "@/lib/settings/settings-schemas";
import {
  loadSettingsValues,
  saveSettingsValues,
  type SettingsValues,
} from "@/lib/settings/settings-store";
import { cn } from "@/lib/utils";

export function SettingsFormClient({
  categorySlug,
  subpageSlug,
  path,
  moduleHref,
  moduleLabel,
}: {
  categorySlug: string;
  subpageSlug: string;
  path: string;
  moduleHref?: string;
  moduleLabel?: string;
}) {
  const schema = useMemo(
    () => getSettingsSchema(categorySlug, subpageSlug),
    [categorySlug, subpageSlug],
  );
  const schemaKey = `${categorySlug}/${subpageSlug}`;
  const [values, setValues] = useState<SettingsValues>(() =>
    defaultsFromSchema(schema),
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadSettingsValues(schemaKey);
    setValues({ ...defaultsFromSchema(schema), ...saved });
  }, [schemaKey, schema]);

  function setField(id: string, value: string | boolean | number) {
    setValues((v) => ({ ...v, [id]: value }));
  }

  function onCancel() {
    const saved = loadSettingsValues(schemaKey);
    setValues({ ...defaultsFromSchema(schema), ...saved });
    setToast("Reverted to last saved");
    window.setTimeout(() => setToast(null), 1800);
  }

  function onSave() {
    saveSettingsValues(schemaKey, values, {
      path,
      title: schema.title,
    });
    setToast("Saved");
    window.setTimeout(() => setToast(null), 1800);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-bold tracking-tight text-slate-900">
              {schema.title}
            </h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
              {schema.description}
            </p>
          </div>
          {moduleHref ? (
            <Link
              href={moduleHref}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {moduleLabel || "Open module"}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {schema.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={(v) => setField(field.id, v)}
          />
        ))}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="h-9 rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700"
        >
          Save changes
        </button>
      </div>

      {toast && (
        <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function defaultsFromSchema(schema: SettingsSchema): SettingsValues {
  const out: SettingsValues = {};
  for (const f of schema.fields) {
    if (f.defaultValue !== undefined) out[f.id] = f.defaultValue;
    else if (f.type === "toggle") out[f.id] = false;
    else if (f.type === "number") out[f.id] = 0;
    else out[f.id] = "";
  }
  return out;
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: SettingsField;
  value: string | boolean | number | undefined;
  onChange: (v: string | boolean | number) => void;
}) {
  if (field.type === "toggle") {
    const on = Boolean(value);
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
        <div>
          <p className="text-[12px] font-semibold text-slate-800">
            {field.label}
          </p>
          {field.help && (
            <p className="mt-0.5 text-[11px] text-slate-400">{field.help}</p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onChange(!on)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            on ? "bg-violet-600" : "bg-slate-300",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              on && "translate-x-5",
            )}
          />
        </button>
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-violet-600">
            <Upload className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-slate-800">
              {field.label}
            </p>
            <p className="text-[11px] text-slate-400">
              .png, .jpg, or .svg: up to 5MB (demo)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange("uploaded-demo.png")}
            className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block space-y-1.5">
        <span className="text-[12px] font-semibold text-slate-700">
          {field.label}
        </span>
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        >
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="block space-y-1.5">
        <span className="text-[12px] font-semibold text-slate-700">
          {field.label}
        </span>
        <textarea
          rows={3}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </label>
    );
  }

  if (field.type === "number") {
    return (
      <label className="block space-y-1.5">
        <span className="text-[12px] font-semibold text-slate-700">
          {field.label}
        </span>
        <input
          type="number"
          value={Number(value ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </label>
    );
  }

  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-semibold text-slate-700">
        {field.label}
      </span>
      <input
        type="text"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
    </label>
  );
}
