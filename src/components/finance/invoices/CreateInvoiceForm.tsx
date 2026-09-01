"use client";

import { useMemo, useState } from "react";
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
  FINANCE_OWNERS,
  formatFinanceDate,
  newLineItem,
  type FinanceLineItem,
} from "@/lib/finance/shared";
import {
  defaultFinanceDealName,
  defaultFinanceTitle,
  defaultFinanceValidUntil,
  financeClientsWithRelated,
  financeDealOptions,
  financeRelatedTo,
  type RelatedFinancePrefill,
} from "@/lib/finance/related-prefill";
import { LineItemsEditor } from "@/components/finance/LineItemsEditor";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";

interface Props extends RelatedFinancePrefill {
  layoutId: string;
  redirect: boolean;
}

export function CreateInvoiceForm({
  layoutId: _l,
  redirect: _r,
  relatedKind,
  relatedName,
  relatedId,
  email,
}: Props) {
  const router = useRouter();
  const prefill = useMemo(
    () => ({ relatedKind, relatedName, relatedId, email }),
    [relatedKind, relatedName, relatedId, email],
  );
  const clients = useMemo(() => financeClientsWithRelated(prefill), [prefill]);
  const dealOptions = useMemo(() => financeDealOptions(prefill), [prefill]);
  const relatedTo = financeRelatedTo(prefill);
  const [title, setTitle] = useState(defaultFinanceTitle("invoice", prefill));
  const [status, setStatus] = useState<InvoiceStatus>("Draft");
  const [clientId, setClientId] = useState<string>(clients[0]?.id ?? "");
  const [dealName, setDealName] = useState<string>(
    defaultFinanceDealName(prefill),
  );
  const [owner, setOwner] = useState<string>(FINANCE_OWNERS[0]);
  const [issueDate, setIssueDate] = useState(formatFinanceDate());
  const [dueDate, setDueDate] = useState(defaultFinanceValidUntil());
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<FinanceLineItem[]>([
    newLineItem({ name: "Brokerage fee", unitPrice: 1500, taxRate: 10 }),
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const client = clients.find((c) => c.id === clientId) ?? clients[0];

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
    if (!validate() || !client) return;
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
          dealName: dealName || undefined,
          relatedTo,
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
      cardDescription="SRS §20.3: standalone or from a signed quotation"
      listHref="/finance/invoices"
      saveLabel="Save invoice"
      onSave={onSave}
    >
      {relatedTo ? (
        <Field label="Related to" className="sm:col-span-2">
          <InputShell icon={Building2}>
            <input
              readOnly
              className={elevatedInputClass(true)}
              value={relatedTo}
            />
          </InputShell>
        </Field>
      ) : null}
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
            {clients.map((c) => (
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
            {dealOptions.map((d) => (
              <option key={d || "none"} value={d}>
                {d || "None"}
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
