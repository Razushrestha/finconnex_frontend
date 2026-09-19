"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, User, Building2, Calendar, Loader2, X } from "lucide-react";
import {
  ESTIMATE_STATUSES,
  appendEstimateAudit,
  formatFinanceDate,
  nextEstimateIds,
  upsertEstimate,
  type EstimateStatus,
} from "@/lib/finance/estimates/types";
import {
  createCrmEstimate,
  persistRemoteEstimate,
  toCreateEstimateBody,
} from "@/lib/finance/estimates/api";
import {
  FINANCE_OWNERS,
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
import { defaultActorName } from "@/lib/rules/actor";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Props extends RelatedFinancePrefill {
  layoutId?: string;
  redirect?: boolean;
  variant?: "page" | "modal";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateEstimateForm({
  layoutId: _l,
  redirect: _r,
  relatedKind,
  relatedName,
  relatedId,
  email,
  variant = "page",
  open = true,
  onOpenChange,
  onCreated,
}: Props) {
  void _l;
  void _r;
  const router = useRouter();
  const prefill = useMemo(
    () => ({ relatedKind, relatedName, relatedId, email }),
    [relatedKind, relatedName, relatedId, email],
  );
  const clients = useMemo(() => financeClientsWithRelated(prefill), [prefill]);
  const dealOptions = useMemo(() => financeDealOptions(prefill), [prefill]);
  const relatedTo = financeRelatedTo(prefill);
  const [title, setTitle] = useState(defaultFinanceTitle("proposal", prefill));
  const [status, setStatus] = useState<EstimateStatus>("Draft");
  const [clientId, setClientId] = useState<string>(clients[0]?.id ?? "");
  const [dealName, setDealName] = useState<string>(
    defaultFinanceDealName(prefill),
  );
  const [owner, setOwner] = useState<string>(defaultActorName());
  const [validUntil, setValidUntil] = useState(defaultFinanceValidUntil());
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<FinanceLineItem[]>([
    newLineItem({ name: "Home loan packaging", unitPrice: 2200, taxRate: 10 }),
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const modalResetKey = `${variant}|${open}|${relatedKind ?? ""}|${relatedId ?? ""}`;
  const [prevModalResetKey, setPrevModalResetKey] = useState(modalResetKey);
  if (prevModalResetKey !== modalResetKey) {
    setPrevModalResetKey(modalResetKey);
    if (variant === "modal" && open) {
      setTitle(defaultFinanceTitle("proposal", prefill));
      setStatus("Draft");
      setClientId(clients[0]?.id ?? "");
      setDealName(defaultFinanceDealName(prefill));
      setOwner(defaultActorName());
      setValidUntil(defaultFinanceValidUntil());
      setNotes("");
      setLineItems([
        newLineItem({ name: "Home loan packaging", unitPrice: 2200, taxRate: 10 }),
      ]);
      setErrors({});
      setSaveError(null);
    }
  }

  const client = clients.find((c) => c.id === clientId) ?? clients[0];

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

  async function onSave(createAnother: boolean) {
    if (!validate() || !client) return;
    setSaving(true);
    setSaveError(null);
    const draft = {
      title: title.trim(),
      clientName: client.name,
      clientId,
      contactName: client.contact,
      contactEmail: client.email,
      dealName: dealName || undefined,
      relatedTo,
      notes: notes.trim() || undefined,
      status,
      owner,
      validUntil: validUntil.trim(),
      lineItems,
    };
    let created;
    try {
      created = persistRemoteEstimate(
        await createCrmEstimate(toCreateEstimateBody(draft)),
      );
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
      const ids = nextEstimateIds();
      created = upsertEstimate(
        appendEstimateAudit(
          {
            id: ids.id,
            estimateId: ids.estimateId,
            title: draft.title,
            status: draft.status,
            clientId,
            clientName: draft.clientName,
            contactName: draft.contactName,
            contactEmail: draft.contactEmail,
            dealName: draft.dealName,
            relatedTo,
            owner,
            validUntil: draft.validUntil,
            notes: draft.notes,
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
    }
    setSaving(false);
    if (createAnother) {
      setTitle("");
      setNotes("");
      setLineItems([newLineItem()]);
      setErrors({});
      setSaveError(null);
      return;
    }
    if (variant === "modal") {
      onCreated?.();
      onOpenChange?.(false);
      return;
    }
    router.push(`/finance/estimates/${created.id}`);
  }

  const fields = (
    <>
      {relatedTo ? (
        <Field label="Related to" className="sm:col-span-2">
          <InputShell icon={Building2}>
            <input readOnly className={elevatedInputClass(true)} value={relatedTo} />
          </InputShell>
        </Field>
      ) : null}
      {saveError ? (
        <p className="sm:col-span-2 text-[12px] text-rose-600">{saveError}</p>
      ) : null}
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
            {clients.map((c) => (
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

      <Field label="Notes" className="col-span-full">
        <MentionNotesTextarea
          rows={3}
          value={notes}
          onChange={setNotes}
          placeholder="Internal notes for this estimate. Type @ to assign someone."
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
    </>
  );

  if (variant === "modal") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(92vh,900px)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        >
          <DialogTitle className="sr-only">Create Estimate</DialogTitle>
          <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-slate-900">
              Create Estimate
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange?.(false)}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70">
            <div className="grid grid-cols-1 content-start gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-2">
              {fields}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
            <button
              type="button"
              onClick={() => onOpenChange?.(false)}
              disabled={saving}
              className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onSave(true)}
              disabled={saving}
              className="h-8 rounded-md border border-violet-200 bg-violet-50 px-3 text-[12px] font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
            >
              Save &amp; New
            </button>
            <button
              type="button"
              onClick={() => void onSave(false)}
              disabled={saving}
              className="inline-flex h-8 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-md bg-violet-600 px-4 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-90"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save estimate"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Estimates", href: "/finance/estimates" }}
      badge="Live CRM"
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
      {fields}
    </CreateEntityFormShell>
  );
}
