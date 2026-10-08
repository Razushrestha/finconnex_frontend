"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, X } from "lucide-react";

import { useContentArea } from "@/hooks/useContentArea";
import {
  searchLibraryImages,
  type LibraryImage,
} from "@/lib/booking/background-library";
import { cn } from "@/lib/utils";

const SUGGESTED = [
  "Office",
  "Nature",
  "City",
  "Ocean",
  "Mountains",
  "Abstract",
  "Minimal",
  "Flowers",
];

/**
 * Pick a free background photo by keyword. The photos are StockSnap's (all
 * CC0, found through Openverse); picking one keeps only its web address and
 * the photographer's credit.
 */
export function BackgroundLibraryModal({
  onCancel,
  onPick,
}: {
  onCancel: () => void;
  onPick: (image: LibraryImage) => void;
}) {
  const area = useContentArea(true);
  const [query, setQuery] = useState("");
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  function run(q: string, nextPage: number) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    searchLibraryImages(q, nextPage, controller.signal)
      .then((result) => {
        setImages((prev) =>
          nextPage === 1 ? result.images : [...prev, ...result.images],
        );
        setHasMore(result.hasMore);
        setPage(nextPage);
        setSearched(q.trim());
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : "The image library could not be reached.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }

  // Search as the keywords are typed, after a short pause.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const timer = window.setTimeout(() => run(q, 1), 600);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  if (typeof document === "undefined") return null;

  return createPortal(
    // Over the working area beside the sidebar, never over the sidebar.
    <div
      className={cn(
        "fixed z-[1000] flex items-center justify-center bg-slate-900/50 p-4",
        !area && "inset-0",
      )}
      style={area ?? undefined}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose a background photo"
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              Choose a background photo
            </h2>
            <p className="text-[11px] text-slate-500">

              Free CC0 photos from StockSnap. Only the link is saved; the photo

              loads from StockSnap, with a small credit on the page.

            </p>

            <p className="mt-0.5 text-[11px] font-medium text-amber-700">

              Check the photo suits commercial use; avoid recognisable people and

              logos.

            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) run(query, 1);
              }}
              placeholder="Type keywords, e.g. office, beach, city at night"
              aria-label="Search photos"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-[13px] outline-none focus:border-[var(--brand-primary)]"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTED.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => setQuery(word)}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
              >
                {word}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[240px] flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="mb-3 text-[12px] text-rose-600">{error}</p>
          ) : null}
          {!searched && !loading ? (
            <p className="py-10 text-center text-[13px] text-slate-400">
              Type a few words or pick a suggestion to see photos.
            </p>
          ) : null}
          {searched && !loading && images.length === 0 && !error ? (
            <p className="py-10 text-center text-[13px] text-slate-400">
              No photos found for “{searched}”. Try other words.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => onPick(image)}
                title={image.title}
                className="group relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100 hover:ring-2 hover:ring-[var(--brand-primary)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote library thumbnail */}
                <img
                  src={image.thumbnailUrl}
                  alt={image.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
            ))}
          </div>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : hasMore && images.length > 0 ? (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => run(searched, page + 1)}
                className="h-9 rounded-lg border border-slate-200 px-4 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Load more
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
