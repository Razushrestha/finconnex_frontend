"use client";

import { useState } from "react";
import {
  PenLine,
  FileText,
  User,
  Link2,
  Calendar,
  Mail,
  Sparkles,
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

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="col-span-full mt-1 mb-1 flex items-center gap-2 first:mt-0">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50 text-violet-600">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div>
        <p className="text-[12px] font-semibold tracking-wide text-slate-600 uppercase">
          {title}
        </p>
        {description ? (
          <p className="text-[12px] text-slate-400">{description}</p>
        ) : null}
      </div>
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
    // Keep fields empty so Place Fields is the next real step
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
      const href = `/documents/signature/${draft.id}/place`;
      // Hard navigate so the place page always loads the draft from sessionStorage
      window.location.assign(href);
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
      subtitle="Add signers, then place fields on the document before sending."
      tip="Document and at least one signer are required. Next step places signature fields."
      cardIcon={PenLine}
      cardTitle="Signature request"
      cardDescription=""
      listHref="/documents/signature"
      saveLabel="Continue to place fields"
      onSave={onSave}
    >
      {errors.form ? (
        <p
          data-field-error
          className="col-span-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700"
        >
          {errors.form}
        </p>
      ) : null}

      <SectionHeading
        icon={FileText}
        title="Document"
        description="What you are sending out for signature"
      />

      <Field
        label="Document name"
        required
        error={errors.documentName}
        className="col-span-full"
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
        className="col-span-full"
      >
        <InputShell icon={FileText} error={!!errors.documentFile}>
          <input
            value={documentFile}
            onChange={(e) => setDocumentFile(e.target.value)}
            placeholder="filename.pdf"
            className={elevatedInputClass(true)}
          />
        </InputShell>
        {resolvedFileName ? (
          <p className="mt-1 flex items-center gap-1 text-[12px] text-slate-400">
            <Sparkles className="h-3 w-3 text-violet-400" />
            Will be saved as{" "}
            <span className="font-medium text-slate-600">
              {resolvedFileName}
            </span>
          </p>
        ) : null}
      </Field>

      <SectionHeading
        icon={Users}
        title="Signers"
        description="Add everyone who must sign. Order applies when sequential"
      />

      <div className="col-span-full flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
          Signing order
        </p>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
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
                "rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors",
                signingOrder === mode
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {errors.signers ? (
          <p className="text-[12px] font-medium text-rose-600">
            {errors.signers}
          </p>
        ) : null}
      </div>

      <div className="col-span-full space-y-2">
        {signers.map((s, i) => (
          <div
            key={s.key}
            className="grid gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 sm:grid-cols-[auto_1fr_1fr_auto]"
          >
            <div className="flex items-center gap-2 sm:flex-col sm:items-center sm:justify-center sm:gap-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
                {i + 1}
              </span>
              {signingOrder === "sequential" && signers.length > 1 ? (
                <div className="flex gap-0.5 sm:flex-col">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => moveSigner(i, -1)}
                    className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={i === signers.length - 1}
                    onClick={() => moveSigner(i, 1)}
                    className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>

            <Field
              label="Full name"
              required
              error={errors[`signer-name-${i}`]}
            >
              <InputShell icon={User} error={!!errors[`signer-name-${i}`]}>
                <input
                  value={s.name}
                  onChange={(e) => updateSigner(s.key, { name: e.target.value })}
                  placeholder="Full name"
                  className={elevatedInputClass(true)}
                />
              </InputShell>
            </Field>

            <Field
              label="Email"
              required
              error={errors[`signer-email-${i}`]}
            >
              <InputShell icon={Mail} error={!!errors[`signer-email-${i}`]}>
                <input
                  type="email"
                  value={s.email}
                  onChange={(e) =>
                    updateSigner(s.key, { email: e.target.value })
                  }
                  placeholder="signer@email.com"
                  className={elevatedInputClass(true)}
                />
              </InputShell>
            </Field>

            <div className="flex items-end justify-end pb-0.5">
              <button
                type="button"
                disabled={signers.length <= 1}
                onClick={() =>
                  setSigners((prev) => prev.filter((x) => x.key !== s.key))
                }
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setSigners((prev) => [...prev, newRow()])}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-violet-300 bg-violet-50/50 px-3 text-[12px] font-semibold text-violet-700 hover:bg-violet-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add signer
        </button>
      </div>

      <SectionHeading
        icon={Calendar}
        title="Details"
        description="Expiry, ownership, and linked record"
      />

      <Field label="Expiry date">
        <InputShell icon={Calendar}>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className={elevatedInputClass(true)}
          />
        </InputShell>
        <p className="mt-1 text-[12px] text-slate-400">
          {expiryDate ? (
            <>
              Signers have until{" "}
              <span className="font-medium text-slate-600">
                {resolvedExpiry}
              </span>
            </>
          ) : (
            <>Defaults to 14 days from today if left blank</>
          )}
        </p>
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

      <Field label="Related record" className="sm:col-span-2">
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
        {!relatedKind ? (
          <p className="mt-1 text-[12px] text-slate-400">
            Choose a related kind first to filter this list
          </p>
        ) : null}
      </Field>
    </CreateEntityFormShell>
  );
}
