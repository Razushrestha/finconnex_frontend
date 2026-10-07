"use client";

import { useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { SELECT_BG, SELECT_CLASS } from "@/components/booking/select-styles";
import type { BookingPage } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

/** "none" has no location. "office" uses the company address. "custom" is typed in. */
export type OfflineKind = "none" | "office" | "custom";

/**
 * The address saved on an in-person consultation. The setup wizard keeps it in
 * `meetingViaDetail` and the CRM keeps it in `location`; both placeholder
 * labels ("Office address", "In person") mean no address was ever entered.
 */
export function savedOfflineAddress(
  page: Pick<BookingPage, "meetingVia" | "meetingViaDetail" | "location">,
): string {
  if (page.meetingVia !== "in_person") return "";
  const detail = page.meetingViaDetail?.trim();
  if (detail && detail !== "Office address") return detail;
  const location = page.location?.trim();
  return location && location !== "In person" ? location : "";
}

/** None when nothing was saved, the office when that address was saved, otherwise custom. */
export function initialOfflineLocation(
  saved: string,
  officeAddress: string,
): { kind: OfflineKind; custom: string } {
  const address = saved.trim();
  if (!address || address === "None") return { kind: "none", custom: "" };
  if (address === officeAddress.trim()) return { kind: "office", custom: "" };
  return { kind: "custom", custom: address };
}

/** The address to save. None and an empty custom choice save as "". */
export function resolveOfflineAddress(
  kind: OfflineKind,
  officeAddress: string,
  custom: string,
): string {
  if (kind === "none") return "";
  return (kind === "office" ? officeAddress : custom).trim();
}

/** Street address for a position, or the coordinates when the lookup fails. */
export async function addressFromPosition(
  latitude: number,
  longitude: number,
): Promise<string> {
  const coordinates = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
    );
    if (!response.ok) throw new Error("lookup failed");
    const data = (await response.json()) as { display_name?: string };
    return data.display_name || coordinates;
  } catch {
    return coordinates;
  }
}

/**
 * What "Offline" shows: a location menu (None, Office address, Custom address).
 * None has no address line. Office and Custom show the address underneath.
 */
export function OfflineLocationFields({
  kind,
  onKindChange,
  officeAddress,
  address,
  onAddressChange,
  invalid = false,
}: {
  kind: OfflineKind;
  onKindChange: (kind: OfflineKind) => void;
  officeAddress: string;
  /** The typed address, used when `kind` is "custom". */
  address: string;
  onAddressChange: (address: string) => void;
  invalid?: boolean;
}) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  function fillFromCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser");
      return;
    }
    setLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const found = await addressFromPosition(
          position.coords.latitude,
          position.coords.longitude,
        );
        onAddressChange(found);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setGeoError("Could not read your location. Allow access and try again.");
      },
    );
  }

  return (
    <>
      <select
        aria-label="Location"
        value={kind}
        onChange={(event) => {
          setGeoError("");
          onKindChange(event.target.value as OfflineKind);
        }}
        className={cn(SELECT_CLASS, "w-auto min-w-[9.5rem] max-w-[14rem] flex-1")}
        style={{ backgroundImage: SELECT_BG }}
      >
        <option value="none">None</option>
        <option value="office">Office address</option>
        <option value="custom">Custom address</option>
      </select>

      {kind === "none" ? null : (
      <div className="w-full space-y-2">
        {kind === "office" ? (
          <div className="relative">
            <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              readOnly
              aria-label="Office address"
              title={officeAddress}
              value={officeAddress}
              className="h-10 w-full truncate rounded-lg border border-[#E5E7EB] bg-slate-50 pr-3 pl-9 text-[13px] text-slate-600"
            />
          </div>
        ) : (
          <>
            <div className="relative">
              <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Custom address"
                aria-invalid={invalid || undefined}
                value={address}
                onChange={(event) => onAddressChange(event.target.value)}
                placeholder="Search or enter an address"
                className={cn(
                  "h-10 w-full rounded-lg border bg-white pr-3 pl-9 text-[13px] text-slate-700 outline-none",
                  invalid
                    ? "border-rose-300 focus:border-rose-400"
                    : "border-[#E5E7EB] focus:border-[var(--brand-primary)]/45",
                )}
              />
            </div>
            <button
              type="button"
              onClick={fillFromCurrentLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--brand-primary)] hover:underline disabled:opacity-60"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              {locating ? "Finding location…" : "Use current location"}
            </button>
            {invalid ? (
              <p role="alert" className="text-[12px] font-medium text-rose-600">
                Enter an address or use your current location.
              </p>
            ) : null}
            {geoError ? (
              <p className="text-[12px] font-medium text-rose-600">{geoError}</p>
            ) : null}
          </>
        )}
      </div>
      )}
    </>
  );
}
