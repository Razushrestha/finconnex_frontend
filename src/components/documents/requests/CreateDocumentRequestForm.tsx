"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  FileText,
  Search,
  X,
} from "lucide-react";
import {
  nextDocumentRequestIds,
  removeDocumentRequest,
  upsertDocumentRequest,
  type DocumentRequestType,
  type RequestedDocLine,
} from "@/lib/documents/requests/types";
import {
  createCrmDocumentRequest,
  sendCrmDocumentRequest,
  toCreateDocumentRequestBody,
  tryCrmDocumentRequest,
} from "@/lib/documents/requests/api";
import { sendDocumentRequestInviteEmail } from "@/lib/documents/requests/invite-email";
import { notify } from "@/lib/notify/toast";
import { matchPortalForApplicant } from "@/lib/documents/requests/pack";
import { getRulesActor, defaultActorName } from "@/lib/rules/actor";
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
  formatRequestDateTime,
  formatRequestDueDate,
  formatRequestRepeat,
  parseDatetimeLocal,
  toDatetimeLocalValue,
  validateRequestSchedule,
} from "@/components/documents/requests/RequestScheduleCard";
import { RequestQuickReview } from "@/components/documents/requests/RequestQuickReview";
import { defaultReminderRepeatRule } from "@/lib/tasks/repeat-reminder";
import { turnOffReminderRepeat } from "@/components/activities/tasks/ReminderSettingsCard";
import type { NotificationMethod } from "@/lib/reminders/types";
import { readCatalogDescriptionOverrides } from "@/lib/documents/requests/catalog";
import {
  leadDocumentRequestPeople,
  type DocumentRequestPersonSeed,
} from "@/lib/leads/convert-actions";
import { findLeadById } from "@/lib/leads/store";
import { isUuid } from "@/lib/activity-timeline/auth";
import { mergeCrmContactsIntoBoard } from "@/lib/contacts/store";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  loadAssignableOwners,
  type AssignableOwner,
} from "@/lib/users/assignable";
import { FINANCE_PRIMARY_BUTTON_SM } from "@/components/finance/buttonStyles";

type SenderMenuPlacement = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
};

/**
 * Teammate picker for "Send on behalf of", searchable by name or email. The
 * list is drawn at the end of <body> so a card that clips its overflow cannot
 * cut it off, and opens upwards when there is not room below.
 */
export function SenderOnBehalfField({
  value,
  options,
  invalid,
  onChange,
}: {
  value: string;
  options: AssignableOwner[];
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [menuAt, setMenuAt] = useState<SenderMenuPlacement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const isSelected = (row: AssignableOwner) =>
    row.id === value ||
    row.name === value ||
    assignableOwnerLabel(row) === value;
  const selected = options.find(isSelected) ?? null;
  const label = selected
    ? assignableOwnerLabel(selected)
    : value.trim() || "Select teammate";

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q),
    );
  }, [options, query]);

  function place() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 4;
    const below = window.innerHeight - rect.bottom - gap - 8;
    const above = rect.top - gap - 8;
    const base = { left: rect.left, width: rect.width };
    if (below >= 240 || below >= above) {
      setMenuAt({ ...base, top: rect.bottom + gap, maxHeight: Math.max(160, below) });
    } else {
      setMenuAt({
        ...base,
        bottom: window.innerHeight - rect.top + gap,
        maxHeight: Math.max(160, above),
      });
    }
  }

  function close() {
    setOpen(false);
    setQuery("");
    setMenuAt(null);
  }

  function openMenu() {
    place();
    setActive(Math.max(0, options.findIndex(isSelected)));
    setOpen(true);
  }

  function pick(row: AssignableOwner) {
    onChange(row.name);
    close();
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
      setQuery("");
      setMenuAt(null);
    }
    function onMove(event: Event) {
      if (menuRef.current?.contains(event.target as Node)) return;
      place();
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  // Keep the highlighted row in view while arrowing through the list.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  return (
    <div className="relative mb-6">
      <label className="block text-[13px] font-medium text-slate-700">
        Send on behalf of:
      </label>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu())}
        className={cn(
          "relative mt-2 flex h-11 w-full items-center rounded-lg border bg-white px-3.5 pr-10 text-left text-[14px] outline-none focus:ring-2",
          invalid
            ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100"
            : "border-slate-200 focus:border-[var(--brand-primary)]/45 focus:ring-[var(--brand-primary)]/12",
          !selected && !value.trim() ? "text-slate-400" : "text-slate-800",
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </button>
      {open && menuAt && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                left: menuAt.left,
                width: menuAt.width,
                top: menuAt.top,
                bottom: menuAt.bottom,
                maxHeight: Math.min(menuAt.maxHeight, 320),
              }}
              className="z-[1000] flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            >
              <div className="relative border-b border-slate-100 p-2">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(0);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      close();
                      triggerRef.current?.focus();
                    } else if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setActive((i) => Math.min(i + 1, matches.length - 1));
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setActive((i) => Math.max(i - 1, 0));
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      const row = matches[active] ?? matches[0];
                      if (row) pick(row);
                    }
                  }}
                  placeholder="Search teammates by name or email"
                  aria-label="Search teammates"
                  className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pr-3 pl-8 text-[13px] text-slate-800 outline-none focus:border-slate-300"
                />
              </div>
              <ul
                ref={listRef}
                role="listbox"
                aria-label="Teammates"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
              >
                {options.length === 0 ? (
                  <li className="px-3 py-2 text-[13px] text-slate-400">
                    No teammates loaded
                  </li>
                ) : matches.length === 0 ? (
                  <li className="px-3 py-2 text-[13px] text-slate-400">
                    No teammate matches “{query}”
                  </li>
                ) : (
                  matches.map((row, index) => {
                    const itemLabel = assignableOwnerLabel(row);
                    const current = isSelected(row);
                    return (
                      <li
                        key={row.id || itemLabel}
                        role="option"
                        aria-selected={current}
                        data-index={index}
                      >
                        <button
                          type="button"
                          onClick={() => pick(row)}
                          onMouseEnter={() => setActive(index)}
                          className={cn(
                            "flex w-full px-3 py-2 text-left text-[13px]",
                            current
                              ? "font-semibold text-[var(--brand-primary)]"
                              : "text-slate-800",
                            index === active && "bg-[var(--brand-primary-faint)]",
                          )}
                        >
                          <span className="min-w-0 truncate">{itemLabel}</span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

interface CreateDocumentRequestFormProps {
  layoutId: string;
  redirect: boolean;
  relatedId?: string;
  relatedKind?: string;
  relatedName?: string;
  seedApplicants?: DocumentRequestPersonSeed[];
}

function toRequestApplicants(
  people: DocumentRequestPersonSeed[],
): RequestApplicant[] {
  const rows = people.slice(0, 2);
  if (!rows.length) return [emptyApplicant()];
  return rows.map((person, index) => ({
    id: `ap-lead-${index + 1}`,
    source: "lead" as const,
    name: person.name,
    email: person.email,
    deliverVia: "email" as const,
  }));
}

function applicantParentIds(row: RequestApplicant | undefined): {
  leadId?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
} {
  const id = row?.recordId ?? "";
  if (!isUuid(id)) return {};
  if (row?.source === "lead") return { leadId: id };
  if (row?.source === "deal") return { dealId: id };
  if (row?.source === "organization") return { companyId: id };
  return {};
}

/** A document request is always sent to a CRM contact. Leads, deals, and companies stay linked as the related record. */
export async function resolveApplicantContactId(
  row: RequestApplicant | undefined,
): Promise<string> {
  const email = row?.email.trim().toLowerCase() ?? "";
  const { createCrmContact, isCrmContactId, listCrmContacts } = await import(
    "@/lib/contacts/api"
  );

  const matchByEmail = async () => {
    if (!email) return "";
    const rows = await listCrmContacts({ search: email, limit: 50 });
    const match = rows.find(
      (item) => item.contact.email.trim().toLowerCase() === email,
    );
    return match && isCrmContactId(match.contact.id) ? match.contact.id : "";
  };

  const existing = await matchByEmail();
  if (existing) return existing;

  if (
    row?.source === "contact" &&
    row.recordId &&
    isCrmContactId(row.recordId)
  ) {
    return row.recordId;
  }

  const parts = (row?.name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Client";
  const lastName = parts.slice(1).join(" ") || firstName;
  try {
    const created = await createCrmContact({
      firstName,
      lastName,
      email: email || `${Date.now()}@added.finconnex.local`,
      status: "Active",
      owner: getRulesActor().name || "",
    });
    if (created && isCrmContactId(created.contact.id)) {
      mergeCrmContactsIntoBoard([created]);
      return created.contact.id;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/409|already exists|conflict|emailExists/i.test(message)) throw err;
    const again = await matchByEmail();
    if (again) return again;
    throw err;
  }
  throw new Error(
    "Pick or add a live CRM contact before creating this document request.",
  );
}

function resolvePrefill(props: CreateDocumentRequestFormProps): {
  applicants: RequestApplicant[];
  phones: [string, string];
  relatedKind: string;
  relatedName: string;
} {
  const fromUrl = (props.seedApplicants ?? []).slice(0, 2);
  const live =
    !fromUrl.length && props.relatedId
      ? findLeadById(props.relatedId)?.card
      : null;
  const people = fromUrl.length
    ? fromUrl
    : live
      ? leadDocumentRequestPeople(live)
      : [];
  return {
    applicants: toRequestApplicants(people),
    phones: [people[0]?.phone ?? "", people[1]?.phone ?? ""],
    relatedKind: props.relatedKind?.trim() || (live ? "Lead" : ""),
    relatedName: props.relatedName?.trim() || live?.name || "",
  };
}

type LoanType = "Home loan" | "Asset / Other";
type HomePurpose = "Property purchase" | "Refinance";
type AssetPurpose = "Personal" | "Business";
type Purpose = HomePurpose | AssetPurpose;
type ApplicantCount = "1" | "2";

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
        className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-[4.5rem] pl-7 text-[13px] text-slate-800 outline-none focus:border-[var(--brand-primary)]/45 focus:ring-2 focus:ring-[var(--brand-primary)]/12"
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
          className={cn(FINANCE_PRIMARY_BUTTON_SM, "h-8 shrink-0 rounded-md text-[13px]")}
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
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[var(--brand-primary)]/45 focus:ring-2 focus:ring-[var(--brand-primary)]/12"
      />
    </div>
  );
}

export function Stepper({ step }: { step: number }) {
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
                    ? "bg-[var(--brand-primary)] text-white"
                    : "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]",
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
              <div className="mx-3 h-px min-w-[24px] flex-1 border-t border-dashed border-[var(--brand-primary)]/45" />
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
  relatedId,
  relatedKind,
  relatedName,
  seedApplicants,
}: CreateDocumentRequestFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [prefill] = useState(() =>
    resolvePrefill({
      layoutId: _layoutId,
      redirect: _redirect,
      relatedId,
      relatedKind,
      relatedName,
      seedApplicants,
    }),
  );

  const [sendOnBehalfOf, setSendOnBehalfOf] = useState("");
  const [senders, setSenders] = useState<AssignableOwner[]>([]);

  useEffect(() => {
    void loadAssignableOwners().then((rows) => {
      setSenders(rows);
      setSendOnBehalfOf((current) => {
        if (
          current &&
          rows.some(
            (row) =>
              row.name === current ||
              row.id === current ||
              assignableOwnerLabel(row) === current,
          )
        ) {
          return current;
        }
        const actor = getRulesActor().name.trim();
        const match =
          rows.find((row) => row.name === actor) ||
          rows.find((row) => row.id === defaultAssignableOwnerId(rows));
        return match?.name || current || actor;
      });
    });
  }, []);
  const loanType: LoanType = "Home loan";
  const purpose: Purpose = "Property purchase";
  const [applicants, setApplicants] = useState<RequestApplicant[]>(
    () => prefill.applicants,
  );
  const [applicantCount, setApplicantCount] = useState<ApplicantCount>("1");
  const [skipCoApplicant, setSkipCoApplicant] = useState(true);
  const [clientSearch, setClientSearch] = useState("");
  const [clientSearch2, setClientSearch2] = useState("");

  const [applicant1, setApplicant1] = useState("");
  const [applicant2, setApplicant2] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(() => prefill.phones[0]);
  const [email2, setEmail2] = useState("");
  const [phone2, setPhone2] = useState(() => prefill.phones[1]);
  const [existingAccount1, setExistingAccount1] = useState(() =>
    Boolean(prefill.applicants[0]?.name && prefill.applicants[0]?.email),
  );
  const [existingAccount2, setExistingAccount2] = useState(() =>
    Boolean(prefill.applicants[1]?.name && prefill.applicants[1]?.email),
  );

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
  const [dueDate, setDueDate] = useState(() => {
    const due = new Date();
    due.setDate(due.getDate() + 7);
    due.setHours(17, 0, 0, 0);
    return toDatetimeLocalValue(due);
  });
  const [reminderDate, setReminderDate] = useState("");
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderRepeat, setReminderRepeat] = useState(defaultReminderRepeatRule);
  const [notifyBy, setNotifyBy] = useState<NotificationMethod[]>(["Email"]);
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
    const scheduleErrors = validateRequestSchedule(
      dueDate,
      reminderOn ? reminderDate : "",
    );
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
    if (dueDate.trim()) return;
    if (reminderOn) setReminderOn(false);
    if (reminderDate) setReminderDate("");
    if (reminderRepeat.preset !== "none") {
      setReminderRepeat(turnOffReminderRepeat());
    }
  }, [dueDate, reminderOn, reminderDate, reminderRepeat.preset]);

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

  function handleReminderEnabledChange(on: boolean) {
    setReminderOn(on);
    if (on) return;
    setReminderDate("");
    setReminderRepeat(turnOffReminderRepeat());
    setErrors((prev) => {
      const next = { ...prev };
      delete next.reminderDate;
      return next;
    });
  }

  function toggleNotify(method: NotificationMethod) {
    setNotifyBy((prev) =>
      prev.includes(method)
        ? prev.filter((item) => item !== method)
        : [...prev, method],
    );
  }

  function goNext() {
    if (saving) return;
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
    const clientEmail = (
      applicants[0]?.email.trim() ||
      email.trim() ||
      ""
    ).toLowerCase();
    if (!clientEmail.includes("@")) {
      setErrors({ applicants: "Add a client email so we can send the request." });
      setStep(1);
      return;
    }
    if (reviewGroups.every((g) => g.items.length === 0)) {
      setErrors({ documents: "Select at least one document to request." });
      setStep(2);
      return;
    }

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
        clientEmail,
      );
      const relatedTo = prefill.relatedName
        ? `${prefill.relatedKind || "Lead"}: ${prefill.relatedName}`
        : portal
          ? `${portal.clientName}: ${applicant1.trim() || "Client"}`
          : `Lead: ${applicant1.trim() || "Client"}`;
      const brokerName = sendOnBehalfOf || defaultActorName();
      const documentTitles = items.map((item) => item.title);

      let requestedFromId = "";
      try {
        requestedFromId = await resolveApplicantContactId(applicants[0]);
      } catch (err) {
        setErrors({
          applicants:
            err instanceof Error
              ? err.message
              : "Pick or add a live CRM contact",
        });
        setStep(1);
        return;
      }

      const relatedKindKey = (prefill.relatedKind || relatedKind || "").toLowerCase();
      const relatedParent = relatedKindKey.includes("contact")
        ? { contactId: relatedId }
        : relatedKindKey.includes("compan")
          ? { companyId: relatedId }
          : relatedKindKey.includes("deal")
            ? { dealId: relatedId }
            : relatedId
              ? { leadId: relatedId }
              : {};
      const parentIds = {
        ...applicantParentIds(applicants[0]),
        ...relatedParent,
      };

      const draft = {
        id: ids.id,
        requestId: ids.requestId,
        title,
        requestedFrom: requestedFrom || "Client",
        relatedTo,
        documentType,
        status: "Requested" as const,
        dueDate: due,
        reminderDate: reminderOn && reminderDate
          ? formatRequestDateTime(reminderDate)
          : undefined,
        repeat:
          reminderOn && reminderRepeat.preset !== "none"
            ? formatRequestRepeat(reminderRepeat)
            : undefined,
        notifyBy: reminderOn ? notifyBy : undefined,
        requestedBy: brokerName,
        requestedDate: started,
        lastUpdated: started,
        progress: 0,
        notes: notes.trim() || undefined,
        items,
        timeline: [] as Array<{
          id: string;
          at: string;
          by: string;
          label: string;
          detail: string;
        }>,
        messages: notes.trim()
          ? [
              {
                id: `${ids.id}-m-note`,
                at: started,
                by: brokerName,
                from: "team" as const,
                text: notes.trim(),
              },
            ]
          : [],
        clientName: portal?.clientName || requestedFrom || applicants[0]?.name,
        clientEmail,
      };

      let remote: Awaited<ReturnType<typeof createCrmDocumentRequest>>;
      try {
        remote = await createCrmDocumentRequest(
          toCreateDocumentRequestBody({
            ...draft,
            dueDate,
            reminderDate: reminderOn ? reminderDate : undefined,
            repeat:
              reminderOn && reminderRepeat.preset !== "none"
                ? formatRequestRepeat(reminderRepeat)
                : undefined,
            notifyBy: reminderOn ? notifyBy : undefined,
            requestedFromId,
            ...parentIds,
          }),
        );
      } catch (err) {
        notify(
          err instanceof Error
            ? err.message
            : "Could not create this request in the CRM. Check the contact and try again.",
        );
        return;
      }

      if (!remote) {
        notify(
          "Could not create this request in the CRM. Check the contact and try again.",
        );
        return;
      }

      const sent = await tryCrmDocumentRequest(() =>
        sendCrmDocumentRequest(remote!.id),
      );
      if (sent) remote = { ...remote, ...sent, status: "Pending" };

      let provideUrl = "";
      let inviteError: string | null = null;
      try {
        const publishRes = await fetch("/api/documents/provide/publish", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: remote.id,
            title,
            clientName: draft.clientName || requestedFrom,
            clientEmail,
            dueDate: due,
            notes: notes.trim() || undefined,
            items: items.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              applicant: item.applicant,
            })),
          }),
        });
        const published = (await publishRes.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };
        if (!publishRes.ok || !published.url) {
          throw new Error(
            published.error || "Could not build the client upload link.",
          );
        }
        provideUrl = published.url;
        await sendDocumentRequestInviteEmail({
          to: clientEmail,
          clientName: String(draft.clientName || requestedFrom || "Client"),
          brokerName,
          title,
          documents: items.map((item) => ({
            title: item.title,
            description: item.description,
          })),
          provideUrl,
          dueDate: due,
          notes: notes.trim() || undefined,
          contactId: requestedFromId,
        });
      } catch (err) {
        inviteError =
          err instanceof Error
            ? err.message
            : "Could not email the client this request.";
      }

      const timeline = [
        {
          id: `${remote.id}-t-created`,
          at: started,
          by: brokerName,
          label: "Request created",
          detail: inviteError
            ? `Saved in CRM. Invite email failed: ${inviteError}`
            : `Invitation emailed to ${clientEmail} with ${documentTitles.length} document${documentTitles.length === 1 ? "" : "s"} to provide.`,
        },
        ...(provideUrl && !inviteError
          ? [
              {
                id: `${remote.id}-t-invite`,
                at: started,
                by: brokerName,
                label: "Invite sent",
                detail: `Emailed ${documentTitles.join(", ")} · ${provideUrl}`,
              },
            ]
          : []),
        ...(reminderOn && reminderDate
          ? [
              {
                id: `${remote.id}-t-reminder`,
                at: formatRequestDateTime(reminderDate),
                by: brokerName,
                label: "Reminder scheduled",
                detail: [
                  formatRequestDateTime(reminderDate),
                  reminderRepeat.preset !== "none"
                    ? formatRequestRepeat(reminderRepeat)
                    : "Does not repeat",
                  notifyBy.length ? `Notify by ${notifyBy.join(", ")}` : "",
                ]
                  .filter(Boolean)
                  .join(" · "),
              },
            ]
          : []),
      ];

      if (remote.id !== draft.id) removeDocumentRequest(draft.id);
      upsertDocumentRequest({
        ...draft,
        ...remote,
        items: draft.items,
        timeline,
        messages: draft.messages,
        clientEmail,
        status: sent ? "Pending" : draft.status,
      });

      if (inviteError) {
        notify(`Request created, but email failed: ${inviteError}`);
      } else {
        notify(`Request created — invite emailed to ${clientEmail}`);
      }
      router.push(`/documents/requests/${remote.id}?created=1`);
    } finally {
      setSaving(false);
    }
  }

  return (
    // Laid out inside the dashboard's content area, not over the whole
    // window: a fixed overlay slid under the sidebar and the bottom bar.
    <div className="relative flex h-full min-h-0 w-full justify-center p-3 sm:p-5">
      <div className="flex h-full min-h-0 w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-white">
            <FileText className="h-4 w-4" />
          </span>
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-slate-900">
            Create document request
          </h1>
          <button
            type="button"
            onClick={() => router.push("/documents/requests")}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errors.dueDate || errors.reminderDate || errors.docs || errors.applicants || errors.sendOnBehalfOf ? (
          <p className="shrink-0 px-4 pt-2 text-[12px] font-medium text-rose-600 sm:px-6">
            {errors.dueDate ||
              errors.reminderDate ||
              errors.docs ||
              errors.applicants ||
              errors.sendOnBehalfOf}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto flex min-h-full w-full max-w-[1920px] flex-1 flex-col overflow-hidden px-4 pb-4 sm:px-6">
            <div className="pt-3">
              <Stepper step={step} />
            </div>

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
                  <section className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-slate-100 bg-white p-5 sm:p-6">
                    <SenderOnBehalfField
                      value={sendOnBehalfOf}
                      options={senders}
                      invalid={Boolean(errors.sendOnBehalfOf)}
                      onChange={(next) => {
                        setSendOnBehalfOf(next);
                        if (errors.sendOnBehalfOf) {
                          setErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.sendOnBehalfOf;
                            return copy;
                          });
                        }
                      }}
                    />
                    {errors.sendOnBehalfOf ? (
                      <p className="-mt-4 mb-4 text-[12px] font-medium text-rose-500">
                        {errors.sendOnBehalfOf}
                      </p>
                    ) : null}

                    <div className="relative z-0 border-t border-slate-100 pt-5">
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
                  <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-slate-100 bg-white p-5 sm:p-6">
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
                        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--brand-primary)]/45 focus:ring-2 focus:ring-[var(--brand-primary)]/12"
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
                      reminderOn && reminderDate
                        ? formatRequestDateTime(reminderDate)
                        : "Not set"
                    }
                    repeatLabel={
                      reminderOn
                        ? reminderRepeat.preset === "none"
                          ? "Once"
                          : formatRequestRepeat(reminderRepeat)
                        : "Off"
                    }
                    notifyBy={reminderOn ? notifyBy : []}
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
                    reminderEnabled={reminderOn}
                    reminderRepeat={reminderRepeat}
                    notifyBy={notifyBy}
                    errors={{
                      dueDate: errors.dueDate,
                      reminderDate: errors.reminderDate,
                    }}
                    onDueDateChange={handleDueDateChange}
                    onReminderDateChange={handleReminderDateChange}
                    onReminderEnabledChange={handleReminderEnabledChange}
                    onReminderRepeatChange={setReminderRepeat}
                    onToggleNotify={toggleNotify}
                  />
                </aside>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={goNext}
            className={cn(
              FINANCE_PRIMARY_BUTTON_SM,
              "rounded-md px-4 py-2 text-sm disabled:opacity-60",
            )}
          >
            {step === 3 ? (saving ? "Creating…" : "Create request") : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
