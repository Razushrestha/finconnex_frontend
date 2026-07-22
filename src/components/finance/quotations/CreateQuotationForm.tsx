"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, User, Building2, Calendar } from "lucide-react";
import {
  QUOTATION_STATUSES,
  appendQuotationAudit,
  nextQuotationIds,
  upsertQuotation,
  type QuotationStatus,
} from "@/lib/finance/quotations/types";
import {
  FINANCE_CLIENTS,
  FINANCE_DEALS,
  FINANCE_OWNERS,
  formatFinanceDate,
  newLineItem,
  type FinanceLineItem,
} from "@/lib/finance/shared";
import { LineItemsEditor } from "@/components/finance/LineItemsEditor";
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

export function CreateQuotationForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<QuotationStatus>("Draft");
  const [clientId, setClientId] = useState<string>(FINANCE_CLIENTS[0].id);
  const [dealName, setDealName] = useState<string>(FINANCE_DEALS[0]);
  const [owner, setOwner] = useState<string>(FINANCE_OWNERS[0]);
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<FinanceLineItem[]>([
    newLineItem({ name: "Home loan packaging", unitPrice: 2200, taxRate: 10 }),
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const client =
    FINANCE_CLIENTS.find((c) => c.id === clientId) ?? FINANCE_CLIENTS[0];

  function validate() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required";
    if (!validUntil.trim()) next.validUntil = "Valid until is required";
    if (!lineItems.length || lineItems.some((i) => !i.name.trim()))
      next.lines = "Add at least one named line item";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextQuotationIds();
    const created = upsertQuotation(
      appendQuotationAudit(
        {
          id: ids.id,
          quotationId: ids.quotationId,
          title: title.trim(),
          status,
          clientId,
          clientName: client.name,
          contactName: client.contact,
          contactEmail: client.email,
          dealName,
          owner,
          validUntil: validUntil.trim(),
          notes: notes.trim() || undefined,
          lineItems,
          subtotal: 0,
          tax: 0,
          total: 0,
          signatureStatus: "Not sent",
          createdBy: owner,
          createdAt: formatFinanceDate(),
          audit: [],
        },
        "Created",
        owner,
      ),
    );
    if (createAnother) {
      setTitle("");
      setNotes("");
      setLineItems([newLineItem()]);
      setErrors({});
      return;
    }
    router.push(`/finance/quotations/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Quotations", href: "/finance/quotations" }}
      badge="§13.2"
      title="Create Quotation"
      subtitle="Formal quotation with line items and pricing — convertible to invoice."
      tip="Title, Valid until, and line items are required."
      cardIcon={FileText}
      cardTitle="Quotation details"
      cardDescription="SRS §20.2 — standalone or from an accepted estimate"
      listHref="/finance/quotations"
      saveLabel="Save quotation"
      onSave={onSave}
    >
      <Field label="Title" required error={errors.title} className="sm:col-span-2">
        <InputShell icon={FileText} error={!!errors.title}>
          <input
            className={elevatedInputClass(true)}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Greystone refinance quotation"
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
      <Field label="Linked deal">
        <InputShell icon={Building2}>
          <select
            className={elevatedSelectClass(true)}
            value={dealName}
            onChange={(e) => setDealName(e.target.value)}
          >
            {FINANCE_DEALS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Status">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={status}
            onChange={(e) => setStatus(e.target.value as QuotationStatus)}
          >
            {QUOTATION_STATUSES.filter((s) => s !== "Invoiced").map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Valid until" required error={errors.validUntil}>
        <InputShell icon={Calendar} error={!!errors.validUntil}>
          <input
            className={elevatedInputClass(true)}
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            placeholder="DD/MM/YYYY"
          />
        </InputShell>
      </Field>
      <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </TextAreaShell>
      </Field>
      <div className="sm:col-span-2 lg:col-span-3">
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
