"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  CloudOff,
  FileText,
  Loader2,
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
  CONSULTATION_SETUP_STEPS,
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
import { WorkspacePortal } from "@/components/shared/WorkspacePortal";
import { currentZoneName } from "@/lib/booking/all-timezones";
import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/lib/activities/shared";
import {
  createCrmEventType,
  deleteConsultationDraft,
  listConsultationDrafts,
  saveBookingEventTypePage,
  saveConsultationDraft,
  type ConsultationDraftRecord,
  listCrmEventTypePages,
  mergeCrmEventTypePages,
  removeConsultationPage,
  tryCrmBooking,
} from "@/lib/booking/api";
import { toast } from "@/lib/notify/toast";
import { confirmDialog } from "@/lib/notify/dialog";
import { mergeNotificationPrefs } from "@/lib/booking/notify-prefs";
import {
  readLocalBookingPageBranding,
  writeLocalBookingPageBranding,
  type BookingPageBranding,
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

const BRAND = "var(--brand-primary)";

type ViewMode = "grid" | "list";

const SECTION_FILTERS = [
  "All Consultations",
  "Active Consultations",
  "Non active Consultations",
  "My Consultations",
  "Drafts",
] as const;

type SectionFilter = (typeof SECTION_FILTERS)[number];

/**
 * Everything the setup wizard holds, saved on the server as a draft so an
 * unfinished consultation can be picked up again from any browser.
 */
type WizardDraftData = {
  version: 1;
  step: ConsultationSetupStepId;
  furthest: number;
  choice: CalendarTypeChoice;
  details: ConsultationDetailsValues | null;
  consultants: string[];
  priorities: Record<string, ConsultantPriority>;
  userIds: Record<string, string>;
  hostIds: string[];
  availabilityPanel: AvailabilityPanelId;
  availability: AvailabilityLimitsValues | null;
  timezone: string;
  rules: BookingRulesValues | null;
  form: BookingFormValues | null;
  notifyPanel: NotifyPanelId;
  notify: NotificationRow[] | null;
  notifyReminders?: BookingPage["notifyReminders"];
  emailNotifyConfig?: EmailNotifyConfig;
  whatsappNotifyConfig?: BookingPage["whatsappNotifyConfig"];
  calendarInvite?: BookingPage["calendarInvite"];
  additional: AdditionalSettingsValues | null;
  branding: BookingPageBranding | null;
};

type DraftSaveState =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved"; at: number }
  | { state: "error"; message: string };

function draftData(record: ConsultationDraftRecord): WizardDraftData | null {
  const data = record.data as Partial<WizardDraftData>;
  if (!data.choice?.mode) return null;
  return data as WizardDraftData;
}

/** Wait this long after the last edit before saving the draft. */
const DRAFT_SAVE_DELAY_MS = 800;

async function loadConsultationPagesFromApi(): Promise<BookingPage[]> {
  const remote = await tryCrmBooking(() => listCrmEventTypePages());
  const local = listBookingPages().filter(
    (page) => page.eventType === "Consultation",
  );
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
    case "Drafts":
      return false;
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
  // The host's own time zone, set before the hours; it is also the booking
  // page's default zone.
  const [wizardTimezone, setWizardTimezone] = useState(browserTimezone);
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
  const [notifyReminders, setNotifyReminders] =
    useState<BookingPage["notifyReminders"]>(undefined);
  const [emailNotifyConfig, setEmailNotifyConfig] = useState<
    EmailNotifyConfig | undefined
  >(undefined);
  const [whatsappNotifyConfig, setWhatsappNotifyConfig] =
    useState<BookingPage["whatsappNotifyConfig"]>(undefined);
  const [calendarInvite, setCalendarInvite] =
    useState<BookingPage["calendarInvite"]>(undefined);
  const [settingsStep, setSettingsStep] = useState(false);
  const [pageStep, setPageStep] = useState(false);
  const draftPageId = useRef(`wizard-page-${Date.now()}`).current;
  const [additionalValues, setAdditionalValues] =
    useState<AdditionalSettingsValues | null>(null);
  const [wizardFurthest, setWizardFurthest] = useState(0);
  const [pageBranding, setPageBranding] =
    useState<BookingPageBranding | null>(null);
  const [drafts, setDrafts] = useState<ConsultationDraftRecord[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftsError, setDraftsError] = useState(false);
  const [draftSave, setDraftSave] = useState<DraftSaveState>({
    state: "idle",
  });
  // The server draft this wizard session saves to, once it has one.
  const draftIdRef = useRef<string | null>(null);
  const latestDraftJson = useRef("");
  const savedDraftJson = useRef("");
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  // Set while publishing, so a late autosave cannot bring the draft back.
  const publishing = useRef(false);

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
        <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void saveDraftAndExit()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Consultations
          </button>
          <div className="flex items-center gap-3">
            <DraftSaveStatus
              save={draftSave}
              hasName={Boolean(draftJson)}
              onRetry={() => void flushDraft()}
            />
            <button
              type="button"
              onClick={() => void saveDraftAndExit()}
              className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Save draft &amp; exit
            </button>
          </div>
        </div>
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
    setPageBranding(null);
    setWizardTimezone(browserTimezone());
    draftIdRef.current = null;
    latestDraftJson.current = "";
    savedDraftJson.current = "";
    setDraftSave({ state: "idle" });
  }

  function currentSnapshot(): WizardDraftData | null {
    if (!detailsChoice) return null;
    return {
      version: 1,
      step: currentSetupStep(),
      furthest: wizardFurthest,
      choice: detailsChoice,
      details: detailsValues,
      consultants: assignedConsultants,
      priorities: assignedPriorities,
      userIds: assignedUserIds,
      hostIds: availabilityHostIds,
      availabilityPanel,
      availability: availabilityValues,
      timezone: wizardTimezone,
      rules: rulesValues,
      form: formValues,
      notifyPanel,
      notify: notifyValues,
      notifyReminders,
      emailNotifyConfig,
      whatsappNotifyConfig,
      calendarInvite,
      additional: additionalValues,
      branding: pageBranding,
    };
  }

  // Saved once the consultation has a name; nothing before is worth keeping.
  const snapshot = currentSnapshot();
  const draftJson =
    snapshot?.details?.name.trim() ? JSON.stringify(snapshot) : "";

  /** Saves the latest wizard state, one request at a time, in order. */
  function flushDraft(): Promise<void> {
    saveChain.current = saveChain.current.then(async () => {
      const json = latestDraftJson.current;
      if (publishing.current || !json || json === savedDraftJson.current) {
        return;
      }
      const data = JSON.parse(json) as WizardDraftData;
      setDraftSave({ state: "saving" });
      try {
        const saved = await saveConsultationDraft(
          draftIdRef.current,
          data.details?.name.trim() ?? "",
          data as unknown as Record<string, unknown>,
        );
        if (publishing.current) return;
        if (saved?.id) draftIdRef.current = saved.id;
        savedDraftJson.current = json;
        setDraftSave({ state: "saved", at: Date.now() });
      } catch (err) {
        setDraftSave({
          state: "error",
          message:
            err instanceof Error && err.message
              ? err.message
              : "Could not save the draft",
        });
      }
    });
    return saveChain.current;
  }

  useEffect(() => {
    latestDraftJson.current = draftJson;
    if (!draftJson || draftJson === savedDraftJson.current) return;
    const timer = window.setTimeout(
      () => void flushDraft(),
      DRAFT_SAVE_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
    // flushDraft reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftJson]);

  // Warn before closing the tab while an edit has not reached the server.
  useEffect(() => {
    if (!draftJson) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (latestDraftJson.current === savedDraftJson.current) return;
      void flushDraft();
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(draftJson)]);

  function refreshDrafts() {
    setDraftsLoading(true);
    void listConsultationDrafts()
      .then((rows) => {
        setDrafts(rows);
        setDraftsError(false);
      })
      .catch(() => setDraftsError(true))
      .finally(() => setDraftsLoading(false));
  }

  /** Leaves the wizard, keeping its work as a draft. */
  async function saveDraftAndExit() {
    const hadDraft = Boolean(latestDraftJson.current);
    await flushDraft();
    resetWizard();
    refreshDrafts();
    if (hadDraft) {
      setSectionFilter("Drafts");
      toast.success("Saved to Drafts");
    }
  }

  function openDraft(record: ConsultationDraftRecord) {
    const data = draftData(record);
    if (!data) {
      toast.error("This draft cannot be opened.");
      return;
    }
    resetWizard();
    draftIdRef.current = record.id;
    setDetailsChoice(data.choice);
    setDetailsValues(data.details ?? null);
    setAssignedConsultants(data.consultants ?? []);
    setAssignedPriorities(data.priorities ?? {});
    setAssignedUserIds(data.userIds ?? {});
    setAvailabilityHostIds(data.hostIds ?? []);
    setAvailabilityPanel(data.availabilityPanel ?? "dates");
    setAvailabilityValues(data.availability ?? null);
    if (data.timezone) setWizardTimezone(data.timezone);
    setRulesValues(data.rules ?? null);
    setFormValues(data.form ?? null);
    setNotifyPanel(data.notifyPanel ?? "email");
    setNotifyValues(data.notify ?? null);
    setNotifyReminders(data.notifyReminders);
    setEmailNotifyConfig(data.emailNotifyConfig);
    setWhatsappNotifyConfig(data.whatsappNotifyConfig);
    setCalendarInvite(data.calendarInvite);
    setAdditionalValues(data.additional ?? null);
    setPageBranding(data.branding ?? null);
    // The page designer reads its theme from here when it opens.
    if (data.branding) writeLocalBookingPageBranding(draftPageId, data.branding);
    // Only steps whose earlier answers exist can be shown.
    const step = data.details ? data.step : "details";
    setWizardFurthest(Math.max(data.furthest ?? 0, consultationSetupIndex(step)));
    goToSetupStep(step, true);
    setDraftSave({ state: "saved", at: Date.parse(record.updatedAt) || Date.now() });
  }

  async function discardDraft(record: ConsultationDraftRecord) {
    const name = record.name || "Untitled consultation";
    if (
      !(await confirmDialog({
        title: "Discard draft?",
        message: `Discard the draft “${name}”? This cannot be undone.`,
        confirmText: "Discard",
        tone: "danger",
      }))
    ) {
      return;
    }
    try {
      await deleteConsultationDraft(record.id);
      setDrafts((list) => list.filter((item) => item.id !== record.id));
      toast.success("Draft discarded");
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Could not discard this draft",
      );
    }
  }

  /** Publishes a draft from the list without reopening the wizard. */
  function publishDraft(record: ConsultationDraftRecord) {
    const data = draftData(record);
    if (!data) {
      toast.error("This draft cannot be published.");
      return;
    }
    const missing = draftMissingStep(data);
    if (missing) {
      toast.error(`Finish “${missing.title}” before publishing.`);
      openDraft(record);
      return;
    }
    void finishConsultation(data, record.id);
  }

  async function finishConsultation(
    snap: WizardDraftData,
    draftId: string | null,
  ) {
    const missing = draftMissingStep(snap);
    if (missing) {
      toast.error(`Finish “${missing.title}” before publishing.`);
      // In the wizard: take the user to that step.
      if (currentSnapshot()) goToSetupStep(missing.id, true);
      return;
    }
    const detailsChoice = snap.choice;
    const detailsValues = snap.details!;
    const rulesValues = snap.rules!;
    const form = snap.form;
    const additional = snap.additional ?? undefined;
    const assignedConsultants = snap.consultants;
    const assignedPriorities = snap.priorities;
    const assignedUserIds = snap.userIds;
    const availabilityHostIds = snap.hostIds;
    const availabilityValues = snap.availability;
    const wizardTimezone = snap.timezone || browserTimezone();
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
      timezone: wizardTimezone,
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
      notifyPrefs: mergeNotificationPrefs(snap.notify),
      notifyReminders: snap.notifyReminders,
      emailNotifyConfig: snap.emailNotifyConfig,
      whatsappNotifyConfig: snap.whatsappNotifyConfig,
      calendarInvite: snap.calendarInvite,
    };
    publishing.current = true;
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
        bufferAfterMinutes:
          page.schedulingRules?.postBufferMinutes || undefined,
        minimumNoticeMinutes: Math.round((page.minNoticeHours ?? 2) * 60),
        maxDaysInFuture: page.maxAdvanceDays,
      }),
    );
    const savedId = created?.id || page.id;
    const branding = snap.branding ?? readLocalBookingPageBranding(draftPageId);
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
    // Wait out any save already on its way before removing the draft. Kept
    // when the CRM did not create the consultation, so nothing is lost.
    await saveChain.current;
    if (draftId && created?.id) {
      await tryCrmBooking(() => deleteConsultationDraft(draftId));
      setDrafts((list) => list.filter((item) => item.id !== draftId));
    }
    publishing.current = false;
    toast.success(`“${page.title}” is published`);
    void loadConsultationPagesFromApi().then(setPages);
    resetWizard();
    refreshDrafts();
  }

  function refreshPages() {
    setPagesLoading(true);
    void loadConsultationPagesFromApi()
      .then(setPages)
      .finally(() => setPagesLoading(false));
  }

  useEffect(() => {
    refreshPages();
    refreshDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sectionOpen) return;
    function onDoc(e: MouseEvent) {
      if (
        sectionRef.current &&
        !sectionRef.current.contains(e.target as Node)
      ) {
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
      timezone: wizardTimezone,
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
        <BookingPageDesigner page={designerPage} onSaved={setPageBranding} />
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
            onClick={() => {
              const snap = currentSnapshot();
              if (snap) void finishConsultation(snap, draftIdRef.current);
            }}
            className="h-10 min-w-[96px] rounded-lg bg-[var(--brand-primary)] px-6 text-[13px] font-semibold text-white hover:brightness-110"
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
        onDraftChange={setAdditionalValues}
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
      timezone: wizardTimezone,
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
            className="h-10 min-w-[96px] rounded-lg bg-[var(--brand-primary)] px-6 text-[13px] font-semibold text-white hover:brightness-110"
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
        onDraftChange={setFormValues}
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
        onDraftChange={setRulesValues}
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
        timezone={wizardTimezone}
        onTimezoneChange={setWizardTimezone}
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
        initialSelected={assignedConsultants}
        initialPriorities={assignedPriorities}
        onDraftChange={(consultants, priorities) => {
          setAssignedConsultants(consultants);
          setAssignedPriorities(priorities);
        }}
        onBack={(consultants, priorities) => {
          setAssignedConsultants(consultants);
          setAssignedPriorities(priorities);
          goToSetupStep("details");
        }}
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
        onDraftChange={setDetailsValues}
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
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pr-9 pl-9 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15"
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
                ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
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
                ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                : "text-slate-400 hover:bg-slate-50",
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            resetWizard();
            setChooseType(true);
          }}
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
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[var(--brand-primary-soft)] px-1.5 text-[11px] font-bold text-[var(--brand-primary)]">
              {sectionFilter === "Drafts" ? drafts.length : filtered.length}
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
                      ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
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

      {sectionFilter === "Drafts" ? (
        <DraftsList
          drafts={drafts}
          loading={draftsLoading}
          error={draftsError}
          view={view}
          query={query}
          onRetry={refreshDrafts}
          onOpen={openDraft}
          onPublish={publishDraft}
          onDiscard={(record) => void discardDraft(record)}
        />
      ) : pagesLoading ? (
        <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-white py-16 text-center text-[13px] text-slate-400">
          Loading consultation pages…
        </p>
      ) : filtered.length === 0 ? (
        <div className="space-y-3">
          <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-white py-16 text-center text-[13px] text-slate-400">
            No consultation pages yet. Create one to start sharing booking
            links.
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

/** The first wizard step a draft still needs before it can be published. */
function draftMissingStep(data: WizardDraftData) {
  const step = (id: ConsultationSetupStepId) =>
    CONSULTATION_SETUP_STEPS[consultationSetupIndex(id)];
  const details = data.details;
  if (!details?.name.trim() || details.durationMinutes < 5) {
    return step("details");
  }
  if (!data.consultants?.length) return step("consultants");
  if (!data.rules) return step("rules");
  return null;
}

function DraftSaveStatus({
  save,
  hasName,
  onRetry,
}: {
  save: DraftSaveState;
  hasName: boolean;
  onRetry: () => void;
}) {
  if (!hasName) {
    return (
      <span className="text-[12px] text-slate-400">
        Name the consultation to save a draft
      </span>
    );
  }
  if (save.state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving draft…
      </span>
    );
  }
  if (save.state === "error") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-rose-600"
        title={save.message}
      >
        <CloudOff className="h-3.5 w-3.5" />
        Draft not saved
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold underline underline-offset-2"
        >
          Retry
        </button>
      </span>
    );
  }
  if (save.state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
        <Check className="h-3.5 w-3.5 text-emerald-600" />
        Draft saved {formatSavedAt(save.at)}
      </span>
    );
  }
  return null;
}

function formatSavedAt(at: number) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const time = date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
  return date.toDateString() === today.toDateString()
    ? `at ${time}`
    : `on ${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}, ${time}`;
}

function formatEditedAgo(iso: string) {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "";
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "Edited just now";
  if (minutes < 60) return `Edited ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Edited ${hours} hr ago`;
  return `Edited ${new Date(at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

function DraftsList({
  drafts,
  loading,
  error,
  view,
  query,
  onRetry,
  onOpen,
  onPublish,
  onDiscard,
}: {
  drafts: ConsultationDraftRecord[];
  loading: boolean;
  error: boolean;
  view: ViewMode;
  query: string;
  onRetry: () => void;
  onOpen: (record: ConsultationDraftRecord) => void;
  onPublish: (record: ConsultationDraftRecord) => void;
  onDiscard: (record: ConsultationDraftRecord) => void;
}) {
  const q = query.trim().toLowerCase();
  const shown = q
    ? drafts.filter((record) => record.name.toLowerCase().includes(q))
    : drafts;

  if (loading && drafts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-white py-16 text-center text-[13px] text-slate-400">
        Loading drafts…
      </p>
    );
  }
  if (error && drafts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white py-16 text-center text-[13px] text-slate-500">
        Drafts could not be loaded.{" "}
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold text-[var(--brand-primary)] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }
  if (shown.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-white py-16 text-center text-[13px] text-slate-400">
        {q
          ? "No drafts match your search."
          : "No drafts. Consultations you start and don’t finish are saved here."}
      </p>
    );
  }
  return (
    <div
      className={
        view === "grid"
          ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          : "overflow-hidden rounded-xl border border-[#E5E7EB] bg-white"
      }
    >
      {shown.map((record) => (
        <DraftItem
          key={record.id}
          record={record}
          row={view === "list"}
          onOpen={() => onOpen(record)}
          onPublish={() => onPublish(record)}
          onDiscard={() => onDiscard(record)}
        />
      ))}
    </div>
  );
}

function DraftItem({
  record,
  row,
  onOpen,
  onPublish,
  onDiscard,
}: {
  record: ConsultationDraftRecord;
  row: boolean;
  onOpen: () => void;
  onPublish: () => void;
  onDiscard: () => void;
}) {
  const data = draftData(record);
  const title = record.name || data?.details?.name || "Untitled consultation";
  const index = data ? consultationSetupIndex(data.step) : 0;
  const stepTitle = CONSULTATION_SETUP_STEPS[Math.max(0, index)]?.title ?? "";
  const ready = data ? !draftMissingStep(data) : false;
  const meta = [
    data?.details?.durationMinutes ? `${data.details.durationMinutes} mins` : "",
    data?.choice?.title ?? "",
  ]
    .filter(Boolean)
    .join(" | ");
  const cover = data?.details?.coverImageUrl;

  const mark = cover ? (
    <span className="flex h-12 w-12 shrink-0 overflow-hidden rounded-xl">
      <img src={cover} alt="" className="h-full w-full object-cover" />
    </span>
  ) : (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--brand-primary)]/40 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
      <FileText className="h-5 w-5" />
    </span>
  );

  const actions = (
    <div
      className="flex shrink-0 items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onDiscard}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
        aria-label={`Discard draft ${title}`}
        title="Discard draft"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onPublish}
        disabled={!ready}
        title={
          ready ? "Publish this consultation" : "Finish the setup to publish"
        }
        className="inline-flex h-8 items-center rounded-md border border-[var(--brand-primary)]/35 px-2.5 text-[12px] font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
      >
        Publish
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex h-8 items-center gap-1 rounded-md bg-[var(--brand-primary)] px-2.5 text-[12px] font-semibold text-white hover:brightness-110"
      >
        <Pencil className="h-3.5 w-3.5" />
        Continue
      </button>
    </div>
  );

  const body = (
    <div className="flex min-w-0 items-start gap-3 text-left">
      {mark}
      <div className="min-w-0 pt-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <h3
            className={cn(
              "truncate font-bold text-slate-900",
              row ? "text-[14px]" : "text-[16px]",
            )}
          >
            {title}
          </h3>
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 uppercase">
            Draft
          </span>
        </div>
        {meta ? (
          <p className="mt-0.5 truncate text-[12px] text-slate-500">{meta}</p>
        ) : null}
        <p className="mt-0.5 truncate text-[12px] text-slate-400">
          {stepTitle ? `Step ${index + 1} of ${CONSULTATION_SETUP_STEPS.length}: ${stepTitle}` : ""}
          {stepTitle && record.updatedAt ? " · " : ""}
          {formatEditedAgo(record.updatedAt)}
        </p>
      </div>
    </div>
  );

  const open = {
    role: "button" as const,
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen();
      }
    },
  };

  if (row) {
    return (
      <div
        {...open}
        className="flex cursor-pointer flex-col gap-3 border-b border-[#F3F4F6] px-4 py-3.5 transition-colors last:border-0 hover:bg-[var(--brand-primary-soft)] sm:flex-row sm:items-center sm:justify-between"
      >
        {body}
        {actions}
      </div>
    );
  }
  return (
    <article
      {...open}
      className="relative flex min-w-0 cursor-pointer flex-col rounded-xl border border-dashed border-[var(--brand-primary)]/35 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors hover:bg-[var(--brand-primary-soft)]"
    >
      {body}
      <div className="mt-6 flex items-center justify-between gap-3">
        <PeopleSlot people={data?.consultants ?? []} />
        {actions}
      </div>
    </article>
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
  const types = more
    ? [...CALENDAR_TYPES, ...MORE_CALENDAR_TYPES]
    : CALENDAR_TYPES;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <WorkspacePortal>
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
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 text-left transition-colors hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-primary-soft)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/25 focus-visible:outline-none"
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-primary)]" />
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-[var(--brand-primary)]">
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
              className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--brand-primary)] hover:underline"
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform",
                  more && "rotate-90",
                )}
              />
              {more ? "Show fewer types" : "Explore more types"}
            </button>
          </div>
        </div>
      </div>
    </WorkspacePortal>
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
      className="relative flex min-w-0 cursor-pointer flex-col rounded-xl border border-[var(--brand-primary)]/25 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors hover:bg-[var(--brand-primary-soft)]"
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
          <ShareButton slug={page.slug} title={page.title} />
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
      className="flex cursor-pointer flex-col gap-3 border-b border-[#F3F4F6] px-4 py-3.5 transition-colors last:border-0 hover:bg-[var(--brand-primary-soft)] sm:flex-row sm:items-center sm:justify-between"
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
        <ShareButton slug={page.slug} title={page.title} />
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
            onClick={async () => {
              setOpen(false);
              let next: "Draft" | "Live" | null = null;
              if (page.status === "Live") {
                if (
                  await confirmDialog({
                    title: "Move to Draft?",
                    message: "Move this consultation to Draft?",
                    confirmText: "Move to Draft",
                  })
                ) {
                  next = "Draft";
                }
              } else if (
                await confirmDialog({
                  title: "Make active?",
                  message: "Move this consultation to Active?",
                  confirmText: "Make active",
                })
              ) {
                next = "Live";
              }
              if (!next) return;
              upsertBookingPage({ ...page, status: next });
              onRefresh();
            }}
          />
          <MenuRow
            icon={Trash2}
            label="Delete"
            danger
            onClick={() => {
              setOpen(false);
              void (async () => {
                if (
                  !(await confirmDialog({
                    title: "Delete consultation?",
                    message: `Delete “${page.title}”?`,
                    confirmText: "Delete",
                    tone: "danger",
                  }))
                )
                  return;
                try {
                  await removeConsultationPage(page);
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

function ShareButton({ slug, title }: { slug: string; title: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-semibold hover:bg-[var(--brand-primary-soft)]"
        style={{
          borderColor: `color-mix(in srgb, ${BRAND} 33%, transparent)`,
          color: BRAND,
        }}
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

/** This browser's time zone, in its current IANA name; Sydney if unknown. */
function browserTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone ? currentZoneName(zone) : "Australia/Sydney";
  } catch {
    return "Australia/Sydney";
  }
}
