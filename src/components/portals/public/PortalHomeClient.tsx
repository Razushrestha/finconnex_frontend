"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Upload,
} from "lucide-react";
import { LoanJourneyStepper } from "@/components/portals/public/mortgage/LoanJourneyStepper";
import { InitialsAvatar } from "@/components/portals/public/mortgage/PortalBrand";
import { useMortgagePortal } from "@/components/portals/public/mortgage/useMortgagePortal";
import {
  PORTAL_RESOURCES,
  docsProgress,
  factFindProgress,
  formatAud,
  formatMessageAt,
  loanLvr,
  monthlyRepayment,
  normalizeDocStatus,
  pendingDocuments,
  unreadMessages,
} from "@/lib/portals/mortgage";
import { cn } from "@/lib/utils";

export function PortalHomeClient({ slug }: { slug: string }) {
  const { portal, mortgage } = useMortgagePortal(slug);
  if (!portal || !mortgage) return null;

  const { client, broker, loan } = mortgage;
  const ff = factFindProgress(mortgage.factFind);
  const docs = docsProgress(mortgage.documents);
  const pending = pendingDocuments(mortgage.documents);
  const unread = unreadMessages(mortgage.messages);
  const repayment = Math.round(monthlyRepayment(loan.loanAmount, loan.rate, loan.termYears));
  const previewDocs = mortgage.documents.slice(0, 3);
  const previewMsgs = [...mortgage.messages]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 2);
  const previewTimeline = mortgage.timeline.slice(0, 3);

  return (
    <div className="space-y-2.5 pb-2">
      <div>
        <h1 className="text-[18px] leading-tight font-bold tracking-tight text-slate-900">
          {(mortgage.loginCount ?? 1) > 1 ? "Welcome back" : "Welcome"}, {client.firstName}! 👋
        </h1>
        <p className="text-[11px] text-slate-500">
          Here&apos;s everything you need to keep your home loan moving.
        </p>
      </div>

      <LoanJourneyStepper slug={slug} current={mortgage.currentStage} compact />

      <div className="grid gap-2.5 lg:grid-cols-3">
        <div className="flex flex-col gap-2.5">
          <article className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-rose-800">
              <AlertTriangle className="h-3.5 w-3.5" />
              Action Required
            </div>
            <p className="mt-1 text-[11px] leading-snug text-rose-900/80">
              {pending.length} document{pending.length === 1 ? "" : "s"} still required.
              Upload the rest to keep your application moving.
            </p>
            <Link
              href={`/p/${slug}/documents`}
              className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-md bg-rose-500 px-2.5 text-[11px] font-semibold text-white hover:bg-rose-600"
            >
              <Upload className="h-3 w-3" />
              Upload Documents
            </Link>
          </article>

          <article className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-900">
                <FileText className="h-3.5 w-3.5" />
                Documents
              </div>
              <span className="text-[10px] font-semibold text-emerald-800">
                {docs.toComplete} to complete · {docs.accepted} approved
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-emerald-200/80">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${docs.total ? (docs.received / docs.total) * 100 : 0}%` }}
              />
            </div>
            <ul className="mt-1.5 space-y-1">
              {previewDocs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-slate-800">{d.name}</span>
                  {normalizeDocStatus(d.status) === "accepted" ? (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Approved
                    </span>
                  ) : normalizeDocStatus(d.status) === "under-review" ? (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-sky-700">
                      <Clock3 className="h-3 w-3" />
                      Submitted
                    </span>
                  ) : normalizeDocStatus(d.status) === "rejected" ? (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-rose-700">
                      <AlertTriangle className="h-3 w-3" />
                      Rejected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700">
                      <Clock3 className="h-3 w-3" />
                      Not uploaded
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <Link
              href={`/p/${slug}/documents`}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
            >
              View All Documents
              <ArrowRight className="h-3 w-3" />
            </Link>
          </article>
        </div>

        <div className="flex flex-col gap-2.5">
          <article className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-amber-900">
              <Pencil className="h-3.5 w-3.5" />
              Fact Find
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <div className="text-[16px] font-bold text-amber-950">{ff.percent}% complete</div>
              <div className="text-[10px] text-amber-800/80">
                {ff.remaining} question{ff.remaining === 1 ? "" : "s"} remaining
              </div>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-amber-200/70">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${ff.percent}%` }} />
            </div>
            <Link
              href={`/p/${slug}/fact-find`}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:underline"
            >
              Continue Fact Find
              <ArrowRight className="h-3 w-3" />
            </Link>
          </article>

          <article className="flex-1 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-sky-950">
              <MessageSquare className="h-3.5 w-3.5" />
              Messages
              {unread > 0 ? (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5A32A3] px-1 text-[9px] font-bold text-white">
                  {unread}
                </span>
              ) : null}
            </div>
            <ul className="mt-1.5 space-y-1.5">
              {previewMsgs.map((m) => (
                <li key={m.id} className="flex gap-1.5">
                  <InitialsAvatar
                    initials={
                      m.from === "broker"
                        ? broker.initials
                        : `${client.firstName[0]}${client.lastName[0] || ""}`
                    }
                    size="sm"
                    tone={m.from === "broker" ? "purple" : "slate"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-bold text-slate-900">{m.name}</span>
                      <span className="shrink-0 text-[9px] text-slate-400">
                        {formatMessageAt(m.at)}
                      </span>
                    </div>
                    <p className="truncate text-[10px] text-slate-600">{m.body}</p>
                  </div>
                  {m.unread ? (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5A32A3]" />
                  ) : null}
                </li>
              ))}
            </ul>
            <Link
              href={`/p/${slug}/messages`}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:underline"
            >
              View All Messages
              <ArrowRight className="h-3 w-3" />
            </Link>
          </article>
        </div>

        <div className="flex flex-col gap-2.5">
          <article className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
            <div className="text-[12px] font-bold text-slate-900">Your Broker</div>
            <div className="mt-1.5 flex items-center gap-2">
              <InitialsAvatar initials={broker.initials} size="sm" />
              <div className="min-w-0">
                <div className="truncate text-[12px] font-bold text-slate-900">{broker.name}</div>
                <div className="text-[10px] text-slate-500">{broker.title}</div>
              </div>
              <div className="ml-auto flex gap-1">
                <a
                  href={`tel:${broker.phone.replace(/\s/g, "")}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5A32A3] text-white hover:bg-[#4a2888]"
                  aria-label="Call broker"
                >
                  <Phone className="h-3 w-3" />
                </a>
                <a
                  href={`mailto:${broker.email}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5A32A3] text-white hover:bg-[#4a2888]"
                  aria-label="Email broker"
                >
                  <Mail className="h-3 w-3" />
                </a>
                <Link
                  href={`/p/${slug}/messages`}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5A32A3] text-white hover:bg-[#4a2888]"
                  aria-label="Message broker"
                >
                  <MessageSquare className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </article>

          <article className="flex-1 rounded-xl border border-violet-100 bg-white px-3 py-2.5">
            <div className="text-[12px] font-bold text-slate-900">Proposed Loan (Indicative)</div>
            <dl className="mt-1.5 space-y-0.5 text-[11px]">
              {[
                ["Lender", loan.lender],
                ["Loan Amount", formatAud(loan.loanAmount)],
                ["Purchase Price", formatAud(loan.purchasePrice)],
                ["Deposit", formatAud(loan.deposit)],
                ["LVR", `${loanLvr(loan).toFixed(2)}%`],
                ["Loan Type", loan.loanType],
                ["Interest Rate", `${loan.rate.toFixed(2)}% p.a.`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-2 rounded-lg bg-[#5A32A3] px-2.5 py-1.5 text-white">
              <div className="text-[9px] font-semibold tracking-wide uppercase opacity-80">
                Estimated Repayment
              </div>
              <div className="text-[15px] font-bold leading-tight">
                {formatAud(repayment)}{" "}
                <span className="text-[10px] font-semibold opacity-80">/ month</span>
              </div>
            </div>
            <Link
              href={`/p/${slug}/loan`}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#5A32A3] hover:underline"
            >
              View Loan Recommendation
              <ArrowRight className="h-3 w-3" />
            </Link>
          </article>
        </div>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 lg:col-span-2">
          <div className="text-[12px] font-bold text-slate-900">Latest Updates</div>
          <ol className="mt-1.5">
            {previewTimeline.map((ev, i) => (
              <li key={ev.id} className="flex gap-2">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full",
                      ev.done ? "bg-[#5A32A3] text-white" : "border-2 border-[#5A32A3] bg-white",
                    )}
                  >
                    {ev.done ? <CheckCircle2 className="h-3 w-3" /> : null}
                  </span>
                  {i < previewTimeline.length - 1 ? (
                    <span className="w-px flex-1 bg-slate-200" />
                  ) : null}
                </div>
                <div className={i < previewTimeline.length - 1 ? "pb-1.5" : ""}>
                  <div className="text-[11px] font-semibold text-slate-900">{ev.title}</div>
                  <div className="text-[9px] text-slate-400">{ev.at}</div>
                </div>
              </li>
            ))}
          </ol>
          <Link
            href={`/p/${slug}/timeline`}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#5A32A3] hover:underline"
          >
            View Full Timeline
            <ArrowRight className="h-3 w-3" />
          </Link>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
          <div className="text-[12px] font-bold text-slate-900">Helpful Resources</div>
          <ul className="mt-1 divide-y divide-slate-100">
            {PORTAL_RESOURCES.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/p/${slug}/resources/${r.id}`}
                  className="flex items-center gap-2 py-1.5 hover:opacity-80"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50 text-[#5A32A3]">
                    <FileText className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold text-slate-900">
                      {r.title}
                    </span>
                    <span className="block truncate text-[9px] text-slate-500">{r.blurb}</span>
                  </span>
                  <ExternalLink className="h-3 w-3 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}
