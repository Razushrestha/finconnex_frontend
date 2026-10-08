"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { currentLocationAddress } from "@/lib/geo/current-address";
import { cn } from "@/lib/utils";

/** "Use current location": looks up where the browser is and hands back the address. */
export function UseCurrentLocationButton({
  onAddress,
  className,
}: {
  onAddress: (address: string) => void;
  className?: string;
}) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  async function locate() {
    setLocating(true);
    setError("");
    try {
      onAddress(await currentLocationAddress());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read your location.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className={cn("space-y-1", className)}>
      <button
        type="button"
        onClick={() => void locate()}
        disabled={locating}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:text-violet-800 disabled:opacity-60"
      >
        <LocateFixed className="h-3.5 w-3.5" />
        {locating ? "Finding location…" : "Use current location"}
      </button>
      {error ? (
        <p className="text-[11px] font-medium text-rose-500">{error}</p>
      ) : null}
    </div>
  );
}
