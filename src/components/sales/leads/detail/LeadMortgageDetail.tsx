"use client";

import Link from "next/link";
import {
  Briefcase,
  Calculator,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock,
  Download,
  FileText,
  Home,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Send,
  StickyNote,
  Target,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import type { LeadCardData } from "@/lib/leads/types";
import {
  daysInStage,
  leadApplicants,
  leadBuyerTag,
  leadFinancials,
  leadLocation,
  leadQualification,
  leadScoreBreakdown,
  LEAD_DETAIL_STAGES,
} from "@/lib/leads/detail-snapshot";
import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/lib/activities/shared";

const PURPLE = "#5A32A3";

const STAGE_LABEL: Record<string, string> = {
  "New Lead": "New Lead",
  "Appointment Booked": "Appointment",
  "In Conversation": "Contacted",
  "Waiting on Documents": "Qualified",
  "Documents Received": "Documents",
  Processing: "Processing",
  Settled: "Settled",
};

const FINANCE_META = [
  { icon: Home, iconWrap: "bg-violet-50 text-violet-600" },
  { icon: CircleDollarSign, iconWrap: "bg-emerald-50 text-emerald-600" },
  { icon: Calculator, iconWrap: "bg-sky-50 text-sky-600" },
  { icon: Wallet, iconWrap: "bg-amber-50 text-amber-600" },
  { icon: Users, iconWrap: "bg-rose-50 text-rose-600" },
  { icon: Clock, iconWrap: "bg-indigo-50 text-indigo-600" },
];

const ACTIVITY = [
  { label: "Call made", when: "Yesterday, 1:00 PM", icon: Phone, tone: "bg-orange-50 text-orange-600" },
  { label: "SMS sent", when: "Yesterday, 11:20 AM", icon: MessageSquare, tone: "bg-sky-50 text-sky-600" },
  { label: "Email opened", when: "3 hours ago", icon: Mail, tone: "bg-emerald-50 text-emerald-600" },
  { label: "Document uploaded", when: "2 days ago", icon: Upload, tone: "bg-violet-50 text-violet-600" },
];

const RELATED = [
  { label: "Tasks", count: 3, icon: Check, tone: "bg-violet-50 text-violet-700" },
  { label: "Notes", count: 4, icon: StickyNote, tone: "bg-amber-50 text-amber-700" },
  { label: "Appts", count: 2, icon: CalendarDays, tone: "bg-sky-50 text-sky-700" },
  { label: "Deals", count: 0, icon: Briefcase, tone: "bg-slate-100 text-slate-500" },
  { label: "Docs", count: 3, icon: FileText, tone: "bg-rose-50 text-rose-600" },
];

interface LeadMortgageDetailProps {
  card: LeadCardData;
  onCall: () => void;
  onEmail: () => void;
  onConvert: () => void;
  onEdit: () => void;
  onMore: () => void;
  onStatusChange: (stage: string) => void;
  onStartCall: () => void;
  onReschedule: () => void;
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.07em] text-slate-400 uppercase">
      {children}
    </p>
  );
}

function GhostButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ScoreRing({ value }: { value: number }) {
  const size = 96;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="leadScoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#eef2f7"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#leadScoreGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[20px] font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-0.5 text-[10px] text-slate-400">/100</p>
      </div>
    </div>
  );
}

export function LeadMortgageDetail({
  card,
  onCall,
  onEmail,
  onConvert,
  onMore,
  onStatusChange,
  onStartCall,
  onReschedule,
}: LeadMortgageDetailProps) {
  const stage = card.pipelineStage ?? "New Lead";
  const stageIndex = Math.max(
    0,
    LEAD_DETAIL_STAGES.findIndex((item) => item === stage),
  );
  const applicants = leadApplicants(card);
  const financials = leadFinancials(card);
  const score = leadScoreBreakdown(card);
  const qualification = leadQualification(card);
  const inStage = daysInStage(card);
  const tag = leadBuyerTag(card);
  const location = leadLocation(card);

  return (
    <div className="space-y-4 bg-[#F7F6F9] -mx-3 -mb-3 px-3 pb-6 lg:-mx-5 lg:px-5 2xl:-mx-8 2xl:px-8">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="relative shrink-0">
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full text-[15px] font-bold",
                  card.avatarBgClass,
                )}
              >
                {card.initials}
              </span>
              <span className="absolute right-0.5 bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
                  {card.name}
                </h1>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {stage}
                </span>
                <span className="rounded-full bg-[#F3ECFB] px-2 py-0.5 text-[11px] font-semibold text-[#5A32A3]">
                  {tag}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {card.phone}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {card.email}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {location}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GhostButton onClick={onCall}>
              <Phone className="h-3.5 w-3.5" />
              Call
            </GhostButton>
            <GhostButton onClick={onEmail}>
              <Mail className="h-3.5 w-3.5" />
              Email
            </GhostButton>
            <button
              type="button"
              onClick={onConvert}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: PURPLE }}
            >
              <Send className="h-3.5 w-3.5" />
              Convert to Deal
            </button>
            <GhostButton onClick={onMore} className="w-9 px-0 justify-center">
              <MoreHorizontal className="h-4 w-4" />
            </GhostButton>
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-6">
          <Meta
            label="Lead Owner"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold",
                    avatarColor(card.owner),
                  )}
                >
                  {initials(card.owner)}
                </span>
                {card.owner}
              </span>
            }
          />
          <Meta label="Lead Source" value={card.source} />
          <Meta label="Lead Created" value={card.createdDate} />
          <Meta label="Last Contacted" value="Yesterday, 1:00 PM" />
          <Meta
            label="Days in Stage"
            value={`${inStage} day${inStage === 1 ? "" : "s"}`}
          />
          <div>
            <Eyebrow>Status</Eyebrow>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute top-1/2 left-2.5 h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-500" />
              <select
                value={stage}
                onChange={(e) => onStatusChange(e.target.value)}
                className="h-8 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-6 pr-7 text-[13px] font-medium text-slate-800 outline-none"
              >
                {LEAD_DETAIL_STAGES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-slate-900">
                Applicants
              </h2>
              <button
                type="button"
                className="text-[12px] font-semibold hover:underline"
                style={{ color: PURPLE }}
              >
                Manage Applicants
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {applicants.map((person) => (
                <div
                  key={person.name}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-[#FAF9FC] p-3"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      avatarColor(person.name),
                    )}
                  >
                    {initials(person.name)}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">
                      {person.name}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400">
                      {person.role}
                    </p>
                    <p className="mt-1 text-[12px] text-slate-500">
                      {person.residency}
                    </p>
                    <p className="text-[12px] text-slate-500">{person.employment}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Eyebrow>Financial Snapshot</Eyebrow>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {financials.map((item, i) => {
                const meta = FINANCE_META[i];
                const Icon = meta.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-[#FAF9FC] px-3 py-2.5"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        meta.iconWrap,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-400">{item.label}</p>
                      <p className="truncate text-[13px] font-semibold text-slate-900">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <Eyebrow>Pipeline Progress</Eyebrow>
            <div className="mt-5">
              <div className="relative flex items-start justify-between">
                <div className="absolute top-3 right-4 left-4 h-0.5 bg-slate-100" />
                <div
                  className="absolute top-3 left-4 h-0.5 bg-orange-400"
                  style={{
                    width: `calc(${(stageIndex / Math.max(1, LEAD_DETAIL_STAGES.length - 1)) * 100}% - 8px)`,
                  }}
                />
                {LEAD_DETAIL_STAGES.map((item, index) => {
                  const current = index === stageIndex;
                  const done = index < stageIndex;
                  return (
                    <div
                      key={item}
                      className="relative z-[1] flex min-w-0 flex-1 flex-col items-center"
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-4 ring-white",
                          current && "bg-orange-500 text-white",
                          done && "bg-[#5A32A3] text-white",
                          !current && !done && "bg-slate-200 text-slate-500",
                        )}
                      >
                        {done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                      </span>
                      <p
                        className={cn(
                          "mt-1.5 text-center text-[10px] leading-tight",
                          current
                            ? "font-semibold text-orange-600"
                            : done
                              ? "font-medium text-slate-700"
                              : "text-slate-400",
                        )}
                      >
                        {STAGE_LABEL[item] ?? item}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-orange-400"
                  style={{
                    width: `${((stageIndex + 1) / LEAD_DETAIL_STAGES.length) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-[12px] text-slate-500">
                Days in stage:{" "}
                <span className="font-medium text-slate-700">
                  {inStage} day{inStage === 1 ? "" : "s"}
                </span>
              </p>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <Eyebrow>Recent Activity</Eyebrow>
                <span className="text-[12px] font-semibold" style={{ color: PURPLE }}>
                  View all
                </span>
              </div>
              <ul className="space-y-3">
                {ACTIVITY.map((row) => {
                  const Icon = row.icon;
                  return (
                    <li key={row.label} className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          row.tone,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-slate-800">
                          {row.label}
                        </p>
                        <p className="text-[11px] text-slate-400">{row.when}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card>
              <Eyebrow>Recent Documents</Eyebrow>
              <ul className="mt-3 space-y-2">
                {[
                  "ID Proof.pdf",
                  "Payslip - Jun 2025.pdf",
                  "Bank Statement - Jun 2025.pdf",
                ].map((name) => (
                  <li
                    key={name}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2 text-[13px] font-medium text-slate-800">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-[10px] font-bold text-rose-600">
                        PDF
                      </span>
                      <span className="truncate">{name}</span>
                    </span>
                    <Download className="h-4 w-4 shrink-0 text-slate-400" />
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <Eyebrow>Lead Source & Campaign</Eyebrow>
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-[#FAF9FC] px-3 py-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1877F2] text-[11px] font-bold text-white">
                f
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-slate-900">
                  {card.source === "Social Media" || card.source === "Website"
                    ? "Facebook Ads"
                    : card.source}
                </p>
                <p className="truncate text-[12px] text-slate-500">
                  Campaign · {card.custom?.referralSource ?? "First Home Buyer Q3"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400">Company</p>
                <p className="text-[13px] font-medium text-slate-800">
                  {card.company || "—"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-orange-100">
            <div className="mb-2 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-orange-500" />
              <p className="text-[11px] font-semibold tracking-[0.07em] text-orange-500 uppercase">
                Next Action
              </p>
            </div>
            <p className="text-[17px] font-semibold text-slate-900">
              Call {card.name.split(" ")[0]}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-slate-500">
              Confirm borrowing requirements and book consultation.
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Due Today · 10:00 AM · {card.owner}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onStartCall}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-500 text-[13px] font-semibold text-white hover:bg-orange-600"
              >
                <Phone className="h-3.5 w-3.5" />
                Start Call
              </button>
              <GhostButton onClick={onReschedule}>
                <CalendarDays className="h-3.5 w-3.5" />
                Reschedule
              </GhostButton>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
              <div>
                <p className="text-[10px] text-slate-400">Last Contact</p>
                <p className="text-[12px] font-semibold text-slate-700">Yesterday</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Last Outcome</p>
                <p className="text-[12px] font-semibold text-emerald-600">Positive</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Attempts</p>
                <p className="text-[12px] font-semibold text-slate-700">2</p>
              </div>
            </div>
          </Card>

          <Card>
            <Eyebrow>Qualification</Eyebrow>
            <ul className="mt-3 space-y-2.5">
              {qualification.rows.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[13px] text-slate-600">
                    <span
                      className={cn(
                        "flex h-[18px] w-[18px] items-center justify-center rounded-full",
                        item.ok
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-400",
                      )}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {item.label}
                  </span>
                  <span className="text-right text-[13px] font-semibold text-slate-800">
                    {item.value}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <Eyebrow>Lead Score</Eyebrow>
            <div className="mt-3 flex items-center gap-4">
              <ScoreRing value={score.score} />
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-[12px] font-semibold text-emerald-600">
                  {score.label}
                </p>
                <ul className="space-y-1.5">
                  {score.parts.map((part) => (
                    <li
                      key={part.label}
                      className="flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="inline-flex items-center gap-1.5 text-slate-500">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: part.color }}
                        />
                        {part.label}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {part.value}/100
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <Eyebrow>Related Records</Eyebrow>
              <Link
                href="/activities/tasks"
                className="text-[12px] font-semibold hover:underline"
                style={{ color: PURPLE }}
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {RELATED.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="text-center">
                    <span
                      className={cn(
                        "mx-auto flex h-8 w-8 items-center justify-center rounded-lg",
                        item.tone,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <p className="mt-1 text-[15px] font-bold text-slate-900">
                      {item.count}
                    </p>
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1 text-[13px] font-medium text-slate-800">{value}</div>
    </div>
  );
}
