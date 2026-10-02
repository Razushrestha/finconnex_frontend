"use client";

import { useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { SELECT_BG, SELECT_CLASS } from "@/components/booking/select-styles";
import type { BookingPage } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

/** "office" uses the company address; "custom" is typed in or read from the browser. */
export type OfflineKind = "office" | "custom";

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

/** Start on the office address unless a different address was saved. */
export function initialOfflineLocation(
  saved: string,
  officeAddress: string,
): { kind: OfflineKind; custom: string } {
  const address = saved.trim();
  return address && address !== officeAddress.trim()
    ? { kind: "custom", custom: address }
    : { kind: "office", custom: "" };
}

/** The address to save, or "" when "Custom" is chosen but nothing is typed. */
export function resolveOfflineAddress(
  kind: OfflineKind,
  officeAddress: string,
  custom: string,
): string {
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
 * What "Offline" shows for a meeting's location, like the setup wizard: an
 * "Office address" / "Custom" dropdown, then the address on its own line.
 *
 * Meant to sit inside a wrapping flex row after the Online/Offline toggle. The
 * dropdown fills the rest of that row and the address drops to the next line.
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
        className={cn(SELECT_CLASS, "w-auto min-w-[9.5rem] flex-1")}
        style={{ backgroundImage: SELECT_BG }}
      >
        <option value="office">Office address</option>
        <option value="custom">Custom</option>
      </select>

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
                    : "border-[#E5E7EB] focus:border-[#5A32A3]/45",
                )}
              />
            </div>
            <button
              type="button"
              onClick={fillFromCurrentLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#5A32A3] hover:underline disabled:opacity-60"
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
    </>
  );
}
