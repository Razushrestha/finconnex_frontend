"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  CalendarDays,
  ChevronDown,
  FileText,
  Filter,
  Mail,
  MessageSquare,
  MoreVertical,
  Phone,
  RefreshCcw,
  Sparkles,
  SquareCheck,
  UserPlus,
  Zap,
} from "lucide-react";
import { formatDuration, listLeadConversation } from "@/lib/leads/conversation-store";
import {
  hrefForLeadActivity,
  listLeadActivityCandidates,
} from "@/lib/leads/activity-index";
import { parseFlexibleDate, startOfDay } from "@/lib/leads/activity-dates";
import type { LeadActivityKind } from "@/lib/leads/card-types";
import { onLeadActivityChange } from "@/lib/leads/lead-extras-store";
import { onRulesChange } from "@/lib/rules/storage";
import type { LeadCardData } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

const PURPLE = "#5A32A3";
const PAGE = 8;

type ChipKey =
  | "all"
  | "call"
  | "email"
  | "sms"
  | "meeting"
  | "task"
  | "note"
  | "document"
  | "stage"
  | "automation";

type EventFamily = Exclude<ChipKey, "all"> | "system";

type RangeKey = "all" | "today" | "7d" | "30d";

type TimelineRow = {
  id: string;
  family: EventFamily;
  kind: LeadActivityKind | "conversation";
  at: Date;
  headline: string;
  body: string;
  actor: string;
  badge: string;
  duration?: string;
  href?: string | null;
};

const CHIPS: { id: ChipKey; label: string }[] = [
  { id: "all", label: "All" },
  { id: "call", label: "Calls" },
  { id: "email", label: "Emails" },
  { id: "sms", label: "SMS" },
  { id: "meeting", label: "Meetings" },
  { id: "task", label: "Tasks" },
  { id: "note", label: "Notes" },
  { id: "document", label: "Documents" },
  { id: "stage", label: "Stage Changes" },
  { id: "automation", label: "Automations" },
];

const FAMILIES: {
  id: EventFamily;
  label: string;
  icon: typeof Phone;
  tone: string;
  badge: string;
}[] = [
  { id: "call", label: "Calls", icon: Phone, tone: "bg-emerald-50 text-emerald-700", badge: "bg-emerald-50 text-emerald-700" },
  { id: "email", label: "Emails", icon: Mail, tone: "bg-orange-50 text-orange-700", badge: "bg-orange-50 text-orange-700" },
  { id: "sms", label: "SMS", icon: MessageSquare, tone: "bg-blue-50 text-blue-700", badge: "bg-blue-50 text-blue-700" },
  { id: "meeting", label: "Meetings", icon: CalendarDays, tone: "bg-sky-50 text-sky-700", badge: "bg-sky-50 text-sky-700" },
  { id: "task", label: "Tasks", icon: SquareCheck, tone: "bg-amber-50 text-amber-700", badge: "bg-amber-50 text-amber-700" },
  { id: "note", label: "Notes", icon: FileText, tone: "bg-violet-50 text-violet-700", badge: "bg-violet-50 text-violet-700" },
  { id: "document", label: "Documents", icon: FileText, tone: "bg-rose-50 text-rose-700", badge: "bg-rose-50 text-rose-700" },
  { id: "stage", label: "Stage Changes", icon: RefreshCcw, tone: "bg-slate-100 text-slate-600", badge: "bg-slate-100 text-slate-600" },
  { id: "automation", label: "Automations", icon: Zap, tone: "bg-indigo-50 text-indigo-700", badge: "bg-indigo-50 text-indigo-700" },
  { id: "system", label: "System Activity", icon: Sparkles, tone: "bg-purple-50 text-[#5A32A3]", badge: "bg-purple-50 text-[#5A32A3]" },
];

const RANGES: { id: RangeKey; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];

function kindToFamily(kind: LeadActivityKind): EventFamily {
  if (kind === "call") return "call";
  if (kind === "email") return "email";
  if (kind === "sms") return "sms";
  if (kind === "meeting") return "meeting";
  if (kind === "task" || kind === "reminder") return "task";
  if (kind === "note") return "note";
  if (kind === "document" || kind === "attachment") return "document";
  if (kind === "stage_change") return "stage";
  if (kind === "workflow") return "automation";
  return "system";
}

function headlineFor(kind: LeadActivityKind, title: string) {
  if (title && /→|Lead |updated|assigned|converted|created|Automation|Document|Stage |Status |Owner /i.test(title)) {
    return title;
  }
  if (kind === "note") return "Note added";
  if (kind === "call") return "Call logged";
  if (kind === "email") return "Email logged";
  if (kind === "meeting") return "Meeting logged";
  if (kind === "sms") return "SMS logged";
  if (kind === "document") return "Document activity";
  if (kind === "attachment") return "Document uploaded";
  if (kind === "stage_change") return "Stage changed";
  if (kind === "status_change") return "Status changed";
  if (kind === "workflow") return "Automation ran";
  if (kind === "created") return "Lead created";
  if (kind === "assigned") return "Lead assigned";
  if (kind === "owner_change") return "Owner changed";
  if (kind === "converted") return "Lead converted";
  if (kind === "deal") return "Deal activity";
  if (kind === "client") return "Client activity";
  if (kind === "task") return title || "Task updated";
  return title || "Lead updated";
}

function badgeFor(kind: LeadActivityKind, family: EventFamily) {
  if (kind === "created") return "Lead Created";
  if (kind === "assigned") return "Lead Assigned";
  if (kind === "owner_change") return "Owner Changed";
  if (kind === "converted") return "Lead Converted";
  if (kind === "status_change") return "Status Changed";
  if (kind === "deal") return "Deal Activity";
  if (kind === "client") return "Client Activity";
  if (kind === "workflow") return "Automation";
  if (kind === "attachment") return "Document";
  if (family === "stage") return "Stage Changed";
  if (family === "note") return "Note";
  if (family === "call") return "Call";
  if (family === "email") return "Email";
  if (family === "meeting") return "Meeting";
  if (family === "task") return "Task";
  if (family === "document") return "Document";
  if (family === "sms") return "SMS";
  return "System";
}

function familyIcon(family: EventFamily, kind?: LeadActivityKind) {
  if (kind === "created" || kind === "converted") return Sparkles;
  if (kind === "assigned") return UserPlus;
  if (kind === "owner_change") return ArrowRightLeft;
  return (FAMILIES.find((item) => item.id === family) ?? FAMILIES[FAMILIES.length - 1]).icon;
}

function dayLabel(at: Date, now: Date) {
  const today = startOfDay(now).getTime();
  const day = startOfDay(at).getTime();
  const rest = at.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (day === today) return `Today · ${rest}`;
  if (day === today - 86_400_000) return `Yesterday · ${rest}`;
  return rest;
}

function formatTime(at: Date) {
  return at.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function inRange(at: Date, range: RangeKey, now: Date) {
  if (range === "all") return true;
  const start = startOfDay(now).getTime();
  const t = at.getTime();
  if (range === "today") return startOfDay(at).getTime() === start;
  if (range === "7d") return t >= now.getTime() - 7 * 86_400_000;
  return t >= now.getTime() - 30 * 86_400_000;
}

function fromCandidates(card: LeadCardData, now: Date): TimelineRow[] {
  return listLeadActivityCandidates(card.name, now).flatMap((item) => {
    const family = kindToFamily(item.kind);
    const at = item.dueAt ?? item.createdAt;
    if (!at) return [];
    return [
      {
        id: item.id,
        family,
        kind: item.kind,
        at,
        headline: headlineFor(item.kind, item.title),
        body: item.body || item.title,
        actor: item.actor || card.owner,
        badge: badgeFor(item.kind, family),
        href: hrefForLeadActivity(item),
      },
    ];
  });
}

function fromConversation(card: LeadCardData): TimelineRow[] {
  return listLeadConversation(card).map((item) => {
    const family: EventFamily =
      item.channel === "email"
        ? "email"
        : item.channel === "call" || item.kind === "call" || item.kind === "voice"
          ? "call"
          : "sms";
    const outbound = item.direction === "out";
    return {
      id: `convo-${item.id}`,
      family,
      kind: "conversation" as const,
      at: new Date(item.at),
      headline:
        item.kind === "email"
          ? outbound
            ? "Email sent"
            : "Email received"
          : item.callOutcome === "missed"
            ? "Missed call"
            : item.kind === "voice"
              ? "Voice recording"
              : item.channel === "call"
                ? "Call completed"
                : outbound
                  ? `${item.channel === "whatsapp" ? "WhatsApp" : "SMS"} sent`
                  : `${item.channel === "whatsapp" ? "WhatsApp" : "SMS"} received`,
      body: item.subject || item.body || "",
      actor: item.fromName || card.owner,
      badge:
        item.channel === "email"
          ? outbound
            ? "Email"
            : "Client Activity"
          : item.channel === "call"
            ? outbound
              ? "Outbound Call"
              : "Inbound Call"
            : item.channel === "whatsapp"
              ? "WhatsApp"
              : outbound
                ? "SMS"
                : "Client Activity",
      duration:
        item.durationSeconds != null
          ? formatDuration(item.durationSeconds)
          : undefined,
    };
  });
}

function systemSeeds(card: LeadCardData, live: TimelineRow[]): TimelineRow[] {
  const createdAt =
    parseFlexibleDate(card.createdDate) ??
    parseFlexibleDate(card.pipelineStartedAt) ??
    new Date();
  const rows: TimelineRow[] = [];
  if (!live.some((row) => row.kind === "created")) {
    rows.push({
      id: `${card.id}-created`,
      family: "system",
      kind: "created",
      at: createdAt,
      headline: "Lead created",
      body: `${card.name} was added to the pipeline${card.source ? ` from ${card.source}` : ""}.`,
      actor: card.owner,
      badge: "Lead Created",
    });
  }
  if (!live.some((row) => row.kind === "assigned" || row.kind === "owner_change")) {
    rows.push({
      id: `${card.id}-assigned`,
      family: "system",
      kind: "assigned",
      at: createdAt,
      headline: `Lead assigned to ${card.owner}`,
      body: `Owner set to ${card.owner}.`,
      actor: card.owner,
      badge: "Lead Assigned",
    });
  }
  if (card.isConverted && !live.some((row) => row.kind === "converted")) {
    rows.push({
      id: `${card.id}-converted`,
      family: "system",
      kind: "converted",
      at: parseFlexibleDate(card.convertedAt) ?? createdAt,
      headline: "Lead converted",
      body: card.convertedDealId
        ? `Converted to deal ${card.convertedDealId}.`
        : "Lead converted to a deal.",
      actor: card.owner,
      badge: "Lead Converted",
    });
  }
  if (!live.some((row) => row.family === "automation")) {
    const autoAt = new Date(createdAt);
    autoAt.setMinutes(autoAt.getMinutes() + 5);
    rows.push({
      id: `${card.id}-automation`,
      family: "automation",
      kind: "workflow",
      at: autoAt,
      headline: "Automation ran",
      body: "New lead welcome sequence started.",
      actor: "Automation",
      badge: "Automation",
    });
  }
  return rows;
}

function metaFor(family: EventFamily) {
  return FAMILIES.find((item) => item.id === family) ?? FAMILIES[FAMILIES.length - 1];
}

export function LeadTimelinePanel({ card }: { card: LeadCardData }) {
  const [now] = useState(() => new Date());
  const [revision, setRevision] = useState(0);
  const [chip, setChip] = useState<ChipKey>("all");
  const [range, setRange] = useState<RangeKey>("all");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const chipLabel = CHIPS.find((item) => item.id === chip)?.label ?? "All";

  useEffect(() => {
    const bump = () => setRevision((n) => n + 1);
    const offActivity = onLeadActivityChange(bump);
    const offRules = onRulesChange(bump);
    return () => {
      offActivity();
      offRules();
    };
  }, []);

  const rows = useMemo(() => {
    const live = [...fromCandidates(card, now), ...fromConversation(card)];
    const extras = systemSeeds(card, live);
    const seen = new Set<string>();
    return [...live, ...extras]
      .filter((row) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return !Number.isNaN(row.at.getTime());
      })
      .sort((a, b) => b.at.getTime() - a.at.getTime());
  }, [card, now, revision]);

  const filtered = rows.filter((row) => {
    if (!inRange(row.at, range, now)) return false;
    if (chip === "all") return true;
    return row.family === chip;
  });
  const shown = filtered.slice(0, visibleCount);

  const groups: { label: string; items: TimelineRow[] }[] = [];
  for (const item of shown) {
    const label = dayLabel(item.at, now);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  const counts = FAMILIES.map((item) => ({
    ...item,
    count: rows.filter((row) => row.family === item.id).length,
  }));
  const total = rows.length;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold text-slate-900">Timeline</h2>
              <p className="text-[12px] text-slate-500">
                Every change, message, and system event on this lead
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setFilterOpen((v) => !v);
                    setRangeOpen(false);
                  }}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium",
                    filterOpen || chip !== "all"
                      ? "border-purple-200 bg-purple-50 text-[#5A32A3]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {chip === "all" ? "Filter" : chipLabel}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {filterOpen ? (
                  <>
                    <button
                      type="button"
                      aria-label="Close filter"
                      className="fixed inset-0 z-20 cursor-default"
                      onClick={() => setFilterOpen(false)}
                    />
                    <div className="absolute top-9 right-0 z-30 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      {CHIPS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setChip(item.id);
                            setFilterOpen(false);
                            setVisibleCount(PAGE);
                          }}
                          className={cn(
                            "flex w-full px-3 py-1.5 text-left text-[12px]",
                            chip === item.id
                              ? "font-semibold text-[#5A32A3]"
                              : "text-slate-700 hover:bg-slate-50",
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setRangeOpen((v) => !v);
                    setFilterOpen(false);
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  {RANGES.find((item) => item.id === range)?.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {rangeOpen ? (
                  <div className="absolute top-9 right-0 z-20 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {RANGES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setRange(item.id);
                          setRangeOpen(false);
                          setVisibleCount(PAGE);
                        }}
                        className={cn(
                          "flex w-full px-3 py-1.5 text-left text-[12px]",
                          range === item.id
                            ? "font-semibold text-[#5A32A3]"
                            : "text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {groups.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-slate-400">
              No timeline events in this view.
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.label} className="mb-5">
                <p className="mb-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  {group.label}
                </p>
                <div className="relative pl-2">
                  <div className="absolute top-3 bottom-3 left-[18px] w-px bg-slate-200" />
                  <ul className="space-y-3">
                    {group.items.map((item) => {
                      const meta = metaFor(item.family);
                      const Icon = familyIcon(item.family, item.kind === "conversation" ? undefined : item.kind);
                      const inner = (
                        <>
                          <span
                            className={cn(
                              "relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                              meta.tone,
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="w-14 shrink-0 text-[11px] text-slate-400">
                            {formatTime(item.at)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold text-slate-900">
                              {item.headline}
                            </span>
                            {item.body && item.body !== item.headline ? (
                              <span className="mt-0.5 block line-clamp-2 text-[12px] text-slate-500">
                                {item.body}
                              </span>
                            ) : null}
                          </span>
                          <span className="hidden w-32 shrink-0 text-right text-[12px] text-slate-600 sm:block">
                            {item.actor}
                          </span>
                          <span
                            className={cn(
                              "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold md:inline-flex",
                              meta.badge,
                            )}
                          >
                            {item.badge}
                          </span>
                          {item.duration ? (
                            <span className="hidden w-12 shrink-0 text-right text-[11px] text-slate-400 lg:block">
                              {item.duration}
                            </span>
                          ) : null}
                          <MoreVertical className="h-4 w-4 shrink-0 text-slate-300" />
                        </>
                      );
                      return (
                        <li key={item.id}>
                          {item.href ? (
                            <Link
                              href={item.href}
                              className="flex items-start gap-2.5 rounded-xl px-1 py-1 hover:bg-slate-50"
                            >
                              {inner}
                            </Link>
                          ) : (
                            <div className="flex items-start gap-2.5 rounded-xl px-1 py-1">
                              {inner}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            ))
          )}
          {filtered.length > shown.length ? (
            <div className="pb-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Load more
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="min-h-0 overflow-y-auto">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h3 className="text-[14px] font-semibold text-slate-900">
            Timeline Summary
          </h3>
          <ul className="mt-3 space-y-2">
            {counts.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-[12px]"
                >
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md",
                        item.tone,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {item.label}
                  </span>
                  <span className="font-semibold" style={{ color: PURPLE }}>
                    {item.count}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[13px] font-semibold text-slate-900">
            <span>Total Activities</span>
            <span>{total}</span>
          </div>
        </section>
      </aside>
    </div>
  );
}
