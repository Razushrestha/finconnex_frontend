"use client";

import { useState } from "react";
import {
  PenLine,
  FileText,
  User,
  Link2,
  Calendar,
  Mail,
  Plus,
  Trash2,
  Users,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
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
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import {
  buildSignersFromDraft,
  formatAuditAt,
  nextSignatureIds,
  upsertSignatureRequest,
  type SigningOrderMode,
} from "@/lib/documents/signature/types";
import { cn } from "@/lib/utils";

interface Props {
  layoutId: string;
  redirect: boolean;
}

type SignerRow = { key: string; name: string; email: string };

function formatExpiry(iso: string) {
  if (!iso) {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toLocaleDateString("en-AU");
  }
  const [y, m, day] = iso.split("-");
  return `${day}/${m}/${y}`;
}

function SectionLabel({
  icon: Icon,
  title,
  end,
}: {
  icon: React.ElementType;
  title: string;
  end?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-50 text-violet-600">
          <Icon className="h-3 w-3" />
        </span>
        <p className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
          {title}
        </p>
      </div>
      {end}
    </div>
  );
}

function newRow(): SignerRow {
  return {
    key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    email: "",
  };
}

export function CreateSignatureForm({ layoutId: _l, redirect: _r }: Props) {
  const [documentName, setDocumentName] = useState("");
  const [documentFile, setDocumentFile] = useState("");
  const [signers, setSigners] = useState<SignerRow[]>([newRow()]);
  const [signingOrder, setSigningOrder] =
    useState<SigningOrderMode>("sequential");
  const [relatedKind, setRelatedKind] = useState<RelatedEntityKind | "">("");
  const [relatedName, setRelatedName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [createdBy, setCreatedBy] = useState<string>(ACTIVITY_OWNERS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const relatedOptions = relatedKind
    ? RELATED_RECORD_OPTIONS.filter((r) => r.kind === relatedKind)
    : RELATED_RECORD_OPTIONS;

  const resolvedFileName = documentFile.trim()
    ? documentFile.trim().endsWith(".pdf")
      ? documentFile.trim()
      : `${documentFile.trim()}.pdf`
    : "";

  const resolvedExpiry = formatExpiry(expiryDate);

  function updateSigner(key: string, patch: Partial<SignerRow>) {
    setSigners((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    );
  }

  function moveSigner(index: number, dir: -1 | 1) {
    setSigners((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!documentName.trim()) next.documentName = "Document name is required";
    if (!documentFile.trim()) next.documentFile = "Document file is required";
    if (signers.length === 0) next.signers = "Add at least one signer";
    signers.forEach((s, i) => {
      if (!s.name.trim()) next[`signer-name-${i}`] = "Name required";
      if (!s.email.trim() || !s.email.includes("@"))
        next[`signer-email-${i}`] = "Valid email required";
    });
    const emails = signers
      .map((s) => s.email.trim().toLowerCase())
      .filter(Boolean);
    if (new Set(emails).size !== emails.length) {
      next.signers = "Each signer needs a unique email";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildDraft() {
    const ids = nextSignatureIds();
    const relatedTo =
      relatedKind && relatedName ? `${relatedKind}: ${relatedName}` : undefined;
    const builtSigners = buildSignersFromDraft(
      signers.map((s) => ({ name: s.name, email: s.email })),
    );
    const primary = builtSigners[0];
    if (!primary) {
      throw new Error("Add at least one signer");
    }
    return upsertSignatureRequest(
      {
        id: ids.id,
        signatureRequestId: ids.signatureRequestId,
        documentName: documentName.trim(),
        documentFile: resolvedFileName,
        signer: primary.name,
        signerEmail: primary.email,
        signers: builtSigners,
        fields: [],
        signingOrder,
        relatedTo,
        status: "Draft",
        expiryDate: resolvedExpiry,
        createdBy,
        manageToken: primary.token,
        audit: [
          {
            id: `a-${Date.now()}`,
            at: formatAuditAt(),
            action: `Created · ${builtSigners.length} signer(s)`,
            actor: createdBy,
          },
        ],
      },
      { allowEmptyFields: true },
    );
  }

  function onSave(createAnother: boolean) {
    if (!validate()) {
      window.requestAnimationFrame(() => {
        const el =
          document.querySelector("[data-field-error]") ||
          document.querySelector(".text-rose-500, .text-rose-600");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    try {
      const draft = buildDraft();
      if (createAnother) {
        setDocumentName("");
        setDocumentFile("");
        setSigners([newRow()]);
        setSigningOrder("sequential");
        setRelatedKind("");
        setRelatedName("");
        setExpiryDate("");
        setErrors({});
        return;
      }
      window.location.assign(`/documents/signature/place/${draft.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create signature request";
      setErrors({ form: message });
    }
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "E-Signature", href: "/documents/signature" }}
      badge="Multi-signer"
      title="Create Signature Request"
      subtitle="Add signers, then place fields before sending."
      tip="Document + signer required"
      cardIcon={PenLine}
      cardTitle="Signature request"
      cardDescription=""
      listHref="/documents/signature"
      saveLabel="Continue to place fields"
      onSave={onSave}
    >
      <div className="col-span-full space-y-3">
        {errors.form ? (
          <p
            data-field-error
            className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-700"
          >
            {errors.form}
          </p>
        ) : null}

        {/* Document */}
        <section>
          <SectionLabel icon={FileText} title="Document" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Field
              label="Document name"
              required
              error={errors.documentName}
            >
              <InputShell icon={FileText} error={!!errors.documentName}>
                <input
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Engagement Letter: Anderson"
                  className={elevatedInputClass(true)}
                  data-field-error={errors.documentName ? true : undefined}
                />
              </InputShell>
            </Field>
            <Field
              label="Document file"
              required
              error={errors.documentFile}
            >
              <InputShell icon={FileText} error={!!errors.documentFile}>
                <input
                  value={documentFile}
                  onChange={(e) => setDocumentFile(e.target.value)}
                  placeholder="filename.pdf"
                  className={elevatedInputClass(true)}
                />
              </InputShell>
            </Field>
          </div>
        </section>

        {/* Signers */}
        <section>
          <SectionLabel
            icon={Users}
            title="Signers"
            end={
              <div className="inline-flex rounded-md bg-slate-100 p-0.5">
                {(
                  [
                    ["sequential", "One after another"],
                    ["parallel", "All at once"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSigningOrder(mode)}
                    className={cn(
                      "rounded px-2 py-1 text-[10px] font-semibold transition-colors",
                      signingOrder === mode
                        ? "bg-white text-violet-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
          />
          {errors.signers ? (
            <p className="mb-1 text-[11px] font-medium text-rose-600">
              {errors.signers}
            </p>
          ) : null}

          <div className="space-y-1.5">
            {signers.map((s, i) => (
              <div
                key={s.key}
                className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/50 px-2 py-1.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                  {i + 1}
                </span>
                {signingOrder === "sequential" && signers.length > 1 ? (
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveSigner(i, -1)}
                      className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={i === signers.length - 1}
                      onClick={() => moveSigner(i, 1)}
                      className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
                <div className="min-w-[140px] flex-1">
                  <InputShell icon={User} error={!!errors[`signer-name-${i}`]}>
                    <input
                      value={s.name}
                      onChange={(e) =>
                        updateSigner(s.key, { name: e.target.value })
                      }
                      placeholder="Full name *"
                      className={elevatedInputClass(true)}
                      aria-label={`Signer ${i + 1} name`}
                    />
                  </InputShell>
                  {errors[`signer-name-${i}`] ? (
                    <p
                      data-field-error
                      className="mt-0.5 text-[10px] font-medium text-rose-500"
                    >
                      {errors[`signer-name-${i}`]}
                    </p>
                  ) : null}
                </div>
                <div className="min-w-[160px] flex-1">
                  <InputShell icon={Mail} error={!!errors[`signer-email-${i}`]}>
                    <input
                      type="email"
                      value={s.email}
                      onChange={(e) =>
                        updateSigner(s.key, { email: e.target.value })
                      }
                      placeholder="Email *"
                      className={elevatedInputClass(true)}
                      aria-label={`Signer ${i + 1} email`}
                    />
                  </InputShell>
                  {errors[`signer-email-${i}`] ? (
                    <p
                      data-field-error
                      className="mt-0.5 text-[10px] font-medium text-rose-500"
                    >
                      {errors[`signer-email-${i}`]}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={signers.length <= 1}
                  onClick={() =>
                    setSigners((prev) => prev.filter((x) => x.key !== s.key))
                  }
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                  aria-label="Remove signer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setSigners((prev) => [...prev, newRow()])}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-violet-300 bg-violet-50/40 px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-50"
            >
              <Plus className="h-3 w-3" />
              Add signer
            </button>
          </div>
        </section>

        {/* Details */}
        <section>
          <SectionLabel icon={Calendar} title="Details" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Expiry">
              <InputShell icon={Calendar}>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className={elevatedInputClass(true)}
                />
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
            <Field label="Related kind">
              <InputShell icon={Link2}>
                <select
                  value={relatedKind}
                  onChange={(e) => {
                    setRelatedKind(e.target.value as RelatedEntityKind | "");
                    setRelatedName("");
                  }}
                  className={elevatedSelectClass(true)}
                >
                  <option value="">None</option>
                  {RELATED_ENTITY_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </InputShell>
            </Field>
            <Field label="Related record">
              <InputShell>
                <select
                  value={relatedName}
                  onChange={(e) => setRelatedName(e.target.value)}
                  disabled={!relatedKind}
                  className={elevatedSelectClass()}
                >
                  <option value="">Select…</option>
                  {relatedOptions.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </InputShell>
            </Field>
          </div>
        </section>
      </div>
    </CreateEntityFormShell>
  );
}
