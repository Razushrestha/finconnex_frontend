"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, User, Hash, FileText } from "lucide-react";
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  appendPaymentAudit,
  nextPaymentIds,
  upsertPayment,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/finance/payments/types";
import {
  applyPaymentToInvoice,
  appendInvoiceAudit,
  getInvoiceById,
  listInvoices,
  upsertInvoice,
  type Invoice,
} from "@/lib/finance/invoices/types";
import { FINANCE_OWNERS, formatAUD, formatFinanceDate } from "@/lib/finance/shared";
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

export function CreatePaymentForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Bank transfer");
  const [status, setStatus] = useState<PaymentStatus>("Completed");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [recordedBy, setRecordedBy] = useState<string>(FINANCE_OWNERS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const list = listInvoices().filter(
      (i) => i.amountDue > 0 && !["Void", "Cancelled", "Draft"].includes(i.status),
    );
    setInvoices(list);
    if (list[0]) {
      setInvoiceId(list[0].id);
      setAmount(String(list[0].amountDue));
    }
  }, []);

  const invoice = invoices.find((i) => i.id === invoiceId) ?? getInvoiceById(invoiceId);

  function onInvoiceChange(id: string) {
    setInvoiceId(id);
    const inv = invoices.find((i) => i.id === id) ?? getInvoiceById(id);
    if (inv) setAmount(String(inv.amountDue));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!invoiceId) next.invoiceId = "Invoice is required";
    const n = Number(amount);
    if (!n || n <= 0) next.amount = "Valid amount required";
    if (invoice && n > invoice.amountDue)
      next.amount = `Cannot exceed balance ${formatAUD(invoice.amountDue)}`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate() || !invoice) return;
    const n = Number(amount);
    const ids = nextPaymentIds();
    const created = upsertPayment(
      appendPaymentAudit(
        {
          id: ids.id,
          paymentId: ids.paymentId,
          invoiceId: invoice.id,
          invoiceRef: invoice.invoiceId,
          clientName: invoice.clientName,
          amount: n,
          method,
          status,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          receivedAt: formatFinanceDate(),
          recordedBy,
          createdAt: formatFinanceDate(),
          audit: [],
        },
        "Recorded",
        recordedBy,
      ),
    );

    if (status === "Completed") {
      const paid = applyPaymentToInvoice(invoice, n);
      upsertInvoice(
        appendInvoiceAudit(
          paid,
          `Payment recorded ${formatAUD(n)}`,
          recordedBy,
        ),
      );
    }

    if (createAnother) {
      setReference("");
      setNotes("");
      setErrors({});
      const list = listInvoices().filter(
        (i) => i.amountDue > 0 && !["Void", "Cancelled", "Draft"].includes(i.status),
      );
      setInvoices(list);
      if (list[0]) {
        setInvoiceId(list[0].id);
        setAmount(String(list[0].amountDue));
      }
      return;
    }
    router.push(`/finance/payments/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Payments", href: "/finance/payments" }}
      badge="§13.5"
      title="Record Payment"
      subtitle="Record and track payments against invoices (gateway stub)."
      tip="Invoice and amount are required. Completed payments update invoice balance."
      cardIcon={Banknote}
      cardTitle="Payment details"
      cardDescription="SRS §20.4 — links to the open invoice balance"
      listHref="/finance/payments"
      saveLabel="Save payment"
      onSave={onSave}
    >
      <Field label="Invoice" required error={errors.invoiceId} className="sm:col-span-2">
        <InputShell icon={FileText} error={!!errors.invoiceId}>
          <select
            className={elevatedSelectClass(true)}
            value={invoiceId}
            onChange={(e) => onInvoiceChange(e.target.value)}
          >
            {invoices.length === 0 ? (
              <option value="">No open invoices</option>
            ) : (
              invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoiceId} · {i.clientName} · due {formatAUD(i.amountDue)}
                </option>
              ))
            )}
          </select>
        </InputShell>
      </Field>
      <Field label="Amount (AUD)" required error={errors.amount}>
        <InputShell icon={Banknote} error={!!errors.amount}>
          <input
            type="number"
            min={0}
            step={0.01}
            className={elevatedInputClass(true)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Method" required>
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Status" required>
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={status}
            onChange={(e) => setStatus(e.target.value as PaymentStatus)}
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Reference">
        <InputShell icon={Hash}>
          <input
            className={elevatedInputClass(true)}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="EFT / gateway ref"
          />
        </InputShell>
      </Field>
      <Field label="Recorded by" required>
        <InputShell icon={User}>
          <select
            className={elevatedSelectClass(true)}
            value={recordedBy}
            onChange={(e) => setRecordedBy(e.target.value)}
          >
            {FINANCE_OWNERS.map((o) => (
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
            className={elevatedTextareaClass}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
