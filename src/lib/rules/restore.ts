/**
 * §28.1 Recycle Bin restore — rehydrate module stores from snapshot.
 */

import { getRulesActor, requireAction } from "@/lib/rules/actor";
import { restoreFromRecycleBin, type RecycleBinItem } from "@/lib/rules/soft-delete";
import { fail, ok, type RuleResult } from "@/lib/rules/types";
import { upsertTicket } from "@/lib/support/types";
import { upsertInvoice } from "@/lib/finance/invoices/types";
import { upsertEstimate } from "@/lib/finance/estimates/types";
import { upsertQuotation } from "@/lib/finance/quotations/types";
import { upsertPayment } from "@/lib/finance/payments/types";
import { upsertEmailCampaign } from "@/lib/marketing/email/types";
import { upsertSmsCampaign } from "@/lib/marketing/sms/types";
import { upsertWhatsAppCampaign } from "@/lib/marketing/whatsapp/types";
import { upsertResource } from "@/lib/resources/types";
import { upsertTimeEntry } from "@/lib/time-tracking/types";
import { upsertPortal } from "@/lib/portals/types";
import { upsertReport } from "@/lib/reports/types";
import { upsertCalculation } from "@/lib/calculator/types";
import { pushLibraryDoc } from "@/lib/documents/library/types";
import { listLeadColumns, saveLeadColumns } from "@/lib/leads/store";
import { listContactGroups, saveContactGroups } from "@/lib/contacts/store";
import { listDealPipelines, saveDealPipelines } from "@/lib/deals/store";
import { listTaskColumns, saveTaskColumns } from "@/lib/tasks/store";
import type { LeadCardData } from "@/lib/leads/types";
import type { ContactCardData } from "@/lib/contacts/types";
import type { DealRecord, DealPipeline } from "@/lib/deals/types";
import type { Task } from "@/lib/tasks/types";
import type { LibraryDocument } from "@/lib/documents/library/types";

type RestoreHandler = (snapshot: unknown) => void;

function restoreLead(snapshot: unknown) {
  const data = snapshot as { card: LeadCardData; status: string };
  if (!data?.card) return;
  const cols = listLeadColumns();
  const target = cols.find((c) => c.title === data.status) ?? cols[0];
  if (cols.some((c) => c.cards.some((x) => x.id === data.card.id))) return;
  saveLeadColumns(
    cols.map((c) =>
      c.id === target.id
        ? { ...c, cards: [data.card, ...c.cards], leadCount: c.cards.length + 1 }
        : c,
    ),
  );
}

function restoreContact(snapshot: unknown) {
  const data = snapshot as { contact: ContactCardData; status: string };
  if (!data?.contact) return;
  const groups = listContactGroups();
  const target = groups.find((g) => g.title === data.status) ?? groups[0];
  if (groups.some((g) => g.contacts.some((x) => x.id === data.contact.id)))
    return;
  saveContactGroups(
    groups.map((g) =>
      g.id === target.id
        ? { ...g, contacts: [data.contact, ...g.contacts] }
        : g,
    ),
  );
}

function restoreDeal(snapshot: unknown) {
  const data = snapshot as {
    deal: DealRecord;
    stage: string;
    pipeline?: DealPipeline;
  };
  if (!data?.deal) return;
  const pipe = data.pipeline ?? "Deals";
  const pipelines = listDealPipelines();
  const stages = pipelines[pipe] ?? pipelines.Deals;
  if (stages.some((s) => s.deals.some((d) => d.id === data.deal.id))) return;
  const target = stages.find((s) => s.title === data.stage) ?? stages[0];
  pipelines[pipe] = stages.map((s) =>
    s.id === target.id ? { ...s, deals: [data.deal, ...s.deals] } : s,
  );
  saveDealPipelines(pipelines);
}

function restoreTask(snapshot: unknown) {
  const data = snapshot as { task: Task; status: string };
  if (!data?.task) return;
  const cols = listTaskColumns();
  if (cols.some((c) => c.tasks.some((t) => t.taskId === data.task.taskId)))
    return;
  const target = cols.find((c) => c.title === data.status) ?? cols[0];
  saveTaskColumns(
    cols.map((c) =>
      c.id === target.id
        ? {
            ...c,
            tasks: [data.task, ...c.tasks],
            count: c.tasks.length + 1,
          }
        : c,
    ),
  );
}

const HANDLERS: Record<string, RestoreHandler> = {
  "support.tickets": (s) => upsertTicket(s as Parameters<typeof upsertTicket>[0]),
  "finance.invoices": (s) =>
    upsertInvoice(s as Parameters<typeof upsertInvoice>[0]),
  "finance.estimates": (s) =>
    upsertEstimate(s as Parameters<typeof upsertEstimate>[0]),
  "finance.quotations": (s) =>
    upsertQuotation(s as Parameters<typeof upsertQuotation>[0]),
  "finance.payments": (s) =>
    upsertPayment(s as Parameters<typeof upsertPayment>[0]),
  "marketing.email": (s) =>
    upsertEmailCampaign(s as Parameters<typeof upsertEmailCampaign>[0]),
  "marketing.sms": (s) =>
    upsertSmsCampaign(s as Parameters<typeof upsertSmsCampaign>[0]),
  "marketing.whatsapp": (s) =>
    upsertWhatsAppCampaign(s as Parameters<typeof upsertWhatsAppCampaign>[0]),
  resources: (s) => upsertResource(s as Parameters<typeof upsertResource>[0]),
  "time-tracking": (s) =>
    upsertTimeEntry(s as Parameters<typeof upsertTimeEntry>[0]),
  portals: (s) => upsertPortal(s as Parameters<typeof upsertPortal>[0]),
  reports: (s) => upsertReport(s as Parameters<typeof upsertReport>[0]),
  "calculator.history": (s) =>
    upsertCalculation(s as Parameters<typeof upsertCalculation>[0]),
  "documents.library": (s) => {
    const doc = s as LibraryDocument;
    if (doc?.id) pushLibraryDoc(doc);
  },
  "sales.leads": restoreLead,
  "sales.contacts": restoreContact,
  "sales.deals": restoreDeal,
  "activities.tasks": restoreTask,
};

export function canRestoreModule(module: string) {
  return Boolean(HANDLERS[module]);
}

/** Permission-gated restore that puts the snapshot back into the live module store. */
export function restoreRecord(binId: string): RuleResult & {
  item?: RecycleBinItem;
} {
  const gate = requireAction("recycle-bin.restore");
  if (!gate.ok) return gate;

  const actor = getRulesActor().name;
  const item = restoreFromRecycleBin(binId, actor);
  if (!item) {
    return fail("RESTORE_NOT_FOUND", "Recycle Bin item not found");
  }
  if (item.snapshot == null) {
    return fail(
      "RESTORE_NO_SNAPSHOT",
      `No snapshot stored for ${item.recordLabel}`,
    );
  }

  const handler = HANDLERS[item.module];
  if (!handler) {
    return fail(
      "RESTORE_UNSUPPORTED",
      `Restore is not supported for module ${item.module}`,
    );
  }

  try {
    handler(item.snapshot);
  } catch (e) {
    return fail(
      "RESTORE_FAILED",
      e instanceof Error ? e.message : "Failed to restore record",
    );
  }

  return { ...ok(), item };
}
