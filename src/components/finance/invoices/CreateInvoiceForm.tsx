"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, User, Building2, Calendar } from "lucide-react";
import {
  INVOICE_STATUSES,
  appendInvoiceAudit,
  nextInvoiceIds,
  upsertInvoice,
  type InvoiceStatus,
} from "@/lib/finance/invoices/types";
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

export function CreateInvoiceForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("Draft");
  const [clientId, setClientId] = useState<string>(FINANCE_CLIENTS[0].id);
  const [dealName, setDealName] = useState<string>(FINANCE_DEALS[0]);
  const [owner, setOwner] = useState<string>(FINANCE_OWNERS[0]);
  const [issueDate, setIssueDate] = useState(formatFinanceDate());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<FinanceLineItem[]>([
    newLineItem({ name: "Brokerage fee", unitPrice: 1500, taxRate: 10 }),
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const client =
    FINANCE_CLIENTS.find((c) => c.id === clientId) ?? FINANCE_CLIENTS[0];

  function validate() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required";
    if (!dueDate.trim()) next.dueDate = "Due date is required";
    if (!lineItems.length || lineItems.some((i) => !i.name.trim()))
      next.lines = "Add at least one named line item";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextInvoiceIds();
    const created = upsertInvoice(
      appendInvoiceAudit(
        {
          id: ids.id,
          invoiceId: ids.invoiceId,
          title: title.trim(),
          status,
          clientId,
          clientName: client.name,
          contactName: client.contact,
          contactEmail: client.email,
          dealName,
          owner,
          issueDate: issueDate.trim() || formatFinanceDate(),
          dueDate: dueDate.trim(),
          notes: notes.trim() || undefined,
          lineItems,
          subtotal: 0,
          tax: 0,
          total: 0,
          amountPaid: 0,
          amountDue: 0,
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
    router.push(`/finance/invoices/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Invoices", href: "/finance/invoices" }}
      badge="§13.4"
      title="Create Invoice"
      subtitle="Generate and send sales invoices; track payment status."
      tip="Title, Due date, and line items are required."
      cardIcon={Receipt}
      cardTitle="Invoice details"
      cardDescription="SRS §20.3 — standalone or from a signed quotation"
      listHref="/finance/invoices"
      saveLabel="Save invoice"
      onSave={onSave}
    >
      <Field label="Title" required error={errors.title} className="sm:col-span-2">
        <InputShell icon={Receipt} error={!!errors.title}>
          <input
            className={elevatedInputClass(true)}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Greystone refinance invoice"
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
            onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
          >
            {INVOICE_STATUSES.filter(
              (s) => !["Paid", "Partially Paid", "Void"].includes(s),
            ).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
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
      <Field label="Due date" required error={errors.dueDate}>
        <InputShell icon={Calendar} error={!!errors.dueDate}>
          <input
            className={elevatedInputClass(true)}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            placeholder="DD/MM/YYYY"
          />
        </InputShell>
      </Field>
      <Field label="Notes" className="col-span-full">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </TextAreaShell>
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
