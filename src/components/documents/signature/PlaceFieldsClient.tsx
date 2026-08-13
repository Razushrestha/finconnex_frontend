"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
    Send,
  Trash2,
  Save,
  PenLine,
  Calendar,
  Type,
  User,
  Check,
} from "lucide-react";
import {
  SIGNER_COLORS,
  ensureDefaultFields,
  fieldKindLabel,
  getSignatureRequestById,
  markRequestSent,
  upsertSignatureRequest,
  type SignatureField,
  type SignatureFieldKind,
  type SignatureRequest,
} from "@/lib/documents/signature/types";
import { SignatureDocPreview } from "./SignatureDocPreview";
import { cn } from "@/lib/utils";

const FIELD_KINDS: {
  kind: SignatureFieldKind;
  label: string;
  icon: React.ElementType;
  w: number;
  h: number;
}[] = [
  { kind: "signature", label: "Signature", icon: PenLine, w: 36, h: 7 },
  { kind: "initials", label: "Initials", icon: PenLine, w: 14, h: 6 },
  { kind: "date", label: "Date", icon: Calendar, w: 18, h: 5 },
  { kind: "name", label: "Full name", icon: User, w: 28, h: 5 },
  { kind: "text", label: "Text", icon: Type, w: 28, h: 5 },
];

export function PlaceFieldsClient({ id }: { id: string }) {
  const router = useRouter();
  const [req, setReq] = useState<SignatureRequest | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [activeSignerId, setActiveSignerId] = useState<string>("");
  const [placeKind, setPlaceKind] = useState<SignatureFieldKind>("signature");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const fieldsRef = useRef<SignatureField[]>([]);
  const reqRef = useRef<SignatureRequest | null>(null);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  useEffect(() => {
    reqRef.current = req;
  }, [req]);

  useEffect(() => {
    const live = getSignatureRequestById(id);
    if (!live) {
      setReq(null);
      setHydrated(true);
      return;
    }
    const normalized =
      live.fields.length === 0 ? ensureDefaultFields(live) : live;
    if (live.fields.length === 0) {
      upsertSignatureRequest(normalized);
    }
    setReq(normalized);
    setFields(normalized.fields);
    setActiveSignerId(normalized.signers[0]?.id ?? "");
    setHydrated(true);
  }, [id]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const preview = document.getElementById("place-preview-host");
      if (!preview) return;
      const rect = preview.getBoundingClientRect();
      const dx = ((e.clientX - d.startX) / rect.width) * 100;
      const dy = ((e.clientY - d.startY) / rect.height) * 100;
      setFields((prev) => {
        const next = prev.map((f) =>
          f.id === d.id
            ? {
                ...f,
                x: Math.min(92, Math.max(2, d.origX + dx)),
                y: Math.min(94, Math.max(2, d.origY + dy)),
              }
            : f,
        );
        fieldsRef.current = next;
        return next;
      });
    }
    function onUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      const current = reqRef.current;
      if (!current) return;
      const next = upsertSignatureRequest({
        ...current,
        fields: fieldsRef.current,
      });
      setReq(next);
      setFields(next.fields);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function persist(nextFields: SignatureField[], msg?: string) {
    const current = reqRef.current;
    if (!current) return;
    const next = upsertSignatureRequest({ ...current, fields: nextFields });
    setReq(next);
    setFields(next.fields);
    fieldsRef.current = next.fields;
    if (msg) flash(msg);
  }

  function placeAt(xPct: number, yPct: number) {
    if (!req || !activeSignerId) return;
    const meta = FIELD_KINDS.find((k) => k.kind === placeKind)!;
    const signer = req.signers.find((s) => s.id === activeSignerId);
    const idNew = `fld-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const field: SignatureField = {
      id: idNew,
      kind: placeKind,
      label: fieldKindLabel(placeKind),
      x: Math.min(100 - meta.w, Math.max(2, xPct - meta.w / 2)),
      y: Math.min(100 - meta.h, Math.max(2, yPct - meta.h / 2)),
      w: meta.w,
      h: meta.h,
      page: 1,
      signerId: activeSignerId,
      required: placeKind === "signature",
    };
    const next = [...fields, field];
    setSelectedId(idNew);
    persist(next, `Placed ${meta.label} for ${signer?.name ?? "signer"}`);
  }

  function patchField(id: string, patch: Partial<SignatureField>) {
    const next = fieldsRef.current.map((f) =>
      f.id === id ? { ...f, ...patch } : f,
    );
    setFields(next);
    persist(next);
  }

  function removeSelected() {
    if (!selectedId) return;
    const next = fields.filter((f) => f.id !== selectedId);
    setSelectedId(null);
    persist(next, "Field removed");
  }

  function saveDraft() {
    persist(fields, "Fields saved");
  }

  function saveAndOpenDetail() {
    persist(fields);
    router.push(`/documents/signature/${id}`);
  }

  function saveAndSend() {
    if (!req) return;
    const missing = req.signers.filter(
      (s) =>
        s.role !== "CC" &&
        !fields.some((f) => f.signerId === s.id && f.kind === "signature"),
    );
    if (missing.length) {
      flash(`Add a signature field for ${missing[0].name}`);
      setActiveSignerId(missing[0].id);
      return;
    }
    const withFields = upsertSignatureRequest({ ...req, fields });
    markRequestSent(withFields, withFields.createdBy);
    flash("Sent to signers");
    router.push(`/documents/signature/${id}`);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 text-[13px] text-slate-400">
        Loading…
      </div>
    );
  }

  if (!req) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 p-8">
        <p className="font-bold text-slate-900">Request not found</p>
        <Link
          href="/documents/signature"
          className="mt-3 text-[12px] font-semibold text-violet-700"
        >
          Back
        </Link>
      </div>
    );
  }

  if (req.status !== "Draft") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <p className="font-bold text-slate-900">Fields locked</p>
        <p className="mt-1 max-w-sm text-[13px] text-slate-500">
          This request is {req.status.toLowerCase()}. Field placement is only
          available while the request is a draft.
        </p>
        <Link
          href={`/documents/signature/${id}`}
          className="mt-4 text-[12px] font-semibold text-violet-700"
        >
          Open request
        </Link>
      </div>
    );
  }

  const selected = fields.find((f) => f.id === selectedId) ?? null;
  const counts = Object.fromEntries(
    req.signers.map((s) => [
      s.id,
      fields.filter((f) => f.signerId === s.id).length,
    ]),
  );

  return (
    <div className="relative flex min-h-full flex-col bg-slate-50">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 bg-white px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={() => router.push(`/documents/signature/${id}`)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          aria-label="Back"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <h1 className="text-[14px] font-bold text-slate-900">Place fields</h1>
        <p className="hidden text-[12px] text-slate-500 sm:block">
          · {req.documentName}
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            type="button"
            onClick={saveAndOpenDetail}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700"
          >
            <Check className="h-3.5 w-3.5" />
            Done
          </button>
          <button
            type="button"
            onClick={saveAndSend}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[220px_1fr_240px]">
        <aside className="space-y-4 border-b border-slate-200 bg-white p-4 lg:border-r lg:border-b-0">
          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Active signer
            </p>
            <div className="space-y-1.5">
              {req.signers.map((s) => {
                const color = SIGNER_COLORS[s.colorIndex % SIGNER_COLORS.length];
                const active = activeSignerId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSignerId(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors",
                      active
                        ? cn(color.border, color.bg)
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                        color.bg,
                        color.text,
                      )}
                    >
                      {s.order}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-slate-800">
                        {s.name}
                      </span>
                      <span className="block truncate text-[10px] text-slate-400">
                        {counts[s.id] ?? 0} field
                        {(counts[s.id] ?? 0) === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Field type
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {FIELD_KINDS.map((k) => {
                const Icon = k.icon;
                const active = placeKind === k.kind;
                return (
                  <button
                    key={k.kind}
                    type="button"
                    onClick={() => setPlaceKind(k.kind)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px] font-semibold",
                      active
                        ? "border-violet-300 bg-violet-50 text-violet-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {k.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Select a signer and field type, then click the document to place.
              Drag fields to adjust.
            </p>
          </div>
        </aside>

        <div className="flex min-h-0 flex-col p-4 sm:p-5">
          <div id="place-preview-host" className="mx-auto w-full max-w-md">
            <SignatureDocPreview
              fileName={req.documentFile}
              fields={fields}
              signers={req.signers}
              selectedFieldId={selectedId}
              highlightSignerId={activeSignerId}
              interactive
              onCanvasClick={placeAt}
              onFieldClick={setSelectedId}
              onFieldPointerDown={(fieldId, e) => {
                const f = fields.find((x) => x.id === fieldId);
                if (!f) return;
                setSelectedId(fieldId);
                dragRef.current = {
                  id: fieldId,
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: f.x,
                  origY: f.y,
                };
              }}
            />
          </div>
        </div>

        <aside className="border-t border-slate-200 bg-white p-4 lg:border-t-0 lg:border-l">
          <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Selected field
          </p>
          {selected ? (
            <div className="space-y-3">
              <dl className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-[12px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Type</dt>
                  <dd className="font-semibold text-slate-800">
                    {fieldKindLabel(selected.kind)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Signer</dt>
                  <dd className="truncate font-semibold text-slate-800">
                    {req.signers.find((s) => s.id === selected.signerId)?.name}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Position</dt>
                  <dd className="font-medium text-slate-700">
                    {Math.round(selected.x)}%, {Math.round(selected.y)}%
                  </dd>
                </div>
              </dl>

              <label className="block text-[11px] font-semibold text-slate-600">
                Label
                <input
                  value={selected.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    setFields((prev) => {
                      const next = prev.map((f) =>
                        f.id === selected.id ? { ...f, label } : f,
                      );
                      fieldsRef.current = next;
                      return next;
                    });
                  }}
                  onBlur={() => {
                    const live = fieldsRef.current.find(
                      (f) => f.id === selected.id,
                    );
                    if (live) patchField(selected.id, { label: live.label });
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-violet-400"
                />
              </label>

              <label className="flex items-center gap-2 text-[12px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={selected.required}
                  onChange={(e) =>
                    patchField(selected.id, { required: e.target.checked })
                  }
                  className="rounded border-slate-300 text-violet-600"
                />
                Required
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] font-semibold text-slate-600">
                  Width %
                  <input
                    type="number"
                    min={8}
                    max={80}
                    value={Math.round(selected.w)}
                    onChange={(e) =>
                      patchField(selected.id, { w: Number(e.target.value) })
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[12px]"
                  />
                </label>
                <label className="text-[11px] font-semibold text-slate-600">
                  Height %
                  <input
                    type="number"
                    min={4}
                    max={20}
                    value={Math.round(selected.h)}
                    onChange={(e) =>
                      patchField(selected.id, { h: Number(e.target.value) })
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[12px]"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={removeSelected}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove field
              </button>
            </div>
          ) : (
            <p className="text-[12px] leading-relaxed text-slate-400">
              Click a field on the preview to edit its size, label, or assignee.
            </p>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
            <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Checklist
            </p>
            <ul className="mt-2 space-y-1.5">
              {req.signers.map((s) => {
                const hasSig = fields.some(
                  (f) => f.signerId === s.id && f.kind === "signature",
                );
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-2 text-[12px] text-slate-700"
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white",
                        hasSig ? "bg-emerald-500" : "bg-slate-300",
                      )}
                    >
                      {hasSig ? "✓" : s.order}
                    </span>
                    {s.name}
                    <span className="ml-auto text-[10px] text-slate-400">
                      {hasSig ? "Ready" : "Needs signature"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>

      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
