"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OfflineLocationFields,
  initialOfflineLocation,
  resolveOfflineAddress,
  type OfflineKind,
} from "@/components/booking/OfflineLocationFields";
import { ConsultationCoverPicker } from "@/components/booking/ConsultationCoverPicker";
import { useMeetingPlatforms } from "@/lib/booking/conference-providers";
import type { ConsultationMode } from "@/lib/booking/types";
import {
  defaultOfficeAddress,
  type OnlineMeetingPlatform,
} from "@/lib/booking/meeting-platforms";

const BRAND = "var(--brand-primary)";

export type CalendarTypeChoice = {
  mode: ConsultationMode;
  title: string;
};

export type MeetingPlace = "online" | "offline" | "phone";

export type ConsultationDetailsValues = {
  name: string;
  durationMinutes: number;
  isFree: boolean;
  price: number;
  online: boolean;
  meetingPlace: MeetingPlace;
  platform: string;
  locationDetail: string;
  phoneDetail: string;
  coverImageUrl?: string;
};

export function modeSubtitle(choice: CalendarTypeChoice) {
  if (choice.mode === "group") return "Class booking";
  if (choice.mode === "collective") return "Collective";
  if (choice.mode === "resource") return "Resource";
  return "One on One";
}

export function ConsultationDetailsStep({
  choice,
  initial,
  onBack,
  onNext,
  onDraftChange,
}: {
  choice: CalendarTypeChoice;
  initial?: ConsultationDetailsValues;
  onBack: () => void;
  onNext: (values: ConsultationDetailsValues) => void;
  /** Every edit as typed (not yet validated), so it can be kept as a draft. */
  onDraftChange?: (values: ConsultationDetailsValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [hours, setHours] = useState(
    initial ? Math.floor(initial.durationMinutes / 60) : 0,
  );
  const [minutes, setMinutes] = useState(
    initial ? initial.durationMinutes % 60 : 30,
  );
  const [isFree, setIsFree] = useState(initial?.isFree ?? true);
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [priceDraft, setPriceDraft] = useState(() => {
    if (initial?.isFree === false && (initial.price ?? 0) > 0) {
      return String(initial.price);
    }
    return "";
  });
  const [meetingPlace, setMeetingPlace] = useState<MeetingPlace>(() => {
    const place =
      initial?.meetingPlace ??
      (initial?.online === false ? "offline" : "online");
    return place === "phone" ? "online" : place;
  });
  // Only the platforms that are actually integrated (CRM-reported).
  const meetingPlatforms = useMeetingPlatforms();
  const connectedPlatforms: OnlineMeetingPlatform[] = meetingPlatforms.platforms;
  const [platform, setPlatform] = useState(() => initial?.platform ?? "");
  const officeAddress = defaultOfficeAddress();
  const [offlineStart] = useState(() =>
    initialOfflineLocation(initial?.locationDetail ?? "", officeAddress),
  );
  const [offlineKind, setOfflineKind] = useState<OfflineKind>(offlineStart.kind);
  const [customAddress, setCustomAddress] = useState(offlineStart.custom);
  const [phoneDetail, setPhoneDetail] = useState(initial?.phoneDetail ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    initial?.coverImageUrl ?? "",
  );
  const [platformOpen, setPlatformOpen] = useState(false);
  const [platformQuery, setPlatformQuery] = useState("");
  const [error, setError] = useState("");

  const platforms = useMemo(() => {
    const q = platformQuery.trim().toLowerCase();
    if (!q) return connectedPlatforms;
    return connectedPlatforms.filter((item) =>
      item.toLowerCase().includes(q),
    );
  }, [connectedPlatforms, platformQuery]);

  // Once the integrated platforms are known, a choice that isn't one of
  // them (or none yet) falls back to the first that is.
  const platformChoice = connectedPlatforms.includes(platform as OnlineMeetingPlatform)
    ? platform
    : (connectedPlatforms[0] ?? "");

  const draftChange = useRef(onDraftChange);
  useEffect(() => {
    draftChange.current = onDraftChange;
  });
  useEffect(() => {
    const paid = Number(priceDraft);
    draftChange.current?.({
      name: name.trim(),
      durationMinutes: hours * 60 + minutes,
      isFree,
      price: isFree || !Number.isFinite(paid) ? 0 : paid,
      online: meetingPlace === "online",
      meetingPlace,
      platform,
      locationDetail:
        meetingPlace === "offline"
          ? resolveOfflineAddress(offlineKind, officeAddress, customAddress)
          : "",
      phoneDetail: phoneDetail.trim(),
      coverImageUrl: coverImageUrl || undefined,
    });
  }, [
    name,
    hours,
    minutes,
    isFree,
    priceDraft,
    meetingPlace,
    platform,
    offlineKind,
    officeAddress,
    customAddress,
    phoneDetail,
    coverImageUrl,
  ]);

  const heading = name.trim() || "Consultation title";
  const subtitle = modeSubtitle(choice);

  function submit() {
    if (!name.trim()) {
      setError("Consultation name is required");
      return;
    }
    const durationMinutes = hours * 60 + minutes;
    if (durationMinutes < 5) {
      setError("Duration must be at least 5 minutes");
      return;
    }
    const paidAmount = Number(priceDraft);
    if (
      !isFree &&
      (priceDraft.trim() === "" || !Number.isFinite(paidAmount) || paidAmount <= 0)
    ) {
      setError("Enter a price for paid consultations");
      return;
    }
    if (meetingPlace === "online" && !platformChoice) {
      setError(
        "No meeting platform integrated. Connect one in Settings → Integrations.",
      );
      return;
    }
    const offlineAddress =
      meetingPlace === "offline"
        ? resolveOfflineAddress(offlineKind, officeAddress, customAddress)
        : "";
    if (meetingPlace === "offline" && offlineKind !== "none" && !offlineAddress) {
      setError(
        offlineKind === "custom"
          ? "Enter a custom address or use your current location"
          : "Default office address is missing",
      );
      return;
    }
    onNext({
      name: name.trim(),
      durationMinutes,
      isFree,
      price: isFree ? 0 : paidAmount,
      online: meetingPlace === "online",
      meetingPlace,
      platform: meetingPlace === "online" ? platformChoice : platform,
      locationDetail: meetingPlace === "offline" ? offlineAddress : "",
      phoneDetail: phoneDetail.trim(),
      coverImageUrl: coverImageUrl || undefined,
    });
  }

  return (
    <div className="mx-auto w-full max-w-[720px] pb-8">
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <ConsultationCoverPicker
          value={coverImageUrl}
          onChange={(url) => {
            setCoverImageUrl(url);
            if (error) setError("");
          }}
        />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-slate-800">
            {heading}
          </p>
          <p className="text-[12px] text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-8 sm:py-7">
        <div className="mb-6 flex items-center gap-2.5">
          <span
            className="h-5 w-[3px] rounded-full"
            style={{ backgroundColor: BRAND }}
          />
          <h2 className="text-[13px] font-bold tracking-[0.08em] text-slate-700 uppercase">
            Consultation details
          </h2>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
              Consultation Name
              <span className="text-rose-500">*</span>
            </span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              className={cn(
                "h-11 w-full rounded-lg border bg-white px-3 text-[13px] text-slate-800 outline-none",
                error && !name.trim()
                  ? "border-rose-300"
                  : "border-[#E5E7EB] focus:border-[var(--brand-primary)]/45",
              )}
            />
          </label>

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-slate-700">
              Duration
            </p>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="h-11 w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white bg-[length:16px] bg-[right_12px_center] bg-no-repeat px-3 pr-9 text-[13px] text-slate-700 outline-none focus:border-[var(--brand-primary)]/45"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                }}
              >
                {Array.from({ length: 9 }, (_, i) => (
                  <option key={i} value={i}>
                    {i} {i === 1 ? "Hour" : "Hours"}
                  </option>
                ))}
              </select>
              <select
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="h-11 w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white bg-[length:16px] bg-[right_12px_center] bg-no-repeat px-3 pr-9 text-[13px] text-slate-700 outline-none focus:border-[var(--brand-primary)]/45"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                }}
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>
                    {m} Minutes
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-slate-700">
              Price
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setIsFree(true);
                    setPrice(0);
                    setPriceDraft("");
                  }}
                  className={cn(
                    "h-11 min-w-[88px] px-5 text-[13px] font-semibold",
                    isFree
                      ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                      : "text-slate-500 hover:bg-slate-50",
                  )}
                >
                  Free
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFree(false);
                    if (price <= 0) setPriceDraft("");
                  }}
                  className={cn(
                    "h-11 min-w-[88px] border-l border-[#E5E7EB] px-5 text-[13px] font-semibold",
                    !isFree
                      ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                      : "text-slate-500 hover:bg-slate-50",
                  )}
                >
                  Paid
                </button>
              </div>
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] font-medium text-slate-400">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Enter amount"
                  value={isFree ? "0" : priceDraft}
                  disabled={isFree}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    if (raw === "") {
                      setPriceDraft("");
                      setPrice(0);
                      return;
                    }
                    if (!/^\d*\.?\d{0,2}$/.test(raw)) return;
                    setPriceDraft(raw);
                    const next = Number(raw);
                    if (Number.isFinite(next) && next >= 0) setPrice(next);
                  }}
                  className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-white pr-3 pl-7 text-[13px] text-slate-700 outline-none focus:border-[var(--brand-primary)]/45 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-slate-700">
              Meeting Mode
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
              <div className="inline-flex overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
                {(
                  [
                    ["online", "Online"],
                    ["offline", "Offline"],
                  ] as const
                ).map(([value, label], i) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMeetingPlace(value);
                      setPlatformOpen(false);
                      if (error) setError("");
                    }}
                    className={cn(
                      "h-11 min-w-[88px] px-5 text-[13px] font-semibold",
                      i > 0 && "border-l border-[#E5E7EB]",
                      meetingPlace === value
                        ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                        : "text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {meetingPlace === "online" ? (
                meetingPlatforms.loading ? (
                  <div className="min-w-0 flex-1 rounded-lg border border-[#E5E7EB] bg-slate-50 px-3 py-2.5 text-[13px] text-slate-500">
                    Checking connected meeting platforms…
                  </div>
                ) : connectedPlatforms.length === 0 ? (
                  <div
                    role="alert"
                    className="min-w-0 flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5"
                  >
                    <p className="text-[13px] font-semibold text-rose-700">
                      No meeting platform integrated
                    </p>
                    <ul className="mt-1 space-y-0.5 text-[12px] text-rose-600">
                      {(meetingPlatforms.error
                        ? [meetingPlatforms.error]
                        : meetingPlatforms.unavailable.map(
                            (item) => item.reason ?? `${item.platform} is not connected.`,
                          )
                      ).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <a
                      href="/settings/integrations"
                      target="_blank"
                      rel="noopener"
                      className="mt-1.5 inline-block text-[12px] font-semibold text-rose-700 underline"
                    >
                      Open Settings → Integrations
                    </a>
                  </div>
                ) : (
                  <div className="relative min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setPlatformOpen((open) => !open)}
                      className="flex h-11 w-full items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-3 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <span>{platformChoice || "Choose a platform"}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-slate-400 transition-transform",
                          platformOpen && "rotate-180",
                        )}
                      />
                    </button>
                    {platformOpen ? (
                      <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
                        <div className="relative border-b border-slate-100">
                          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          <input
                            autoFocus
                            value={platformQuery}
                            onChange={(e) => setPlatformQuery(e.target.value)}
                            placeholder="Search"
                            className="h-10 w-full pr-3 pl-9 text-[13px] outline-none"
                          />
                        </div>
                        <ul className="max-h-48 overflow-auto py-1">
                          {platforms.map((item) => (
                            <li key={item}>
                              <button
                                type="button"
                                onClick={() => {
                                  setPlatform(item);
                                  setPlatformOpen(false);
                                  setPlatformQuery("");
                                }}
                                className={cn(
                                  "flex w-full px-3 py-2 text-left text-[13px]",
                                  item === platformChoice
                                    ? "bg-[var(--brand-primary-soft)] font-semibold text-[var(--brand-primary)]"
                                    : "text-slate-700 hover:bg-slate-50",
                                )}
                              >
                                {item}
                              </button>
                            </li>
                          ))}
                          {platforms.length === 0 ? (
                            <li className="px-3 py-3 text-[12px] text-slate-400">
                              No platforms match your search
                            </li>
                          ) : null}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )
              ) : (
                <OfflineLocationFields
                  kind={offlineKind}
                  onKindChange={(kind) => {
                    setOfflineKind(kind);
                    if (error) setError("");
                  }}
                  officeAddress={officeAddress}
                  address={customAddress}
                  onAddressChange={(address) => {
                    setCustomAddress(address);
                    if (error) setError("");
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-[12px] font-medium text-rose-600">{error}</p>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-10 min-w-[96px] rounded-lg border border-[#E5E7EB] bg-white px-6 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={submit}
          className="h-10 min-w-[96px] rounded-lg px-6 text-[13px] font-semibold text-white hover:brightness-110"
          style={{ backgroundColor: BRAND }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
