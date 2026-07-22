"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, FileText, User, Link2, Calendar, Mail } from "lucide-react";
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
  formatAuditAt,
  nextSignatureIds,
  upsertSignatureRequest,
} from "@/lib/documents/signature/types";

interface Props {
  layoutId: string;
  redirect: boolean;
}

function formatExpiry(iso: string) {
  if (!iso) {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toLocaleDateString("en-AU");
  }
  const [y, m, day] = iso.split("-");
  return `${day}/${m}/${y}`;
}

export function CreateSignatureForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [documentName, setDocumentName] = useState("");
  const [documentFile, setDocumentFile] = useState("");
  const [signer, setSigner] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [relatedKind, setRelatedKind] = useState<RelatedEntityKind | "">("");
  const [relatedName, setRelatedName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [createdBy, setCreatedBy] = useState<string>(ACTIVITY_OWNERS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const relatedOptions = relatedKind
    ? RELATED_RECORD_OPTIONS.filter((r) => r.kind === relatedKind)
    : RELATED_RECORD_OPTIONS;

  function validate() {
    const next: Record<string, string> = {};
    if (!documentName.trim()) next.documentName = "Document name is required";
    if (!documentFile.trim()) next.documentFile = "Document file is required";
    if (!signer.trim()) next.signer = "Signer is required";
    if (!signerEmail.trim() || !signerEmail.includes("@"))
      next.signerEmail = "Valid email required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildDraft() {
    const ids = nextSignatureIds();
    const relatedTo =
      relatedKind && relatedName ? `${relatedKind}: ${relatedName}` : undefined;
    return upsertSignatureRequest({
      id: ids.id,
      signatureRequestId: ids.signatureRequestId,
      documentName: documentName.trim(),
      documentFile: documentFile.trim().endsWith(".pdf")
        ? documentFile.trim()
        : `${documentFile.trim()}.pdf`,
      signer: signer.trim(),
      signerEmail: signerEmail.trim(),
      relatedTo,
      status: "Draft",
      expiryDate: formatExpiry(expiryDate),
      createdBy,
      manageToken: ids.manageToken,
      audit: [
        {
          id: `a-${Date.now()}`,
          at: formatAuditAt(),
          action: "Created",
          actor: createdBy,
        },
      ],
    });
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const draft = buildDraft();
    if (createAnother) {
      setDocumentName("");
      setDocumentFile("");
      setSigner("");
      setSignerEmail("");
      setRelatedKind("");
      setRelatedName("");
      setExpiryDate("");
      setErrors({});
      return;
    }
    router.push(`/documents/signature/${draft.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "E-Signature", href: "/documents/signature" }}
      badge="Native sign"
      title="Create Signature Request"
      subtitle="Upload a document and send it for signature without leaving FinConnex."
      tip="Document name, file, and signer are required."
      cardIcon={PenLine}
      cardTitle="Signature request"
      cardDescription="SRS §9.3 — status starts as Draft until you send"
      listHref="/documents/signature"
      saveLabel="Save draft"
      onSave={onSave}
    >
      <Field
        label="Document name"
        required
        error={errors.documentName}
        className="sm:col-span-2 lg:col-span-3"
      >
        <InputShell icon={FileText} error={!!errors.documentName}>
          <input
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="Engagement Letter — Anderson"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field
        label="Document file"
        required
        error={errors.documentFile}
        className="sm:col-span-2 lg:col-span-3"
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

      <Field label="Signer" required error={errors.signer}>
        <InputShell icon={User} error={!!errors.signer}>
          <input
            value={signer}
            onChange={(e) => setSigner(e.target.value)}
            placeholder="Full name"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field label="Signer email" required error={errors.signerEmail}>
        <InputShell icon={Mail} error={!!errors.signerEmail}>
          <input
            type="email"
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
            placeholder="signer@email.com"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field label="Expiry date">
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
      </Field>
    </CreateEntityFormShell>
  );
}
