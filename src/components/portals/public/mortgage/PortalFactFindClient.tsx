"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  ChevronDown,
  Clock3,
  Coins,
  CreditCard,
  Home,
  Landmark,
  ShoppingBag,
  UserRound,
  Wallet,
} from "lucide-react";
import { CurrencyInput } from "@/components/portals/public/mortgage/CurrencyInput";
import { GeoAddressField } from "@/components/portals/public/mortgage/GeoAddressField";
import { MonthYearPicker } from "@/components/portals/public/mortgage/MonthYearPicker";
import { PortalFactFindAssets } from "@/components/portals/public/mortgage/PortalFactFindAssets";
import { PortalFactFindEmployment } from "@/components/portals/public/mortgage/PortalFactFindEmployment";
import { PortalFactFindExpenses } from "@/components/portals/public/mortgage/PortalFactFindExpenses";
import { PortalFactFindIncome } from "@/components/portals/public/mortgage/PortalFactFindIncome";
import { PortalFactFindLiabilities } from "@/components/portals/public/mortgage/PortalFactFindLiabilities";
import { PortalFactFindLoanPrefs } from "@/components/portals/public/mortgage/PortalFactFindLoanPrefs";
import { PortalFactFindProperty } from "@/components/portals/public/mortgage/PortalFactFindProperty";
import { useMortgagePortal } from "@/components/portals/public/mortgage/useMortgagePortal";
import { searchAddresses, type AddressHit } from "@/lib/address/geocode";
import {
  FACT_FIND_WIZARD,
  assetsTotal,
  currentAddressGapMessage,
  dependantCount,
  expensesMonthlyTotal,
  factFindFieldById,
  factFindProgress,
  factFindScreens,
  formatMoney,
  formatPortalStamp,
  hasThreeYearResidence,
  incomesAnnualTotal,
  isFactFindScreenComplete,
  liabilitiesBalanceTotal,
  monthsSince,
  normalizePropertyUsage,
  parseIncomes,
  parseLiabilities,
  parseLoanFeatures,
  parsePropertyPostcodes,
  type FactFindField,
  type FactFindScreenId,
  type MortgagePortalState,
} from "@/lib/portals/mortgage";
import { cn } from "@/lib/utils";

const GROUP_ICON = {
  property: Home,
  details: UserRound,
  finances: Wallet,
  loan: Landmark,
} as const;

export function PortalFactFindClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { mortgage, update, logActivity, canWrite, isReadOnly } = useMortgagePortal(slug);
  const screens = useMemo(() => factFindScreens(), []);
  const firstOpen = useMemo(() => {
    if (!mortgage) return 0;
    const open = screens.findIndex(
      (screen) =>
        screen.fields.length > 0 &&
        !isFactFindScreenComplete(mortgage.factFind, screen.fields),
    );
    return open >= 0 ? open : screens.length - 1;
  }, [mortgage, screens]);
  const [index, setIndex] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const autosaveTimer = useRef<number>(0);
  const savedTimer = useRef<number>(0);

  useEffect(() => {
    if (index === null && mortgage) setIndex(firstOpen);
  }, [index, mortgage, firstOpen]);

  useEffect(() => {
    setShowErrors(false);
  }, [index]);

  useEffect(() => {
    function flush() {
      window.clearTimeout(autosaveTimer.current);
      syncFactFindProgress();
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(autosaveTimer.current);
      window.clearTimeout(savedTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mortgage) return null;
  const currentIndex = index ?? firstOpen;
  const locked = isReadOnly || !canWrite;
  const screen = screens[currentIndex];
  const progress = factFindProgress(mortgage.factFind);
  const purpose = normalizePropertyUsage(mortgage.factFind.purpose);
  const purposeBadge =
    purpose === "As an investment"
      ? "Investment Property"
      : purpose === "To live-in"
        ? "Owner occupier property"
        : purpose || "Home loan";

  function valueOf(id: string) {
    const raw = mortgage!.factFind[id] ?? fallbackValue(mortgage!, id);
    if (id === "title" && raw === "Mr") return "Mr.";
    if (id === "residency" && raw === "Australian Citizen") return "Australian citizen";
    if (id === "purpose") return normalizePropertyUsage(raw);
    return raw;
  }

  function setAnswer(id: string, value: string) {
    update((prev) => {
      const factFind = { ...prev.factFind, [id]: value };
      const client = { ...prev.client };
      if (id === "firstName") client.firstName = value;
      if (id === "lastName") client.lastName = value;
      if (id === "mobile") client.phone = value;
      if (id === "currentAddress") client.address = value;
      if (
        id === "streetAddress" ||
        id === "addressSuburb" ||
        id === "addressState" ||
        id === "addressPostcode"
      ) {
        const street = id === "streetAddress" ? value : factFind.streetAddress ?? "";
        const suburb = id === "addressSuburb" ? value : factFind.addressSuburb ?? "";
        const state = id === "addressState" ? value : factFind.addressState ?? "";
        const postcode = id === "addressPostcode" ? value : factFind.addressPostcode ?? "";
        client.address = [street, [suburb, state, postcode].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(", ");
      }
      return { ...prev, factFind, client };
    });
    queueAutosave();
  }

  function flashSaved() {
    setSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 1600);
  }

  function syncFactFindProgress() {
    update((prev) => {
      const next = factFindProgress(prev.factFind);
      return {
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.href === "fact-find"
            ? {
                ...n,
                body:
                  next.remaining === 0
                    ? "Your fact find is complete."
                    : `Your fact find is ${next.percent}% complete — ${next.remaining} questions remaining.`,
                read: true,
              }
            : n,
        ),
      };
    });
    flashSaved();
  }

  function queueAutosave() {
    window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      syncFactFindProgress();
    }, 400);
  }

  function persist(title?: string) {
    update((prev) => {
      const next = factFindProgress(prev.factFind);
      return {
        ...prev,
        timeline: [
          {
            id: `ff-${Date.now()}`,
            title:
              title ??
              (next.remaining === 0 ? "Fact Find completed" : "Fact Find updated"),
            at: formatPortalStamp(),
            done: true,
          },
          ...prev.timeline,
        ],
        notifications: prev.notifications.map((n) =>
          n.href === "fact-find"
            ? {
                ...n,
                body:
                  next.remaining === 0
                    ? "Your fact find is complete."
                    : `Your fact find is ${next.percent}% complete — ${next.remaining} questions remaining.`,
                read: true,
              }
            : n,
        ),
      };
    });
    logActivity("Updated fact find");
    flashSaved();
  }

  function goNext() {
    if (!mortgage) return;
    if (!isFactFindScreenComplete(mortgage.factFind, screen.fields)) {
      setShowErrors(true);
      window.setTimeout(() => {
        document
          .querySelector<HTMLElement>("[data-invalid='true']")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    setShowErrors(false);
    persist();
    if (currentIndex >= screens.length - 1) {
      router.push(`/p/${slug}/documents`);
      return;
    }
    setIndex(currentIndex + 1);
  }

  function goBack() {
    if (currentIndex === 0) {
      router.push(`/p/${slug}`);
      return;
    }
    setIndex(currentIndex - 1);
  }

  return (
    <div className="pb-10">
      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <section
            className={cn(
              "px-1 py-1",
              screen.id === "review" ||
                screen.id === "address" ||
                screen.id === "assets" ||
                screen.id === "expenses" ||
                screen.id === "debts" ||
                screen.id === "income" ||
                screen.id === "employment" ||
                screen.id === "property-details" ||
                screen.id === "loan-preferences"
                ? "max-w-[860px]"
                : "max-w-[560px]",
            )}
          >
            <div className="flex items-center gap-3">
              {screen.id === "address" || screen.id === "property-details" ? (
                <HomeIllustration />
              ) : screen.id === "id" ? (
                <IdIllustration />
              ) : screen.id === "assets" ? (
                <AssetsIllustration />
              ) : screen.id === "expenses" ? (
                <ExpensesIllustration />
              ) : screen.id === "income" ? (
                <IncomeIllustration />
              ) : screen.id === "employment" ? (
                <EmploymentIllustration />
              ) : screen.id === "debts" ? (
                <LiabilitiesIllustration />
              ) : screen.id === "loan-preferences" ? (
                <LoanPrefsIllustration />
              ) : (
                <DetailsIllustration />
              )}
              <h1 className="text-[26px] font-bold tracking-tight text-slate-900">
                {screen.title}
              </h1>
            </div>
            {screen.blurb ? (
              <p className="mt-2 text-[13px] text-slate-500">{screen.blurb}</p>
            ) : null}

            {screen.id === "review" ? (
              <ReviewSummary
                answers={mortgage.factFind}
                onJump={(id) => {
                  const next = screens.findIndex((item) => item.id === id);
                  if (next >= 0) setIndex(next);
                }}
              />
            ) : screen.id === "personal" ? (
              <PersonalDetailsForm
                valueOf={valueOf}
                disabled={locked}
                showErrors={showErrors}
                onChange={setAnswer}
              />
            ) : screen.id === "address" ? (
              <AddressHistoryForm
                valueOf={valueOf}
                disabled={locked}
                showErrors={showErrors}
                onChange={setAnswer}
              />
            ) : screen.id === "id" ? (
              <IdDetailsForm
                valueOf={valueOf}
                disabled={locked}
                showErrors={showErrors}
                onChange={setAnswer}
              />
            ) : screen.id === "assets" ? (
              <PortalFactFindAssets
                valueOf={valueOf}
                disabled={locked}
                showErrors={showErrors}
                onChange={setAnswer}
              />
            ) : screen.id === "expenses" ? (
              <PortalFactFindExpenses
                valueOf={valueOf}
                disabled={locked}
                onChange={setAnswer}
              />
            ) : screen.id === "income" ? (
              <PortalFactFindIncome
                valueOf={valueOf}
                disabled={locked}
                showErrors={showErrors}
                onChange={setAnswer}
              />
            ) : screen.id === "employment" ? (
              <PortalFactFindEmployment
                valueOf={valueOf}
                disabled={locked}
                showErrors={showErrors}
                onChange={setAnswer}
              />
            ) : screen.id === "debts" ? (
              <PortalFactFindLiabilities
                valueOf={valueOf}
                disabled={locked}
                showErrors={showErrors}
                onChange={setAnswer}
              />
            ) : screen.id === "property-details" ? (
              <PortalFactFindProperty
                valueOf={valueOf}
                disabled={locked}
                showErrors={showErrors}
                onChange={setAnswer}
              />
            ) : screen.id === "loan-preferences" ? (
              <PortalFactFindLoanPrefs
                valueOf={valueOf}
                disabled={locked}
                onChange={setAnswer}
              />
            ) : null}

            <div className="mt-10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              {!locked ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#2B2140] px-5 text-[13px] font-semibold text-white hover:bg-[#1f1830] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saved
                    ? "Saved"
                    : currentIndex >= screens.length - 1
                      ? "Submit"
                      : "Save & next"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <span className="text-[12px] text-slate-400">View only</span>
              )}
            </div>
          </section>
        </div>

        <aside className="hidden w-[270px] shrink-0 xl:block">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-[#5A32A3]">
                {purposeBadge}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                ID {slug.slice(0, 4).toUpperCase()}-1042
              </span>
            </div>

            <div className="mt-4 text-[11px] font-bold text-slate-400">
              {progress.percent}% complete · {progress.remaining} remaining
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-[#5A32A3]"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <ol className="mt-4 space-y-1">
              {FACT_FIND_WIZARD.map((group) => {
                const Icon = GROUP_ICON[group.id];
                const complete = group.screens.every((item) =>
                  isFactFindScreenComplete(mortgage.factFind, item.fields),
                );
                const current = screen.groupId === group.id;
                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const next = screens.findIndex((s) => s.groupId === group.id);
                        if (next >= 0) setIndex(next);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left",
                        current && "bg-violet-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                          complete && "bg-emerald-500 text-white",
                          current && !complete && "bg-[#5A32A3] text-white",
                          !current && !complete && "bg-slate-100 text-slate-400",
                        )}
                      >
                        {complete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-[13px] font-bold",
                            current ? "text-[#5A32A3]" : "text-slate-800",
                          )}
                        >
                          {group.title}
                        </span>
                      </span>
                      {current ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
                          <Clock3 className="h-3 w-3" />
                          {group.estimate}
                        </span>
                      ) : null}
                    </button>
                    {current && group.screens.length > 1 ? (
                      <ul className="mt-0.5 ml-5 space-y-0.5 border-l border-slate-100 pl-4">
                        {group.screens.map((item) => {
                          const done = isFactFindScreenComplete(mortgage.factFind, item.fields);
                          const active = screen.id === item.id;
                          const screenIndex = screens.findIndex((s) => s.id === item.id);
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => setIndex(screenIndex)}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-[12px]",
                                  active
                                    ? "font-bold text-[#5A32A3]"
                                    : "font-medium text-slate-500 hover:text-slate-800",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded-full",
                                    done || active
                                      ? "bg-[#5A32A3] text-white"
                                      : "bg-slate-200 text-slate-500",
                                  )}
                                >
                                  <Check className="h-2.5 w-2.5" />
                                </span>
                                {item.title}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

function fallbackValue(state: MortgagePortalState, id: string) {
  if (id === "preferredName" || id === "firstName") return state.client.firstName;
  if (id === "lastName") return state.client.lastName;
  if (id === "mobile") return state.client.phone;
  if (id === "streetAddress") return state.client.address.split(",")[0]?.trim() ?? "";
  if (id === "currentAddress") {
    const parts = [
      state.factFind.streetAddress,
      [state.factFind.addressSuburb, state.factFind.addressState, state.factFind.addressPostcode]
        .filter(Boolean)
        .join(" "),
    ].filter(Boolean);
    return parts.join(", ") || state.client.address;
  }
  if (id === "postalSame") return "Yes";
  if (id === "hasDriverLicence") return "Yes";
  if (id === "nameChanged") return "No";
  if (id === "residency" && state.factFind.residency === "Australian Citizen") {
    return "Australian citizen";
  }
  if (id === "title" && state.factFind.title === "Mr") return "Mr.";
  if (id === "purpose") return normalizePropertyUsage(state.factFind.purpose);
  return "";
}

const fieldShell =
  "h-12 w-full rounded-lg bg-white px-3.5 text-[14px] text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.07)] outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-[#5A32A3] disabled:bg-slate-50";

function FieldError({ show, message = "Required" }: { show: boolean; message?: string }) {
  if (!show) return null;
  return <p className="mt-1.5 text-[12px] font-medium text-rose-600">{message}</p>;
}

export function PersonalDetailsForm({
  valueOf,
  disabled,
  showErrors,
  onChange,
}: {
  valueOf: (id: string) => string;
  disabled: boolean;
  showErrors: boolean;
  onChange: (id: string, value: string) => void;
}) {
  const count = dependantCount({ dependants: valueOf("dependants") });
  const titleField = factFindFieldById("title")!;
  const genderField = factFindFieldById("gender")!;
  const maritalField = factFindFieldById("marital")!;
  const dependantsField = factFindFieldById("dependants")!;

  return (
    <div className="mt-7 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldControl
          field={{ ...factFindFieldById("preferredName")!, label: "Preferred name (optional)" }}
          value={valueOf("preferredName")}
          disabled={disabled}
          showErrors={showErrors}
          onChange={(next) => onChange("preferredName", next)}
        />
        <FieldControl
          field={factFindFieldById("mobile")!}
          value={valueOf("mobile")}
          disabled={disabled}
          showErrors={showErrors}
          onChange={(next) => onChange("mobile", next)}
        />
      </div>
      <FieldControl
        field={titleField}
        value={valueOf("title")}
        disabled={disabled}
        showErrors={showErrors}
        onChange={(next) => onChange("title", next)}
      />
      {valueOf("title") === "Other" ? (
        <FieldControl
          field={{
            id: "titleOther",
            section: "about",
            label: "Your title",
            type: "text",
          }}
          value={valueOf("titleOther")}
          disabled={disabled}
          showErrors={showErrors}
          onChange={(next) => onChange("titleOther", next)}
        />
      ) : null}
      <FieldControl
        field={genderField}
        value={valueOf("gender")}
        disabled={disabled}
        showErrors={showErrors}
        onChange={(next) => onChange("gender", next)}
      />
      <FieldControl
        field={maritalField}
        value={valueOf("marital")}
        disabled={disabled}
        showErrors={showErrors}
        onChange={(next) => onChange("marital", next)}
      />
      <FieldControl
        field={dependantsField}
        value={valueOf("dependants")}
        disabled={disabled}
        showErrors={showErrors}
        onChange={(next) => onChange("dependants", next)}
      />
      {Array.from({ length: count }, (_, i) => (
        <DependantAgeField
          key={i}
          index={i + 1}
          value={valueOf(`dependantAge${i + 1}`)}
          disabled={disabled}
          showErrors={showErrors}
          onChange={(next) => onChange(`dependantAge${i + 1}`, next)}
        />
      ))}
    </div>
  );
}

function DependantAgeField({
  index,
  value,
  disabled,
  showErrors,
  onChange,
}: {
  index: number;
  value: string;
  disabled: boolean;
  showErrors: boolean;
  onChange: (value: string) => void;
}) {
  const invalid = showErrors && !value.trim();
  return (
    <label className="block" data-invalid={invalid || undefined}>
      <span className={cn("mb-2 block text-[13px] font-semibold", invalid ? "text-rose-700" : "text-slate-900")}>
        Dependant {index}
        <span className="text-rose-500"> *</span>
      </span>
      <div className="relative">
        <input
          type="number"
          min={0}
          max={120}
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter age"
          className={cn(fieldShell, "pr-24", invalid && "ring-2 ring-rose-400")}
        />
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[13px] text-slate-400">
          years old
        </span>
      </div>
      <FieldError show={invalid} />
    </label>
  );
}

function FieldControl({
  field,
  value,
  disabled,
  showErrors,
  onChange,
}: {
  field: FactFindField;
  value: string;
  disabled: boolean;
  showErrors?: boolean;
  onChange: (value: string) => void;
}) {
  const invalid = Boolean(showErrors && !field.optional && !value.trim());
  return (
    <label className="block" data-invalid={invalid || undefined}>
      <span className={cn("mb-2 block text-[13px] font-semibold", invalid ? "text-rose-700" : "text-slate-900")}>
        {field.label}
        {!field.optional ? <span className="text-rose-500"> *</span> : null}
      </span>
      {field.hint ? (
        <p className="-mt-1 mb-2.5 text-[12px] leading-relaxed text-slate-400">{field.hint}</p>
      ) : null}

      {field.control === "choice" && field.options ? (
        <div className={cn("flex flex-wrap gap-2.5 rounded-xl p-1", invalid && "bg-rose-50 ring-2 ring-rose-400")}>
          {field.options.map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => onChange(opt)}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-1 rounded-lg px-5 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-[#EDE4F7] text-[#5A32A3]"
                    : "bg-white text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.07)] ring-1 ring-black/5 hover:bg-slate-50",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : field.control === "phone" ? (
        <div
          className={cn(
            "flex overflow-hidden rounded-lg bg-white shadow-[0_2px_10px_rgba(15,23,42,0.07)] ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#5A32A3]",
            invalid && "ring-2 ring-rose-400",
          )}
        >
          <span className="flex items-center gap-1.5 border-r border-slate-100 bg-white px-3 text-[13px] font-semibold text-slate-700">
            <span aria-hidden>🇦🇺</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </span>
          <input
            type="tel"
            inputMode="tel"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[14px] outline-none disabled:bg-slate-50"
            placeholder="+61 412 345 678"
          />
        </div>
      ) : field.control === "money" ? (
        <CurrencyInput
          value={value}
          disabled={disabled}
          invalid={invalid}
          onChange={onChange}
          className="h-12"
        />
      ) : field.type === "select" ? (
        <div className="relative">
          <select
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={cn(fieldShell, "fc-select-caret appearance-none pr-10", invalid && "ring-2 ring-rose-400")}
          >
            {field.id === "dependants" ? null : <option value="">Select…</option>}
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {field.id === "dependants" && opt === "0" ? "None" : opt}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      ) : (
        <input
          type={field.type === "number" ? "number" : field.type}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldShell, invalid && "ring-2 ring-rose-400")}
        />
      )}
      <FieldError show={invalid} />
    </label>
  );
}

function applyAddressParts(
  onChange: (id: string, value: string) => void,
  hit: AddressHit,
  prefix: "current" | "postal" | "previous",
) {
  if (prefix === "current") {
    onChange("currentAddress", hit.label);
    onChange("currentAddressGeo", "1");
    if (hit.street) onChange("streetAddress", hit.street);
    if (hit.suburb) onChange("addressSuburb", hit.suburb);
    if (hit.state) onChange("addressState", hit.state);
    if (hit.postcode) onChange("addressPostcode", hit.postcode);
    return;
  }
  if (prefix === "postal") {
    onChange("postalAddress", hit.label);
    onChange("postalAddressGeo", "1");
    return;
  }
  onChange("previousAddress", hit.label);
  onChange("previousAddressGeo", "1");
}

export function AddressHistoryForm({
  valueOf,
  disabled,
  showErrors,
  onChange,
  fieldsRequired = true,
}: {
  valueOf: (id: string) => string;
  disabled: boolean;
  showErrors: boolean;
  onChange: (id: string, value: string) => void;
  fieldsRequired?: boolean;
}) {
  const living = valueOf("livingArrangement");
  const moveIn = valueOf("moveInDate");
  const postalSame = valueOf("postalSame") || "Yes";
  const currentMonths = monthsSince(moveIn);
  const underThreeYears = currentMonths != null && currentMonths < 36;
  const gapMessage = underThreeYears ? currentAddressGapMessage(moveIn) : null;
  const historyReady =
    hasThreeYearResidence({
      moveInDate: moveIn,
      previousAddress: valueOf("previousAddress"),
      previousMoveIn: valueOf("previousMoveIn"),
    }) &&
    valueOf("currentAddressGeo") === "1" &&
    (!underThreeYears || valueOf("previousAddressGeo") === "1");

  return (
    <div className="mt-6">
      <div className="rounded-2xl bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.06)] ring-1 ring-black/5 sm:p-6">
        <h2 className="mb-5 text-[16px] font-bold text-slate-900">Current residential address</h2>

        <div className="space-y-5">
          <GeoAddressField
            label="Current residential address"
            required={fieldsRequired}
            invalid={fieldsRequired && showErrors && (!valueOf("currentAddress").trim() || valueOf("currentAddressGeo") !== "1")}
            value={valueOf("currentAddress")}
            disabled={disabled}
            onChange={(next) => {
              onChange("currentAddress", next);
              onChange("currentAddressGeo", "");
            }}
            onPick={(hit) => applyAddressParts(onChange, hit, "current")}
          />

          <FancySelect
            label="Living arrangements"
            required={fieldsRequired}
            invalid={fieldsRequired && showErrors && !living.trim()}
            value={living}
            options={factFindFieldById("livingArrangement")?.options ?? []}
            disabled={disabled}
            onChange={(next) => onChange("livingArrangement", next)}
          />

          <MonthYearPicker
            label="Move in date"
            required={fieldsRequired}
            invalid={fieldsRequired && showErrors && !moveIn.trim()}
            value={moveIn}
            disabled={disabled}
            onChange={(next) => onChange("moveInDate", next)}
          />

          <div>
            <span className="mb-2 block text-[13px] font-semibold text-slate-900">
              Postal address is the same?
            </span>
            <div className="flex gap-2">
              {["Yes", "No"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange("postalSame", opt)}
                  className={cn(
                    "h-11 min-w-[72px] rounded-lg px-5 text-[13px] font-semibold",
                    postalSame === opt
                      ? "bg-[#EDE4F7] text-[#5A32A3]"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {postalSame === "No" ? (
            <GeoAddressField
              label="Postal address"
              required={fieldsRequired}
              invalid={
                fieldsRequired &&
                showErrors &&
                (!valueOf("postalAddress").trim() || valueOf("postalAddressGeo") !== "1")
              }
              value={valueOf("postalAddress")}
              disabled={disabled}
              placeholder="Start typing a postal address"
              onChange={(next) => {
                onChange("postalAddress", next);
                onChange("postalAddressGeo", "");
              }}
              onPick={(hit) => applyAddressParts(onChange, hit, "postal")}
            />
          ) : null}

          {underThreeYears ? (
            <div className="space-y-4 rounded-xl bg-[#F7F6F9] p-4">
              <p className="text-[12px] leading-relaxed text-slate-500">
                Lenders need 3 years of address history. Please add where you lived before this.
              </p>
              <GeoAddressField
                label="Previous address"
                required={fieldsRequired}
                invalid={
                  fieldsRequired &&
                  showErrors &&
                  (!valueOf("previousAddress").trim() || valueOf("previousAddressGeo") !== "1")
                }
                value={valueOf("previousAddress")}
                disabled={disabled}
                placeholder="Start typing your previous address"
                onChange={(next) => {
                  onChange("previousAddress", next);
                  onChange("previousAddressGeo", "");
                }}
                onPick={(hit) => applyAddressParts(onChange, hit, "previous")}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <MonthYearPicker
                  label="Moved in"
                  required={fieldsRequired}
                  invalid={fieldsRequired && showErrors && !valueOf("previousMoveIn").trim()}
                  value={valueOf("previousMoveIn")}
                  disabled={disabled}
                  onChange={(next) => onChange("previousMoveIn", next)}
                />
                <MonthYearPicker
                  label="Moved out"
                  value={valueOf("previousMoveOut")}
                  disabled={disabled}
                  onChange={(next) => onChange("previousMoveOut", next)}
                />
              </div>
            </div>
          ) : null}

          {gapMessage ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-center text-[13px] font-medium text-red-800">
              {gapMessage}
            </div>
          ) : null}
        </div>
      </div>

      {historyReady && fieldsRequired ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-800">
          <Check className="h-4 w-4 text-emerald-600" />
          3 years residential history provided. Proceed to the next step.
        </div>
      ) : null}
    </div>
  );
}

export function IdDetailsForm({
  valueOf,
  disabled,
  showErrors,
  onChange,
}: {
  valueOf: (id: string) => string;
  disabled: boolean;
  showErrors: boolean;
  onChange: (id: string, value: string) => void;
}) {
  const hasLicence = (valueOf("hasDriverLicence") || "Yes") !== "No";
  const [cardHelp, setCardHelp] = useState(false);
  const residencyOptions = factFindFieldById("residency")?.options ?? [];
  const missing = (id: string) => showErrors && !valueOf(id).trim();
  const firstMissing = missing("firstName");
  const lastMissing = missing("lastName");
  const nameChangedMissing = missing("nameChanged");
  const previousNameMissing = valueOf("nameChanged") === "Yes" && missing("previousLegalName");

  return (
    <div className="mt-7 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[15px] font-bold text-slate-900">Australian Driver Licence</div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-slate-500">
          I don&apos;t have this
          <button
            type="button"
            role="switch"
            aria-checked={!hasLicence}
            disabled={disabled}
            onClick={() => onChange("hasDriverLicence", hasLicence ? "No" : "Yes")}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              hasLicence ? "bg-slate-200" : "bg-[#5A32A3]",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                !hasLicence && "translate-x-5",
              )}
            />
          </button>
        </label>
      </div>

      {hasLicence ? (
        <>
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-slate-900">
              Name exactly as displayed on ID
              <span className="text-rose-500"> *</span>
            </span>
            <div className="space-y-2.5">
              <input
                value={valueOf("firstName")}
                disabled={disabled}
                onChange={(e) => onChange("firstName", e.target.value)}
                placeholder="First name"
                className={cn(fieldShell, firstMissing && "ring-2 ring-rose-400")}
              />
              <input
                value={valueOf("middleName")}
                disabled={disabled}
                onChange={(e) => onChange("middleName", e.target.value)}
                placeholder="Middle name"
                className={fieldShell}
              />
              <input
                value={valueOf("lastName")}
                disabled={disabled}
                onChange={(e) => onChange("lastName", e.target.value)}
                placeholder="Last name"
                className={cn(fieldShell, lastMissing && "ring-2 ring-rose-400")}
              />
            </div>
            <FieldError show={firstMissing || lastMissing} />
          </div>

          <FancySelect
            label="State issued in"
            value={valueOf("licenceState")}
            options={factFindFieldById("licenceState")?.options ?? []}
            disabled={disabled}
            placeholder="Select a state"
            required
            invalid={missing("licenceState")}
            onChange={(next) => onChange("licenceState", next)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span
                className={cn(
                  "mb-2 block text-[13px] font-semibold",
                  missing("licenceNumber") ? "text-rose-700" : "text-slate-900",
                )}
              >
                Driver licence number
                <span className="text-rose-500"> *</span>
              </span>
              <input
                value={valueOf("licenceNumber")}
                disabled={disabled}
                onChange={(e) => onChange("licenceNumber", e.target.value)}
                className={cn(fieldShell, missing("licenceNumber") && "ring-2 ring-rose-400")}
                placeholder="e.g. 102 553 856"
              />
              <FieldError show={missing("licenceNumber")} />
            </label>
            <label className="block">
              <span
                className={cn(
                  "mb-2 block text-[13px] font-semibold",
                  missing("licenceCardNumber") ? "text-rose-700" : "text-slate-900",
                )}
              >
                Card number
                <span className="text-rose-500"> *</span>
              </span>
              <input
                value={valueOf("licenceCardNumber")}
                disabled={disabled}
                onChange={(e) => onChange("licenceCardNumber", e.target.value)}
                className={cn(fieldShell, missing("licenceCardNumber") && "ring-2 ring-rose-400")}
                placeholder="e.g. 665B 55CE 77"
              />
              <button
                type="button"
                onClick={() => setCardHelp((v) => !v)}
                className="mt-1.5 text-[12px] font-semibold text-[#5A32A3] hover:underline"
              >
                Where can I find this?
              </button>
              {cardHelp ? (
                <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                  The card number is usually on the front or back of your licence, separate from
                  the driver licence number.
                </p>
              ) : null}
              <FieldError show={missing("licenceCardNumber")} />
            </label>
          </div>

          <DateField
            label="Expiry date"
            value={valueOf("licenceExpiry")}
            disabled={disabled}
            required
            invalid={missing("licenceExpiry")}
            onChange={(next) => onChange("licenceExpiry", next)}
          />
        </>
      ) : (
        <>
          <div className="rounded-xl bg-[#F3F0F7] px-4 py-3">
            <p className="text-[13px] font-bold text-slate-900">
              Why we request Driver Licence details
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
              We verify your driver licence on behalf of your broker and share these details with
              them. If you don&apos;t have one, it&apos;s fine. Provide the details below and hit
              Save & next to continue.
            </p>
          </div>
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-slate-900">
              Legal name
              <span className="text-rose-500"> *</span>
            </span>
            <div className="space-y-2.5">
              <input
                value={valueOf("firstName")}
                disabled={disabled}
                onChange={(e) => onChange("firstName", e.target.value)}
                placeholder="First name"
                className={cn(fieldShell, firstMissing && "ring-2 ring-rose-400")}
              />
              <input
                value={valueOf("middleName")}
                disabled={disabled}
                onChange={(e) => onChange("middleName", e.target.value)}
                placeholder="Middle name"
                className={fieldShell}
              />
              <input
                value={valueOf("lastName")}
                disabled={disabled}
                onChange={(e) => onChange("lastName", e.target.value)}
                placeholder="Last name"
                className={cn(fieldShell, lastMissing && "ring-2 ring-rose-400")}
              />
            </div>
            <FieldError show={firstMissing || lastMissing} />
          </div>
        </>
      )}

      <div data-invalid={nameChangedMissing || undefined}>
        <span
          className={cn(
            "mb-2 block text-[13px] font-semibold",
            nameChangedMissing ? "text-rose-700" : "text-slate-900",
          )}
        >
          Legal name has ever changed?
          <span className="text-rose-500"> *</span>
        </span>
        <div className={cn("flex gap-2", nameChangedMissing && "rounded-xl p-1 ring-2 ring-rose-400")}>
          {["Yes", "No"].map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange("nameChanged", opt)}
              className={cn(
                "h-11 min-w-[72px] rounded-lg px-5 text-[13px] font-semibold",
                valueOf("nameChanged") === opt
                  ? "bg-[#EDE4F7] text-[#5A32A3]"
                  : "bg-white text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.07)] ring-1 ring-black/5",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        <FieldError show={nameChangedMissing} />
      </div>

      {valueOf("nameChanged") === "Yes" ? (
        <label className="block">
          <span
            className={cn(
              "mb-2 block text-[13px] font-semibold",
              previousNameMissing ? "text-rose-700" : "text-slate-900",
            )}
          >
            Previous legal name
            <span className="text-rose-500"> *</span>
          </span>
          <input
            value={valueOf("previousLegalName")}
            disabled={disabled}
            onChange={(e) => onChange("previousLegalName", e.target.value)}
            className={cn(fieldShell, previousNameMissing && "ring-2 ring-rose-400")}
          />
          <FieldError show={previousNameMissing} />
        </label>
      ) : null}

      <DateField
        label="Date of birth"
        value={valueOf("dob")}
        disabled={disabled}
        required
        invalid={missing("dob")}
        onChange={(next) => onChange("dob", next)}
      />

      <div
        data-invalid={showErrors && !valueOf("residency").trim() ? true : undefined}
      >
        <span
          className={cn(
            "mb-2 block text-[13px] font-semibold",
            showErrors && !valueOf("residency").trim() ? "text-rose-700" : "text-slate-900",
          )}
        >
          Residency status
          <span className="text-rose-500"> *</span>
        </span>
        <div
          className={cn(
            "grid grid-cols-4 gap-2 rounded-xl p-1",
            showErrors && !valueOf("residency").trim() && "bg-rose-50 ring-2 ring-rose-400",
          )}
        >
          {residencyOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange("residency", opt);
                if (opt !== "Temporary resident") onChange("visaType", "");
              }}
              className={cn(
                "h-11 rounded-lg px-2 text-center text-[12px] font-semibold leading-tight sm:text-[13px]",
                valueOf("residency") === opt
                  ? "bg-[#EDE4F7] text-[#5A32A3]"
                  : "bg-white text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.07)] ring-1 ring-black/5",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        <FieldError show={showErrors && !valueOf("residency").trim()} />
        {valueOf("residency") === "Temporary resident" ? (
          <label
            className="mt-3 block"
            data-invalid={showErrors && !valueOf("visaType").trim() ? true : undefined}
          >
            <span
              className={cn(
                "mb-2 block text-[13px] font-semibold",
                showErrors && !valueOf("visaType").trim() ? "text-rose-700" : "text-slate-900",
              )}
            >
              Visa type
              <span className="text-rose-500"> *</span>
            </span>
            <input
              value={valueOf("visaType")}
              disabled={disabled}
              onChange={(e) => onChange("visaType", e.target.value)}
              className={cn(fieldShell, showErrors && !valueOf("visaType").trim() && "ring-2 ring-rose-400")}
              placeholder="e.g. 482, 500, 485"
            />
            <FieldError show={showErrors && !valueOf("visaType").trim()} />
          </label>
        ) : null}
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  disabled,
  onChange,
  required,
  invalid,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  required?: boolean;
  invalid?: boolean;
}) {
  return (
    <label className="block" data-invalid={invalid || undefined}>
      <span className={cn("mb-2 block text-[13px] font-semibold", invalid ? "text-rose-700" : "text-slate-900")}>
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(fieldShell, invalid && "ring-2 ring-rose-400")}
      />
      <FieldError show={Boolean(invalid)} />
    </label>
  );
}

function FancySelect({
  label,
  value,
  options,
  disabled,
  onChange,
  placeholder = "Select…",
  required,
  invalid,
}: {
  label: string;
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative" data-invalid={invalid || undefined}>
      <span className={cn("mb-2 block text-[13px] font-semibold", invalid ? "text-rose-700" : "text-slate-900")}>
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-lg bg-white px-3.5 text-left text-[14px] text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.07)] outline-none ring-1 ring-black/5",
          open && "ring-2 ring-[#5A32A3]",
          invalid && "ring-2 ring-rose-400",
        )}
      >
        <span className={value ? "" : "text-slate-400"}>{value || placeholder}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-50 text-[#5A32A3]">
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open ? (
        <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 overflow-hidden rounded-xl bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-3.5 py-2.5 text-left text-[13px]",
                opt === value ? "bg-violet-50 text-slate-900" : "text-slate-700 hover:bg-violet-50/70",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : null}
      <FieldError show={Boolean(invalid)} />
    </div>
  );
}

function IncomeIllustration() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="22" fill="#E8D8F4" />
      <ellipse cx="22" cy="16" rx="9" ry="4" fill="#E8C36A" />
      <path d="M13 16v6c0 2.3 4 4.2 9 4.2s9-1.9 9-4.2v-6" fill="#D4A84B" />
      <ellipse cx="22" cy="22" rx="9" ry="4" fill="#E8C36A" />
      <path d="M13 22v6c0 2.3 4 4.2 9 4.2s9-1.9 9-4.2v-6" fill="#D4A84B" />
      <ellipse cx="22" cy="28" rx="9" ry="4" fill="#F0D078" />
    </svg>
  );
}

function LiabilitiesIllustration() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="22" fill="#E8D8F4" />
      <rect x="10" y="15" width="24" height="15" rx="3" fill="#5A32A3" />
      <rect x="10" y="18" width="24" height="4" fill="#C4B0E2" />
      <rect x="13" y="25" width="8" height="2.2" rx="1" fill="#E8D8F4" />
    </svg>
  );
}

function ExpensesIllustration() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="22" fill="#E8D8F4" />
      <path d="M15 16h14l2 16H13l2-16Z" fill="#5A32A3" />
      <path d="M17 16c.5-3 9.5-3 10 0" stroke="#C4B0E2" strokeWidth="2.2" />
      <path d="M18 22h8M18 26h6" stroke="#E8D8F4" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AssetsIllustration() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="22" fill="#E8D8F4" />
      <path d="M10 26h24l-3 7H13l-3-7Z" fill="#5A32A3" />
      <path d="M14 26c1-5 4-8 8-8s7 3 8 8" fill="#C4B0E2" />
      <circle cx="15.5" cy="33.5" r="2.2" fill="#2B2140" />
      <circle cx="28.5" cy="33.5" r="2.2" fill="#2B2140" />
    </svg>
  );
}

function IdIllustration() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="22" fill="#E8D8F4" />
      <rect x="9" y="14" width="26" height="16" rx="3" fill="#5A32A3" />
      <rect x="12" y="17" width="8" height="6" rx="1.5" fill="#C5D8F6" />
      <rect x="22" y="18" width="10" height="2" rx="1" fill="#E8D8F4" />
      <rect x="22" y="22" width="7" height="2" rx="1" fill="#C4B0E2" />
      <rect x="12" y="25" width="16" height="2" rx="1" fill="#E8D8F4" />
    </svg>
  );
}

function HomeIllustration() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="22" fill="#E8D8F4" />
      <path d="M9 21.5 22 11l13 10.5V33a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V21.5Z" fill="#5A32A3" />
      <path d="M18 35V25h8v10" fill="#E8D8F4" />
    </svg>
  );
}

function EmploymentIllustration() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="22" fill="#E8D8F4" />
      <rect x="12" y="18" width="20" height="14" rx="2.5" fill="#5A32A3" />
      <path d="M17 18v-2.5A3.5 3.5 0 0 1 20.5 12h3A3.5 3.5 0 0 1 27 15.5V18" stroke="#5A32A3" strokeWidth="2" />
      <rect x="19.5" y="23" width="5" height="3" rx="1" fill="#E8D8F4" />
    </svg>
  );
}

function DetailsIllustration() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <defs>
        <clipPath id="ff-details-icon">
          <circle cx="22" cy="22" r="22" />
        </clipPath>
      </defs>
      <g clipPath="url(#ff-details-icon)">
        <circle cx="22" cy="22" r="22" fill="#E8D8F4" />
        <ellipse cx="22" cy="44" rx="17" ry="13.5" fill="#5A32A3" />
        <circle cx="22" cy="18.5" r="7.4" fill="#F0C9A6" />
        <path
          d="M14.6 19.2c.3-7.4 14.5-7.4 14.8 0C28.8 13.4 26 9.6 22 9.6s-6.8 3.8-7.4 9.6Z"
          fill="#3A2418"
        />
      </g>
    </svg>
  );
}

function LoanPrefsIllustration() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="22" fill="#E8D8F4" />
      <rect x="11" y="10" width="22" height="24" rx="3" fill="#5A32A3" />
      <rect x="14" y="14" width="12" height="2.2" rx="1" fill="#E8D8F4" />
      <rect x="14" y="19" width="16" height="2" rx="1" fill="#C4B0E2" />
      <rect x="14" y="23.5" width="16" height="2" rx="1" fill="#C4B0E2" />
      <rect x="14" y="28" width="10" height="2" rx="1" fill="#E8D8F4" />
    </svg>
  );
}

function propertyUseLabel(value: string) {
  const usage = normalizePropertyUsage(value);
  if (usage === "As an investment") return "Investment Property";
  if (usage === "To live-in") return "Owner occupier property";
  return usage;
}

function ReviewSummary({
  answers,
  onJump,
}: {
  answers: Record<string, string>;
  onJump: (id: FactFindScreenId) => void;
}) {
  const dash = (value?: string) => (value?.trim() ? value.trim() : "—");
  const moneyOrDash = (value: string | number) => {
    const raw = String(value ?? "").trim();
    if (!raw && typeof value !== "number") return "—";
    return formatMoney(value);
  };

  const incomes = parseIncomes(answers.incomesJson ?? "");
  const liabilities = parseLiabilities(answers.liabilitiesJson ?? "");
  const annualIncome = incomes.length > 0 ? incomesAnnualTotal(incomes) : Number(answers.annualIncome || 0);
  const monthlyExpenses = expensesMonthlyTotal(answers);
  const liabilityBalance = liabilitiesBalanceTotal(liabilities);
  const assetValue = assetsTotal(answers);
  const features = parseLoanFeatures(answers.loanFeatures ?? "");
  const looking = answers.hasPropertyInMind === "No";
  const postcodes = parsePropertyPostcodes(answers.propertyPostcodes ?? "");
  const propertyLocation = looking
    ? postcodes.length
      ? postcodes.join(", ")
      : "—"
    : dash(answers.propertySearchAddress || answers.suburb);
  const fullName = [answers.firstName, answers.middleName, answers.lastName].filter(Boolean).join(" ");

  const financeCards = [
    {
      label: "Annual income pre-tax",
      value: formatMoney(annualIncome),
      jump: "income" as const,
      icon: Coins,
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      label: "Monthly expenses",
      value: formatMoney(monthlyExpenses),
      jump: "expenses" as const,
      icon: ShoppingBag,
      iconClass: "bg-violet-50 text-[#5A32A3]",
    },
    {
      label: "Liabilities balance",
      value: formatMoney(liabilityBalance),
      jump: "debts" as const,
      icon: CreditCard,
      iconClass: "bg-fuchsia-50 text-fuchsia-600",
    },
    {
      label: "Assets value",
      value: formatMoney(assetValue),
      jump: "assets" as const,
      icon: Car,
      iconClass: "bg-violet-50 text-[#5A32A3]",
    },
  ];

  return (
    <div className="mt-6 space-y-4">
      <div>
        <h2 className="text-[13px] font-semibold text-slate-500">Total finances (customer declared)</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {financeCards.map((card) => (
            <div
              key={card.label}
              className="min-w-0 overflow-hidden rounded-2xl bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] ring-1 ring-black/5"
            >
              <p className="text-[12px] font-semibold text-slate-500">{card.label}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-[20px] font-bold tabular-nums tracking-tight text-slate-900">
                  {card.value}
                </p>
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    card.iconClass,
                  )}
                >
                  <card.icon className="h-5 w-5" />
                </span>
              </div>
              <button
                type="button"
                onClick={() => onJump(card.jump)}
                className="mt-3 text-[12px] font-semibold text-[#5A32A3] hover:underline"
              >
                More details
              </button>
            </div>
          ))}
        </div>
      </div>

      <ReviewSection title="Your property" onEdit={() => onJump("property-details")}>
        <ReviewRow label="Property use" value={dash(propertyUseLabel(answers.purpose ?? ""))} />
        <ReviewRow label={looking ? "Postcodes" : "Address"} value={propertyLocation} />
        <ReviewRow
          label="Status"
          value={
            answers.hasPropertyInMind === "Yes"
              ? "Property in mind"
              : looking
                ? "Still looking"
                : "—"
          }
        />
        <ReviewRow label="Property value" value={moneyOrDash(answers.purchasePrice ?? "")} />
      </ReviewSection>

      <ReviewSection title="Your details" onEdit={() => onJump("personal")}>
        <ReviewRow label="Title" value={dash(answers.title)} />
        <ReviewRow label="Name" value={dash(fullName)} />
        <ReviewRow label="Date of birth" value={formatReviewDate(answers.dob ?? "")} />
        <ReviewRow label="Gender" value={dash(answers.gender)} />
        <ReviewRow label="Residency status" value={dash(answers.residency)} />
        <ReviewRow label="Relationship status" value={dash(answers.marital)} />
        <ReviewRow label="Current residential address" value={dash(answers.currentAddress)} />
        <ReviewRow label="Living arrangement" value={dash(answers.livingArrangement)} />
        <ReviewRow label="Move in date" value={formatReviewDate(answers.moveInDate ?? "")} />
      </ReviewSection>

      <ReviewSection title="Your finances" onEdit={() => onJump("assets")}>
        <ReviewRow label="Assets — total value" value={formatMoney(assetValue)} />
        <ReviewRow label="Income" value={`${formatMoney(annualIncome)} per year`} />
        <ReviewRow label="Expenses" value={`${formatMoney(monthlyExpenses)} per month`} />
        <ReviewRow label="Liabilities — total balance" value={formatMoney(liabilityBalance)} />
      </ReviewSection>

      <ReviewSection title="Loan preferences" onEdit={() => onJump("loan-preferences")}>
        <ReviewRow
          label="Desired loan amount"
          value={answers.loanAmountUnsure === "1" ? "Unsure" : moneyOrDash(answers.desiredLoanAmount ?? "")}
        />
        <ReviewRow label="Rate type" value={dash(answers.rateType)} />
        <ReviewRow label="Repayment type" value={dash(answers.repaymentTypePref)} />
        <ReviewRow label="Loan term" value={dash(answers.loanTerm)} />
        <ReviewRow label="Repayment frequency" value={dash(answers.repaymentFrequency)} />
        <ReviewRow label="Loan features" value={features.length > 0 ? features.join(", ") : "—"} />
        <ReviewRow label="Other loan requirements" value={dash(answers.otherLoanRequirements)} />
      </ReviewSection>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)] ring-1 ring-black/5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-[12px] font-semibold text-[#5A32A3] hover:underline"
        >
          Edit
        </button>
      </div>
      <dl className="divide-y divide-slate-100">{children}</dl>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start gap-4 py-2.5">
      <dt className="text-[13px] font-medium text-slate-500">{label}</dt>
      <dd className="break-words text-right text-[13px] font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function formatReviewDate(value: string) {
  const full = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (full) return `${full[3]}/${full[2]}/${full[1]}`;
  const monthYear = value.trim().match(/^(\d{4})-(\d{2})/);
  if (monthYear) return `${monthYear[2]}/${monthYear[1]}`;
  return value.trim() || "—";
}
