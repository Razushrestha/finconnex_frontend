"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CircleHelp,
  House,
  Infinity,
  Plus,
  RefreshCw,
  Search,
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
  upsertDocumentRequest,
  type DocumentRequestType,
} from "@/lib/documents/requests/types";
import { RELATED_RECORD_OPTIONS } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";
import {
  REQUEST_DOC_CATEGORIES,
  type RequestDocItem,
} from "@/lib/documents/requests/catalog";
import { RequestDocumentsPicker } from "@/components/documents/requests/RequestDocumentsPicker";
import { PropertyDetailsEditor, emptyPropertyDetails, type PropertyDetails } from "@/components/documents/requests/PropertyDetailsEditor";

interface CreateDocumentRequestFormProps {
  layoutId: string;
  redirect: boolean;
}

type LoanType = "Home loan" | "Asset / Other";
type HomePurpose = "Property purchase" | "Refinance";
type AssetPurpose = "Personal" | "Business";
type Purpose = HomePurpose | AssetPurpose;
type ApplicantCount = "1" | "2";

const HOME_PURPOSES = ["Property purchase", "Refinance"] as const;
const ASSET_PURPOSES = ["Personal", "Business"] as const;

const PAGE_GRADIENT =
  "bg-[linear-gradient(90deg,#efe8f6_0%,#f5eef2_48%,#f8e6dc_100%)]";

const STEPS = [
  { id: 1, label: "Document Request details" },
  { id: 2, label: "Pre-fill client details" },
  { id: 3, label: "Documents" },
] as const;

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="w-full">
      <p className="mb-2 text-[13px] font-medium text-slate-800">{label}</p>
      <div className="grid w-full grid-cols-2 overflow-hidden rounded-lg border border-slate-200">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "flex h-11 items-center justify-center px-2 text-center text-[14px] leading-none font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-[#EDE4FB] text-slate-900"
                  : "bg-[#f7f6f8] text-slate-600 hover:bg-slate-100",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ApplicantSearchRow({
  label,
  showHelp,
  value,
  error,
  matches,
  showResults,
  onChange,
  onFocus,
  onSelect,
  onAdd,
}: {
  label: string;
  showHelp?: boolean;
  value: string;
  error?: string;
  matches: { kind: string; name: string }[];
  showResults: boolean;
  onChange: (v: string) => void;
  onFocus: () => void;
  onSelect: (name: string) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <h3 className="text-[15px] font-bold text-slate-900">{label}</h3>
        {showHelp ? (
          <CircleHelp className="h-3.5 w-3.5 text-slate-400" />
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            placeholder="Search for existing Middle client"
            className={cn(
              "h-11 w-full rounded-lg border bg-slate-50 pr-10 pl-3.5 text-[14px] text-slate-800 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2",
              error
                ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100"
                : "border-slate-200 focus:border-[#5A32A3]/40 focus:ring-[#5A32A3]/12",
            )}
          />
          <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          {showResults && matches.length > 0 ? (
            <div className="absolute inset-x-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {matches.map((r) => (
                <button
                  key={`${r.kind}-${r.name}`}
                  type="button"
                  onClick={() => onSelect(r.name)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-[#F3ECFB]"
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-[11px] text-slate-400">{r.kind}</span>
                </button>
              ))}
            </div>
          ) : null}
          {error ? (
            <p className="mt-1 text-[12px] font-medium text-rose-500">{error}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-dashed border-[#5A32A3] bg-white px-4 text-[14px] font-medium text-slate-900 hover:bg-[#F3ECFB]"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5A32A3] text-white">
            <Plus className="h-3 w-3" strokeWidth={3} />
          </span>
          Add client
        </button>
      </div>
    </div>
  );
}

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
    <ol className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-2 px-2">
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
    main.style.backgroundColor = "transparent";
    main.style.backgroundImage =
      "linear-gradient(90deg, #efe8f6 0%, #f5eef2 48%, #f8e6dc 100%)";
    return () => {
      main.style.backgroundColor = previousColor;
      main.style.backgroundImage = previousImage;
    };
  }, []);

  const [sendOnBehalfOf, setSendOnBehalfOf] = useState("");
  const [loanType, setLoanType] = useState<LoanType>("Home loan");
  const [purpose, setPurpose] = useState<Purpose>("Refinance");
  const [applicantCount, setApplicantCount] = useState<ApplicantCount>("1");
  const [skipCoApplicant, setSkipCoApplicant] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientSearch2, setClientSearch2] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);
  const [showClientResults2, setShowClientResults2] = useState(false);
  const [activeApplicantSlot, setActiveApplicantSlot] = useState<1 | 2>(1);

  const [applicant1, setApplicant1] = useState("");
  const [applicant2, setApplicant2] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [email2, setEmail2] = useState("");
  const [phone2, setPhone2] = useState("");
  const [existingAccount1, setExistingAccount1] = useState(false);
  const [existingAccount2, setExistingAccount2] = useState(false);
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
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const requestedFrom = useMemo(() => {
    const names = [applicant1.trim(), applicant2.trim()].filter(Boolean);
    return names.join(", ");
  }, [applicant1, applicant2]);

  const clientMatches = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return [];
    return RELATED_RECORD_OPTIONS.filter(
      (r) =>
        (r.kind === "Lead" || r.kind === "Contact") &&
        r.name.toLowerCase().includes(q),
    ).slice(0, 6);
  }, [clientSearch]);

  const clientMatches2 = useMemo(() => {
    const q = clientSearch2.trim().toLowerCase();
    if (!q) return [];
    return RELATED_RECORD_OPTIONS.filter(
      (r) =>
        (r.kind === "Lead" || r.kind === "Contact") &&
        r.name.toLowerCase().includes(q) &&
        r.name !== applicant1,
    ).slice(0, 6);
  }, [clientSearch2, applicant1]);

  function selectExistingClient(name: string, slot: 1 | 2 = 1) {
    const contact = contactFromName(name);
    if (slot === 1) {
      setApplicant1(name);
      setClientSearch(name);
      setEmail((prev) => prev || contact.email);
      setPhone((prev) => prev || contact.phone);
      setExistingAccount1(true);
      setShowClientResults(false);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.clientSearch;
        return next;
      });
    } else {
      setApplicant2(name);
      setClientSearch2(name);
      setEmail2((prev) => prev || contact.email);
      setPhone2((prev) => prev || contact.phone);
      setExistingAccount2(true);
      setShowClientResults2(false);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.clientSearch2;
        return next;
      });
    }
    setActiveApplicantSlot(slot);
    setPrefillTab("applicant");
    setOpenPrefill(null);
    setStep(2);
  }

  function startAddClient(slot: 1 | 2 = 1) {
    setActiveApplicantSlot(slot);
    if (slot === 1) {
      setApplicant1(clientSearch.trim());
      setExistingAccount1(false);
      setShowClientResults(false);
    } else {
      setApplicant2(clientSearch2.trim());
      setExistingAccount2(false);
      setShowClientResults2(false);
    }
    setPrefillTab("applicant");
    setOpenPrefill(slot === 1 ? "applicant-1" : "applicant-2");
    setStep(2);
  }

  function setLoanTypeAndPurpose(nextLoan: LoanType) {
    setLoanType(nextLoan);
    setPurpose(nextLoan === "Home loan" ? "Refinance" : "Business");
  }

  function validateStep(current: number) {
    const next: Record<string, string> = {};
    if (current === 1) {
      if (!sendOnBehalfOf.trim()) next.sendOnBehalfOf = "Provide a name";
      if (!clientSearch.trim() && !applicant1.trim()) {
        next.clientSearch = "Search or add a client to continue";
      }
      if (
        applicantCount === "2" &&
        !skipCoApplicant &&
        !clientSearch2.trim() &&
        !applicant2.trim()
      ) {
        next.clientSearch2 = "Search or add the secondary applicant";
      }
    }
    if (current === 2) {
      // Optional pre-fill — names are already captured on step 1.
    }
    if (current === 3) {
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

  function handleCreate() {
    if (!validateStep(3)) return;
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
      const title = `${purpose} pack — ${requestedFrom || "client"}`;
      let due = "";
      if (dueDate) {
        const [y, m, d] = dueDate.split("-");
        due = `${d}/${m}/${y}`;
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        due = d.toLocaleDateString("en-AU");
      }

      const created = upsertDocumentRequest({
        id: ids.id,
        requestId: ids.requestId,
        title,
        requestedFrom: requestedFrom || "Client",
        relatedTo: `Lead: ${applicant1.trim() || "Client"}`,
        documentType,
        status: "Requested",
        dueDate: due,
        requestedBy: sendOnBehalfOf || DOCUMENT_REQUEST_BROKERS[0],
        requestedDate: started,
        lastUpdated: started,
        progress: 0,
        notes:
          [
            `${loanType} · ${purpose} · ${applicantCount} applicant${applicantCount === "2" ? "s" : ""}`,
            email ? `Email: ${email}` : "",
            phone ? `Phone: ${phone}` : "",
            email2 ? `Email 2: ${email2}` : "",
            phone2 ? `Phone 2: ${phone2}` : "",
            propertyDetails.address
              ? `Property: ${propertyDetails.address}`
              : "",
            propertyDetails.value
              ? `Est. value: ${propertyDetails.value}`
              : "",
            propertyDetails.type ? `Type: ${propertyDetails.type}` : "",
            propertyDetails.usage ? `Usage: ${propertyDetails.usage}` : "",
            assetSummary ? `Assets: ${assetSummary}` : "",
            Object.entries(hemValues)
              .filter(([, v]) => v.trim())
              .map(([k, v]) => `HEM ${k}: $${v}/mo`)
              .join("; ") || "",
            Object.entries(nonHemValues)
              .filter(([, v]) => v.trim())
              .map(([k, v]) => `Non-HEM ${k}: $${v}/mo`)
              .join("; ") || "",
            (() => {
              const catalog = REQUEST_DOC_CATEGORIES.flatMap((c) => [
                ...c.items,
                ...(extraDocs[c.id] ?? []),
              ]);
              const titleOf = (id: string) =>
                catalog.find((i) => i.id === id)?.title ?? id;
              const a1 = selectedByApplicant[1].map(titleOf);
              const a2 =
                applicantCount === "2" && !skipCoApplicant
                  ? selectedByApplicant[2].map(titleOf)
                  : [];
              return [
                a1.length ? `Docs (${applicant1.trim() || "Applicant"}): ${a1.join(", ")}` : "",
                a2.length ? `Docs (${applicant2.trim() || "Applicant 2"}): ${a2.join(", ")}` : "",
              ]
                .filter(Boolean)
                .join("\n");
            })(),
            notes.trim(),
          ]
            .filter(Boolean)
            .join("\n") || undefined,
      });
      router.push(`/documents/requests/${created.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("relative min-h-full w-full", PAGE_GRADIENT)}>
      <div className="mx-auto flex w-full max-w-[720px] flex-col px-4 pb-28 pt-6 sm:px-6">
        <Stepper step={step} />

        {step === 1 ? (
          <section className="mt-8 rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(90,50,163,0.08)] sm:p-8">
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
              Create Document Request
            </h1>
            <label className="mt-6 block text-[13px] font-medium text-slate-700">
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
                <option value="">Select an option</option>
                {DOCUMENT_REQUEST_BROKERS.map((b) => (
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

            <h2 className="mt-8 text-[16px] font-bold text-slate-900">
              General details
            </h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-slate-500">
              Who Middle works best for
              <CircleHelp className="h-3.5 w-3.5 text-slate-400" />
            </p>

            <div className="mt-5 flex w-full flex-col gap-5">
              <Segmented
                label="Loan type"
                value={loanType}
                options={["Home loan", "Asset / Other"] as const}
                onChange={setLoanTypeAndPurpose}
              />
              <Segmented
                label="Purpose"
                value={purpose}
                options={
                  loanType === "Home loan" ? HOME_PURPOSES : ASSET_PURPOSES
                }
                onChange={setPurpose}
              />
              <div>
                <Segmented
                  label="Number of applicants"
                  value={applicantCount}
                  options={["1", "2"] as const}
                  onChange={(v) => {
                    setApplicantCount(v);
                    if (v === "1") {
                      setSkipCoApplicant(false);
                      setClientSearch2("");
                      setApplicant2("");
                      setShowClientResults2(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (applicantCount === "1") {
                      setApplicantCount("2");
                      setSkipCoApplicant(true);
                    } else {
                      setSkipCoApplicant((v) => !v);
                    }
                  }}
                  className="mt-2.5 text-[13px] font-medium text-slate-700 underline underline-offset-2 hover:text-[#5A32A3]"
                >
                  {applicantCount === "2" && skipCoApplicant
                    ? "I have the co-applicant’s details"
                    : "Don’t know the co-applicant’s details?"}
                </button>
              </div>

              <div className="flex gap-3 rounded-xl bg-[#f3fbf9] px-4 py-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-400 text-white">
                  <Infinity className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-slate-900">
                    Pre-fill with Infynity data (new-to-Middle clients only)
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                    Hit ‘Add client’ and enter the exact first name, surname,
                    and email address from the Infynity client account. If
                    matched, you’ll be able to{" "}
                    <span className="font-semibold text-slate-800">
                      import the data on the next page.
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-5">
                <ApplicantSearchRow
                  label={
                    applicantCount === "2" && !skipCoApplicant
                      ? "Primary applicant"
                      : "Applicant"
                  }
                  showHelp={applicantCount === "2" && !skipCoApplicant}
                  value={clientSearch}
                  error={errors.clientSearch}
                  matches={clientMatches}
                  showResults={showClientResults}
                  onChange={(v) => {
                    setClientSearch(v);
                    setShowClientResults(true);
                    setShowClientResults2(false);
                    if (errors.clientSearch) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.clientSearch;
                        return next;
                      });
                    }
                  }}
                  onFocus={() => {
                    setShowClientResults(true);
                    setShowClientResults2(false);
                  }}
                  onSelect={(name) => selectExistingClient(name, 1)}
                  onAdd={() => {
                    if (!sendOnBehalfOf.trim()) {
                      setErrors((prev) => ({
                        ...prev,
                        sendOnBehalfOf: "Provide a name",
                      }));
                      return;
                    }
                    startAddClient(1);
                  }}
                />

                {applicantCount === "2" && !skipCoApplicant ? (
                  <ApplicantSearchRow
                    label="Secondary applicant"
                    value={clientSearch2}
                    error={errors.clientSearch2}
                    matches={clientMatches2}
                    showResults={showClientResults2}
                    onChange={(v) => {
                      setClientSearch2(v);
                      setShowClientResults2(true);
                      setShowClientResults(false);
                      if (errors.clientSearch2) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.clientSearch2;
                          return next;
                        });
                      }
                    }}
                    onFocus={() => {
                      setShowClientResults2(true);
                      setShowClientResults(false);
                    }}
                    onSelect={(name) => selectExistingClient(name, 2)}
                    onAdd={() => {
                      if (!sendOnBehalfOf.trim()) {
                        setErrors((prev) => ({
                          ...prev,
                          sendOnBehalfOf: "Provide a name",
                        }));
                        return;
                      }
                      startAddClient(2);
                    }}
                  />
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="mt-5">
            <h2 className="text-[18px] font-bold text-slate-900">
              Pre-fill client details{" "}
              <span className="font-semibold text-slate-700">(optional)</span>
            </h2>
            <p className="mt-1 text-[13px] text-slate-500">
              Save your clients time by completing any information you already
              know about them.{" "}
              <button
                type="button"
                className="font-medium text-slate-700 underline underline-offset-2 hover:text-[#5A32A3]"
              >
                Learn more
              </button>
            </p>

            <div className="mt-4">
              <div className="flex gap-0.5">
                {PREFILL_TABS.map((tab) => {
                  const active = prefillTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setPrefillTab(tab.id);
                        setOpenPrefill(null);
                      }}
                      className={cn(
                        "relative z-10 shrink-0 rounded-t-lg px-3.5 py-2 text-[13px] font-medium",
                        active
                          ? "bg-white text-[#5A32A3] shadow-[0_-1px_3px_rgba(15,23,42,0.06)]"
                          : "bg-transparent text-slate-700 hover:text-slate-900",
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="-mt-px rounded-xl rounded-tl-none border border-slate-200/70 bg-white px-3.5 py-3 shadow-sm">
                {prefillTab === "property" ? (
                  openPrefill === "property" ? (
                    <PropertyDetailsEditor
                      title={
                        loanType === "Home loan"
                          ? purpose === "Refinance"
                            ? "Refinance property"
                            : "Purchase property"
                          : "Asset / other"
                      }
                      value={propertyDetails}
                      onChange={setPropertyDetails}
                      onCancel={() => {
                        setPropertyDetails(propertyDraft);
                        setOpenPrefill(null);
                      }}
                      onUpdate={() => setOpenPrefill(null)}
                    />
                  ) : (
                    <PrefillRow
                      icon={
                        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
                          <House className="h-4 w-4" strokeWidth={2} />
                          {purpose === "Refinance" ? (
                            <span className="absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-white">
                              <RefreshCw className="h-2 w-2" strokeWidth={3} />
                            </span>
                          ) : null}
                        </span>
                      }
                      label={
                        loanType === "Home loan"
                          ? purpose === "Refinance"
                            ? "Refinance property"
                            : "Purchase property"
                          : "Asset / other"
                      }
                      open={false}
                      onToggle={() => {
                        setPropertyDraft(propertyDetails);
                        setOpenPrefill("property");
                      }}
                    />
                  )
                ) : null}

                {prefillTab === "applicant" ? (
                  <div className="space-y-4">
                    {existingAccount1 && applicant1.trim() ? (
                      <ApplicantProfile
                        name={applicant1}
                        email={email}
                        phone={phone}
                        existing
                      />
                    ) : (
                      <PrefillRow
                        icon={
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
                            <UserRound className="h-4 w-4" />
                          </span>
                        }
                        label={
                          applicant1.trim() ||
                          (applicantCount === "2" && !skipCoApplicant
                            ? "Primary applicant"
                            : "Applicant")
                        }
                        open={openPrefill === "applicant-1"}
                        onToggle={() =>
                          setOpenPrefill((v) =>
                            v === "applicant-1" ? null : "applicant-1",
                          )
                        }
                      >
                        <div className="grid gap-3 sm:grid-cols-3">
                          <Field
                            label="Full name"
                            value={applicant1}
                            onChange={setApplicant1}
                            placeholder="Applicant name"
                          />
                          <Field
                            label="Email"
                            type="email"
                            value={email}
                            onChange={setEmail}
                            placeholder="client@email.com"
                          />
                          <Field
                            label="Mobile"
                            type="tel"
                            value={phone}
                            onChange={setPhone}
                            placeholder="+61 …"
                          />
                        </div>
                      </PrefillRow>
                    )}

                    {applicantCount === "2" && !skipCoApplicant ? (
                      existingAccount2 && applicant2.trim() ? (
                        <ApplicantProfile
                          name={applicant2}
                          email={email2}
                          phone={phone2}
                          existing
                        />
                      ) : (
                        <PrefillRow
                          icon={
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
                              <UserRound className="h-4 w-4" />
                            </span>
                          }
                          label={applicant2.trim() || "Secondary applicant"}
                          open={openPrefill === "applicant-2"}
                          onToggle={() =>
                            setOpenPrefill((v) =>
                              v === "applicant-2" ? null : "applicant-2",
                            )
                          }
                        >
                          <div className="grid gap-3 sm:grid-cols-3">
                            <Field
                              label="Full name"
                              value={applicant2}
                              onChange={setApplicant2}
                              placeholder="Applicant name"
                            />
                            <Field
                              label="Email"
                              type="email"
                              value={email2}
                              onChange={setEmail2}
                              placeholder="client@email.com"
                            />
                            <Field
                              label="Mobile"
                              type="tel"
                              value={phone2}
                              onChange={setPhone2}
                              placeholder="+61 …"
                            />
                          </div>
                        </PrefillRow>
                      )
                    ) : null}

                    {applicantCount === "2" && skipCoApplicant ? (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                        Co-applicant details will be collected later from the
                        client.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {prefillTab === "assets" ? (
                  existingAccount1 || existingAccount2 ? (
                    <PrefillUnavailable
                      title="Assets pre-fill unavailable"
                      body="Assets can't be pre-filled if an applicant has an existing Middle account. We'll pre-fill asset details from their most recent Discovery Journey."
                    />
                  ) : (
                    <PrefillRow
                      icon={
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
                          <Wallet className="h-4 w-4" />
                        </span>
                      }
                      label="Assets"
                      open={openPrefill === "assets"}
                      onToggle={() =>
                        setOpenPrefill((v) =>
                          v === "assets" ? null : "assets",
                        )
                      }
                    >
                      <Field
                        label="Known assets"
                        value={assetSummary}
                        onChange={setAssetSummary}
                        placeholder="e.g. Savings, vehicle, super"
                      />
                    </PrefillRow>
                  )
                ) : null}

                {prefillTab === "expenses" ? (
                  <div className="space-y-2">
                    {openPrefill === "hem" ? (
                      <ExpenseEditorCard
                        icon={
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
                            <ShoppingCart className="h-4 w-4" />
                          </span>
                        }
                        title="HEM comparable expenses"
                        categories={HEM_CATEGORIES}
                        values={hemValues}
                        onChange={(cat, v) =>
                          setHemValues((prev) => ({ ...prev, [cat]: v }))
                        }
                        onClear={() => setHemValues(emptyHemValues())}
                        onCancel={() => {
                          setHemValues(hemDraft);
                          setOpenPrefill(null);
                        }}
                        onUpdate={() => setOpenPrefill(null)}
                      />
                    ) : (
                      <PrefillRow
                        icon={
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
                            <ShoppingCart className="h-4 w-4" />
                          </span>
                        }
                        label="HEM comparable expenses"
                        open={false}
                        onToggle={() => {
                          setHemDraft(hemValues);
                          setOpenPrefill("hem");
                        }}
                      />
                    )}
                    {openPrefill === "non-hem" ? (
                      <ExpenseEditorCard
                        icon={
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
                            <Banknote className="h-4 w-4" />
                          </span>
                        }
                        title="Non HEM expenses"
                        categories={NON_HEM_CATEGORIES}
                        values={nonHemValues}
                        onChange={(cat, v) =>
                          setNonHemValues((prev) => ({ ...prev, [cat]: v }))
                        }
                        onClear={() => setNonHemValues(emptyNonHemValues())}
                        onCancel={() => {
                          setNonHemValues(nonHemDraft);
                          setOpenPrefill(null);
                        }}
                        onUpdate={() => setOpenPrefill(null)}
                      />
                    ) : (
                      <PrefillRow
                        icon={
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
                            <Banknote className="h-4 w-4" />
                          </span>
                        }
                        label="Non HEM expenses"
                        open={false}
                        onToggle={() => {
                          setNonHemDraft(nonHemValues);
                          setOpenPrefill("non-hem");
                        }}
                      />
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <>
            <RequestDocumentsPicker
              applicant1={applicant1}
              applicant2={applicant2}
              twoApplicants={applicantCount === "2" && !skipCoApplicant}
              selected={selectedByApplicant}
              onChange={setSelectedByApplicant}
              extras={extraDocs}
              onExtrasChange={setExtraDocs}
              error={errors.docs}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">
                  Due date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12"
                />
              </div>
              <div className="sm:col-span-2">
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
          </>
        ) : null}
      </div>

      <div className={cn("fixed inset-x-0 bottom-0 z-20", PAGE_GRADIENT)}>
        <div className="mx-auto flex w-full max-w-[720px] items-center justify-end gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            className="text-[14px] font-medium text-slate-700 hover:text-slate-900"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={goNext}
            className="inline-flex h-10 min-w-[88px] items-center justify-center rounded-lg bg-slate-900 px-6 text-[14px] font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {step === 3 ? (saving ? "Creating…" : "Create") : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
