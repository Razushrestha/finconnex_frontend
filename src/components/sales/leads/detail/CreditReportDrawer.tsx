"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CreditReport = {
  generatedAt: string;
  accounts: {
    active: number;
    combinedLimit: string;
    rows: { name: string; limit: string; status: string }[];
  };
  enquiries: {
    past3: number;
    past12: number;
    totalValue: string;
    rows: { date: string; lender: string; type: string; amount: string }[];
  };
  defaults: {
    recent2y: number;
    older: number;
    rows: { date: string; original: string; status: string }[];
  };
  insolvencies: {
    total: number;
    rows: { type: string; date: string; status: string }[];
  };
  business: {
    names: number;
    currentDirectorships: number;
    previousDirectorships: number;
    rows: { name: string; role: string; status: string }[];
  };
  identity: {
    count: number;
    rows: { name: string; source: string }[];
  };
};

function money(value: number) {
  return value.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function buildCreditReport(
  seed: string,
  name: string,
  matched: boolean,
): CreditReport {
  if (!matched) {
    return {
      generatedAt: "Feb 07, 2026 - 9:01am",
      accounts: { active: 0, combinedLimit: money(0), rows: [] },
      enquiries: { past3: 0, past12: 0, totalValue: money(0), rows: [] },
      defaults: { recent2y: 0, older: 0, rows: [] },
      insolvencies: { total: 0, rows: [] },
      business: {
        names: 0,
        currentDirectorships: 0,
        previousDirectorships: 0,
        rows: [],
      },
      identity: { count: 0, rows: [] },
    };
  }

  const hash = hashSeed(seed);
  const first = name.split(" ")[0] ?? name;
  return {
    generatedAt: "Feb 07, 2026 - 9:01am",
    accounts: {
      active: 2,
      combinedLimit: money(980_962),
      rows: [
        { name: "Home loan — CBA", limit: money(850_000), status: "Open" },
        { name: "Credit card — NAB", limit: money(12_000), status: "Open" },
        { name: "Vehicle finance — Macquarie", limit: money(118_962), status: "Open" },
      ].slice(0, 2 + (hash % 2)),
    },
    enquiries: {
      past3: 0,
      past12: 3,
      totalValue: money(3_885_384),
      rows: [
        { date: "12 Nov 2025", lender: "ANZ", type: "Home loan", amount: money(920_000) },
        { date: "03 Aug 2025", lender: "CBA", type: "Home loan", amount: money(2_400_000) },
        { date: "18 Mar 2025", lender: "Westpac", type: "Personal loan", amount: money(565_384) },
      ],
    },
    defaults: { recent2y: 0, older: 0, rows: [] },
    insolvencies: { total: 0, rows: [] },
    business: {
      names: 0,
      currentDirectorships: 1,
      previousDirectorships: 1,
      rows: [
        { name: `${first} Holdings Pty Ltd`, role: "Director", status: "Current" },
        { name: "Northside Advisory Pty Ltd", role: "Director", status: "Ceased 2023" },
      ],
    },
    identity: {
      count: 2,
      rows: [
        { name, source: "Credit file" },
        { name: `${first} ${name.split(" ").slice(-1)[0] ?? ""}`.trim(), source: "ASIC" },
      ],
    },
  };
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <p className="text-[13px] text-slate-600">{label}</p>
      <p className="text-[14px] font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ReportSection({
  title,
  children,
  extra,
}: {
  title: string;
  children: ReactNode;
  extra?: ReactNode;
}) {
  const [more, setMore] = useState(false);
  return (
    <section className="border-b border-slate-100 py-3 last:border-b-0">
      <h3 className="mb-1 text-[14px] font-bold text-slate-900">{title}</h3>
      {children}
      {extra ? (
        <>
          {more ? <div className="mt-2 space-y-1.5">{extra}</div> : null}
          <button
            type="button"
            onClick={() => setMore((open) => !open)}
            className="mt-1 inline-flex items-center gap-0.5 text-[12px] font-medium text-[#2563eb]"
          >
            {more ? "Show less" : "Show more"}
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", more && "rotate-180")}
            />
          </button>
        </>
      ) : null}
    </section>
  );
}

export function CreditReportBody({ report }: { report: CreditReport }) {
  return (
    <div>
      <p className="mb-3 text-[12px] text-slate-500">
        Date generated:{" "}
        <span className="font-medium text-slate-700">{report.generatedAt}</span>
      </p>
      <p className="mb-4 text-[10px] text-slate-400">
        Powered by{" "}
        <span className="font-extrabold tracking-wide text-[#d52b1e]">
          EQUIFAX
        </span>
      </p>

      <ReportSection
        title="Accounts"
        extra={
          report.accounts.rows.length > 0 ? (
            report.accounts.rows.map((row) => (
              <div
                key={row.name}
                className="rounded-lg border border-slate-100 bg-[#FAF9FC] px-3 py-2"
              >
                <p className="text-[13px] font-medium text-slate-800">
                  {row.name}
                </p>
                <p className="text-[12px] text-slate-500">
                  {row.limit} · {row.status}
                </p>
              </div>
            ))
          ) : (
            <p className="text-[12px] text-slate-500">No accounts on file.</p>
          )
        }
      >
        <Metric
          label="Number of active credit accounts"
          value={report.accounts.active}
        />
        <Metric
          label="Total combined limit"
          value={report.accounts.combinedLimit}
        />
      </ReportSection>

      <ReportSection
        title="Credit enquiries"
        extra={
          report.enquiries.rows.length > 0 ? (
            report.enquiries.rows.map((row) => (
              <div
                key={`${row.date}-${row.lender}`}
                className="rounded-lg border border-slate-100 bg-[#FAF9FC] px-3 py-2"
              >
                <p className="text-[13px] font-medium text-slate-800">
                  {row.lender} · {row.type}
                </p>
                <p className="text-[12px] text-slate-500">
                  {row.date} · {row.amount}
                </p>
              </div>
            ))
          ) : (
            <p className="text-[12px] text-slate-500">No enquiries on file.</p>
          )
        }
      >
        <Metric label="Past 3 months" value={report.enquiries.past3} />
        <Metric label="Past 12 months" value={report.enquiries.past12} />
        <Metric label="Total value" value={report.enquiries.totalValue} />
      </ReportSection>

      <ReportSection
        title="Defaults"
        extra={
          report.defaults.rows.length > 0 ? (
            report.defaults.rows.map((row) => (
              <div
                key={row.date}
                className="rounded-lg border border-slate-100 bg-[#FAF9FC] px-3 py-2"
              >
                <p className="text-[13px] font-medium text-slate-800">
                  {row.original}
                </p>
                <p className="text-[12px] text-slate-500">
                  {row.date} · {row.status}
                </p>
              </div>
            ))
          ) : (
            <p className="text-[12px] text-slate-500">No defaults recorded.</p>
          )
        }
      >
        <Metric label="Most recent 2 years" value={report.defaults.recent2y} />
        <Metric label="Older than 2 years" value={report.defaults.older} />
      </ReportSection>

      <ReportSection
        title="Insolvencies & court actions"
        extra={
          report.insolvencies.rows.length > 0 ? (
            report.insolvencies.rows.map((row) => (
              <div
                key={row.date}
                className="rounded-lg border border-slate-100 bg-[#FAF9FC] px-3 py-2"
              >
                <p className="text-[13px] font-medium text-slate-800">
                  {row.type}
                </p>
                <p className="text-[12px] text-slate-500">
                  {row.date} · {row.status}
                </p>
              </div>
            ))
          ) : (
            <p className="text-[12px] text-slate-500">
              No insolvencies or court actions.
            </p>
          )
        }
      >
        <Metric
          label="Total number of insolvencies"
          value={report.insolvencies.total}
        />
      </ReportSection>

      <ReportSection
        title="Business relationships"
        extra={
          report.business.rows.length > 0 ? (
            report.business.rows.map((row) => (
              <div
                key={row.name}
                className="rounded-lg border border-slate-100 bg-[#FAF9FC] px-3 py-2"
              >
                <p className="text-[13px] font-medium text-slate-800">
                  {row.name}
                </p>
                <p className="text-[12px] text-slate-500">
                  {row.role} · {row.status}
                </p>
              </div>
            ))
          ) : (
            <p className="text-[12px] text-slate-500">
              No business relationships on file.
            </p>
          )
        }
      >
        <Metric label="Business names" value={report.business.names} />
        <Metric
          label="Current directorships"
          value={report.business.currentDirectorships}
        />
        <Metric
          label="Previous directorships (10 years)"
          value={report.business.previousDirectorships}
        />
      </ReportSection>

      <ReportSection
        title="Identity details"
        extra={
          report.identity.rows.length > 0 ? (
            report.identity.rows.map((row) => (
              <div
                key={`${row.name}-${row.source}`}
                className="rounded-lg border border-slate-100 bg-[#FAF9FC] px-3 py-2"
              >
                <p className="text-[13px] font-medium text-slate-800">
                  {row.name}
                </p>
                <p className="text-[12px] text-slate-500">{row.source}</p>
              </div>
            ))
          ) : (
            <p className="text-[12px] text-slate-500">
              No identity records on file.
            </p>
          )
        }
      >
        <Metric label="Number of identities" value={report.identity.count} />
      </ReportSection>
    </div>
  );
}

export function CreditReportDrawer({
  open,
  name,
  roleLabel,
  score,
  band,
  report,
  onClose,
}: {
  open: boolean;
  name: string;
  roleLabel: string;
  score: number | null;
  band: string | null;
  report: CreditReport;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Credit report"
        className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-white shadow-[-16px_0_40px_-16px_rgba(15,23,42,0.28)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.07em] text-[#5A32A3] uppercase">
              {roleLabel}
            </p>
            <p className="truncate text-[16px] font-semibold text-slate-900">
              {name}
            </p>
            <p className="mt-1 text-[12px] text-slate-500">
              {score !== null
                ? `Apply Score ${score} of 1200${band ? ` · ${band}` : ""}`
                : "No Equifax match"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-slate-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <CreditReportBody report={report} />
        </div>
      </aside>
    </div>,
    document.body,
  );
}
