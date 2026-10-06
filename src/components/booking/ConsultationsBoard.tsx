"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FolderInput,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Presentation,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import type { BookingPage, ConsultationMode } from "@/lib/booking/types";
import type { EmailNotifyConfig } from "@/lib/booking/email-config";
import { AssignConsultantsStep } from "@/components/booking/AssignConsultantsStep";
import {
  AvailabilityLimitsStep,
  type AvailabilityLimitsValues,
} from "@/components/booking/AvailabilityLimitsStep";
import {
  BookingAdditionalSettingsStep,
  type AdditionalSettingsValues,
} from "@/components/booking/BookingAdditionalSettingsStep";
import {
  BookingFormStep,
  type BookingFormValues,
} from "@/components/booking/BookingFormStep";
import {
  ConsultationNotifyPanel,
  type NotifyPanelId,
} from "@/components/booking/ConsultationNotifyPanel";
import type { NotificationRow } from "@/components/booking/BookingNotificationsStep";
import {
  BookingRulesStep,
  rulesToPageFields,
  type BookingRulesValues,
} from "@/components/booking/BookingRulesStep";
import {
  ConsultationDetailsStep,
  type CalendarTypeChoice,
  type ConsultationDetailsValues,
} from "@/components/booking/ConsultationDetailsStep";
import {
  ConsultationWizardLayout,
  consultationSetupIndex,
  type AvailabilityPanelId,
  type ConsultationSetupStepId,
} from "@/components/booking/ConsultationWizardLayout";
import { ConsultationOverview } from "@/components/booking/ConsultationOverview";
import { BookingPageDesigner } from "@/components/booking/BookingPageDesigner";
import { normalizeSlotLimit } from "@/components/booking/LimitsControls";
import { ShareConsultationModal } from "@/components/booking/ShareConsultationModal";
import { getRulesActor } from "@/lib/rules/actor";
import { BodyPortal } from "@/components/shared/BodyPortal";
import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/lib/activities/shared";
import {
  createCrmEventType,
  saveBookingEventTypePage,
  listCrmEventTypePages,
  mergeCrmEventTypePages,
  removeConsultationPage,
  tryCrmBooking,
} from "@/lib/booking/api";
import { toast } from "@/lib/notify/toast";
import { mergeNotificationPrefs } from "@/lib/booking/notify-prefs";
import {
  readLocalBookingPageBranding,
  writeLocalBookingPageBranding,
} from "@/lib/booking/page-branding";
import { FINANCE_PRIMARY_BUTTON } from "@/components/finance/buttonStyles";
import {
  consultationModeLabel,
  nextBookingPageId,
  publicBookUrl,
  upsertBookingPage,
  WEEKDAYS,
  listBookingPages,
  type ConsultantPriority,
} from "@/lib/booking/types";

const BRAND = "#5A32A3";

type ViewMode = "grid" | "list";

const SECTION_FILTERS = [
  "All Consultations",
  "Active Consultations",
  "Non active Consultations",
  "My Consultations",
] as const;

type SectionFilter = (typeof SECTION_FILTERS)[number];

async function loadConsultationPagesFromApi(): Promise<BookingPage[]> {
  const remote = await tryCrmBooking(() => listCrmEventTypePages());
  const local = listBookingPages().filter((page) => page.eventType === "Consultation");
  if (remote == null) return local;
  const merged = mergeCrmEventTypePages(local, remote).filter(
    (page) => page.eventType === "Consultation",
  );
  for (const page of merged) upsertBookingPage(page, { publish: false });
  return merged;
}

function matchesSection(
  page: BookingPage,
  filter: SectionFilter,
  myName: string,
) {
  const mine =
    page.owner === myName || (page.consultants ?? []).includes(myName);
  switch (filter) {
    case "All Consultations":
      return true;
    case "Active Consultations":
      return page.status === "Live";
    case "Non active Consultations":
      return page.status !== "Live";
    case "My Consultations":
      return mine;
    default:
      return true;
  }
}

export function ConsultationsBoard() {
  const [pages, setPages] = useState<BookingPage[]>([]);
  const [viewingPage, setViewingPage] = useState<BookingPage | null>(null);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [sectionOpen, setSectionOpen] = useState(false);
  const [sectionFilter, setSectionFilter] =
    useState<SectionFilter>("All Consultations");
  const sectionRef = useRef<HTMLDivElement>(null);
  const [chooseType, setChooseType] = useState(false);
  const [detailsChoice, setDetailsChoice] = useState<CalendarTypeChoice | null>(
    null,
  );
  const [detailsValues, setDetailsValues] =
    useState<ConsultationDetailsValues | null>(null);
  const [assignStep, setAssignStep] = useState(false);
  const [assignedConsultants, setAssignedConsultants] = useState<string[]>([]);
  const [assignedPriorities, setAssignedPriorities] = useState<
    Record<string, ConsultantPriority>
  >({});
  const [assignedUserIds, setAssignedUserIds] = useState<
    Record<string, string>
  >({});
  const [availabilityHostIds, setAvailabilityHostIds] = useState<string[]>([]);
  const [availabilityStep, setAvailabilityStep] = useState(false);
  const [availabilityPanel, setAvailabilityPanel] =
    useState<AvailabilityPanelId>("dates");
  const [availabilityValues, setAvailabilityValues] =
    useState<AvailabilityLimitsValues | null>(null);
  const [rulesStep, setRulesStep] = useState(false);
  const [rulesValues, setRulesValues] = useState<BookingRulesValues | null>(
    null,
  );
  const [formStep, setFormStep] = useState(false);
  const [formValues, setFormValues] = useState<BookingFormValues | null>(null);
  const [notifyStep, setNotifyStep] = useState(false);
  const [notifyPanel, setNotifyPanel] = useState<NotifyPanelId>("email");
  const [notifyValues, setNotifyValues] = useState<NotificationRow[] | null>(
    null,
  );
  const [notifyReminders, setNotifyReminders] = useState<
    BookingPage["notifyReminders"]
  >(undefined);
  const [emailNotifyConfig, setEmailNotifyConfig] = useState<
    EmailNotifyConfig | undefined
  >(undefined);
  const [whatsappNotifyConfig, setWhatsappNotifyConfig] = useState<
    BookingPage["whatsappNotifyConfig"]
  >(undefined);
  const [calendarInvite, setCalendarInvite] = useState<
    BookingPage["calendarInvite"]
  >(undefined);
  const [settingsStep, setSettingsStep] = useState(false);
  const [pageStep, setPageStep] = useState(false);
  const draftPageId = useRef(`wizard-page-${Date.now()}`).current;
  const [additionalValues, setAdditionalValues] =
    useState<AdditionalSettingsValues | null>(null);
  const [wizardFurthest, setWizardFurthest] = useState(0);

  function currentSetupStep(): ConsultationSetupStepId {
    if (pageStep) return "page";
    if (settingsStep) return "settings";
    if (notifyStep) return "notify";
    if (formStep) return "form";
    if (rulesStep) return "rules";
    if (availabilityStep) return "availability";
    if (assignStep) return "consultants";
    return "details";
  }

  function goToSetupStep(id: ConsultationSetupStepId, force = false) {
    const index = consultationSetupIndex(id);
    if (index < 0) return;
    if (!force && index > wizardFurthest) return;
    setAssignStep(index >= 1);
    setAvailabilityStep(index >= 2);
    setRulesStep(index >= 3);
    setFormStep(index >= 4);
    setNotifyStep(index >= 5);
    setSettingsStep(index >= 6);
    setPageStep(index >= 7);
  }

  function reachSetupStep(id: ConsultationSetupStepId) {
    const index = consultationSetupIndex(id);
    setWizardFurthest((current) => Math.max(current, index));
    goToSetupStep(id, true);
  }

  function wrapSetup(node: ReactNode) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ConsultationWizardLayout
          current={currentSetupStep()}
          furthest={wizardFurthest}
          onSelect={goToSetupStep}
          availabilityPanel={availabilityPanel}
          onAvailabilityPanel={(panel) => {
            setAvailabilityPanel(panel);
            if (currentSetupStep() !== "availability") {
              goToSetupStep("availability");
            }
          }}
          notifyPanel={notifyPanel}
          onNotifyPanel={(panel) => {
            setNotifyPanel(panel);
            if (currentSetupStep() !== "notify") {
              goToSetupStep("notify");
            }
          }}
        >
          {node}
        </ConsultationWizardLayout>
      </div>
    );
  }

  function resetWizard() {
    setPageStep(false);
    setSettingsStep(false);
    setNotifyStep(false);
    setNotifyPanel("email");
    setFormStep(false);
    setRulesStep(false);
    setAssignStep(false);
    setAvailabilityStep(false);
    setAvailabilityPanel("dates");
    setAvailabilityValues(null);
    setAssignedConsultants([]);
    setAssignedPriorities({});
    setAssignedUserIds({});
    setAvailabilityHostIds([]);
    setRulesValues(null);
    setFormValues(null);
    setNotifyValues(null);
    setNotifyReminders(undefined);
    setEmailNotifyConfig(undefined);
    setWhatsappNotifyConfig(undefined);
    setCalendarInvite(undefined);
    setAdditionalValues(null);
    setDetailsValues(null);
    setDetailsChoice(null);
    setWizardFurthest(0);
  }

  async function finishConsultation(
    form: BookingFormValues | null,
    additional?: AdditionalSettingsValues,
  ) {
    if (!detailsChoice || !detailsValues || !rulesValues) return;
    const mapped = rulesToPageFields(rulesValues, {
      durationMinutes: detailsValues.durationMinutes,
      group: detailsChoice.mode === "group",
    });
    const slug = detailsValues.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    const confirmationTemplate =
      form?.freeButton ||
      "Hi {{name}}, your consultation is confirmed for {{datetime}}.";
    const inviteNotes = additional?.inviteNotes?.trim();
    const page: BookingPage = {
      id: nextBookingPageId(),
      title: detailsValues.name,
      slug: slug || `consult-${Date.now()}`,
      owner: assignedConsultants[0] ?? "Admin",
      eventType: "Consultation" as const,
      consultationMode: detailsChoice.mode,
      meetingMode: "one_time" as const,
      durationMinutes: mapped.durationMinutes,
      bufferMinutes: mapped.bufferMinutes,
      minNoticeHours: mapped.minNoticeHours,
      maxAdvanceDays: mapped.maxAdvanceDays,
      maxAttendees: mapped.maxAttendees,
      schedulingRules: mapped.schedulingRules,
      timezone: "Australia/Sydney",
      meetingVia:
        detailsValues.meetingPlace === "online"
          ? "video"
          : detailsValues.meetingPlace === "offline"
            ? "in_person"
            : "phone",
      meetingViaDetail:
        detailsValues.meetingPlace === "online"
          ? detailsValues.platform
          : detailsValues.meetingPlace === "offline"
            ? detailsValues.locationDetail || undefined
            : detailsValues.phoneDetail || undefined,
      consultants: assignedConsultants,
      consultantPriorities: assignedPriorities,
      price: detailsValues.price,
      coverImageUrl: detailsValues.coverImageUrl,
      currency: "AUD",
      description: "",
      availability:
        availabilityValues?.defaultHours && availabilityValues.weekly.length
          ? availabilityValues.weekly
          : WEEKDAYS.map((day) => ({
              day,
              enabled: day !== "Saturday" && day !== "Sunday",
              start: "09:00",
              end: "17:00",
            })),
      appointmentLimits: availabilityValues
        ? {
            defaultHours: availabilityValues.defaultHours,
            overrideUserHours: availabilityValues.overrideUserHours,
            userSpecificHours: availabilityValues.userSpecificHours,
            slotsPerEvent: normalizeSlotLimit(availabilityValues.slotsPerEvent),
            slotsPerCustomer: normalizeSlotLimit(
              availabilityValues.slotsPerCustomer,
            ),
            customLimits: availabilityValues.customLimits,
            userHours: availabilityValues.userHours,
          }
        : undefined,
      questions: (form?.fields ?? []).map((f) => ({
        id: f.id,
        label: f.label,
        required: f.required,
        hidden: f.hidden,
        fieldType: f.type,
        ephi: f.ephi,
        options: f.options,
        addressParts: f.addressParts,
      })),
      termsEnabled: Boolean(form?.terms),
      termsHtml: form?.termsText,
      confirmationTemplate:
        additional?.calendarInvites !== false && inviteNotes
          ? `${confirmationTemplate}\n\n${inviteNotes}`
          : confirmationTemplate,
      reminderTemplate: "Consultation reminder: starting soon.",
      status: "Live",
      views: 0,
      bookingsCount: 0,
      cancelRate: 0,
      createdAt: new Date().toLocaleDateString("en-GB"),
      calendarInvites: additional?.calendarInvites !== false,
      inviteNotes,
      allowReschedule: additional?.allowReschedule !== false,
      allowCancel: additional?.allowCancel !== false,
      additionalSettings: additional,
      notifyPrefs: mergeNotificationPrefs(notifyValues),
      notifyReminders,
      emailNotifyConfig,
      whatsappNotifyConfig,
      calendarInvite,
    };
    const created = await tryCrmBooking(() =>
      createCrmEventType({
        name: page.title,
        slug: page.slug,
        durationMinutes: page.durationMinutes,
        description: page.description,
        active: page.status === "Live",
        meetingPlace: detailsValues.meetingPlace,
        platform: detailsValues.platform,
        locationDetail:
          detailsValues.meetingPlace === "offline"
            ? detailsValues.locationDetail
            : detailsValues.phoneDetail,
        hostIds: availabilityHostIds.length
          ? availabilityHostIds
          : Object.values(assignedUserIds).filter(Boolean),
        bufferBeforeMinutes: page.bufferMinutes,
        // Only sent when set, so the default create request is unchanged.
        bufferAfterMinutes: page.schedulingRules?.postBufferMinutes || undefined,
        minimumNoticeMinutes: Math.round((page.minNoticeHours ?? 2) * 60),
        maxDaysInFuture: page.maxAdvanceDays,
      }),
    );
    const savedId = created?.id || page.id;
    const branding = readLocalBookingPageBranding(draftPageId);
    if (savedId !== draftPageId) {
      writeLocalBookingPageBranding(savedId, branding);
    }
    if (created?.id) {
      void tryCrmBooking(() => saveBookingEventTypePage(created.id, branding));
    }
    upsertBookingPage(
      created?.id
        ? {
            ...page,
            id: created.id,
            slug: created.slug || page.slug,
            crmEventTypeId: created.id,
          }
        : page,
    );
    void loadConsultationPagesFromApi().then(setPages);
    resetWizard();
  }

  function refreshPages() {
    setPagesLoading(true);
    void loadConsultationPagesFromApi()
      .then(setPages)
      .finally(() => setPagesLoading(false));
  }

  useEffect(() => {
    refreshPages();
  }, []);

  useEffect(() => {
    if (!sectionOpen) return;
    function onDoc(e: MouseEvent) {
      if (sectionRef.current && !sectionRef.current.contains(e.target as Node)) {
        setSectionOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sectionOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pages.filter((p) => {
      if (!matchesSection(p, sectionFilter, getRulesActor().name)) return false;
      if (!q) return true;
      const people = (p.consultants ?? [p.owner]).join(" ").toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        people.includes(q) ||
        consultationModeLabel(p.consultationMode).toLowerCase().includes(q)
      );
    });
  }, [pages, query, sectionFilter]);

  if (detailsChoice && pageStep && detailsValues) {
    const designerPage: BookingPage = {
      id: draftPageId,
      title: detailsValues.name,
      slug: "wizard-page",
      owner: assignedConsultants[0] ?? "Admin",
      eventType: "Consultation",
      durationMinutes: detailsValues.durationMinutes,
      bufferMinutes: 0,
      timezone: "Australia/Sydney",
      description: "",
      availability: [],
      questions: [],
      confirmationTemplate: "",
      reminderTemplate: "",
      status: "Draft",
      views: 0,
      bookingsCount: 0,
      cancelRate: 0,
      createdAt: "",
      consultants: assignedConsultants,
    };
    return wrapSetup(
      <div className="flex min-h-[640px] flex-col pb-8">
        <BookingPageDesigner page={designerPage} />
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => goToSetupStep("settings")}
            className="h-10 min-w-[96px] rounded-lg border border-[#E5E7EB] bg-white px-6 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => void finishConsultation(formValues, additionalValues ?? undefined)}
            className="h-10 min-w-[96px] rounded-lg bg-[#5A32A3] px-6 text-[13px] font-semibold text-white hover:brightness-110"
          >
            Finish setup
          </button>
        </div>
      </div>,
    );
  }

  if (detailsChoice && settingsStep && detailsValues) {
    return wrapSetup(
      <BookingAdditionalSettingsStep
        initial={additionalValues ?? undefined}
        onBack={() => goToSetupStep("notify")}
        finishLabel="Next"
        onFinish={(values) => {
          setAdditionalValues(values);
          reachSetupStep("page");
        }}
      />,
    );
  }

  if (detailsChoice && notifyStep && detailsValues) {
    const notifyPage: BookingPage = {
      id: "wizard-notify",
      title: detailsValues.name,
      slug: "wizard-notify",
      owner: assignedConsultants[0] ?? "Admin",
      eventType: "Consultation",
      durationMinutes: detailsValues.durationMinutes,
      bufferMinutes: 0,
      timezone: "Australia/Sydney",
      description: "",
      availability: [],
      questions: [],
      confirmationTemplate: "",
      reminderTemplate: "",
      status: "Draft",
      views: 0,
      bookingsCount: 0,
      cancelRate: 0,
      createdAt: "",
      notifyPrefs: notifyValues ?? undefined,
      notifyReminders,
      emailNotifyConfig,
      whatsappNotifyConfig,
      calendarInvite,
    };
    return wrapSetup(
      <div className="pb-8">
        <ConsultationNotifyPanel
          panel={notifyPanel}
          page={notifyPage}
          onSaved={(next) => {
            setNotifyValues(
              (next.notifyPrefs as NotificationRow[] | undefined) ?? null,
            );
            setNotifyReminders(next.notifyReminders);
            setEmailNotifyConfig(next.emailNotifyConfig);
            setWhatsappNotifyConfig(next.whatsappNotifyConfig);
            setCalendarInvite(next.calendarInvite);
          }}
        />
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => goToSetupStep("form")}
            className="h-10 min-w-[96px] rounded-lg border border-[#E5E7EB] bg-white px-6 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => reachSetupStep("settings")}
            className="h-10 min-w-[96px] rounded-lg bg-[#5A32A3] px-6 text-[13px] font-semibold text-white hover:brightness-110"
          >
            Next
          </button>
        </div>
      </div>,
    );
  }

  if (detailsChoice && formStep && detailsValues) {
    return wrapSetup(
      <BookingFormStep
        initial={formValues ?? undefined}
        onBack={() => goToSetupStep("rules")}
        onNext={(values) => {
          setFormValues(values);
          reachSetupStep("notify");
        }}
      />,
    );
  }

  if (detailsChoice && rulesStep && detailsValues) {
    return wrapSetup(
      <BookingRulesStep
        group={detailsChoice.mode === "group"}
        initial={rulesValues}
        onBack={() => goToSetupStep("availability")}
        onSave={(rules) => {
          setRulesValues(rules);
          reachSetupStep("form");
        }}
      />,
    );
  }

  if (detailsChoice && availabilityStep && detailsValues) {
    return wrapSetup(
      <AvailabilityLimitsStep
        panel={availabilityPanel}
        consultants={assignedConsultants}
        consultantUserIds={assignedUserIds}
        timezone="Australia/Sydney"
        initial={availabilityValues}
        onChange={setAvailabilityValues}
        onBack={() => {
          if (availabilityPanel === "limits") {
            setAvailabilityPanel("dates");
            return;
          }
          goToSetupStep("consultants");
        }}
        onNext={(values, hostIds) => {
          setAvailabilityValues(values);
          setAvailabilityHostIds(hostIds);
          if (availabilityPanel === "dates") {
            setAvailabilityPanel("limits");
            return;
          }
          reachSetupStep("rules");
        }}
      />,
    );
  }

  if (detailsChoice && assignStep && detailsValues) {
    return wrapSetup(
      <AssignConsultantsStep
        choice={detailsChoice}
        consultationName={detailsValues.name}
        coverImageUrl={detailsValues.coverImageUrl}
        onCoverChange={(url) =>
          setDetailsValues((current) =>
            current ? { ...current, coverImageUrl: url } : current,
          )
        }
        onBack={() => goToSetupStep("details")}
        onCreate={(consultants, priorities, userIds) => {
          setAssignedConsultants(consultants);
          setAssignedPriorities(priorities);
          setAssignedUserIds(userIds);
          setAvailabilityPanel("dates");
          reachSetupStep("availability");
        }}
      />,
    );
  }

  if (detailsChoice) {
    return wrapSetup(
      <ConsultationDetailsStep
        choice={detailsChoice}
        initial={detailsValues ?? undefined}
        onBack={() => {
          setDetailsChoice(null);
          setDetailsValues(null);
          setChooseType(true);
          setWizardFurthest(0);
        }}
        onNext={(values) => {
          setDetailsValues(values);
          reachSetupStep("consultants");
        }}
      />,
    );
  }

  if (viewingPage) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ConsultationOverview
          page={viewingPage}
          onClose={() => setViewingPage(null)}
          onRefresh={refreshPages}
          onSaved={(next) => {
            upsertBookingPage(next);
            setViewingPage(next);
            setPages((list) =>
              list.some((item) => item.id === next.id)
                ? list.map((item) => (item.id === next.id ? next : item))
                : [next, ...list],
            );
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
      <div className="mb-5 flex flex-wrap items-center justify-end gap-2 sm:mb-6">
        <label className="relative min-w-0 w-full sm:w-72 lg:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search consultations…"
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pr-9 pl-9 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#5A32A3] focus:ring-2 focus:ring-[#5A32A3]/15"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>
        <div className="inline-flex overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={cn(
              "flex h-10 w-10 items-center justify-center",
              view === "grid"
                ? "bg-[#F3ECFB] text-[#5A32A3]"
                : "text-slate-400 hover:bg-slate-50",
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex h-10 w-10 items-center justify-center border-l border-[#E5E7EB]",
              view === "list"
                ? "bg-[#F3ECFB] text-[#5A32A3]"
                : "text-slate-400 hover:bg-slate-50",
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setChooseType(true)}
          className={`${FINANCE_PRIMARY_BUTTON} h-10 px-3.5 text-[13px] sm:px-4`}
        >
          <Plus className="h-4 w-4" />
          New Consultation
        </button>
      </div>

      <div className="mb-4">
        <div className="relative self-start" ref={sectionRef}>
          <button
            type="button"
            onClick={() => setSectionOpen((v) => !v)}
            className="inline-flex items-center gap-2 text-[15px] font-semibold text-slate-800"
            aria-expanded={sectionOpen}
          >
            {sectionFilter}
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[#F3ECFB] px-1.5 text-[11px] font-bold text-[#5A32A3]">
              {filtered.length}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                sectionOpen && "rotate-180",
              )}
            />
          </button>
          {sectionOpen ? (
            <div className="absolute top-9 left-0 z-30 w-56 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
              {SECTION_FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setSectionFilter(option);
                    setSectionOpen(false);
                  }}
                  className={cn(
                    "flex w-full px-3 py-2.5 text-left text-[13px] font-medium",
                    option === sectionFilter
                      ? "bg-[#F3ECFB] text-[#5A32A3]"
                      : "text-slate-800 hover:bg-slate-50",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {pagesLoading ? (
        <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-white py-16 text-center text-[13px] text-slate-400">
          Loading consultation pages…
        </p>
      ) : filtered.length === 0 ? (
        <div className="space-y-3">
          <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-white py-16 text-center text-[13px] text-slate-400">
            No consultation pages yet. Create one to start sharing booking links.
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((page) => (
            <ConsultationCard
              key={page.id}
              page={page}
              onOpen={() => setViewingPage(page)}
              onRefresh={refreshPages}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          {filtered.map((page) => (
            <ConsultationRow
              key={page.id}
              page={page}
              onOpen={() => setViewingPage(page)}
              onRefresh={refreshPages}
            />
          ))}
        </div>
      )}

      {chooseType ? (
        <ChooseCalendarTypeModal
          onClose={() => setChooseType(false)}
          onSelect={(choice) => {
            setChooseType(false);
            setAssignStep(false);
            setRulesStep(false);
            setFormStep(false);
            setNotifyStep(false);
            setSettingsStep(false);
            setPageStep(false);
            setWizardFurthest(0);
            setDetailsChoice(choice);
          }}
        />
      ) : null}
    </div>
  );
}

const CALENDAR_TYPES: {
  mode: ConsultationMode;
  title: string;
  icon: typeof Users;
}[] = [
  {
    mode: "one_to_one",
    title: "Personal booking",
    icon: Users,
  },
  {
    mode: "one_to_one",
    title: "Round robin",
    icon: RefreshCw,
  },
  {
    mode: "group",
    title: "Class booking",
    icon: Presentation,
  },
  {
    mode: "collective",
    title: "Collective booking",
    icon: UsersRound,
  },
];

const MORE_CALENDAR_TYPES: typeof CALENDAR_TYPES = [
  {
    mode: "resource",
    title: "Resource booking",
    icon: CalendarDays,
  },
];

function ChooseCalendarTypeModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (choice: CalendarTypeChoice) => void;
}) {
  const [more, setMore] = useState(false);
  const types = more ? [...CALENDAR_TYPES, ...MORE_CALENDAR_TYPES] : CALENDAR_TYPES;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-[1px] sm:items-center sm:p-6"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="choose-calendar-title"
          className="flex max-h-[min(90dvh,720px)] w-full max-w-[min(920px,100%)] flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative border-b border-[#E5E7EB] px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <h2
              id="choose-calendar-title"
              className="pr-10 text-[18px] font-bold text-slate-800 sm:text-[20px]"
            >
              Choose calendar type
            </h2>
          </div>

          <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-7 sm:pb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {types.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.title}
                    type="button"
                    onClick={() => onSelect({ mode: t.mode, title: t.title })}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 text-left transition-colors hover:border-[#5A32A3]/40 hover:bg-[#F3ECFB] focus-visible:ring-2 focus-visible:ring-[#5A32A3]/25 focus-visible:outline-none"
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#5A32A3]" />
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-[#5A32A3]">
                        {t.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setMore((v) => !v)}
              className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-[#5A32A3] hover:underline"
            >
              <ChevronRight
                className={cn("h-4 w-4 transition-transform", more && "rotate-90")}
              />
              {more ? "Show fewer types" : "Explore more types"}
            </button>
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}

function ConsultationCard({
  page,
  onOpen,
  onRefresh,
}: {
  page: BookingPage;
  onOpen: () => void;
  onRefresh: () => void;
}) {
  const people = page.consultants?.length ? page.consultants : [page.owner];
  const mode = consultationModeLabel(page.consultationMode) || "One on One";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="relative flex min-w-0 cursor-pointer flex-col rounded-xl border border-[#5A32A3]/25 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors hover:bg-[#F3ECFB]"
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <BrandMark page={page} />
          <div className="min-w-0 pt-0.5">
            <h3 className="truncate text-[16px] font-bold text-slate-900">
              {page.title}
            </h3>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {page.durationMinutes} mins | {mode}
            </p>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <CardMenu page={page} onOpen={onOpen} onRefresh={onRefresh} />
        </div>
      </div>
      <div className="mt-8 flex items-center justify-between gap-3">
        <PeopleSlot people={people} />
        <div onClick={(e) => e.stopPropagation()}>
          <ShareButton
            slug={page.slug}
            title={page.title}
          />
        </div>
      </div>
    </article>
  );
}

function ConsultationRow({
  page,
  onOpen,
  onRefresh,
}: {
  page: BookingPage;
  onOpen: () => void;
  onRefresh: () => void;
}) {
  const people = page.consultants?.length ? page.consultants : [page.owner];
  const mode = consultationModeLabel(page.consultationMode) || "One on One";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="flex cursor-pointer flex-col gap-3 border-b border-[#F3F4F6] px-4 py-3.5 transition-colors last:border-0 hover:bg-[#F3ECFB] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-center gap-3 text-left">
        <BrandMark page={page} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-slate-900">
            {page.title}
          </p>
          <p className="text-[12px] text-slate-500">
            {page.durationMinutes} mins | {mode}
          </p>
        </div>
      </div>
      <div
        className="flex items-center justify-between gap-3 sm:justify-end"
        onClick={(e) => e.stopPropagation()}
      >
        <PeopleSlot people={people} />
        <ShareButton
          slug={page.slug}
          title={page.title}
        />
        <CardMenu page={page} onOpen={onOpen} onRefresh={onRefresh} />
      </div>
    </div>
  );
}

function CardMenu({
  page,
  onOpen,
  onRefresh,
}: {
  page: BookingPage;
  onOpen: () => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function copyPage() {
    const slugBase = `${page.slug}-copy`.slice(0, 48);
    upsertBookingPage({
      ...page,
      id: nextBookingPageId(),
      title: `${page.title} (copy)`,
      slug: slugBase,
      views: 0,
      bookingsCount: 0,
      createdAt: new Date().toLocaleDateString("en-GB"),
    });
    onRefresh();
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute top-9 right-0 z-30 w-44 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
          <MenuRow
            icon={Pencil}
            label="Edit"
            onClick={() => {
              setOpen(false);
              onOpen();
            }}
          />
          <MenuRow
            icon={ExternalLink}
            label="Booking page"
            onClick={() => {
              setOpen(false);
              window.open(publicBookUrl(page.slug), "_blank", "noopener");
            }}
          />
          <MenuRow
            icon={Copy}
            label="Make a copy"
            onClick={() => {
              setOpen(false);
              copyPage();
            }}
          />
          <MenuRow
            icon={FolderInput}
            label="Move"
            onClick={() => {
              const next =
                page.status === "Live"
                  ? window.confirm("Move this consultation to Draft?")
                    ? "Draft"
                    : null
                  : window.confirm("Move this consultation to Active?")
                    ? "Live"
                    : null;
              if (!next) return;
              upsertBookingPage({ ...page, status: next });
              setOpen(false);
              onRefresh();
            }}
          />
          <MenuRow
            icon={Trash2}
            label="Delete"
            danger
            onClick={() => {
              if (!window.confirm(`Delete “${page.title}”?`)) return;
              void (async () => {
                try {
                  await removeConsultationPage(page);
                  setOpen(false);
                  onRefresh();
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Could not delete this consultation.",
                  );
                }
              })();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium",
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-800 hover:bg-slate-50",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

function BrandMark({ page }: { page: BookingPage }) {
  if (page.coverImageUrl) {
    return (
      <span className="flex h-12 w-12 shrink-0 overflow-hidden rounded-xl">
        <img
          src={page.coverImageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      </span>
    );
  }
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white"
      style={{ backgroundColor: BRAND }}
    >
      {initials(page.title || page.owner)}
    </span>
  );
}

function ShareButton({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-semibold hover:bg-[#F3ECFB]"
        style={{ borderColor: `${BRAND}55`, color: BRAND }}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>
      {open ? (
        <ShareConsultationModal
          title={title}
          slug={slug}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function PeopleSlot({ people }: { people: string[] }) {
  const names = people.filter(Boolean);
  if (names.length === 0) return null;

  return (
    <div className="flex items-center" aria-label={names.join(", ")}>
      {names.slice(0, 3).map((name, i) => (
        <span
          key={`${name}-${i}`}
          title={name}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold",
            avatarColor(name),
            i > 0 && "-ml-2",
          )}
        >
          {initials(name)}
        </span>
      ))}
    </div>
  );
}

