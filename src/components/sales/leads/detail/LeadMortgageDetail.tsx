"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Calculator,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Download,
  FileText,
  Home,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  StickyNote,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import type { LeadCardData, LeadSource } from "@/lib/leads/types";
import { LEAD_SOURCES, OWNERS } from "@/lib/leads/types";
import {
  daysInStage,
  leadApplicants,
  leadFinancials,
  leadBuyerTag,
  leadLocation,
  leadQualification,
  leadScoreBreakdown,
  LEAD_DETAIL_STAGES,
} from "@/lib/leads/detail-snapshot";
import {
  hrefForLeadActivity,
  hrefForLeadNextBest,
  leadNextBestActivity,
  listLeadActivityCandidates,
} from "@/lib/leads/activity-index";
import { formatRelativeTime } from "@/lib/leads/activity-dates";
import type { LeadActivityCandidate } from "@/lib/leads/card-types";
import { relatedToLabel } from "@/lib/related-entity";
import { RecordTagsRow } from "@/components/shared/tags/RecordTags";
import {
  emitLeadActivityChange,
  onLeadActivityChange,
} from "@/lib/leads/lead-extras-store";
import {
  isOverdueActivity,
  nextBestWhenLabel,
} from "@/lib/leads/next-best-action";
import { completeTask } from "@/lib/tasks/store";
import { updateCall } from "@/lib/calls/store";
import { updateMeeting } from "@/lib/meetings/store";
import { onRulesChange } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/lib/activities/shared";
import { resolvePipelineStage } from "@/lib/pipeline-sla/board";
import { LeadConvertActions } from "@/components/sales/leads/LeadConvertActions";
import {
  LeadMoreMenu,
  type LeadMoreAction,
} from "@/components/sales/leads/LeadMoreMenu";
import {
  LeadDetailTabs,
  type LeadDetailTabId,
} from "@/components/sales/leads/detail/LeadDetailTabs";
import { LeadConversationPanel } from "@/components/sales/leads/detail/LeadConversationPanel";
import { LeadActivitiesPanel } from "@/components/sales/leads/detail/LeadActivitiesPanel";
import { LeadNotesPanel } from "@/components/sales/leads/detail/LeadNotesPanel";
import { LeadTimelinePanel } from "@/components/sales/leads/detail/LeadTimelinePanel";
import { LeadDocumentsPanel } from "@/components/sales/leads/detail/LeadDocumentsPanel";
import { LeadInlineField } from "@/components/sales/leads/detail/LeadInlineField";
import { LeadDetailsPanel } from "@/components/sales/leads/detail/LeadDetailsPanel";
import { LeadFinancialsPanel } from "@/components/sales/leads/detail/LeadFinancialsPanel";
import { LeadStrategyPanel } from "@/components/sales/leads/detail/LeadStrategyPanel";
import { LeadRedFlagsCard } from "@/components/sales/leads/detail/LeadRedFlagsCard";
import {
  FOLLOWERS_KEY,
  LeadFollowersField,
} from "@/components/sales/leads/detail/LeadFollowersField";
import { listLeadConversation } from "@/lib/leads/conversation-store";
import { openSoftphoneNear } from "@/lib/softphone/events";

export type LeadFieldPatch = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  owner?: string;
  source?: LeadSource;
  estimatedValue?: string;
  custom?: Record<string, string>;
};

const PURPLE = "#5A32A3";

const STAGE_LABEL: Record<string, string> = {
  "New Lead": "New Lead",
  "Appointment Booked": "Appt Booked",
  "Appointment Missed": "Appt Missed",
  "In Conversation": "In Convo",
  Hold: "Hold",
  "No Answer": "No Answer",
  "Waiting on Docs": "Waiting Docs",
  "Document Received": "Docs Rec'd",
  Findings: "Findings",
  "Research & Servicing": "Research",
  "Servicing Completed": "Serviced",
  "Loan Proposal Presented": "Proposal",
  "Future Potential Clients": "Future",
  "Closed Won": "Won",
  "Closed Lost": "Lost",
};

const FINANCE_META = [
  { icon: Home, iconWrap: "bg-violet-50 text-violet-600" },
  { icon: CircleDollarSign, iconWrap: "bg-emerald-50 text-emerald-600" },
  { icon: Calculator, iconWrap: "bg-sky-50 text-sky-600" },
  { icon: Wallet, iconWrap: "bg-amber-50 text-amber-600" },
  { icon: Users, iconWrap: "bg-rose-50 text-rose-600" },
  { icon: Clock, iconWrap: "bg-indigo-50 text-indigo-600" },
];

const RELATED = [
  { label: "Tasks", count: 3, icon: Check, tone: "bg-violet-50 text-violet-700" },
  { label: "Notes", count: 4, icon: StickyNote, tone: "bg-amber-50 text-amber-700" },
  { label: "Appts", count: 2, icon: CalendarDays, tone: "bg-sky-50 text-sky-700" },
  { label: "Deals", count: 0, icon: Briefcase, tone: "bg-slate-100 text-slate-500" },
  { label: "Docs", count: 3, icon: FileText, tone: "bg-rose-50 text-rose-600" },
];

const CONVERSATION_KINDS = new Set(["call", "sms", "email"]);
const ACTIVITY_KINDS = new Set(["task", "meeting", "reminder"]);
const DOCUMENT_KINDS = new Set(["attachment", "document"]);

const KIND_META: Record<
  string,
  { label: string; icon: typeof Phone; tone: string }
> = {
  call: { label: "Call", icon: Phone, tone: "bg-orange-50 text-orange-600" },
  sms: {
    label: "SMS",
    icon: MessageSquare,
    tone: "bg-sky-50 text-sky-600",
  },
  email: { label: "Email", icon: Mail, tone: "bg-emerald-50 text-emerald-600" },
  task: { label: "Task", icon: Check, tone: "bg-violet-50 text-violet-600" },
  meeting: {
    label: "Appointment",
    icon: CalendarDays,
    tone: "bg-amber-50 text-amber-600",
  },
  reminder: { label: "Reminder", icon: Clock, tone: "bg-indigo-50 text-indigo-600" },
  note: {
    label: "Note",
    icon: StickyNote,
    tone: "bg-amber-50 text-amber-700",
  },
  attachment: {
    label: "Document",
    icon: FileText,
    tone: "bg-rose-50 text-rose-600",
  },
  document: {
    label: "Document",
    icon: FileText,
    tone: "bg-rose-50 text-rose-600",
  },
};

function newestFirst(a: LeadActivityCandidate, b: LeadActivityCandidate) {
  return (b.dueAt?.getTime() ?? 0) - (a.dueAt?.getTime() ?? 0);
}

interface LeadMortgageDetailProps {
  card: LeadCardData;
  backHref?: string;
  backLabel?: string;
  onCall: () => void;
  onEmail: () => void;
  onConvert: () => void;
  onEdit: () => void;
  onMoreAction: (action: LeadMoreAction) => void;
  onStatusChange: (stage: string) => void;
  onTagsChange?: (tags: string[]) => void;
  onLeadPatch?: (patch: LeadFieldPatch) => void;
  onStartCall: () => void;
  onReschedule: () => void;
  onComplete?: () => void;
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
        "rounded-2xl border border-slate-200 bg-white p-4",
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
        "inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50",
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
  backHref,
  backLabel = "Back",
  onCall,
  onEmail,
  onConvert,
  onMoreAction,
  onStatusChange,
  onTagsChange,
  onLeadPatch,
  onStartCall,
  onReschedule,
  onComplete,
}: LeadMortgageDetailProps) {
  const [editingContact, setEditingContact] = useState(false);
  const [nameDraft, setNameDraft] = useState(card.name);
  const [emailDraft, setEmailDraft] = useState(card.email ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [tab, setTab] = useState<LeadDetailTabId>("overview");
  const callBtnRef = useRef<HTMLSpanElement>(null);
  const startCallBtnRef = useRef<HTMLButtonElement>(null);
  const tags = card.tags ?? [];
  const stage =
    resolvePipelineStage(card.pipelineStage ?? "New Lead") ?? "New Lead";
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
  const conversationCount = useMemo(
    () => listLeadConversation(card).length,
    [card],
  );
  const [activityTick, setActivityTick] = useState(0);
  useEffect(() => {
    const refresh = () => setActivityTick((n) => n + 1);
    const offActivity = onLeadActivityChange(refresh);
    const offRules = onRulesChange(refresh);
    return () => {
      offActivity();
      offRules();
    };
  }, []);
  const activity = useMemo(() => {
    const all = listLeadActivityCandidates(card.name);
    return {
      conversation: all.filter((item) => CONVERSATION_KINDS.has(item.kind)).sort(newestFirst),
      activities: all.filter((item) => ACTIVITY_KINDS.has(item.kind)).sort(newestFirst),
      documents: all.filter((item) => DOCUMENT_KINDS.has(item.kind)).sort(newestFirst),
      notes: all.filter((item) => item.kind === "note").sort(newestFirst),
      timeline: [...all].sort(newestFirst),
    };
  }, [card.name, activityTick]);
  const now = useMemo(() => new Date(), [activityTick]);
  const nextAction = useMemo(
    () => leadNextBestActivity(card.name, now),
    [card.name, now],
  );
  const router = useRouter();
  const nextOverdue = nextAction
    ? isOverdueActivity(nextAction.at, now)
    : false;

  function openNextAction() {
    if (!nextAction) return;
    router.push(hrefForLeadNextBest(nextAction.kind, nextAction.id));
  }

  function completeNextAction() {
    if (!nextAction) return;
    if (nextAction.kind === "task") completeTask(nextAction.id);
    else if (nextAction.kind === "call") {
      updateCall(nextAction.id, { status: "Completed" });
    } else {
      updateMeeting(nextAction.id, { status: "Completed" });
    }
    emitLeadActivityChange();
    onComplete?.();
  }
  const showApplicants = tab === "overview";
  const showFinancials = tab === "overview";
  const showFinancialsPanel = tab === "financials";
  const showDetailsPanel = tab === "details";
  const showStrategyPanel = tab === "strategy";
  const showPipeline = tab === "overview";
  const showRedFlags = tab === "overview";
  const showRecentDocuments = tab === "overview";
  const showDocuments = tab === "documents";
  const showSidebar = tab === "overview";
  const showConversation = tab === "conversation";
  const showActivities = tab === "activities";
  const showNotes = tab === "notes";
  const showTimeline = tab === "timeline";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {backHref ? (
              <Link
                href={backHref}
                aria-label={backLabel}
                title={backLabel}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : null}
            <span className="relative shrink-0">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold",
                  card.avatarBgClass,
                )}
              >
                {card.initials}
              </span>
              <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </span>
            <div className="min-w-0">
              {editingContact ? (
                <div className="space-y-1.5">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    aria-label="Lead name"
                    className="h-8 w-full min-w-[220px] max-w-[320px] rounded-lg border border-[#5A32A3]/40 px-2.5 text-[15px] font-semibold text-slate-900 outline-none"
                  />
                  <div>
                    <input
                      type="email"
                      value={emailDraft}
                      onChange={(e) => {
                        setEmailDraft(e.target.value);
                        if (emailError) {
                          setEmailError(
                            e.target.value.trim() &&
                              !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(
                                e.target.value.trim(),
                              )
                              ? "Enter a valid email address"
                              : null,
                          );
                        }
                      }}
                      aria-label="Lead email"
                      placeholder="Email address"
                      className={cn(
                        "h-8 w-full min-w-[220px] max-w-[320px] rounded-lg border px-2.5 text-[13px] text-slate-800 outline-none",
                        emailError ? "border-rose-400" : "border-slate-200",
                      )}
                    />
                    {emailError ? (
                      <p className="mt-0.5 text-[11px] font-medium text-rose-600">
                        {emailError}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
              <h1 className="text-[18px] leading-tight font-semibold tracking-tight text-slate-900">
                {card.name}
              </h1>
              )}
              <div className="mt-1">
                <RecordTagsRow
                  tags={tags}
                  relatedTo={relatedToLabel("Lead", card.name)}
                  onChange={onTagsChange}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span ref={callBtnRef} className="inline-flex">
              <GhostButton
                onClick={() => {
                  openSoftphoneNear(callBtnRef.current, {
                    phone: card.phone,
                    name: card.name,
                  });
                  onCall();
                }}
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </GhostButton>
            </span>
            <GhostButton onClick={onEmail}>
              <Mail className="h-3.5 w-3.5" />
              Email
            </GhostButton>
            <GhostButton
              onClick={() => {
                if (!editingContact) {
                  setNameDraft(card.name);
                  setEmailDraft(card.email ?? "");
                  setEmailError(null);
                  setEditingContact(true);
                  return;
                }
                const nextName = nameDraft.trim();
                const nextEmail = emailDraft.trim();
                if (
                  nextEmail &&
                  !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(nextEmail)
                ) {
                  setEmailError("Enter a valid email address");
                  return;
                }
                const parts = nextName.split(/\s+/).filter(Boolean);
                const first = parts[0] ?? "";
                const last = parts.length > 1 ? parts[parts.length - 1] : "";
                const middle = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
                onLeadPatch?.({
                  name: nextName || card.name,
                  email: nextEmail,
                  custom: {
                    firstName: first,
                    middleName: middle,
                    surname: last,
                  },
                });
                setEmailError(null);
                setEditingContact(false);
              }}
              className={
                editingContact
                  ? "border-[#5A32A3] bg-[#5A32A3] text-white hover:bg-[#4a278a]"
                  : undefined
              }
            >
              {editingContact ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
              {editingContact ? "Done" : "Edit"}
            </GhostButton>
            <LeadConvertActions card={card} onConvert={onConvert} />
            <LeadMoreMenu onAction={onMoreAction} />
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 overflow-visible border-t border-slate-100 pt-2.5 sm:grid-cols-3 xl:grid-cols-7">
          <Meta
            label="Lead Owner"
            value={
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                    avatarColor(card.owner),
                  )}
                >
                  {initials(card.owner)}
                </span>
                <select
                  value={card.owner}
                  onChange={(e) => onLeadPatch?.({ owner: e.target.value })}
                  className="min-w-0 flex-1 truncate bg-transparent text-[13px] font-medium text-slate-800 outline-none"
                >
                  {[card.owner, ...OWNERS.filter((item) => item !== card.owner)].map(
                    (owner) => (
                      <option key={owner} value={owner}>
                        {owner}
                      </option>
                    ),
                  )}
                </select>
              </span>
            }
          />
          <div className="relative z-20 w-max min-w-[7rem] overflow-visible">
            <Eyebrow>Followers</Eyebrow>
            <LeadFollowersField
              value={card.custom?.[FOLLOWERS_KEY]}
              owner={card.owner}
              onChange={(next) =>
                onLeadPatch?.({ custom: { [FOLLOWERS_KEY]: next } })
              }
            />
          </div>
          <Meta
            label="Lead Source"
            value={
              <select
                value={card.source}
                onChange={(e) =>
                  onLeadPatch?.({ source: e.target.value as LeadSource })
                }
                className="w-full truncate bg-transparent text-[13px] font-medium text-slate-800 outline-none"
              >
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            }
          />
          <Meta label="Lead Created" value={card.createdDate} />
          <Meta label="Last Contacted" value="Yesterday, 1:00 PM" />
          <Meta
            label="Days in Stage"
            value={`${inStage} day${inStage === 1 ? "" : "s"}`}
          />
          <div className="min-w-0">
            <Eyebrow>Status</Eyebrow>
            <div className="relative mt-0.5">
              <span className="pointer-events-none absolute top-1/2 left-2.5 h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-500" />
              <select
                value={stage}
                onChange={(e) => onStatusChange(e.target.value)}
                title={stage}
                className="fc-select-caret h-8 w-full appearance-none rounded-full border border-slate-200 bg-white pl-6 pr-7 text-[12px] font-medium text-slate-800 outline-none"
              >
                {LEAD_DETAIL_STAGES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        <LeadDetailTabs
          active={tab}
          onChange={setTab}
          conversationCount={conversationCount}
          activitiesCount={activity.activities.length}
        />
      </header>

      <div
        className={cn(
          "mt-3 min-h-0 flex-1",
          showConversation ||
            showActivities ||
            showNotes ||
            showTimeline ||
            showDocuments ||
            showFinancialsPanel ||
            showDetailsPanel ||
            showStrategyPanel
            ? "overflow-hidden"
            : "overflow-y-auto",
        )}
      >
          {showConversation ? (
        <LeadConversationPanel card={card} />
      ) : showActivities ? (
        <LeadActivitiesPanel
          card={card}
          onStartCall={onStartCall}
          onSnooze={onReschedule}
        />
      ) : showNotes ? (
        <LeadNotesPanel card={card} />
      ) : showTimeline ? (
        <LeadTimelinePanel card={card} />
      ) : showDocuments ? (
        <LeadDocumentsPanel card={card} />
      ) : showFinancialsPanel ? (
        <LeadFinancialsPanel card={card} onLeadPatch={onLeadPatch} />
      ) : showDetailsPanel ? (
        <LeadDetailsPanel card={card} onLeadPatch={onLeadPatch} />
      ) : showStrategyPanel ? (
        <LeadStrategyPanel card={card} onLeadPatch={onLeadPatch} />
      ) : (
      <div className={cn("grid grid-cols-1 gap-4", showSidebar && "xl:grid-cols-[minmax(0,1fr)_340px]")}>
        <div className="space-y-4">
          {showApplicants ? (
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
                  </div>
                </div>
              ))}
            </div>
          </Card>
          ) : null}

          {showFinancials ? (
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
                      <LeadInlineField
                        value={item.value}
                        className="truncate text-[13px] font-semibold text-slate-900"
                        inputClassName="text-[13px] font-semibold"
                        onSave={(next) =>
                          onLeadPatch?.({
                            custom: { [item.key]: next },
                            ...(item.key === "loanAmount"
                              ? { estimatedValue: next }
                              : {}),
                          })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          ) : null}

          {showPipeline ? (
          <Card>
            <Eyebrow>Pipeline Progress</Eyebrow>
            <div className="mt-5">
              <div className="overflow-x-auto pb-1">
              <div className="relative flex min-w-[1080px] items-start justify-between">
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
                      className="relative z-[1] flex w-[72px] shrink-0 flex-col items-center"
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
          ) : null}

          {showRedFlags || showRecentDocuments ? (
          <div className={cn("grid gap-4", showRedFlags && showRecentDocuments && "lg:grid-cols-2")}>
            {showRedFlags ? (
            <Card>
              <LeadRedFlagsCard card={card} />
            </Card>
            ) : null}

            {showRecentDocuments ? (
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
            ) : null}
          </div>
          ) : null}
        </div>

        {showSidebar ? (
        <div className="space-y-4">
          {tab === "overview" ? (
          <Card className="border-orange-100">
            <div className="mb-2 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-orange-500" />
              <p className="text-[11px] font-semibold tracking-[0.07em] text-orange-500 uppercase">
                Next Action
              </p>
              {nextOverdue ? (
                <span className="text-[11px] font-semibold tracking-[0.07em] text-rose-500 uppercase">
                  Overdue
                </span>
              ) : null}
            </div>
            {nextAction ? (
              <>
                <p className="text-[17px] font-semibold text-slate-900">
                  {nextAction.title}
                  {nextAction.subtitle ? (
                    <span className="font-normal text-slate-500">
                      {" "}
                      — {nextAction.subtitle}
                    </span>
                  ) : null}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {nextBestWhenLabel(nextAction.at, now)}
                  {nextAction.actor ? ` · ${nextAction.actor}` : card.owner ? ` · ${card.owner}` : ""}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {nextAction.kind === "call" ? (
                    <button
                      type="button"
                      ref={startCallBtnRef}
                      onClick={() => {
                        openSoftphoneNear(startCallBtnRef.current, {
                          phone: card.phone,
                          name: card.name,
                        });
                        onStartCall();
                      }}
                      className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-orange-500 px-2 text-[12px] font-semibold text-white hover:bg-orange-600"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      Start Call
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openNextAction}
                      className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-orange-500 px-2 text-[12px] font-semibold text-white hover:bg-orange-600"
                    >
                      {nextAction.kind === "meeting" ? (
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Check className="h-3.5 w-3.5 shrink-0" />
                      )}
                      Open
                    </button>
                  )}
                  <GhostButton onClick={openNextAction} className="h-10 flex-none justify-center px-2 text-[12px]">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    Reschedule
                  </GhostButton>
                  <GhostButton onClick={completeNextAction} className="h-10 flex-none justify-center px-2 text-[12px]">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    Completed
                  </GhostButton>
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-[#FAF9FC] px-3 py-4">
                <p className="text-[15px] font-semibold text-slate-800">
                  No action to complete
                </p>
                <p className="mt-1 text-[13px] leading-snug text-slate-500">
                  All good — nothing is due on this lead.
                </p>
              </div>
            )}
          </Card>
          ) : null}

          {tab === "overview" ? (
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
                  <LeadInlineField
                    value={item.value}
                    className="text-right text-[13px] font-semibold text-slate-800"
                    inputClassName="text-right text-[13px] font-semibold"
                    onSave={(next) =>
                      onLeadPatch?.({ custom: { [item.key]: next } })
                    }
                  />
                </li>
              ))}
            </ul>
          </Card>
          ) : null}

          {tab === "overview" ? (
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
          ) : null}

          {tab === "overview" ? (
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
          ) : null}
        </div>
        ) : null}
      </div>
      )}
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
    <div className="min-w-0">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-0.5 truncate text-[13px] leading-tight font-medium text-slate-800">
        {value}
      </div>
    </div>
  );
}

function ActivityRows({
  items,
  fallback,
}: {
  items: LeadActivityCandidate[];
  fallback?: { label: string; when: string; icon: typeof Phone; tone: string }[];
}) {
  const now = new Date();
  if (items.length === 0 && fallback) {
    return (
      <ul className="space-y-3">
        {fallback.map((row) => {
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
                <p className="text-[13px] font-medium text-slate-800">{row.label}</p>
                <p className="text-[11px] text-slate-400">{row.when}</p>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-slate-400">
        Nothing to show yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const meta = KIND_META[item.kind] ?? KIND_META.note;
        const Icon = meta.icon;
        const href = hrefForLeadActivity(item);
        const when = item.dueAt ? formatRelativeTime(item.dueAt, now) : "";
        const body = (
          <>
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                meta.tone,
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-slate-800">
                {item.title}
              </span>
              <span className="text-[11px] text-slate-400">
                {meta.label}
                {when ? ` · ${when}` : ""}
              </span>
            </span>
          </>
        );
        return (
          <li key={`${item.kind}-${item.id}`}>
            {href ? (
              <Link href={href} className="flex items-center gap-2.5 hover:opacity-80">
                {body}
              </Link>
            ) : (
              <div className="flex items-center gap-2.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ActivityFeedCard({
  title,
  items,
  empty,
  fallback,
  actions,
}: {
  title: string;
  items: LeadActivityCandidate[];
  empty: string;
  fallback?: { label: string; when: string; icon: typeof Phone; tone: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {actions}
      </div>
      {items.length === 0 && !fallback ? (
        <p className="py-8 text-center text-[13px] text-slate-400">{empty}</p>
      ) : (
        <ActivityRows items={items} fallback={fallback} />
      )}
    </Card>
  );
}
