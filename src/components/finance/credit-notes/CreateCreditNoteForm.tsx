"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, User, Building2, Calendar } from "lucide-react";
import {
  createCrmCreditNote,
  persistRemoteCreditNote,
  toCreateBody,
} from "@/lib/finance/credit-notes/api";
import {
  CREDIT_NOTE_STATUSES,
  appendCreditNoteAudit,
  nextCreditNoteIds,
  upsertCreditNote,
  type CreditNoteStatus,
} from "@/lib/finance/credit-notes/types";
import {
  FINANCE_CLIENTS,
  FINANCE_OWNERS,
  formatFinanceDate,
  newLineItem,
  type FinanceLineItem,
} from "@/lib/finance/shared";
import { LineItemsEditor } from "@/components/finance/LineItemsEditor";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";

interface Props {
  layoutId: string;
  redirect: boolean;
}

export function CreateCreditNoteForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<CreditNoteStatus>("Draft");
  const [clientId, setClientId] = useState<string>(FINANCE_CLIENTS[0].id);
  const [owner, setOwner] = useState<string>(FINANCE_OWNERS[0]);
  const [issueDate, setIssueDate] = useState(formatFinanceDate());
  const [invoiceRef, setInvoiceRef] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<FinanceLineItem[]>([
    newLineItem({ name: "Fee credit", unitPrice: 220, taxRate: 10 }),
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const client =
    FINANCE_CLIENTS.find((c) => c.id === clientId) ?? FINANCE_CLIENTS[0];

  function validate() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required";
    if (!lineItems.length || lineItems.some((i) => !i.name.trim()))
      next.lines = "Add at least one named line item";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSave(createAnother: boolean) {
    if (!validate() || saving) return;
    setSaving(true);
    setSaveError(null);

    const draft = {
      title: title.trim(),
      clientName: client.name,
      invoiceRef: invoiceRef.trim() || undefined,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      owner,
      issueDate: issueDate.trim() || formatFinanceDate(),
      lineItems,
    };

    let created;
    try {
      created = persistRemoteCreditNote(await createCrmCreditNote(toCreateBody(draft)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Create failed";
      if (!/sign in/i.test(message)) {
        setSaveError(message);
        setSaving(false);
        return;
      }
      created = null;
    }

    if (!created) {
      const ids = nextCreditNoteIds();
      created = upsertCreditNote(
        appendCreditNoteAudit(
          {
            id: ids.id,
            creditNoteId: ids.creditNoteId,
            title: draft.title,
            status: draft.status,
            clientId,
            clientName: draft.clientName,
            invoiceRef: draft.invoiceRef,
            owner: draft.owner,
            issueDate: draft.issueDate,
            reason: draft.reason,
            notes: draft.notes,
            lineItems: draft.lineItems,
            subtotal: 0,
            tax: 0,
            total: 0,
            attachments: [],
            createdBy: owner,
            createdAt: formatFinanceDate(),
            audit: [],
          },
          "Created",
          owner,
        ),
      );
    }
    setSaving(false);

    if (createAnother) {
      setTitle("");
      setReason("");
      setNotes("");
      setInvoiceRef("");
      setLineItems([newLineItem()]);
      setErrors({});
      return;
    }
    router.push(`/finance/credit-notes/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Credit Notes", href: "/finance/credit-notes" }}
      badge="Live CRM"
      title="Create Credit Note"
      subtitle="Credit a client against an invoice or fee adjustment."
      tip="Title and line items are required."
      cardIcon={Receipt}
      cardTitle="Credit note details"
      cardDescription="POST /v1/credit-notes — sign in if CRM is offline"
      listHref="/finance/credit-notes"
      saveLabel={saving ? "Saving…" : "Save credit note"}
      onSave={onSave}
    >
      {saveError ? (
        <p className="col-span-full text-[12px] font-medium text-rose-600">
          {saveError}
        </p>
      ) : null}
      <Field label="Title" required error={errors.title} className="sm:col-span-2">
        <InputShell icon={Receipt} error={!!errors.title}>
          <input
            className={elevatedInputClass(true)}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Greystone packaging credit"
          />
        </InputShell>
      </Field>
      <Field label="Client" required>
        <InputShell icon={Building2}>
          <select
            className={elevatedSelectClass(true)}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            {FINANCE_CLIENTS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Owner" required>
        <InputShell icon={User}>
          <select
            className={elevatedSelectClass(true)}
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          >
            {FINANCE_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Linked invoice">
        <InputShell icon={Receipt}>
          <input
            className={elevatedInputClass(true)}
            value={invoiceRef}
            onChange={(e) => setInvoiceRef(e.target.value)}
            placeholder="INV-3201"
          />
        </InputShell>
      </Field>
      <Field label="Status">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={status}
            onChange={(e) => setStatus(e.target.value as CreditNoteStatus)}
          >
            {CREDIT_NOTE_STATUSES.filter((s) => s === "Draft" || s === "Sent").map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ),
            )}
          </select>
        </InputShell>
      </Field>
      <Field label="Issue date">
        <InputShell icon={Calendar}>
          <input
            className={elevatedInputClass(true)}
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            placeholder="DD/MM/YYYY"
          />
        </InputShell>
      </Field>
      <Field label="Reason" className="sm:col-span-2">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Fee adjustment, returned item…"
          />
        </InputShell>
      </Field>
      <Field label="Notes" className="col-span-full">
        <MentionNotesTextarea
          rows={3}
          value={notes}
          onChange={setNotes}
          placeholder="Internal notes… Type @ to assign someone."
        />
      </Field>
      <div className="col-span-full">
        <h3 className="mb-3 text-[12px] font-bold tracking-wide text-slate-700 uppercase">
          Line items
        </h3>
        {errors.lines ? (
          <p className="mb-2 text-[11px] font-medium text-rose-500">{errors.lines}</p>
        ) : null}
        <LineItemsEditor items={lineItems} onChange={setLineItems} />
      </div>
    </CreateEntityFormShell>
  );
}
