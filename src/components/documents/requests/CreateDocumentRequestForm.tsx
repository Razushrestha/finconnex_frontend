"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileStack,
  User,
  Link2,
  Calendar,
  FileType,
} from "lucide-react";
import {
  DOCUMENT_REQUEST_TYPES,
  DOCUMENT_REQUEST_STATUSES,
  nextDocumentRequestIds,
  upsertDocumentRequest,
  type DocumentRequestType,
  type DocumentRequestStatus,
} from "@/lib/documents/requests/types";
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

interface CreateDocumentRequestFormProps {
  layoutId: string;
  redirect: boolean;
}

function formatDue(iso: string) {
  if (!iso) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString("en-AU");
  }
  const [y, m, day] = iso.split("-");
  return `${day}/${m}/${y}`;
}

export function CreateDocumentRequestForm({
  layoutId: _layoutId,
  redirect: _redirect,
}: CreateDocumentRequestFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [requestedFrom, setRequestedFrom] = useState("");
  const [relatedKind, setRelatedKind] = useState<RelatedEntityKind | "">("");
  const [relatedName, setRelatedName] = useState("");
  const [documentType, setDocumentType] = useState<DocumentRequestType | "">(
    "ID Proof",
  );
  const [status, setStatus] = useState<DocumentRequestStatus>("Requested");
  const [dueDate, setDueDate] = useState("");
  const [requestedBy, setRequestedBy] = useState<string>(ACTIVITY_OWNERS[0]);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const relatedOptions = relatedKind
    ? RELATED_RECORD_OPTIONS.filter((r) => r.kind === relatedKind)
    : RELATED_RECORD_OPTIONS;

  function validate() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required";
    if (!requestedFrom.trim()) next.requestedFrom = "Requested From is required";
    if (!documentType) next.documentType = "Document Type is required";
    if (!status) next.status = "Status is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildRequest() {
    const ids = nextDocumentRequestIds();
    const relatedTo =
      relatedKind && relatedName ? `${relatedKind}: ${relatedName}` : undefined;
    return upsertDocumentRequest({
      id: ids.id,
      requestId: ids.requestId,
      title: title.trim(),
      requestedFrom: requestedFrom.trim(),
      relatedTo,
      documentType: documentType as DocumentRequestType,
      status,
      dueDate: formatDue(dueDate),
      requestedBy,
      requestedDate: new Date().toLocaleDateString("en-AU"),
      notes: notes.trim() || undefined,
    });
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const created = buildRequest();
    if (createAnother) {
      setTitle("");
      setRequestedFrom("");
      setNotes("");
      setErrors({});
      return;
    }
    router.push(`/documents/requests/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{
        label: "Document Requests",
        href: "/documents/requests",
      }}
      badge="Chase docs"
      title="Create Document Request"
      subtitle="Ask a client for a document with a due date and clear status."
      tip="Title, Requested From, Document Type & Status are required."
      cardIcon={FileStack}
      cardTitle="Request details"
      cardDescription="SRS §9.2 — trackable instead of an email thread"
      listHref="/documents/requests"
      saveLabel="Save request"
      onSave={onSave}
    >
      <Field label="Title" required error={errors.title} className="sm:col-span-2 lg:col-span-3">
        <InputShell icon={FileStack} error={!!errors.title}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. ID + income proof for pre-approval"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field label="Requested From" required error={errors.requestedFrom}>
        <InputShell icon={User} error={!!errors.requestedFrom}>
          <input
            value={requestedFrom}
            onChange={(e) => setRequestedFrom(e.target.value)}
            placeholder="Contact or client name"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field label="Document Type" required error={errors.documentType}>
        <InputShell icon={FileType} error={!!errors.documentType}>
          <select
            value={documentType}
            onChange={(e) =>
              setDocumentType(e.target.value as DocumentRequestType)
            }
            className={elevatedSelectClass(true)}
          >
            {DOCUMENT_REQUEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Status" required error={errors.status}>
        <InputShell>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as DocumentRequestStatus)
            }
            className={elevatedSelectClass()}
          >
            {DOCUMENT_REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
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
            <option value="">Select…</option>
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
            className={elevatedSelectClass()}
            disabled={!relatedKind}
          >
            <option value="">Select…</option>
            {relatedOptions.map((r) => (
              <option key={`${r.kind}-${r.name}`} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Due date">
        <InputShell icon={Calendar}>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field label="Requested By">
        <InputShell icon={User}>
          <select
            value={requestedBy}
            onChange={(e) => setRequestedBy(e.target.value)}
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

      <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
        <TextAreaShell>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What exactly do you need from them?"
            className={elevatedTextareaClass}
            rows={3}
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
