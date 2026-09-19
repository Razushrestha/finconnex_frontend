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
import {
  overlayCatalogValues,
  overlaySecurityValues,
  overlaySettingsValues,
  patchCrmWorkspaceSettings,
  saveCrmSettingsFormPage,
  valuesToSettingsPatch,
  type CrmSecuritySettings,
  type CrmWorkspaceSettings,
} from "@/lib/settings/api";
import { useCrmSettings } from "@/lib/settings/use-crm-settings";
import {
  overlayMemberPreferences,
  tryCrmWorkspaceOperations,
  updateCrmWorkspaceMemberPreferences,
} from "@/lib/workspace-operations/api";
import { useCrmWorkspaceMemberPreferences } from "@/lib/workspace-operations/use-crm-workspace-member-preferences";
import { ThemeModeToggle } from "@/components/layout/ThemeModeToggle";
import { uploadCrmStorageFile, type CrmStorageObject } from "@/lib/storage/api";
import { loadSignature, saveSignature } from "@/lib/emails/signature";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify/toast";

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
  const crm = useCrmSettings();
  const memberPrefs = useCrmWorkspaceMemberPreferences(
    categorySlug === "my-preferences",
  );
  const [values, setValues] = useState<SettingsValues>(() =>
    defaultsFromSchema(schema),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(hydrateSettingsForm(schema, schemaKey, crm, memberPrefs.preferences));
  }, [schemaKey, schema, crm.settings, crm.security, memberPrefs.preferences]);

  function setField(id: string, value: string | boolean | number) {
    setValues((v) => ({ ...v, [id]: value }));
    if (
      schemaKey === "organization/branding" &&
      (id === "primaryColor" || id === "secondaryColor") &&
      typeof value === "string"
    ) {
      crm.setPreviewBrand({
        ...(crm.previewBrand ?? {}),
        [id]: value,
      });
    }
    if (schemaKey === "organization/branding" && id === "logoLight") {
      crm.setSettings({
        ...(crm.settings ?? {}),
        logoUrl: typeof value === "string" && value ? crm.settings?.logoUrl ?? null : null,
      });
    }
    if (schemaKey === "organization/branding" && id === "logoDark") {
      crm.setSettings({
        ...(crm.settings ?? {}),
        logoDarkUrl:
          typeof value === "string" && value
            ? crm.settings?.logoDarkUrl ?? null
            : null,
      });
    }
  }

  function onCancel() {
    crm.setPreviewBrand(null);
    setValues(hydrateSettingsForm(schema, schemaKey, crm, memberPrefs.preferences));
    notify("Reverted to last saved");
  }

  async function onSave() {
    setSaving(true);
    saveSettingsValues(schemaKey, values, {
      path,
      title: schema.title,
    });
    if (schemaKey === "organization/branding") {
      crm.setSettings({
        ...(crm.settings ?? {}),
        primaryColor: String(values.primaryColor ?? crm.settings?.primaryColor ?? ""),
        secondaryColor: String(
          values.secondaryColor ?? crm.settings?.secondaryColor ?? "",
        ),
        catalog: {
          ...(crm.settings?.catalog ?? {}),
          [schemaKey]: values,
        },
      });
      crm.setPreviewBrand(null);
    }
    if (schemaKey === "communication/email-signatures" || schemaKey === "my-preferences/signature") {
      const body = String(values.body ?? "");
      if (body.trim()) saveSignature(body);
    }
    if (categorySlug === "my-preferences") {
      const patched = await tryCrmWorkspaceOperations(() =>
        updateCrmWorkspaceMemberPreferences(values),
      );
      if (patched) memberPrefs.setPreferences(patched);
    }
    if (crm.source === "api") {
      try {
        const patched =
          categorySlug === "my-preferences"
            ? await patchCrmWorkspaceSettings(
                valuesToSettingsPatch(values, crm.settings?.revision),
              )
            : await saveCrmSettingsFormPage(
                categorySlug,
                subpageSlug,
                values,
                crm.settings?.revision,
              );
        crm.setSettings(patched);
        notify("Saved to CRM");
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "CRM rejected these settings",
        );
        setSaving(false);
        return;
      }
    } else {
      notify(memberPrefs.source === "api" ? "Saved to CRM" : "Saved");
    }
    setSaving(false);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100">
      <div className="border-b border-slate-100 bg-[#F4F1FA]/70 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-bold tracking-tight text-slate-900">
              {schema.title}
            </h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
              {schema.description}
            </p>
            <span
              className={cn(
                "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                crm.source === "api"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {crm.source === "api"
                ? "Saved to CRM"
                : crm.loading
                  ? "Connecting…"
                  : "Saved on this device"}
            </span>
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

      <div className="grid grid-cols-1 gap-x-5 gap-y-4 p-5 sm:p-6 xl:grid-cols-2">
        {schema.fields.map((field) => (
          <div
            key={field.id}
            className={
              field.type === "textarea" ||
              field.type === "file" ||
              field.type === "color"
                ? "xl:col-span-2"
                : undefined
            }
          >
            <FieldRenderer
              field={field}
              value={values[field.id]}
              onChange={(v) => setField(field.id, v)}
              onAssetUploaded={(stored) => {
                if (!crm.settings && crm.source !== "api") {
                  crm.setSettings({
                    logoUrl:
                      field.id === "logoLight"
                        ? stored.url
                        : undefined,
                    logoDarkUrl:
                      field.id === "logoDark"
                        ? stored.url
                        : undefined,
                  });
                  return;
                }
                crm.setSettings({
                  ...(crm.settings ?? {}),
                  logoUrl:
                    field.id === "logoLight"
                      ? stored.url
                      : crm.settings?.logoUrl,
                  logoDarkUrl:
                    field.id === "logoDark"
                      ? stored.url
                      : crm.settings?.logoDarkUrl,
                });
              }}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-slate-100 bg-slate-50/95 px-5 py-4">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className="h-9 rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function hydrateSettingsForm(
  schema: SettingsSchema,
  schemaKey: string,
  crm: {
    settings: CrmWorkspaceSettings | null;
    security: CrmSecuritySettings | null;
  },
  memberPreferences: Parameters<typeof overlayMemberPreferences>[1],
): SettingsValues {
  const saved = loadSettingsValues(schemaKey);
  let next = { ...defaultsFromSchema(schema), ...saved };
  if (crm.settings) {
    next = overlaySettingsValues(next, crm.settings);
    next = overlayCatalogValues(next, crm.settings, schemaKey);
    if (crm.settings.logoUrl) next.logoLight = crm.settings.logoUrl;
    if (crm.settings.logoDarkUrl) next.logoDark = crm.settings.logoDarkUrl;
  }
  if (crm.security) next = overlaySecurityValues(next, crm.security);
  if (memberPreferences) {
    next = overlayMemberPreferences(next, memberPreferences);
  }
  if (
    (schemaKey === "communication/email-signatures" ||
      schemaKey === "my-preferences/signature") &&
    !String(next.body ?? "").trim()
  ) {
    const local = loadSignature();
    if (local) next.body = local;
  }
  return next;
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
  onAssetUploaded,
}: {
  field: SettingsField;
  value: string | boolean | number | undefined;
  onChange: (v: string | boolean | number) => void;
  onAssetUploaded?: (stored: CrmStorageObject) => void;
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
      <BrandingFileField
        field={field}
        value={String(value ?? "")}
        onChange={onChange}
        onAssetUploaded={onAssetUploaded}
      />
    );
  }

  if (field.type === "select") {
    if (field.id === "theme") {
      return (
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold text-slate-700">
            {field.label}
          </p>
          <ThemeModeToggle onChange={(mode) => onChange(mode)} />
          <p className="text-[11px] text-slate-400">
            Light or dark appearance for your account.
          </p>
        </div>
      );
    }
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
        {field.help ? (
          <p className="text-[11px] text-slate-400">{field.help}</p>
        ) : null}
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

  if (field.type === "color") {
    return (
      <ColorField
        field={field}
        value={String(value ?? "")}
        onChange={onChange}
      />
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

function toPickerHex(value: string): string {
  const t = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return "#7C3AED";
}

const DEFAULT_COLOR_PALETTE: { label: string; value: string }[] = [
  { label: "FinConnex", value: "#5A32A3" },
  { label: "Violet", value: "#7C3AED" },
  { label: "Indigo", value: "#4F46E5" },
  { label: "Blue", value: "#2563EB" },
  { label: "Sky", value: "#0EA5E9" },
  { label: "Teal", value: "#0D9488" },
  { label: "Green", value: "#059669" },
  { label: "Gold", value: "#CA8A04" },
  { label: "Orange", value: "#EA580C" },
  { label: "Red", value: "#DC2626" },
  { label: "Pink", value: "#DB2777" },
  { label: "Navy", value: "#0F172A" },
];

function ColorField({
  field,
  value,
  onChange,
}: {
  field: SettingsField;
  value: string;
  onChange: (v: string | boolean | number) => void;
}) {
  const picker = toPickerHex(value);
  const selected = picker.toLowerCase();
  const palette = field.options?.length ? field.options : DEFAULT_COLOR_PALETTE;

  return (
    <div className="space-y-2">
      <span className="text-[12px] font-semibold text-slate-700">
        {field.label}
      </span>
      <div className="flex items-center gap-2">
        <label className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 shadow-sm">
          <span
            className="pointer-events-none absolute inset-0"
            style={{ backgroundColor: picker }}
            aria-hidden
          />
          <input
            type="color"
            value={picker.toLowerCase()}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            aria-label={`${field.label} colour picker`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <input
          type="text"
          value={value}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onChange(toPickerHex(value))}
          placeholder="#5A32A3"
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 font-mono text-[13px] uppercase text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </div>
      <div
        className="flex flex-wrap gap-1.5"
        role="listbox"
        aria-label={`${field.label} palette`}
      >
        {palette.map((swatch) => {
          const hex = swatch.value.toUpperCase();
          const active = hex.toLowerCase() === selected;
          const light = hex === "#FFFFFF";
          return (
            <button
              key={`${swatch.label}-${hex}`}
              type="button"
              role="option"
              aria-selected={active}
              title={swatch.label}
              onClick={() => onChange(hex)}
              className={cn(
                "h-7 w-7 rounded-full border shadow-sm transition",
                light ? "border-slate-300" : "border-black/10",
                active
                  ? "ring-2 ring-[#5A32A3] ring-offset-2"
                  : "hover:scale-105",
              )}
              style={{ backgroundColor: hex }}
            >
              <span className="sr-only">{swatch.label}</span>
            </button>
          );
        })}
      </div>
      {field.help ? (
        <p className="text-[11px] text-slate-400">{field.help}</p>
      ) : null}
    </div>
  );
}

function previewSrc(value: string): string {
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/api/") ||
    value.startsWith("data:")
  ) {
    return value;
  }
  return "";
}

function BrandingFileField({
  field,
  value,
  onChange,
  onAssetUploaded,
}: {
  field: SettingsField;
  value: string;
  onChange: (v: string) => void;
  onAssetUploaded?: (stored: CrmStorageObject) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = previewSrc(value);

  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-violet-600">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-contain" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </div>
        <div>
          <p className="text-[12px] font-semibold text-slate-800">
            {field.label}
          </p>
          <p className="text-[11px] text-slate-400">
            PNG, JPG, SVG, or WebP up to 5 MB. Stored on CRM storage.
          </p>
          {value && !preview ? (
            <p className="mt-0.5 truncate text-[10px] text-slate-500">{value}</p>
          ) : null}
          {error ? (
            <p className="mt-0.5 text-[11px] font-medium text-rose-600">{error}</p>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2">
        <label className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white disabled:opacity-60">
          {busy ? "Uploading…" : "Upload"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico,.svg"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) {
                setError("File must be 5 MB or smaller.");
                return;
              }
              setBusy(true);
              setError("");
              void (async () => {
                try {
                  const stored = await uploadCrmStorageFile(file);
                  onChange(stored.key);
                  onAssetUploaded?.(stored);
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Could not upload this file to CRM storage.",
                  );
                } finally {
                  setBusy(false);
                }
              })();
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setError("");
            onChange("");
          }}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
