"use client";

import { useMemo, useState } from "react";
import { Aperture, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsultationMode } from "@/lib/booking/types";

const BRAND = "#5A32A3";

const PLATFORMS = [
  "Zoho Meeting",
  "Google Meet",
  "Zoom",
  "Microsoft Teams",
  "Phone",
  "Custom",
] as const;

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
};

export function modeSubtitle(choice: CalendarTypeChoice) {
  if (choice.mode === "group") return "Class booking";
  if (choice.mode === "collective") return "Collective";
  if (choice.mode === "resource") return "Resource";
  return "One-to-One";
}

export function ConsultationDetailsStep({
  choice,
  initial,
  onBack,
  onNext,
}: {
  choice: CalendarTypeChoice;
  initial?: ConsultationDetailsValues;
  onBack: () => void;
  onNext: (values: ConsultationDetailsValues) => void;
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
  const [meetingPlace, setMeetingPlace] = useState<MeetingPlace>(
    initial?.meetingPlace ?? (initial?.online === false ? "offline" : "online"),
  );
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>(
    (initial?.platform as (typeof PLATFORMS)[number]) ?? "Zoho Meeting",
  );
  const [locationDetail, setLocationDetail] = useState(
    initial?.locationDetail ?? "",
  );
  const [phoneDetail, setPhoneDetail] = useState(initial?.phoneDetail ?? "");
  const [platformOpen, setPlatformOpen] = useState(false);
  const [platformQuery, setPlatformQuery] = useState("");
  const [error, setError] = useState("");

  const platforms = useMemo(() => {
    const q = platformQuery.trim().toLowerCase();
    if (!q) return PLATFORMS;
    return PLATFORMS.filter((p) => p.toLowerCase().includes(q));
  }, [platformQuery]);

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
    if (!isFree && price <= 0) {
      setError("Enter a price for paid consultations");
      return;
    }
    if (meetingPlace === "phone" && !phoneDetail.trim()) {
      setError("Enter a phone number");
      return;
    }
    onNext({
      name: name.trim(),
      durationMinutes,
      isFree,
      price: isFree ? 0 : price,
      online: meetingPlace === "online",
      meetingPlace,
      platform,
      locationDetail: locationDetail.trim(),
      phoneDetail: phoneDetail.trim(),
    });
  }

  return (
    <div className="mx-auto w-full max-w-[720px] pb-8">
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: BRAND }}
        >
          <Aperture className="h-5 w-5" />
        </span>
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
                  : "border-[#E5E7EB] focus:border-[#5A32A3]/45",
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
                className="h-11 w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white bg-[length:16px] bg-[right_12px_center] bg-no-repeat px-3 pr-9 text-[13px] text-slate-700 outline-none focus:border-[#5A32A3]/45"
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
                className="h-11 w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white bg-[length:16px] bg-[right_12px_center] bg-no-repeat px-3 pr-9 text-[13px] text-slate-700 outline-none focus:border-[#5A32A3]/45"
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
                  }}
                  className={cn(
                    "h-11 min-w-[88px] px-5 text-[13px] font-semibold",
                    isFree
                      ? "bg-[#F3ECFB] text-[#5A32A3]"
                      : "text-slate-500 hover:bg-slate-50",
                  )}
                >
                  Free
                </button>
                <button
                  type="button"
                  onClick={() => setIsFree(false)}
                  className={cn(
                    "h-11 min-w-[88px] border-l border-[#E5E7EB] px-5 text-[13px] font-semibold",
                    !isFree
                      ? "bg-[#F3ECFB] text-[#5A32A3]"
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
                  type="number"
                  min={0}
                  value={price}
                  disabled={isFree}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                  className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-white pr-3 pl-7 text-[13px] text-slate-700 outline-none focus:border-[#5A32A3]/45 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-slate-700">
              Meeting Mode
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="inline-flex overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
                {(
                  [
                    ["online", "Online"],
                    ["offline", "Offline"],
                    ["phone", "Phone"],
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
                        ? "bg-[#F3ECFB] text-[#5A32A3]"
                        : "text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {meetingPlace === "online" ? (
                <div className="relative min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setPlatformOpen((v) => !v)}
                    className="flex h-11 w-full items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-3 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span>{platform}</span>
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
                        {platforms.map((p) => (
                          <li key={p}>
                            <button
                              type="button"
                              onClick={() => {
                                setPlatform(p);
                                setPlatformOpen(false);
                                setPlatformQuery("");
                              }}
                              className={cn(
                                "flex w-full px-3 py-2 text-left text-[13px]",
                                p === platform
                                  ? "bg-[#F3ECFB] font-semibold text-[#5A32A3]"
                                  : "text-slate-700 hover:bg-slate-50",
                              )}
                            >
                              {p}
                            </button>
                          </li>
                        ))}
                        {platforms.length === 0 ? (
                          <li className="px-3 py-3 text-[12px] text-slate-400">
                            No platforms
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : meetingPlace === "offline" ? (
                <input
                  value={locationDetail}
                  onChange={(e) => setLocationDetail(e.target.value)}
                  placeholder="Office address or room"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-[#5A32A3]/45"
                />
              ) : (
                <input
                  type="tel"
                  value={phoneDetail}
                  onChange={(e) => {
                    setPhoneDetail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Phone number"
                  className={cn(
                    "h-11 min-w-0 flex-1 rounded-lg border bg-white px-3 text-[13px] text-slate-700 outline-none",
                    error && !phoneDetail.trim()
                      ? "border-rose-300"
                      : "border-[#E5E7EB] focus:border-[#5A32A3]/45",
                  )}
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
