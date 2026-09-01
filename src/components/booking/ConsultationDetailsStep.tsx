"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, ChevronDown, LocateFixed, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsultationMode } from "@/lib/booking/types";
import {
  defaultOfficeAddress,
  integratedMeetingPlatforms,
  type OnlineMeetingPlatform,
} from "@/lib/booking/meeting-platforms";

const BRAND = "#5A32A3";

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

type OfflineKind = "office" | "custom";

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
  const [meetingPlace, setMeetingPlace] = useState<MeetingPlace>(() => {
    const place =
      initial?.meetingPlace ??
      (initial?.online === false ? "offline" : "online");
    return place === "phone" ? "online" : place;
  });
  const [connectedPlatforms, setConnectedPlatforms] = useState<
    OnlineMeetingPlatform[]
  >(() => integratedMeetingPlatforms());
  const [platform, setPlatform] = useState(() => {
    const list = integratedMeetingPlatforms();
    const preferred = initial?.platform;
    if (preferred && list.includes(preferred as OnlineMeetingPlatform)) {
      return preferred;
    }
    return list[0] ?? "";
  });
  const [locationDetail, setLocationDetail] = useState(
    initial?.locationDetail ?? "",
  );
  const [offlineKind, setOfflineKind] = useState<OfflineKind>("office");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");
  const officeAddress = defaultOfficeAddress();
  const [phoneDetail, setPhoneDetail] = useState(initial?.phoneDetail ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    initial?.coverImageUrl ?? "",
  );
  const [platformOpen, setPlatformOpen] = useState(false);
  const [platformQuery, setPlatformQuery] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const platforms = useMemo(() => {
    const q = platformQuery.trim().toLowerCase();
    if (!q) return connectedPlatforms;
    return connectedPlatforms.filter((item) =>
      item.toLowerCase().includes(q),
    );
  }, [connectedPlatforms, platformQuery]);

  useEffect(() => {
    refreshConnectedPlatforms(initial?.platform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshConnectedPlatforms(preferred?: string) {
    const list = integratedMeetingPlatforms();
    setConnectedPlatforms(list);
    setPlatform((current) => {
      const pick = preferred || current;
      if (list.includes(pick as OnlineMeetingPlatform)) return pick;
      return list[0] ?? "";
    });
  }

  const heading = name.trim() || "Consultation title";
  const subtitle = modeSubtitle(choice);

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCoverImageUrl(reader.result);
        if (error) setError("");
      }
    };
    reader.readAsDataURL(file);
  }

  function applyOfflineKind(kind: OfflineKind) {
    setOfflineKind(kind);
    setGeoError("");
    if (kind === "office") {
      setLocationDetail(officeAddress);
    } else if (!locationDetail || locationDetail === officeAddress) {
      setLocationDetail("");
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser");
      return;
    }
    setLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          );
          if (!response.ok) throw new Error("lookup failed");
          const data = (await response.json()) as { display_name?: string };
          setLocationDetail(
            data.display_name ||
              `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          );
        } catch {
          setLocationDetail(
            `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          );
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setGeoError("Could not read your location. Allow access and try again.");
      },
    );
  }

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
    if (meetingPlace === "online" && connectedPlatforms.length === 0) {
      setError(
        "You don’t have a meeting integration yet. Connect Zoom, Google Meet, or Microsoft Teams in Settings.",
      );
      return;
    }
    if (meetingPlace === "online" && !platform) {
      setError("Choose a connected meeting platform");
      return;
    }
    if (meetingPlace === "offline") {
      const address =
        offlineKind === "office" ? officeAddress : locationDetail.trim();
      if (!address) {
        setError(
          offlineKind === "custom"
            ? "Enter a custom address or use your current location"
            : "Default office address is missing",
        );
        return;
      }
    }
    onNext({
      name: name.trim(),
      durationMinutes,
      isFree,
      price: isFree ? 0 : price,
      online: meetingPlace === "online",
      meetingPlace,
      platform,
      locationDetail:
        meetingPlace === "offline" && offlineKind === "office"
          ? officeAddress
          : locationDetail.trim(),
      phoneDetail: phoneDetail.trim(),
      coverImageUrl: coverImageUrl || undefined,
    });
  }

  return (
    <div className="mx-auto w-full max-w-[720px] pb-8">
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImagePick}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg text-white transition hover:brightness-110"
          style={{ backgroundColor: BRAND }}
          title={
            coverImageUrl
              ? "Change consultation logo"
              : "Upload consultation logo"
          }
          aria-label={
            coverImageUrl
              ? "Change consultation logo"
              : "Upload consultation logo"
          }
        >
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="h-5 w-5" strokeWidth={2} />
          )}
        </button>
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
                  onClick={() => {
                    setIsFree(false);
                    setPrice((current) => Math.max(0, current));
                  }}
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
                  step="1"
                  inputMode="decimal"
                  value={price}
                  disabled={isFree}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (!Number.isFinite(next) || next < 0) {
                      setPrice(0);
                      return;
                    }
                    setPrice(next);
                  }}
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
                  ] as const
                ).map(([value, label], i) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMeetingPlace(value);
                      setPlatformOpen(false);
                      if (value === "online") refreshConnectedPlatforms();
                      if (value === "offline" && offlineKind === "office") {
                        setLocationDetail(officeAddress);
                      }
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
                connectedPlatforms.length === 0 ? (
                  <div className="min-w-0 flex-1 rounded-lg border border-dashed border-[#E5E7EB] bg-slate-50 px-3 py-2.5">
                    <p className="text-[13px] text-slate-600">
                      You don’t have a meeting integration yet. You’ll need to
                      connect Zoom, Google Meet, or Microsoft Teams to use
                      online meetings.
                    </p>
                    <Link
                      href="/settings/integrations"
                      className="mt-1 inline-block text-[12px] font-semibold text-[#5A32A3] hover:underline"
                    >
                      Go to Settings → Integrations
                    </Link>
                  </div>
                ) : (
                  <div className="relative min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        refreshConnectedPlatforms();
                        setPlatformOpen((open) => !open);
                      }}
                      className="flex h-11 w-full items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-3 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <span>{platform || "Choose a platform"}</span>
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
                                  item === platform
                                    ? "bg-[#F3ECFB] font-semibold text-[#5A32A3]"
                                    : "text-slate-700 hover:bg-slate-50",
                                )}
                              >
                                {item}
                              </button>
                            </li>
                          ))}
                          {platforms.length === 0 ? (
                            <li className="px-3 py-3 text-[12px] text-slate-400">
                              No connected platforms match your search
                            </li>
                          ) : null}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )
              ) : (
                <div className="min-w-0 flex-1 space-y-2">
                  <select
                    value={offlineKind}
                    onChange={(e) =>
                      applyOfflineKind(e.target.value as OfflineKind)
                    }
                    className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-[#5A32A3]/45"
                  >
                    <option value="office">Office address</option>
                    <option value="custom">Custom</option>
                  </select>
                  {offlineKind === "office" ? (
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        readOnly
                        value={officeAddress}
                        className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-slate-50 pr-3 pl-9 text-[13px] text-slate-600"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={locationDetail}
                          onChange={(e) => {
                            setLocationDetail(e.target.value);
                            if (error) setError("");
                          }}
                          placeholder="Search or enter an address"
                          className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-white pr-3 pl-9 text-[13px] text-slate-700 outline-none focus:border-[#5A32A3]/45"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={useCurrentLocation}
                        disabled={locating}
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#5A32A3] hover:underline disabled:opacity-60"
                      >
                        <LocateFixed className="h-3.5 w-3.5" />
                        {locating
                          ? "Finding location…"
                          : "Use current location"}
                      </button>
                      {geoError ? (
                        <p className="text-[12px] font-medium text-rose-600">
                          {geoError}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
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
