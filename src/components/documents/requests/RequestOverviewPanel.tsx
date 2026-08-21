"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Car,
  Coins,
  CreditCard,
  Flag,
  FolderOpen,
  ShoppingBag,
  Zap,
} from "lucide-react";
import type { DocumentRequest } from "@/lib/documents/requests/types";
import { cn } from "@/lib/utils";

type Kind = "insight" | "flag";
type Category =
  | "Applicant details"
  | "Assets"
  | "Expenses"
  | "Income"
  | "Liabilities";

interface InsightItem {
  id: string;
  kind: Kind;
  category: Category;
  title: string;
  tags: string[];
}

const CATEGORIES: Category[] = [
  "Applicant details",
  "Assets",
  "Expenses",
  "Income",
  "Liabilities",
];

function firstNames(requestedFrom: string) {
  const names = requestedFrom
    .split(",")
    .map((s) => s.trim().split(/\s+/)[0])
    .filter(Boolean);
  return names.length ? names : ["Applicant"];
}

function insightsFor(request: DocumentRequest): InsightItem[] {
  const [a, b] = firstNames(request.requestedFrom);
  const joint = b ?? a;
  return [
    {
      id: "i1",
      kind: "insight",
      category: "Assets",
      title: "Declared savings is verified.",
      tags: [a],
    },
    {
      id: "i2",
      kind: "insight",
      category: "Applicant details",
      title: "Identity documents have been received.",
      tags: [a],
    },
    {
      id: "f1",
      kind: "flag",
      category: "Liabilities",
      title: "Home loan balance is higher than originally declared.",
      tags: [a, "NAB", "Home loan"],
    },
    {
      id: "i3",
      kind: "insight",
      category: "Income",
      title: "PAYG income matches the latest payslip.",
      tags: [joint],
    },
    {
      id: "f2",
      kind: "flag",
      category: "Liabilities",
      title: "Credit card limit increased in the last 90 days.",
      tags: [joint, "NAB"],
    },
    {
      id: "i4",
      kind: "insight",
      category: "Assets",
      title: "Vehicle ownership matches the declared asset list.",
      tags: [a],
    },
    {
      id: "f3",
      kind: "flag",
      category: "Expenses",
      title: "HEM expenses are below the comparable region average.",
      tags: [a],
    },
    {
      id: "i5",
      kind: "insight",
      category: "Applicant details",
      title: "Employment tenure is greater than 12 months.",
      tags: [joint],
    },
    {
      id: "f4",
      kind: "flag",
      category: "Liabilities",
      title: "A personal loan was not listed on the application.",
      tags: [a, "Westpac"],
    },
    {
      id: "i6",
      kind: "insight",
      category: "Income",
      title: "Rental income is supported by a current lease.",
      tags: [joint],
    },
    {
      id: "f5",
      kind: "flag",
      category: "Liabilities",
      title: "Credit enquiry recorded in the last 30 days.",
      tags: [a],
    },
  ];
}

function financesFor(request: DocumentRequest) {
  const scale = 0.7 + (request.id.charCodeAt(request.id.length - 1) % 5) * 0.12;
  return {
    income: Math.round(278000 * scale),
    expenses: Math.round(3927 * scale),
    liabilities: 1.49 * scale,
    assets: 2.41 * scale,
  };
}

function formatMoney(n: number) {
  return `$${n.toLocaleString("en-AU")}`;
}

function formatMillions(n: number) {
  return `$${n.toFixed(2)}M`;
}

function LargeProgressRing({ value }: { value: number }) {
  const size = 92;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const complete = clamped >= 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#d1fae5"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={complete ? "#16a34a" : "#22c55e"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[18px] font-bold text-slate-800">
        {clamped}%
      </div>
    </div>
  );
}

export function RequestOverviewPanel({ request }: { request: DocumentRequest }) {
  const [tab, setTab] = useState<"all" | Kind>("all");
  const [category, setCategory] = useState<"All" | Category>("All");
  const items = useMemo(() => insightsFor(request), [request]);
  const finances = useMemo(() => financesFor(request), [request]);
  const totalDocs = 14;
  const actioned = Math.round((request.progress / 100) * totalDocs);

  const filtered = items.filter((item) => {
    if (tab !== "all" && item.kind !== tab) return false;
    if (category !== "All" && item.category !== category) return false;
    return true;
  });

  const catCounts = CATEGORIES.map((c) => ({
    c,
    n: items.filter((i) => i.category === c).length,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
              <Zap className="h-4 w-4" fill="currentColor" />
            </span>
            <h3 className="text-[15px] font-bold text-slate-900">
              Insights and flags
            </h3>
          </div>

          <div className="mt-3 flex gap-4 border-b border-slate-100 text-[13px] font-medium">
            {(
              [
                ["all", "All"],
                ["insight", "Insights"],
                ["flag", "Flags"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "relative pb-2",
                  tab === id ? "text-[#5A32A3]" : "text-slate-500",
                )}
              >
                {label}
                {tab === id ? (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#5A32A3]" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <FilterChip
              label={`All (${items.length})`}
              active={category === "All"}
              onClick={() => setCategory("All")}
            />
            {catCounts.map(({ c, n }) => (
              <FilterChip
                key={c}
                label={`${c} (${n})`}
                active={category === c}
                onClick={() => setCategory(c)}
              />
            ))}
          </div>

          <div className="mt-3 max-h-[280px] space-y-1 overflow-y-auto pr-1">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2.5 rounded-xl px-1.5 py-2 hover:bg-[#F8F4FC]"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    item.kind === "insight"
                      ? "bg-[#EDE4FB] text-[#5A32A3]"
                      : "bg-rose-50 text-rose-500",
                  )}
                >
                  {item.kind === "insight" ? (
                    <Zap className="h-3.5 w-3.5" fill="currentColor" />
                  ) : (
                    <Flag className="h-3.5 w-3.5" fill="currentColor" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900">
                    {item.title}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
          <h3 className="text-[15px] font-bold text-slate-900">
            Documents progress
          </h3>
          <p className="mt-1 text-[12px] text-slate-600">
            {actioned} of {totalDocs} documents actioned
          </p>
          <Link
            href={`/documents/requests/${request.id}`}
            className="mt-1 text-[12px] font-medium text-[#5A32A3] hover:underline"
          >
            More details
          </Link>
          <div className="mt-4 flex flex-1 flex-col items-center justify-between">
            <LargeProgressRing value={request.progress} />
            <div className="mt-4 flex items-end justify-center text-[#5A32A3]">
              <FolderOpen className="h-14 w-14" strokeWidth={1.4} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[14px] font-bold text-slate-900">
          Total finances (customer declared)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FinanceCard
            label="Annual income pre-tax"
            value={formatMoney(finances.income)}
            href={`/documents/requests/${request.id}`}
            icon={<Coins className="h-6 w-6 text-amber-500" />}
          />
          <FinanceCard
            label="Monthly expenses"
            value={formatMoney(finances.expenses)}
            href={`/documents/requests/${request.id}`}
            icon={<ShoppingBag className="h-6 w-6 text-sky-500" />}
          />
          <FinanceCard
            label="Liabilities balance"
            value={formatMillions(finances.liabilities)}
            href={`/documents/requests/${request.id}`}
            icon={<CreditCard className="h-6 w-6 text-violet-500" />}
          />
          <FinanceCard
            label="Assets value"
            value={formatMillions(finances.assets)}
            href={`/documents/requests/${request.id}`}
            icon={<Car className="h-6 w-6 text-[#5A32A3]" />}
          />
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-[12px] font-medium",
        active
          ? "bg-[#EDE4FB] text-[#5A32A3]"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      {label}
    </button>
  );
}

function FinanceCard({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: string;
  href: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <p className="text-[12px] text-slate-500">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[22px] font-bold tracking-tight text-slate-900">
          {value}
        </p>
        {icon}
      </div>
      <Link
        href={href}
        className="mt-2 inline-block text-[12px] font-medium text-[#5A32A3] hover:underline"
      >
        More details
      </Link>
    </div>
  );
}
