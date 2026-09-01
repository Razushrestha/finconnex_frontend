"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Search, X } from "lucide-react";
import {
  reverseGeocode,
  searchAddresses,
  type AddressHit,
} from "@/lib/address/geocode";
import { cn } from "@/lib/utils";

export function GeoAddressField({
  label,
  value,
  disabled,
  placeholder = "Start typing a street address",
  required,
  invalid,
  onChange,
  onPick,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
  onPick: (hit: AddressHit) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pickedRef = useRef(false);
  const [query, setQuery] = useState(value);
  const [hits, setHits] = useState<AddressHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (pickedRef.current) {
      pickedRef.current = false;
      setHits([]);
      return;
    }
    const q = query.trim();
    if (q.length < 3) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      void searchAddresses(q)
        .then((next) => {
          setHits(next);
          setOpen(true);
        })
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  function apply(hit: AddressHit) {
    pickedRef.current = true;
    setQuery(hit.label);
    setHits([]);
    setOpen(false);
    setError(null);
    onPick(hit);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Location is not available in this browser");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void reverseGeocode(position.coords.latitude, position.coords.longitude)
          .then((hit) => {
            setLocating(false);
            if (!hit) {
              setError("Could not find an address for this location");
              return;
            }
            apply(hit);
          })
          .catch(() => {
            setLocating(false);
            setError("Could not look up this location");
          });
      },
      () => {
        setLocating(false);
        setError("Allow location access to fill the address");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <label className="block" data-invalid={invalid || undefined}>
      <span className={cn("mb-2 block text-[13px] font-semibold", invalid ? "text-rose-700" : "text-slate-900")}>
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <div ref={wrapRef} className="relative">
        <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#5A32A3]" />
        <input
          value={query}
          disabled={disabled}
          autoComplete="off"
          onFocus={() => {
            if (hits.length > 0) setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setError(null);
            setOpen(true);
          }}
          placeholder={placeholder}
          className={cn(
            "h-12 w-full rounded-lg bg-white pr-20 pl-9 text-[14px] text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.07)] outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-[#5A32A3] disabled:bg-slate-50",
            invalid && "ring-2 ring-rose-400",
          )}
        />
        <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5">
          {query ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setQuery("");
                setHits([]);
                onChange("");
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
              aria-label="Clear address"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={useMyLocation}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-[#5A32A3]"
            aria-label="Use current location"
          >
            <LocateFixed className={cn("h-4 w-4", locating && "animate-pulse text-[#5A32A3]")} />
          </button>
          <Search className="h-4 w-4 text-slate-400" />
        </span>
        {open && (hits.length > 0 || loading) ? (
          <ul className="absolute top-[calc(100%+6px)] right-0 left-0 z-30 max-h-56 overflow-auto rounded-xl bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
            {loading && hits.length === 0 ? (
              <li className="px-3.5 py-2.5 text-[12px] text-slate-400">Searching addresses…</li>
            ) : (
              hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => apply(hit)}
                    className={cn(
                      "block w-full px-3.5 py-2.5 text-left text-[13px] hover:bg-violet-50",
                      hit.label === value && "bg-violet-50",
                    )}
                  >
                    {hit.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      {error ? <p className="mt-1.5 text-[12px] text-rose-600">{error}</p> : null}
      {invalid ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">Required</p> : null}
      <p className="mt-1.5 text-[11px] text-slate-400">
        Type a street address and choose a result, or use your current location.
      </p>
    </label>
  );
}
