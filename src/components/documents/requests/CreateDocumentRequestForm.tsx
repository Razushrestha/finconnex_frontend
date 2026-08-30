"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  House,
  RefreshCw,
  UserRound,
  Wallet,
  ShoppingCart,
  Banknote,
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  DOCUMENT_REQUEST_BROKERS,
  nextDocumentRequestIds,
  removeDocumentRequest,
  upsertDocumentRequest,
  type DocumentRequestType,
  type RequestedDocLine,
} from "@/lib/documents/requests/types";
import {
  createCrmDocumentRequest,
  toCreateDocumentRequestBody,
  tryCrmDocumentRequest,
} from "@/lib/documents/requests/api";
import { matchPortalForApplicant } from "@/lib/documents/requests/pack";
import { getRulesActor } from "@/lib/rules/actor";
import { cn } from "@/lib/utils";
import {
  REQUEST_DOC_CATEGORIES,
  type RequestDocItem,
} from "@/lib/documents/requests/catalog";
import {
  firstNameOf,
  RequestDocumentsPicker,
} from "@/components/documents/requests/RequestDocumentsPicker";
import {
  emptyApplicant,
  RequestApplicantsSection,
  type RequestApplicant,
} from "@/components/documents/requests/RequestApplicantsSection";
import { PropertyDetailsEditor, emptyPropertyDetails, type PropertyDetails } from "@/components/documents/requests/PropertyDetailsEditor";
import {
  RequestScheduleCard,
  defaultCustomReminder,
  formatCustomReminder,
  formatRequestDateTime,
  formatRequestDueDate,
  parseDatetimeLocal,
  validateRequestSchedule,
  type CustomReminderConfig,
  type RequestNotifyMethod,
} from "@/components/documents/requests/RequestScheduleCard";
import { RequestQuickReview } from "@/components/documents/requests/RequestQuickReview";
import { readCatalogDescriptionOverrides } from "@/lib/documents/requests/catalog";

interface CreateDocumentRequestFormProps {
  layoutId: string;
  redirect: boolean;
}

type LoanType = "Home loan" | "Asset / Other";
type HomePurpose = "Property purchase" | "Refinance";
type AssetPurpose = "Personal" | "Business";
type Purpose = HomePurpose | AssetPurpose;
type ApplicantCount = "1" | "2";

const PAGE_GRADIENT =
  "bg-[linear-gradient(90deg,#efe8f6_0%,#f5eef2_48%,#f8e6dc_100%)]";

const STEPS = [
  { id: 1, label: "Document Request details" },
  { id: 2, label: "Documents" },
  { id: 3, label: "Quick review" },
] as const;

const PREFILL_TABS = [
  { id: "property", label: "Property" },
  { id: "applicant", label: "Applicant details" },
  { id: "assets", label: "Assets" },
  { id: "expenses", label: "Expenses" },
] as const;

type PrefillTab = (typeof PREFILL_TABS)[number]["id"];

const HEM_CATEGORIES = [
  "Groceries",
  "Clothing & personal care",
  "Telephone, internet, pay TV & media streaming subscriptions",
  "Transport",
  "Recreation & entertainment",
  "Pet care",
  "Primary residence running costs (including strata and body corporate fees)",
  "Medical & health care",
  "General basic insurances",
  "Childcare expenses",
  "Public or Government primary & secondary education",
  "Higher education, vocational training & professional fees",
] as const;

const NON_HEM_CATEGORIES = [
  "Land tax",
  "Rent/Board",
  "Health insurance (excluding sickness & personal accident insurance)",
  "Sickness & personal accident insurance, life insurance",
  "Private schooling & tuition",
  "Child & spousal maintenance",
  "Investment property running costs",
  "Secondary residence running costs",
  "Other expenses",
] as const;

function emptyHemValues(): Record<string, string> {
  return Object.fromEntries(HEM_CATEGORIES.map((c) => [c, ""]));
}

function emptyNonHemValues(): Record<string, string> {
  return Object.fromEntries(NON_HEM_CATEGORIES.map((c) => [c, ""]));
}

function MoneyMonthField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative w-full max-w-[260px] shrink-0">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-slate-400">
        $
      </span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-[4.5rem] pl-7 text-[13px] text-slate-800 outline-none focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-slate-400">
        / month
      </span>
    </div>
  );
}

function ExpenseEditorCard({
  icon,
  title,
  categories,
  values,
  onChange,
  onClear,
  onCancel,
  onUpdate,
}: {
  icon: ReactNode;
  title: string;
  categories: readonly string[];
  values: Record<string, string>;
  onChange: (cat: string, v: string) => void;
  onClear: () => void;
  onCancel: () => void;
  onUpdate: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-3 sm:px-4">
      <div className="flex items-center gap-2.5">
        {icon}
        <h3 className="min-w-0 flex-1 text-[14px] font-bold text-slate-900">
          {title}
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear all
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {categories.map((cat) => (
          <div
            key={cat}
            className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <p className="min-w-0 text-[13px] leading-snug text-slate-700">
              {cat}
            </p>
            <MoneyMonthField
              value={values[cat] ?? ""}
              onChange={(v) => onChange(cat, v)}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-800 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onUpdate}
          className="inline-flex h-9 items-center rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-black"
        >
          Update
        </button>
      </div>
    </div>
  );
}

function PrefillRow({
  icon,
  label,
  open,
  onToggle,
  children,
}: {
  icon: ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/40">
      <div className="flex items-center gap-3 px-3 py-2">
        {icon}
        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-800">
          {label}
        </p>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-8 shrink-0 items-center rounded-md bg-[#5A32A3] px-3.5 text-[13px] font-semibold text-white hover:bg-[#4a2890]"
        >
          {open ? "Hide details" : "Add details"}
        </button>
      </div>
      {open ? (
        <div className="border-t border-slate-100 px-3 py-3">{children}</div>
      ) : null}
    </div>
  );
}

function contactFromName(name: string) {
  const parts = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const local =
    parts.length >= 2
      ? `${parts[0]}.${parts[parts.length - 1]}`
      : parts[0] || "client";
  const seed = name.split("").reduce((n, c) => n + c.charCodeAt(0), 0);
  const phone = `+614${String(40000000 + (seed % 59999999)).padStart(8, "0").slice(0, 8)}`;
  return { email: `${local}@gmail.com`, phone };
}

function ApplicantProfile({
  name,
  email,
  phone,
  existing,
}: {
  name: string;
  email: string;
  phone: string;
  existing: boolean;
}) {
  const contact = [email, phone].filter(Boolean).join(" | ");
  return (
    <div>
      <h3 className="text-[18px] font-bold leading-tight text-slate-900">
        {name || "Applicant"}
      </h3>
      {contact ? (
        <p className="mt-1 text-[13px] text-slate-500">{contact}</p>
      ) : (
        <p className="mt-1 text-[13px] text-slate-400">No contact details yet</p>
      )}
      {existing && email ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2 text-[12px] leading-snug text-slate-600">
          <span className="mt-px shrink-0 text-[14px]" aria-hidden>
            ☝️
          </span>
          <p>
            Account already exists for {email}. We&apos;ll pre-fill applicant
            details from their most recent Discovery Journey.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function PrefillUnavailable({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-slate-100 px-3.5 py-3">
      <span className="mt-px shrink-0 text-[15px]" aria-hidden>
        ☝️
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-slate-800">{title}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-slate-600">{body}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-slate-600">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12"
      />
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex w-full items-center justify-between gap-2">
      {STEPS.map((s, index) => {
        const active = step === s.id;
        const done = step > s.id;
        return (
          <li key={s.id} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
                  active || done
                    ? "bg-[#5A32A3] text-white"
                    : "bg-[#EDE4FB] text-[#5A32A3]",
                )}
              >
                {s.id}
              </span>
              <span
                className={cn(
                  "truncate text-[13px] font-medium",
                  active ? "text-slate-900" : "text-slate-500",
                )}
              >
                {s.label}
              </span>
            </div>
            {index < STEPS.length - 1 ? (
              <div className="mx-3 h-px min-w-[24px] flex-1 border-t border-dashed border-[#5A32A3]/45" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function CreateDocumentRequestForm({
  layoutId: _layoutId,
  redirect: _redirect,
}: CreateDocumentRequestFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!(main instanceof HTMLElement)) return;
    const previousColor = main.style.backgroundColor;
    const previousImage = main.style.backgroundImage;
    const previousOverflow = main.style.overflow;
    main.style.backgroundColor = "transparent";
    main.style.backgroundImage =
      "linear-gradient(90deg, #efe8f6 0%, #f5eef2 48%, #f8e6dc 100%)";
    main.style.overflow = "hidden";
    return () => {
      main.style.backgroundColor = previousColor;
      main.style.backgroundImage = previousImage;
      main.style.overflow = previousOverflow;
    };
  }, []);

  const [sendOnBehalfOf, setSendOnBehalfOf] = useState(
    () => getRulesActor().name.trim(),
  );

  useEffect(() => {
    const name = getRulesActor().name.trim();
    if (!name) return;
    setSendOnBehalfOf((prev) => prev || name);
  }, []);

  const senderOptions = useMemo(() => {
    const current = sendOnBehalfOf.trim() || getRulesActor().name.trim();
    const list = [...DOCUMENT_REQUEST_BROKERS];
    if (current && !list.includes(current as (typeof list)[number])) {
      return [current, ...list];
    }
    return list;
  }, [sendOnBehalfOf]);
  const loanType: LoanType = "Home loan";
  const purpose: Purpose = "Property purchase";
  const [applicants, setApplicants] = useState<RequestApplicant[]>([
    emptyApplicant(),
  ]);
  const [applicantCount, setApplicantCount] = useState<ApplicantCount>("1");
  const [skipCoApplicant, setSkipCoApplicant] = useState(true);
  const [clientSearch, setClientSearch] = useState("");
  const [clientSearch2, setClientSearch2] = useState("");

  const [applicant1, setApplicant1] = useState("");
  const [applicant2, setApplicant2] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [email2, setEmail2] = useState("");
  const [phone2, setPhone2] = useState("");
  const [existingAccount1, setExistingAccount1] = useState(false);
  const [existingAccount2, setExistingAccount2] = useState(false);

  useEffect(() => {
    const first = applicants[0];
    const second = applicants[1];
    setApplicant1(first?.name.trim() || "");
    setEmail(first?.email.trim() || "");
    setClientSearch(first?.name.trim() || first?.email.trim() || "");
    setApplicant2(second?.name.trim() || "");
    setEmail2(second?.email.trim() || "");
    setClientSearch2(second?.name.trim() || second?.email.trim() || "");
    setApplicantCount(applicants.length >= 2 ? "2" : "1");
    setSkipCoApplicant(applicants.length < 2);
  }, [applicants]);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails>(
    emptyPropertyDetails,
  );
  const [propertyDraft, setPropertyDraft] = useState<PropertyDetails>(
    emptyPropertyDetails,
  );
  const [assetSummary, setAssetSummary] = useState("");
  const [hemValues, setHemValues] = useState<Record<string, string>>(emptyHemValues);
  const [hemDraft, setHemDraft] = useState<Record<string, string>>(emptyHemValues);
  const [nonHemValues, setNonHemValues] =
    useState<Record<string, string>>(emptyNonHemValues);
  const [nonHemDraft, setNonHemDraft] =
    useState<Record<string, string>>(emptyNonHemValues);
  const [prefillTab, setPrefillTab] = useState<PrefillTab>("property");
  const [openPrefill, setOpenPrefill] = useState<string | null>(null);

  const [selectedByApplicant, setSelectedByApplicant] = useState<
    Record<1 | 2, string[]>
  >({ 1: [], 2: [] });
  const [extraDocs, setExtraDocs] = useState<Record<string, RequestDocItem[]>>(
    {},
  );
  const [docDescOverrides, setDocDescOverrides] = useState<
    Record<string, string>
  >({});
  const [dueDate, setDueDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [customReminder, setCustomReminder] =
    useState<CustomReminderConfig>(defaultCustomReminder);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [notifyBy, setNotifyBy] = useState<RequestNotifyMethod[]>(["Email"]);
  const [notes, setNotes] = useState("");
  const [template, setTemplate] = useState("");
  const [requestTitle, setRequestTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const requestedFrom = useMemo(() => {
    const names = [applicant1.trim(), applicant2.trim()].filter(Boolean);
    return names.join(", ");
  }, [applicant1, applicant2]);

  const twoApplicants = applicantCount === "2" && !skipCoApplicant;

  useEffect(() => {
    if (titleEdited) return;
    const names = [
      firstNameOf(applicant1, ""),
      twoApplicants ? firstNameOf(applicant2, "") : "",
    ]
      .filter(Boolean)
      .join(", ");
    if (template && names) {
      setRequestTitle(`${template} - ${names}`);
      return;
    }
    if (template) {
      setRequestTitle(template);
      return;
    }
    if (names) {
      setRequestTitle(`${purpose} - ${names}`);
      return;
    }
    setRequestTitle("");
  }, [template, applicant1, applicant2, twoApplicants, purpose, titleEdited]);

  const reviewGroups = useMemo(() => {
    const catalog = REQUEST_DOC_CATEGORIES.flatMap((c) => [
      ...c.items,
      ...(extraDocs[c.id] ?? []),
    ]);
    const stored = readCatalogDescriptionOverrides();
    const resolve = (id: string): RequestDocItem => {
      const item = catalog.find((i) => i.id === id);
      return {
        id,
        title: item?.title ?? id,
        description:
          docDescOverrides[id] ?? stored[id] ?? item?.description ?? "",
      };
    };
    const groups = [
      {
        applicant: applicant1.trim() || "Applicant",
        items: selectedByApplicant[1].map(resolve),
      },
    ];
    if (applicantCount === "2" && !skipCoApplicant && selectedByApplicant[2].length) {
      groups.push({
        applicant: applicant2.trim() || "Applicant 2",
        items: selectedByApplicant[2].map(resolve),
      });
    }
    return groups.filter((g) => g.items.length > 0);
  }, [
    applicant1,
    applicant2,
    applicantCount,
    skipCoApplicant,
    selectedByApplicant,
    extraDocs,
    docDescOverrides,
  ]);

  function validateStep(current: number) {
    const next: Record<string, string> = {};
    const scheduleErrors = validateRequestSchedule(dueDate, reminderDate);
    if (scheduleErrors.dueDate) next.dueDate = scheduleErrors.dueDate;
    if (scheduleErrors.reminderDate) next.reminderDate = scheduleErrors.reminderDate;

    if (current === 1) {
      if (!sendOnBehalfOf.trim()) next.sendOnBehalfOf = "Provide a name";
      if (applicants.length === 0) {
        next.applicants = "Select the number of applicants";
      } else {
        const first = applicants[0];
        if (!first?.name.trim() || !first?.email.trim()) {
          next.applicants = "Add at least one applicant with name and email";
        } else if (
          applicants[1] &&
          (!applicants[1].name.trim() || !applicants[1].email.trim())
        ) {
          next.applicants = "Complete the second applicant name and email";
        }
      }
    }
    if (current === 2) {
      const any =
        selectedByApplicant[1].length +
        (applicantCount === "2" && !skipCoApplicant
          ? selectedByApplicant[2].length
          : 0);
      if (any === 0) {
        next.docs = "Select at least one document";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  useEffect(() => {
    if (!dueDate.trim() && repeatEnabled) setRepeatEnabled(false);
  }, [dueDate, repeatEnabled]);

  function handleDueDateChange(value: string) {
    let nextReminder = reminderDate;
    if (!value.trim()) {
      nextReminder = "";
    } else {
      const due = parseDatetimeLocal(value);
      const reminder = parseDatetimeLocal(nextReminder);
      if (due && reminder && reminder.getTime() > due.getTime()) {
        nextReminder = "";
      }
    }
    setDueDate(value);
    setReminderDate(nextReminder);
    setErrors((prev) => {
      const next = { ...prev };
      const dateErrors = validateRequestSchedule(value, nextReminder);
      if (dateErrors.dueDate) next.dueDate = dateErrors.dueDate;
      else delete next.dueDate;
      if (dateErrors.reminderDate) next.reminderDate = dateErrors.reminderDate;
      else delete next.reminderDate;
      return next;
    });
  }

  function handleReminderDateChange(value: string) {
    setReminderDate(value);
    setErrors((prev) => {
      const next = { ...prev };
      const dateErrors = validateRequestSchedule(dueDate, value);
      if (dateErrors.dueDate) next.dueDate = dateErrors.dueDate;
      else delete next.dueDate;
      if (dateErrors.reminderDate) next.reminderDate = dateErrors.reminderDate;
      else delete next.reminderDate;
      return next;
    });
  }

  function goNext() {
    if (!validateStep(step)) return;
    if (step === 1) {
      const name1 = applicant1.trim() || clientSearch.trim();
      if (name1) {
        setApplicant1(name1);
        const contact = contactFromName(name1);
        setEmail((prev) => prev || contact.email);
        setPhone((prev) => prev || contact.phone);
        setExistingAccount1(true);
      }
      if (applicantCount === "2" && !skipCoApplicant) {
        const name2 = applicant2.trim() || clientSearch2.trim();
        if (name2) {
          setApplicant2(name2);
          const contact = contactFromName(name2);
          setEmail2((prev) => prev || contact.email);
          setPhone2((prev) => prev || contact.phone);
          setExistingAccount2(true);
        }
      }
    }
    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }
    handleCreate();
  }

  function goBack() {
    setErrors({});
    if (step === 1) {
      router.push("/documents/requests");
      return;
    }
    setStep((s) => s - 1);
  }

  async function handleCreate() {
    if (!validateStep(2)) return;
    setSaving(true);
    try {
      const ids = nextDocumentRequestIds();
      const started = new Date().toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const documentType = (
        purpose === "Personal" || purpose === "Business" ? "Other" : purpose
      ) as DocumentRequestType;
      const title =
        requestTitle.trim() ||
        `${purpose} pack — ${requestedFrom || "client"}`;
      const due = formatRequestDueDate(dueDate) || (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toLocaleDateString("en-AU");
      })();

      const items: RequestedDocLine[] = reviewGroups.flatMap((group) =>
        group.items.map((item) => ({
          id: `${ids.id}-${item.id}-${group.applicant.replace(/\s+/g, "-").toLowerCase()}`,
          catalogId: item.id,
          title: item.title,
          description: item.description,
          applicant: group.applicant,
          status: "Awaiting" as const,
        })),
      );
      const portal = matchPortalForApplicant(
        applicant1.trim() || requestedFrom,
        email.trim() || undefined,
      );
      const created = upsertDocumentRequest({
        id: ids.id,
        requestId: ids.requestId,
        title,
        requestedFrom: requestedFrom || "Client",
        relatedTo: portal
          ? `${portal.clientName}: ${applicant1.trim() || "Client"}`
          : `Lead: ${applicant1.trim() || "Client"}`,
        documentType,
        status: "Requested",
        dueDate: due,
        reminderDate: reminderDate
          ? formatRequestDateTime(reminderDate)
          : undefined,
        repeat: repeatEnabled ? formatCustomReminder(customReminder) : undefined,
        notifyBy,
        requestedBy: sendOnBehalfOf || DOCUMENT_REQUEST_BROKERS[0],
        requestedDate: started,
        lastUpdated: started,
        progress: 0,
        notes: notes.trim() || undefined,
        items,
        timeline: [
          {
            id: `${ids.id}-t-created`,
            at: started,
            by: sendOnBehalfOf || DOCUMENT_REQUEST_BROKERS[0],
            label: "Request created",
            detail: `Invitation sent to ${requestedFrom || "client"}. Visible in the client portal.`,
          },
          ...(reminderDate
            ? [
                {
                  id: `${ids.id}-t-reminder`,
                  at: formatRequestDateTime(reminderDate),
                  by: sendOnBehalfOf || DOCUMENT_REQUEST_BROKERS[0],
                  label: "Reminder scheduled",
                  detail: [
                    formatRequestDateTime(reminderDate),
                    repeatEnabled
                      ? formatCustomReminder(customReminder)
                      : "Does not repeat",
                    notifyBy.length ? `Notify by ${notifyBy.join(", ")}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · "),
                },
              ]
            : []),
        ],
        messages: notes.trim()
          ? [
              {
                id: `${ids.id}-m-note`,
                at: started,
                by: sendOnBehalfOf || DOCUMENT_REQUEST_BROKERS[0],
                from: "team",
                text: notes.trim(),
              },
            ]
          : [],
        clientName: portal?.clientName,
        clientEmail: email.trim() || portal?.primaryContactEmail,
      });
      const remote = await tryCrmDocumentRequest(() =>
        createCrmDocumentRequest(toCreateDocumentRequestBody(created)),
      );
      if (remote) {
        if (remote.id !== created.id) removeDocumentRequest(created.id);
        upsertDocumentRequest({
          ...created,
          ...remote,
          items: created.items,
          timeline: created.timeline,
          messages: created.messages,
        });
        router.push(`/documents/requests/${remote.id}?created=1`);
        return;
      }
      router.push(`/documents/requests/${created.id}?created=1`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("absolute inset-0 flex flex-col overflow-hidden", PAGE_GRADIENT)}>
      <div className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6 2xl:px-8">
        <h1 className="text-base font-semibold text-slate-900">
          Create Document Request
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={goNext}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
          >
            {step === 3 ? (saving ? "Creating…" : "Create") : "Next"}
          </button>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col overflow-hidden px-4 pb-4 sm:px-6 2xl:px-8">
        <Stepper step={step} />

        <div
          className={cn(
            "mt-4 grid min-h-0 flex-1 grid-cols-1 items-stretch gap-6 overflow-hidden",
            step === 3
              ? "lg:grid-cols-1"
              : "lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)]",
          )}
        >
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-col",
              step === 3 ? "overflow-y-auto" : "overflow-hidden",
            )}
          >
            {step === 1 ? (
              <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(90,50,163,0.08)] sm:p-6">
                <label className="block text-[13px] font-medium text-slate-700">
                  Send on behalf of:
                </label>
                <div className="relative mt-2">
                  <select
                    value={sendOnBehalfOf}
                    onChange={(e) => {
                      setSendOnBehalfOf(e.target.value);
                      if (errors.sendOnBehalfOf) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.sendOnBehalfOf;
                          return next;
                        });
                      }
                    }}
                    className={cn(
                      "h-11 w-full appearance-none rounded-lg border bg-white px-3.5 pr-10 text-[14px] text-slate-800 outline-none focus:ring-2",
                      errors.sendOnBehalfOf
                        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100"
                        : "border-slate-200 focus:border-[#5A32A3]/45 focus:ring-[#5A32A3]/12",
                      !sendOnBehalfOf && "text-slate-400",
                    )}
                  >
                    {senderOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                {errors.sendOnBehalfOf ? (
                  <p className="mt-1 text-[12px] font-medium text-rose-500">
                    {errors.sendOnBehalfOf}
                  </p>
                ) : null}

                <div className="mt-5">
                  <RequestApplicantsSection
                    applicants={applicants}
                    onChange={(next) => {
                      setApplicants(next);
                      if (errors.applicants) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.applicants;
                          return copy;
                        });
                      }
                    }}
                    error={errors.applicants}
                  />
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(90,50,163,0.08)] sm:p-6">
                <RequestDocumentsPicker
                  applicant1={applicant1}
                  applicant2={applicant2}
                  twoApplicants={applicantCount === "2" && !skipCoApplicant}
                  selected={selectedByApplicant}
                  onChange={setSelectedByApplicant}
                  extras={extraDocs}
                  onExtrasChange={setExtraDocs}
                  descriptionOverrides={docDescOverrides}
                  onDescriptionOverridesChange={setDocDescOverrides}
                  template={template}
                  onTemplateChange={setTemplate}
                  error={errors.docs}
                />
                <div className="mt-4">
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">
                    Notes for the client
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything they should know before uploading…"
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12"
                  />
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <RequestQuickReview
                clientName={requestedFrom || "Client"}
                sendOnBehalfOf={sendOnBehalfOf}
                requestTitle={requestTitle}
                onRequestTitleChange={(value) => {
                  setTitleEdited(true);
                  setRequestTitle(value);
                }}
                groups={reviewGroups}
                dueDate={
                  dueDate ? formatRequestDateTime(dueDate) : "Not set"
                }
                reminderDate={
                  reminderDate
                    ? formatRequestDateTime(reminderDate)
                    : "Not set"
                }
                repeatLabel={
                  repeatEnabled
                    ? formatCustomReminder(customReminder)
                    : "Off"
                }
                notifyBy={notifyBy}
                notes={notes}
                onNotesChange={setNotes}
              />
            ) : null}
          </div>

          {step !== 3 ? (
            <aside className="flex min-h-0 flex-col overflow-hidden">
              <RequestScheduleCard
                className="flex-1 overflow-y-auto"
                dueDate={dueDate}
                reminderDate={reminderDate}
                customReminder={customReminder}
                repeatEnabled={repeatEnabled}
                notifyBy={notifyBy}
                errors={{
                  dueDate: errors.dueDate,
                  reminderDate: errors.reminderDate,
                }}
                onDueDateChange={handleDueDateChange}
                onReminderDateChange={handleReminderDateChange}
                onCustomReminderChange={setCustomReminder}
                onRepeatEnabledChange={setRepeatEnabled}
                onNotifyByChange={setNotifyBy}
              />
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
