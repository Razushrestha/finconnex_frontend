"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, PenLine, Search } from "lucide-react";
import {
  reverseGeocode,
  searchAddresses,
  type AddressHit,
} from "@/lib/address/geocode";
import { cn } from "@/lib/utils";

export type ManualAddress = {
  line1: string;
  line2: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
};

export const EMPTY_MANUAL_ADDRESS: ManualAddress = {
  line1: "",
  line2: "",
  suburb: "",
  state: "",
  postcode: "",
  country: "",
};

const COUNTRIES = [
  "Australia",
  "New Zealand",
  "United Kingdom",
  "United States",
  "Canada",
  "India",
  "Singapore",
  "United Arab Emirates",
  "South Africa",
  "Ireland",
];

export function formatManualAddress(parts: ManualAddress): string {
  const locality = [parts.suburb, parts.state, parts.postcode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  return [parts.line1, parts.line2, locality, parts.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function hasManualParts(parts: ManualAddress) {
  return Object.values(parts).some((part) => part.trim());
}

export function RegisteredAddressField({
  label,
  value,
  parts,
  placeholder = "Search street, suburb, or postcode",
  help,
  onChange,
}: {
  label: string;
  value: string;
  parts: ManualAddress;
  placeholder?: string;
  help?: string;
  onChange: (formatted: string, parts: ManualAddress) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pickedRef = useRef(false);
  const userEditedRef = useRef(false);
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [query, setQuery] = useState(value);
  const [hits, setHits] = useState<AddressHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ManualAddress>(parts);
  const partsRef = useRef(parts);
  partsRef.current = parts;
  const partsKey = [
    parts.line1,
    parts.line2,
    parts.suburb,
    parts.state,
    parts.postcode,
    parts.country,
  ].join("\u0001");

  useEffect(() => {
    const current = partsRef.current;
    if (hasManualParts(current)) {
      setDraft(current);
      return;
    }
    if (mode === "manual" && value.trim()) {
      setDraft({ ...EMPTY_MANUAL_ADDRESS, line1: value });
      return;
    }
    setDraft(EMPTY_MANUAL_ADDRESS);
  }, [mode, partsKey, value]);

  useEffect(() => {
    setQuery((current) => {
      if (current === value) return current;
      userEditedRef.current = false;
      setOpen(false);
      setHits([]);
      setSearched(false);
      return value;
    });
  }, [value]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (mode !== "search" || !userEditedRef.current) return;
    if (pickedRef.current) {
      pickedRef.current = false;
      setHits([]);
      setSearched(false);
      return;
    }
    const q = query.trim();
    if (q.length < 3) {
      setHits([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      void searchAddresses(q)
        .then((next) => {
          setHits(next);
          setSearched(true);
          setOpen(true);
        })
        .catch(() => {
          setHits([]);
          setSearched(true);
          setOpen(true);
        })
        .finally(() => setLoading(false));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [mode, query]);

  function apply(hit: AddressHit) {
    pickedRef.current = true;
    const next: ManualAddress = {
      line1: hit.street || hit.label,
      line2: "",
      suburb: hit.suburb,
      state: hit.state,
      postcode: hit.postcode,
      country: hit.country || (hit.australia ? "Australia" : ""),
    };
    setQuery(hit.label);
    setDraft(next);
    setHits([]);
    setOpen(false);
    setSearched(false);
    setError(null);
    onChange(hit.label, next);
  }

  function enterManually() {
    setMode("manual");
    setOpen(false);
    setHits([]);
    setError(null);
    if (!hasManualParts(parts) && query.trim()) {
      const next = { ...EMPTY_MANUAL_ADDRESS, line1: query.trim() };
      setDraft(next);
      onChange(formatManualAddress(next), next);
    }
  }

  function updatePart(key: keyof ManualAddress, nextValue: string) {
    const next = { ...draft, [key]: nextValue };
    setDraft(next);
    onChange(formatManualAddress(next), next);
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
              setError("Could not find an address for this location. Enter it manually.");
              setMode("manual");
              return;
            }
            apply(hit);
          })
          .catch(() => {
            setLocating(false);
            setError("Could not look up this location. Enter the address manually.");
            setMode("manual");
          });
      },
      () => {
        setLocating(false);
        setError("Allow location access, or enter the address manually.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const showEmpty = open && searched && !loading && hits.length === 0 && query.trim().length >= 3;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-slate-700">{label}</span>
        {mode === "search" ? (
          <button
            type="button"
            onClick={enterManually}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:text-violet-900"
          >
            <PenLine className="h-3 w-3" />
            Enter manually
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMode("search");
              setError(null);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:text-violet-900"
          >
            <Search className="h-3 w-3" />
            Search address
          </button>
        )}
      </div>

      {mode === "manual" ? (
        <ManualAddressFields draft={draft} onChange={updatePart} />
      ) : (
        <div ref={wrapRef} className="relative">
          <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            autoComplete="off"
            onFocus={() => {
              if (hits.length > 0 || showEmpty) setOpen(true);
            }}
            onChange={(event) => {
              userEditedRef.current = true;
              setQuery(event.target.value);
              onChange(event.target.value, EMPTY_MANUAL_ADDRESS);
              setError(null);
              setOpen(true);
            }}
            placeholder={placeholder}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-20 pl-9 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
            <button
              type="button"
              onClick={useMyLocation}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-violet-700"
              aria-label="Use current location"
            >
              <LocateFixed className={cn("h-4 w-4", locating && "animate-pulse text-violet-600")} />
            </button>
            <Search className="mr-1 h-3.5 w-3.5 text-slate-300" />
          </span>
          {open && (hits.length > 0 || loading || showEmpty) ? (
            <ul className="absolute top-[calc(100%+6px)] right-0 left-0 z-30 max-h-56 overflow-auto rounded-xl bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
              {loading && hits.length === 0 ? (
                <li className="px-3.5 py-2.5 text-[12px] text-slate-400">Searching addresses…</li>
              ) : null}
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => apply(hit)}
                    className="block w-full px-3.5 py-2.5 text-left text-[13px] text-slate-800 hover:bg-violet-50"
                  >
                    {hit.label}
                  </button>
                </li>
              ))}
              {showEmpty ? (
                <li className="px-3.5 py-2.5">
                  <p className="text-[12px] text-slate-500">No matching address.</p>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={enterManually}
                    className="mt-1 text-[12px] font-semibold text-violet-700 hover:text-violet-900"
                  >
                    Enter “{query.trim()}” manually
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      )}
      {error ? <p className="text-[11px] text-rose-600">{error}</p> : null}
      {help ? <p className="text-[11px] text-slate-400">{help}</p> : null}
    </div>
  );
}

const MANUAL_FIELDS: {
  key: keyof ManualAddress;
  label: string;
  placeholder: string;
  optional?: boolean;
}[] = [
  { key: "line1", label: "Street address", placeholder: "100 Pitt Street" },
  {
    key: "line2",
    label: "Address line 2",
    placeholder: "Apartment, suite, unit, or floor",
    optional: true,
  },
  { key: "suburb", label: "Suburb / city / town", placeholder: "Sydney" },
  { key: "state", label: "State / province / region", placeholder: "NSW" },
  { key: "postcode", label: "Postcode / ZIP", placeholder: "2000" },
  { key: "country", label: "Country", placeholder: "Australia" },
];

function ManualAddressFields({
  draft,
  onChange,
}: {
  draft: ManualAddress;
  onChange: (key: keyof ManualAddress, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {MANUAL_FIELDS.map((field) => (
        <label
          key={field.key}
          className={cn(
            "block space-y-1.5",
            (field.key === "line1" || field.key === "line2") && "sm:col-span-2",
          )}
        >
          <span className="text-[12px] font-semibold text-slate-700">
            {field.label}
            {field.optional ? (
              <span className="ml-1 font-medium text-slate-400">Optional</span>
            ) : null}
          </span>
          {field.key === "country" ? (
            <>
              <input
                value={draft.country}
                list="registered-address-countries"
                onChange={(event) => onChange("country", event.target.value)}
                placeholder={field.placeholder}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <datalist id="registered-address-countries">
                {COUNTRIES.map((country) => (
                  <option key={country} value={country} />
                ))}
              </datalist>
            </>
          ) : (
            <input
              value={draft[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              placeholder={field.placeholder}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          )}
        </label>
      ))}
    </div>
  );
}
