"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { usePortalContext } from "@/components/portals/public/PortalShell";
import {
  listPortalTasks,
  portalDealsForClient,
  portalDocumentsForClient,
  savePortalTasks,
  type PortalTask,
} from "@/lib/portals/clientData";
import {
  listInvoices,
  applyPaymentToInvoice,
  appendInvoiceAudit,
  upsertInvoice,
} from "@/lib/finance/invoices/types";
import { formatAUD } from "@/lib/finance/shared";
import {
  listTickets,
  upsertTicket,
  appendTicketAudit,
  nextTicketIds,
  formatTicketDate,
  TICKET_STATUS_STYLE,
  type SupportTicket,
} from "@/lib/support/types";
import { canPayInPortal, canSignInPortal } from "@/lib/portals/types";
import { cn } from "@/lib/utils";

export function PortalDealsPane({ slug }: { slug: string }) {
  const { portal, logActivity } = usePortalContext(slug);
  useEffect(() => {
    if (portal) logActivity("Viewed deals");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal?.id]);
  if (!portal) return null;
  const deals = portalDealsForClient(portal.clientName);
  return (
    <Pane title="Deals" subtitle="Current deal status for your account">
      {deals.length === 0 ? (
        <Empty>No deals to show</Empty>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
          {deals.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <div className="font-semibold text-slate-900">{d.name}</div>
                <div className="text-[11px] text-slate-500">Updated {d.updatedAt}</div>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-semibold text-violet-700">{d.stage}</div>
                <div className="text-[11px] text-slate-500">{d.amount}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Pane>
  );
}

export function PortalDocumentsPane({ slug }: { slug: string }) {
  const { portal, logActivity, isReadOnly } = usePortalContext(slug);
  useEffect(() => {
    if (portal) logActivity("Viewed documents");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal?.id]);
  if (!portal) return null;
  const docs = portalDocumentsForClient(portal.clientName);
  const canSign = canSignInPortal(portal) && !isReadOnly;
  return (
    <Pane title="Documents" subtitle="Shared files and signature requests">
      {docs.length === 0 ? (
        <Empty>No documents</Empty>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <div className="font-semibold text-slate-900">{d.name}</div>
                <div className="text-[11px] text-slate-500">
                  {d.type} · {d.status}
                </div>
              </div>
              {d.signToken && canSign ? (
                <Link
                  href={`/sign/${d.signToken}`}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white"
                  onClick={() => logActivity(`Opened signature: ${d.name}`)}
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Sign
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Pane>
  );
}

export function PortalTasksPane({ slug }: { slug: string }) {
  const { portal, logActivity, canWrite, isReadOnly } = usePortalContext(slug);
  const [tasks, setTasks] = useState<PortalTask[]>([]);

  useEffect(() => {
    if (!portal) return;
    setTasks(listPortalTasks(portal.clientName));
    logActivity("Viewed tasks");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal?.id]);

  function complete(id: string) {
    if (!portal || isReadOnly || !canWrite) return;
    const next = tasks.map((t) =>
      t.id === id ? { ...t, status: "Done" as const } : t,
    );
    setTasks(next);
    savePortalTasks(portal.clientName, next);
    logActivity("Completed a task");
  }

  if (!portal) return null;
  return (
    <Pane title="Tasks" subtitle="Actions requested from you">
      {tasks.length === 0 ? (
        <Empty>No tasks</Empty>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
          {tasks.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <div
                  className={cn(
                    "font-semibold text-slate-900",
                    t.status === "Done" && "text-slate-400 line-through",
                  )}
                >
                  {t.title}
                </div>
                <div className="text-[11px] text-slate-500">Due {t.due}</div>
              </div>
              {t.status === "Open" && canWrite && !isReadOnly ? (
                <button
                  type="button"
                  onClick={() => complete(t.id)}
                  className="h-8 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700"
                >
                  Mark done
                </button>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                  {t.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Pane>
  );
}

export function PortalInvoicesPane({ slug }: { slug: string }) {
  const { portal, logActivity, refresh } = usePortalContext(slug);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (portal) logActivity("Viewed invoices");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal?.id]);

  if (!portal) return null;
  const invoices = listInvoices().filter(
    (i) =>
      i.clientName === portal.clientName &&
      !["Draft", "Void", "Cancelled"].includes(i.status),
  );
  const canPay = canPayInPortal(portal);

  function pay(invoiceId: string) {
    const inv = listInvoices().find((i) => i.id === invoiceId);
    if (!inv || !canPay || inv.amountDue <= 0) return;
    const amount = inv.amountDue;
    const paid = applyPaymentToInvoice(inv, amount);
    upsertInvoice(
      appendInvoiceAudit(paid, `Portal payment ${formatAUD(amount)}`, portal!.primaryContactName),
    );
    logActivity(`Paid invoice ${inv.invoiceId}`);
    refresh();
    setToast(`Paid ${formatAUD(amount)}`);
    window.setTimeout(() => setToast(null), 2500);
  }

  return (
    <Pane title="Invoices" subtitle="Balances and payments">
      {!canPay && invoices.some((i) => i.amountDue > 0) ? (
        <p className="mb-3 text-[11px] text-slate-500">
          {portal.accessLevel === "Read-only"
            ? "Read-only access — invoices are view-only."
            : "Limited access — contact your broker to pay invoices."}
        </p>
      ) : null}
      {toast ? (
        <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-800">
          {toast}
        </div>
      ) : null}
      {invoices.length === 0 ? (
        <Empty>No invoices</Empty>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <div className="font-semibold text-slate-900">{inv.invoiceId}</div>
                <div className="text-[11px] text-slate-500">
                  {inv.title} · Due {inv.dueDate} · {inv.status}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[13px] font-bold text-slate-900">
                    {formatAUD(inv.amountDue)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    of {formatAUD(inv.total)}
                  </div>
                </div>
                {canPay && inv.amountDue > 0 ? (
                  <button
                    type="button"
                    onClick={() => pay(inv.id)}
                    className="h-8 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white"
                  >
                    Pay
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Pane>
  );
}

export function PortalTicketsPane({ slug }: { slug: string }) {
  const { portal, logActivity, canWrite, isReadOnly, email } =
    usePortalContext(slug);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState("");

  function reload() {
    if (!portal) return;
    setTickets(
      listTickets().filter(
        (t) =>
          t.relatedAccount === portal.clientName ||
          t.requester === portal.primaryContactName,
      ),
    );
  }

  useEffect(() => {
    if (!portal) return;
    reload();
    logActivity("Viewed tickets");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal?.id]);

  function raiseTicket() {
    if (!portal || !canWrite || isReadOnly) return;
    if (!subject.trim() || !description.trim()) {
      setMsg("Subject and description required");
      return;
    }
    const ids = nextTicketIds();
    const created = upsertTicket(
      appendTicketAudit(
        {
          id: ids.id,
          ticketId: ids.ticketId,
          subject: subject.trim(),
          requester: portal.primaryContactName,
          relatedAccount: portal.clientName,
          priority: "Medium",
          status: "New",
          category: "General",
          description: description.trim(),
          createdBy: portal.primaryContactName,
          createdAt: formatTicketDate(),
          modifiedAt: formatTicketDate(),
          notes: [],
          audit: [],
        },
        "Created via client portal",
        email ?? portal.primaryContactName,
      ),
    );
    logActivity(`Raised ticket ${created.ticketId}`);
    setSubject("");
    setDescription("");
    setMsg(`Created ${created.ticketId}`);
    reload();
  }

  if (!portal) return null;

  return (
    <Pane title="Support tickets" subtitle="Track issues and raise new ones">
      {canWrite && !isReadOnly ? (
        <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4">
          <h3 className="mb-2 text-[12px] font-bold text-slate-800">Raise a ticket</h3>
          <input
            className="mb-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            className="mb-2 min-h-[72px] w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-violet-400"
            placeholder="Describe the issue…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {msg ? (
            <p className="mb-2 text-[11px] text-slate-500">{msg}</p>
          ) : null}
          <button
            type="button"
            onClick={raiseTicket}
            className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
          >
            Submit ticket
          </button>
        </div>
      ) : null}

      {tickets.length === 0 ? (
        <Empty>No tickets yet</Empty>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
          {tickets.map((t) => (
            <li key={t.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{t.ticketId}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                    TICKET_STATUS_STYLE[t.status],
                  )}
                >
                  {t.status}
                </span>
              </div>
              <div className="mt-0.5 text-[12px] text-slate-700">{t.subject}</div>
              <div className="text-[10px] text-slate-400">
                {t.priority} · {t.createdAt}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Pane>
  );
}

export function PortalReportsPane({ slug }: { slug: string }) {
  const { portal, logActivity } = usePortalContext(slug);
  useEffect(() => {
    if (portal) logActivity("Viewed reports");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal?.id]);
  if (!portal) return null;

  const invoices = listInvoices().filter((i) => i.clientName === portal.clientName);
  const outstanding = invoices.reduce((s, i) => s + i.amountDue, 0);
  const tickets = listTickets().filter(
    (t) => t.relatedAccount === portal.clientName,
  );
  const openTickets = tickets.filter((t) =>
    ["New", "Open", "In Progress", "Pending", "Reopened"].includes(t.status),
  ).length;

  return (
    <Pane title="Reports" subtitle="Snapshot for your account">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Open deals" value={String(portalDealsForClient(portal.clientName).length)} />
        <Kpi label="Outstanding" value={formatAUD(outstanding)} />
        <Kpi label="Open tickets" value={String(openTickets)} />
      </div>
    </Pane>
  );
}

function Pane({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-[13px] text-slate-400">
      {children}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
      <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
