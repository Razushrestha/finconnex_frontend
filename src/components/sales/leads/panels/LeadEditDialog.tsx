"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/notify/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import type { Priority } from "@/lib/tasks/types";
import { listTaskColumns } from "@/lib/tasks/store";
import { isUuid } from "@/lib/activity-timeline/auth";
import { listMeetings } from "@/lib/meetings/store";
import {
  listRelatedCrmMeetings,
  persistRemoteMeeting,
  tryCrmMeeting,
} from "@/lib/meetings/api";
import { findLeadById, listLeadColumns, updateLead } from "@/lib/leads/store";
import { leadApplicants } from "@/lib/leads/detail-snapshot";
import type { LeadCardData } from "@/lib/leads/types";
import { OWNERS } from "@/lib/leads/types";
import { relatedMatchesLead } from "@/lib/leads/activity-index";
import { listAttachments, createAttachment, deleteAttachment } from "@/lib/attachments/store";
import type { AttachmentKind } from "@/lib/attachments/types";
import { listLibraryDocuments } from "@/lib/documents/library/types";
import { getRulesActor } from "@/lib/rules/actor";
import {
  X,
  Plus,
  Search,
  Paperclip,
  CheckSquare,
  CalendarDays,
  Upload,
  Eye,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LeadSideDrawer,
  LEAD_QUICK_DRAWER_WIDTH,
} from "./LeadSideDrawer";
import { LeadCreateTaskModal } from "@/components/sales/leads/detail/LeadCreateTaskModal";
import { LeadScheduleMeetingModal } from "@/components/sales/leads/detail/LeadScheduleMeetingModal";
import { LeadConversationPanel } from "@/components/sales/leads/detail/LeadConversationPanel";
import { WorkQueueNotesDrawer } from "@/components/work-queue/WorkQueueNotesDrawer";
import {
  FOLLOWERS_KEY,
  LeadFollowersField,
} from "@/components/sales/leads/detail/LeadFollowersField";

type SectionId =
  | "detail"
  | "sms"
  | "appointment"
  | "tasks"
  | "notes"
  | "associated";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "detail", label: "Lead Details" },
  { id: "sms", label: "SMS" },
  { id: "appointment", label: "Meetings" },
  { id: "tasks", label: "Tasks" },
  { id: "notes", label: "Notes" },
  { id: "associated", label: "Attachments" },
];

const SECTION_LABEL: Record<SectionId, string> = {
  detail: "Lead Details",
  sms: "SMS",
  appointment: "Meetings",
  tasks: "Tasks",
  notes: "Notes",
  associated: "Attachments",
};

interface TaskEntry {
  id: string;
  title: string;
  dueLabel: string;
  status: "Open" | "Done";
  priority: Priority;
  assignedTo: string;
  previous?: boolean;
}


interface AppointmentEntry {
  id: string;
  title: string;
  whenLabel: string;
  status: string;
  location?: string;
  previous?: boolean;
}

function matchesLead(related: string | undefined, leadName: string): boolean {
  return relatedMatchesLead(related, leadName);
}

function loadLeadTasks(leadName: string): TaskEntry[] {
  const open: TaskEntry[] = [];
  const done: TaskEntry[] = [];
  for (const col of listTaskColumns()) {
    for (const t of col.tasks) {
      if (t.relatedTo?.kind !== "Lead") continue;
      if (!matchesLead(t.relatedTo.name, leadName)) continue;
      const entry: TaskEntry = {
        id: t.taskId,
        title: t.title,
        dueLabel: t.completedDate
          ? `Completed ${t.completedDate}`
          : t.dueDate || "No due date",
        status: t.status === "Completed" ? "Done" : "Open",
        priority: t.priority,
        assignedTo: t.assignedTo,
        previous: t.status === "Completed",
      };
      if (entry.status === "Done") done.push(entry);
      else open.push(entry);
    }
  }
  const previous = done;
  return [...open, ...previous];
}

function loadLeadAppointments(leadName: string): AppointmentEntry[] {
  const fromStore: AppointmentEntry[] = listMeetings()
    .filter((m) => matchesLead(m.relatedTo, leadName))
    .map((m) => ({
      id: m.id,
      title: m.title,
      whenLabel: m.startDateTime || "No date",
      status: m.status,
      location: m.location,
      previous:
        m.status === "Completed" ||
        m.status === "Cancelled" ||
        Boolean(m.startDateTime && new Date(m.startDateTime) < new Date()),
    }));

  return fromStore;
}

interface LeadEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  initialSection?: SectionId;
  onSuccess?: (message: string) => void;
  /** Work Queue–style right drawer instead of centered dialog. */
  presentation?: "dialog" | "drawer";
}

export function LeadEditDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  initialSection = "tasks",
  onSuccess,
  presentation = "dialog",
}: LeadEditDialogProps) {
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);
  const card = useMemo(
    () => findLeadCard(leadId, leadName),
    [leadId, leadName],
  );

  // Reset the active section whenever the dialog (re)opens (or the
  // requested initial section changes). Computed during render — gated on
  // a state diff of the reset key, per React's documented "adjusting
  // state when a prop changes" pattern — instead of in an effect
  // (react-hooks/set-state-in-effect).
  const activeSectionResetKey = `${open}|${initialSection}`;
  const [prevActiveSectionResetKey, setPrevActiveSectionResetKey] = useState(
    activeSectionResetKey,
  );
  if (prevActiveSectionResetKey !== activeSectionResetKey) {
    setPrevActiveSectionResetKey(activeSectionResetKey);
    if (open) setActiveSection(initialSection);
  }

  const sectionBody = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {activeSection === "appointment" && (
        <AppointmentSection
          leadId={leadId}
          leadName={leadName}
          card={card}
          onSuccess={onSuccess}
        />
      )}
      {activeSection === "detail" && (
        <ClientDetailsSection
          leadId={leadId}
          leadName={leadName}
          leadEmail={leadEmail}
          leadPhone={leadPhone}
          onClose={() => onOpenChange(false)}
        />
      )}
      {activeSection === "sms" && card ? (
        <div className="h-full min-h-[480px] p-3">
          <LeadConversationPanel
            card={card}
            initialComposerChannel="sms"
            initialChannelFilters={["sms"]}
            hideRecentAttachments
            hideConversationSummary
          />
        </div>
      ) : null}
      {activeSection === "sms" && !card ? (
        <p className="p-6 text-[13px] text-slate-400">
          Lead record not found for conversation.
        </p>
      ) : null}
      {activeSection === "tasks" && (
        <TasksSection
          leadId={leadId}
          leadName={leadName}
          card={card}
          onSuccess={onSuccess}
        />
      )}
      {activeSection === "notes" && (
        <NotesSection leadId={leadId} leadName={leadName} onSuccess={onSuccess} />
      )}
      {activeSection === "associated" && (
        <AttachmentsSection leadId={leadId} leadName={leadName} onSuccess={onSuccess} />
      )}
    </div>
  );

  const navAndBody = (
    <div className="flex min-h-0 flex-1">
      <nav className="w-40 shrink-0 border-r border-slate-100 bg-slate-50/40 py-3 sm:w-44">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSection(s.id)}
            className={cn(
              "block w-full border-l-2 px-4 py-2 text-left text-[13px] font-medium transition-colors",
              activeSection === s.id
                ? "border-violet-600 bg-violet-50 text-violet-700"
                : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700",
            )}
          >
            {s.label}
          </button>
        ))}
      </nav>
      {sectionBody}
    </div>
  );

  if (presentation === "drawer") {
    if (!open) return null;
    return (
      <LeadSideDrawer
        open={open}
        onClose={() => onOpenChange(false)}
        title={leadName}
        subtitle={SECTION_LABEL[activeSection]}
        widthClassName={LEAD_QUICK_DRAWER_WIDTH}
        ariaLabel={`${leadName} — ${SECTION_LABEL[activeSection]}`}
      >
        <div className="flex h-full min-h-0 flex-col">{navAndBody}</div>
      </LeadSideDrawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[640px] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">Edit {leadName}</DialogTitle>
        <DialogDescription className="sr-only">
          Add and edit opportunity details, tasks, notes and appointments for{" "}
          {leadName}.
        </DialogDescription>
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              {leadName}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {SECTION_LABEL[activeSection]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {navAndBody}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Client details ----------------------------- */

function findLeadCard(leadId?: string, leadName?: string): LeadCardData | null {
  if (leadId) {
    const found = findLeadById(leadId);
    if (found) return found.card;
  }
  const needle = leadName?.trim().toLowerCase();
  if (!needle) return null;
  for (const col of listLeadColumns()) {
    const card = col.cards.find((item) => item.name.trim().toLowerCase() === needle);
    if (card) return card;
  }
  return null;
}

function joinAddress(...parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

function applicantAddress(card: LeadCardData, role: "primary" | "secondary") {
  if (role === "secondary") {
    return (
      joinAddress(
        card.custom?.["secondary.currentAddress"],
        card.custom?.["secondary.street"],
        card.custom?.["secondary.city"],
        card.custom?.["secondary.state"],
        card.custom?.["secondary.postalCode"],
        card.custom?.["secondary.country"],
      ) || "—"
    );
  }
  return (
    card.custom?.currentAddress?.trim() ||
    joinAddress(card.street, card.city, card.state, card.postalCode, card.country) ||
    "—"
  );
}

function leadContactApplicants(
  card: LeadCardData | null,
  fallback: { name: string; email?: string; phone?: string },
) {
  if (!card) {
    return [
      {
        role: "Primary" as const,
        name: fallback.name || "—",
        phone: fallback.phone?.trim() || "—",
        email: fallback.email?.trim() || "—",
        address: "—",
      },
    ];
  }

  const people = leadApplicants(card);
  const hasSecondaryFields = Boolean(
    card.custom?.["secondary.firstName"]?.trim() ||
      card.custom?.["secondary.email"]?.trim() ||
      card.custom?.["secondary.phone"]?.trim() ||
      card.custom?.["secondary.mobile"]?.trim(),
  );
  const rows = [
    ...(people.length > 1 || hasSecondaryFields ? people : people.slice(0, 1)),
  ];
  if (rows.length === 1 && hasSecondaryFields) {
    rows.push({
      name: [
        card.custom?.["secondary.firstName"],
        card.custom?.["secondary.middleName"],
        card.custom?.["secondary.surname"] || card.custom?.["secondary.lastName"],
      ]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(" ") || "Secondary applicant",
      role: "Secondary",
      residency: "",
      employment: "",
    });
  }

  return rows.map((person, index) => {
    const secondary = index > 0;
    return {
      role: person.role,
      name: person.name,
      phone: secondary
        ? (
            card.custom?.["secondary.mobile"] ||
            card.custom?.["secondary.phone"] ||
            ""
          ).trim() || "—"
        : (
            card.phone ||
            card.mobilePhone ||
            card.custom?.mobile ||
            fallback.phone ||
            ""
          ).trim() || "—",
      email: secondary
        ? (card.custom?.["secondary.email"] || "").trim() || "—"
        : (card.email || fallback.email || "").trim() || "—",
      address: applicantAddress(card, secondary ? "secondary" : "primary"),
    };
  });
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-[13px] font-medium text-slate-900">{value}</p>
    </div>
  );
}

function ClientDetailsSection({
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  onClose,
}: {
  leadId?: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const card = useMemo(() => {
    void revision;
    return findLeadCard(leadId, leadName);
  }, [leadId, leadName, revision]);
  const applicants = leadContactApplicants(card, {
    name: leadName,
    email: leadEmail,
    phone: leadPhone,
  });

  function openLeadOverview() {
    if (!card) return;
    onClose();
    router.push(`/sales/leads/detail/${encodeURIComponent(card.id)}`);
  }

  function patchLead(patch: Parameters<typeof updateLead>[1]) {
    if (!card) return;
    updateLead(card.id, patch);
    setRevision((n) => n + 1);
  }

  return (
    <div className="px-6 py-4">
      <h3 className="text-[15px] font-semibold text-slate-900">Lead Details</h3>
      <p className="mt-0.5 text-[12px] text-slate-500">
        {applicants.length === 1
          ? "Primary applicant on this lead."
          : "Primary and secondary applicants on this lead."}
      </p>
      <div className="mt-4 space-y-4">
        {applicants.map((person) => (
          <div
            key={`${person.role}-${person.name}`}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-left"
          >
            {applicants.length > 1 ? (
              <p className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#5A32A3] uppercase">
                {person.role} applicant
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailField label="Name" value={person.name} />
              <DetailField label="Number" value={person.phone} />
              <DetailField label="Email" value={person.email} />
              <DetailField label="Address" value={person.address} />
            </div>
            {card ? (
              <button
                type="button"
                onClick={openLeadOverview}
                className="mt-3 text-[11px] font-medium text-[#5A32A3] hover:underline"
              >
                View all lead details
              </button>
            ) : null}
          </div>
        ))}

        {card ? (
          <div className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-left">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium text-slate-500">Owner</p>
                <select
                  value={card.owner}
                  onChange={(e) => {
                    patchLead({ owner: e.target.value });
                  }}
                  className="mt-0.5 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[13px] font-medium text-slate-900 outline-none focus:border-violet-500"
                >
                  {[card.owner, ...OWNERS.filter((o) => o !== card.owner)].map(
                    (owner) => (
                      <option key={owner} value={owner}>
                        {owner}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">
                  Followers
                </p>
                <div className="mt-0.5">
                  <LeadFollowersField
                    value={card.custom?.[FOLLOWERS_KEY]}
                    owner={card.owner}
                    onChange={(next) =>
                      patchLead({
                        custom: { [FOLLOWERS_KEY]: next },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------------------------- Tasks ---------------------------------- */

function TasksSection({
  leadId,
  leadName,
  card,
  onSuccess,
}: {
  leadId?: string;
  leadName: string;
  card: LeadCardData | null;
  onSuccess?: (message: string) => void;
}) {
  const [tasks, setTasks] = useState<TaskEntry[]>(() => loadLeadTasks(leadName));
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const resolvedCard =
    card ??
    ({
      id: leadId || leadName,
      name: leadName,
      initials: leadName.slice(0, 2).toUpperCase(),
      company: "",
      email: "",
      phone: "",
      owner: ACTIVITY_OWNERS[0] ?? "John Smith",
      source: "Website",
      createdDate: new Date().toISOString().slice(0, 10),
      accentColorClass: "border-l-violet-500",
      avatarBgClass: "bg-violet-50 text-violet-700",
    } satisfies LeadCardData);

  // Sync `tasks` from `leadName` whenever it changes, per React's
  // documented "adjusting state when a prop changes" pattern — computed
  // during render instead of in an effect (react-hooks/set-state-in-effect).
  const [prevTasksLeadName, setPrevTasksLeadName] = useState(leadName);
  if (prevTasksLeadName !== leadName) {
    setPrevTasksLeadName(leadName);
    setTasks(loadLeadTasks(leadName));
  }

  const openTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status === "Open" &&
          t.title.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [tasks, search],
  );
  const previousTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (t.status === "Done" || t.previous) &&
          t.title.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [tasks, search],
  );

  return (
    <div className="flex h-full flex-col px-6 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-slate-900">Tasks</h3>
      </div>

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-50 py-2 text-[13px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute top-1/2 left-0 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title"
          className="h-9 w-full border-b border-slate-200 bg-transparent pl-6 pr-2 text-[13px] outline-none focus:border-violet-500"
        />
      </div>

      <div className="mt-4 space-y-5">
        <TaskListBlock
          heading="Open tasks"
          emptyLabel="No open tasks"
          items={openTasks}
        />
        <TaskListBlock
          heading="Previous tasks"
          emptyLabel="No previous tasks"
          items={previousTasks}
        />
      </div>

      <LeadCreateTaskModal
        open={createOpen}
        card={resolvedCard}
        onClose={() => {
          setCreateOpen(false);
          setTasks(loadLeadTasks(leadName));
        }}
        onSaved={() => {
          setTasks(loadLeadTasks(leadName));
          onSuccess?.("Task added");
        }}
      />
    </div>
  );
}

function TaskListBlock({
  heading,
  emptyLabel,
  items,
}: {
  heading: string;
  emptyLabel: string;
  items: TaskEntry[];
}) {
  return (
    <section>
      <h4 className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase">
        {heading}
      </h4>
      {items.length === 0 ? (
        <p className="py-2 text-[12.5px] text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <CheckSquare
                  className={cn(
                    "h-4 w-4 shrink-0",
                    t.status === "Done" ? "text-emerald-500" : "text-slate-300",
                  )}
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-[13px] font-medium text-slate-800",
                      t.status === "Done" && "text-slate-500 line-through",
                    )}
                  >
                    {t.title}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {t.dueLabel} · {t.assignedTo}
                  </p>
                </div>
              </div>
              <span className="ml-2 shrink-0 text-[10px] font-semibold text-slate-400">
                {t.priority}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------------- Notes ---------------------------------- */

function NotesSection({
  leadId,
  leadName,
  onSuccess,
}: {
  leadId?: string;
  leadName: string;
  onSuccess?: (message: string) => void;
}) {
  return (
    <div className="h-full min-h-0">
      <WorkQueueNotesDrawer
        embedded
        row={{
          id: leadId || leadName,
          subject: leadName,
          related: `Lead: ${leadName}`,
          contactName: leadName,
          href: `/sales/leads/detail/${encodeURIComponent(leadId || leadName)}`,
        }}
        onClose={() => {}}
        onChanged={(message) => onSuccess?.(message)}
      />
    </div>
  );
}

/* ------------------------------- Appointment ------------------------------- */

function AppointmentSection({
  leadId,
  leadName,
  card,
  onSuccess,
}: {
  leadId?: string;
  leadName: string;
  card: LeadCardData | null;
  onSuccess?: (message: string) => void;
}) {
  const [appointments, setAppointments] = useState<AppointmentEntry[]>(() =>
    loadLeadAppointments(leadName),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const resolvedCard =
    card ??
    ({
      id: leadId || leadName,
      name: leadName,
      initials: leadName.slice(0, 2).toUpperCase(),
      company: "",
      email: "",
      phone: "",
      owner: ACTIVITY_OWNERS[0] ?? "John Smith",
      source: "Website",
      createdDate: new Date().toISOString().slice(0, 10),
      accentColorClass: "border-l-violet-500",
      avatarBgClass: "bg-violet-50 text-violet-700",
    } satisfies LeadCardData);

  // Sync `appointments` from `leadName` whenever it changes, per React's
  // documented "adjusting state when a prop changes" pattern — computed
  // during render instead of in an effect (react-hooks/set-state-in-effect).
  const [prevAppointmentsLeadName, setPrevAppointmentsLeadName] =
    useState(leadName);
  if (prevAppointmentsLeadName !== leadName) {
    setPrevAppointmentsLeadName(leadName);
    setAppointments(loadLeadAppointments(leadName));
  }

  // The local store only holds CRM meetings someone already loaded (Meetings
  // page, lead detail page). Pull this lead's meetings so the tab is complete
  // when opened from the board or work queue.
  useEffect(() => {
    if (!leadId || !isUuid(leadId)) return;
    let cancelled = false;
    void tryCrmMeeting(() => listRelatedCrmMeetings("LEAD", leadId)).then(
      (rows) => {
        if (cancelled || !rows?.length) return;
        for (const meeting of rows) {
          persistRemoteMeeting({
            ...meeting,
            relatedTo: meeting.relatedTo?.trim() || `Lead: ${leadName}`,
          });
        }
        setAppointments(loadLeadAppointments(leadName));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [leadId, leadName]);

  const upcoming = appointments.filter((a) => !a.previous);
  const previous = appointments.filter((a) => a.previous);

  return (
    <div className="flex h-full flex-col px-6 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-slate-900">Meetings</h3>
      </div>

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-50 py-2 text-[13px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
      >
        <Plus className="h-3.5 w-3.5" />
        Add meeting
      </button>

      <div className="mt-4 space-y-5">
        <AppointmentListBlock
          heading="Upcoming appointments"
          emptyLabel="No upcoming appointments"
          items={upcoming}
        />
        <AppointmentListBlock
          heading="Previous booked appointments"
          emptyLabel="No previous appointments"
          items={previous}
        />
      </div>

      <LeadScheduleMeetingModal
        open={createOpen}
        card={resolvedCard}
        onClose={() => {
          setCreateOpen(false);
          setAppointments(loadLeadAppointments(leadName));
        }}
        onSaved={() => {
          setAppointments(loadLeadAppointments(leadName));
          onSuccess?.("Meeting scheduled");
        }}
      />
    </div>
  );
}

function AppointmentListBlock({
  heading,
  emptyLabel,
  items,
}: {
  heading: string;
  emptyLabel: string;
  items: AppointmentEntry[];
}) {
  return (
    <section>
      <h4 className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase">
        {heading}
      </h4>
      {items.length === 0 ? (
        <p className="py-2 text-[12.5px] text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-2.5 py-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                <CalendarDays className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-slate-800">
                  {a.title}
                </p>
                <p className="text-[11px] text-slate-400">
                  {a.whenLabel}
                  {a.location ? ` · ${a.location}` : ""}
                  {` · ${a.status}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------- Attachments ------------------------------- */

function formatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function guessAttachmentKind(fileName: string): AttachmentKind {
  const lower = fileName.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|heic)$/.test(lower)) return "Image";
  if (/\.(xlsx?|csv)$/.test(lower)) return "Spreadsheet";
  if (/\.(pdf|docx?|txt)$/.test(lower)) return "Document";
  return "Other";
}

function guessMimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (/\.pdf$/.test(lower)) return "application/pdf";
  if (/\.png$/.test(lower)) return "image/png";
  if (/\.jpe?g$/.test(lower)) return "image/jpeg";
  if (/\.gif$/.test(lower)) return "image/gif";
  if (/\.webp$/.test(lower)) return "image/webp";
  if (/\.csv$/.test(lower)) return "text/csv";
  if (/\.xlsx?$/.test(lower)) return "application/vnd.ms-excel";
  return "application/octet-stream";
}

function isImageAttachment(type: string, name: string) {
  if (type.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
}

function isPdfAttachment(type: string, name: string) {
  return type === "application/pdf" || /\.pdf$/i.test(name);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** Prefer blob URLs so PDFs / larger files aren't blocked by storage quota. */
async function fileToPreviewUrl(file: File): Promise<string> {
  // Keep small images as data URLs so they survive a refresh in session storage.
  const smallImage =
    file.type.startsWith("image/") && file.size > 0 && file.size <= 250_000;
  if (smallImage) {
    try {
      return await fileToDataUrl(file);
    } catch {
      // fall through to blob URL
    }
  }
  return URL.createObjectURL(file);
}

function revokePreviewUrl(url?: string) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

type LeadDrawerAttachment = {
  id: string;
  name: string;
  kind: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  url?: string;
  contentType?: string;
  byteSize?: number;
  removable?: boolean;
};

function AttachmentsSection({
  leadId,
  leadName,
  onSuccess,
}: {
  leadId?: string;
  leadName: string;
  onSuccess?: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tick, setTick] = useState(0);
  const [previewItem, setPreviewItem] = useState<LeadDrawerAttachment | null>(
    null,
  );
  const card = findLeadCard(leadId, leadName);
  const name = card?.name || leadName;
  void tick;
  const files: LeadDrawerAttachment[] = [
    ...listAttachments()
      .filter((file) => relatedMatchesLead(file.relatedTo, name))
      .map((file) => ({
        id: file.id,
        name: file.fileName,
        kind: file.kind,
        size: file.sizeLabel || "—",
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt,
        url: file.storageUrl,
        contentType: file.contentType || guessMimeFromName(file.fileName),
        byteSize: file.byteSize,
        removable: true,
      })),
    ...listLibraryDocuments()
      .filter((doc) => relatedMatchesLead(doc.relatedTo, name))
      .map((doc) => ({
        id: `lib-${doc.id}`,
        name: doc.fileName,
        kind: "Document",
        size: doc.sizeLabel || "—",
        uploadedBy: doc.owner,
        uploadedAt: doc.uploadedAt,
        url: doc.storageUrl,
        contentType: guessMimeFromName(doc.fileName),
        removable: false,
      })),
  ].filter(
    (file, index, all) =>
      all.findIndex(
        (item) => item.name === file.name && item.uploadedAt === file.uploadedAt,
      ) === index,
  );

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const filesToAdd = Array.from(list);
    try {
      for (const file of filesToAdd) {
        const storageUrl = await fileToPreviewUrl(file);
        createAttachment({
          fileName: file.name,
          kind: guessAttachmentKind(file.name),
          relatedTo: `Lead: ${name}`,
          uploadedBy: card?.owner || getRulesActor().name || "You",
          notes: "Uploaded from lead drawer",
          sizeLabel: formatAttachmentSize(file.size),
          contentType: file.type || guessMimeFromName(file.name),
          byteSize: file.size,
          storageUrl,
        });
      }
      setTick((n) => n + 1);
      onSuccess?.(
        filesToAdd.length === 1
          ? `Added ${filesToAdd[0]!.name}`
          : `Added ${filesToAdd.length} documents`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not add attachment. Try a smaller file.",
      );
    }
  }

  function removeFile(file: LeadDrawerAttachment) {
    if (!file.removable) return;
    revokePreviewUrl(file.url);
    deleteAttachment(file.id);
    setPreviewItem((current) => (current?.id === file.id ? null : current));
    setTick((n) => n + 1);
    onSuccess?.("Attachment removed");
  }

  return (
    <div className="relative px-6 py-4">
      <h3 className="text-[15px] font-semibold text-slate-900">Attachments</h3>
      <p className="mt-0.5 text-[12px] text-slate-500">
        Documents on this lead file.
      </p>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,.pdf,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-50 py-2 text-[13px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
      >
        <Upload className="h-3.5 w-3.5" />
        Add attachment
      </button>

      <div className="mt-4">
        {files.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-50 text-violet-500">
              <Paperclip className="h-5 w-5" />
            </span>
            <p className="text-[13px] font-semibold text-slate-800">
              No documents on this lead
            </p>
            <p className="text-[12px] text-slate-400">
              Upload a file to attach it to this lead.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {files.map((file) => {
              const canOpen = Boolean(file.url);
              const image = isImageAttachment(
                file.contentType || "",
                file.name,
              );
              return (
                <div key={file.id} className="group relative">
                  <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {image && file.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.url}
                        alt={file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Paperclip className="h-5 w-5 text-[#5A32A3]" />
                    )}
                    {canOpen ? (
                      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-slate-900/55 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          title="Preview"
                          aria-label={`Preview ${file.name}`}
                          onClick={() => setPreviewItem(file)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-slate-700 hover:text-sky-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={file.url}
                          download={file.name}
                          title="Download"
                          aria-label={`Download ${file.name}`}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-slate-700 hover:text-sky-700"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ) : null}
                  </div>
                  {file.removable ? (
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => removeFile(file)}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-rose-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  <p
                    className="mt-1 max-w-14 truncate text-[10px] text-slate-500"
                    title={`${file.name} · ${[file.kind, file.size, file.uploadedAt, file.uploadedBy].filter(Boolean).join(" · ")}`}
                  >
                    {file.name}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {previewItem
        ? createPortal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
              <button
                type="button"
                aria-label="Dismiss preview"
                className="absolute inset-0 bg-slate-900/55"
                onClick={() => setPreviewItem(null)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={previewItem.name}
                className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-900">
                      {previewItem.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {previewItem.size}
                      {previewItem.contentType
                        ? ` · ${previewItem.contentType}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {previewItem.url ? (
                      <a
                        href={previewItem.url}
                        download={previewItem.name}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Close preview"
                      onClick={() => setPreviewItem(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex min-h-[min(70vh,36rem)] flex-1 items-center justify-center overflow-auto bg-slate-100 p-4">
                  {previewItem.url &&
                  isImageAttachment(
                    previewItem.contentType || "",
                    previewItem.name,
                  ) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewItem.url}
                      alt={previewItem.name}
                      className="max-h-[min(70vh,34rem)] max-w-full rounded-lg object-contain shadow-sm"
                    />
                  ) : previewItem.url &&
                    isPdfAttachment(
                      previewItem.contentType || "",
                      previewItem.name,
                    ) ? (
                    <iframe
                      title={previewItem.name}
                      src={previewItem.url}
                      className="h-[min(70vh,34rem)] w-full rounded-lg border border-slate-200 bg-white"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400">
                        <Paperclip className="h-6 w-6" />
                      </span>
                      <p className="text-[13px] text-slate-600">
                        {previewItem.url
                          ? "Preview isn’t available for this file type."
                          : "File preview isn’t available for this attachment."}
                      </p>
                      {previewItem.url ? (
                        <a
                          href={previewItem.url}
                          download={previewItem.name}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-[#5A32A3] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:opacity-90"
                        >
                          Download
                        </a>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
