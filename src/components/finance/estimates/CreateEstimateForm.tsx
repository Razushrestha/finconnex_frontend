"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, User, Building2, Calendar } from "lucide-react";
import {
  ESTIMATE_STATUSES,
  appendEstimateAudit,
  formatFinanceDate,
  nextEstimateIds,
  upsertEstimate,
  type EstimateStatus,
} from "@/lib/finance/estimates/types";
import {
  FINANCE_CLIENTS,
  FINANCE_DEALS,
  FINANCE_OWNERS,
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

export function CreateEstimateForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<EstimateStatus>("Draft");
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
    if (!clientId) next.clientId = "Client is required";
    if (!owner) next.owner = "Owner is required";
    if (!validUntil.trim()) next.validUntil = "Valid until is required";
    if (!lineItems.length || lineItems.some((i) => !i.name.trim()))
      next.lines = "Add at least one named line item";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextEstimateIds();
    const created = upsertEstimate(
      appendEstimateAudit(
        {
          id: ids.id,
          estimateId: ids.estimateId,
          title: title.trim(),
          status,
          clientId,
          clientName: client.name,
          contactName: client.contact,
          contactEmail: client.email,
          dealName: dealName || undefined,
          owner,
          validUntil: validUntil.trim(),
          notes: notes.trim() || undefined,
          lineItems,
          subtotal: 0,
          tax: 0,
          total: 0,
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
    router.push(`/finance/estimates/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Estimates", href: "/finance/estimates" }}
      badge="§13.1"
      title="Create Estimate"
      subtitle="Create, edit, send, and track estimates linked to deals and contacts."
      tip="Title, Client, Owner, Valid until, and line items are required."
      cardIcon={FileText}
      cardTitle="Estimate details"
      cardDescription="Opening move in the proposal-to-payment flow"
      listHref="/finance/estimates"
      saveLabel="Save estimate"
      onSave={onSave}
    >
      <Field label="Title" required error={errors.title} className="sm:col-span-2">
        <InputShell icon={FileText} error={!!errors.title}>
          <input
            className={elevatedInputClass(true)}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Greystone refinance estimate"
          />
        </InputShell>
      </Field>

      <Field label="Client" required error={errors.clientId}>
        <InputShell icon={Building2} error={!!errors.clientId}>
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

      <Field label="Owner" required error={errors.owner}>
        <InputShell icon={User} error={!!errors.owner}>
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
            onChange={(e) => setStatus(e.target.value as EstimateStatus)}
          >
            {ESTIMATE_STATUSES.filter((s) => s !== "Converted").map((s) => (
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
            placeholder="Internal notes for this estimate"
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
