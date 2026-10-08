"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  FlipHorizontal2,
  FlipVertical2,
  Loader2,
  RotateCcw,
  RotateCw,
  Undo2,
  X,
} from "lucide-react";

import { useContentArea } from "@/hooks/useContentArea";
import { fitImageDataUrl } from "@/lib/booking/image-fit";
import { cn } from "@/lib/utils";

/** Crop box as fractions (0–1) of the rotated, mirrored image. */
type Crop = { x: number; y: number; w: number; h: number };
type Handle = "move" | "nw" | "ne" | "sw" | "se";

const FULL: Crop = { x: 0, y: 0, w: 1, h: 1 };
const MIN = 0.05;
/** Longest side the edited image is drawn at before it is fitted to the CRM limit. */
const WORK_PX = 2000;

const ASPECTS = [
  { id: "free", label: "Free", ratio: null },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "1:1", label: "1:1", ratio: 1 },
] as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be read."));
    image.src = src;
  });
}

/** The image rotated (quarter turns) and mirrored, at most WORK_PX on its long side. */
function transformed(
  image: HTMLImageElement,
  turns: number,
  flipX: boolean,
  flipY: boolean,
): HTMLCanvasElement {
  const scale = Math.min(
    1,
    WORK_PX / Math.max(image.naturalWidth, image.naturalHeight, 1),
  );
  const w = Math.max(1, Math.round(image.naturalWidth * scale));
  const h = Math.max(1, Math.round(image.naturalHeight * scale));
  const sideways = turns % 2 === 1;
  const canvas = document.createElement("canvas");
  canvas.width = sideways ? h : w;
  canvas.height = sideways ? w : h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((turns * Math.PI) / 2);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  return canvas;
}

/** A crop of `ratio` (width / height, in pixels), as large as fits, centred. */
function centredCrop(
  ratio: number | null,
  width: number,
  height: number,
): Crop {
  if (!ratio) return FULL;
  const imageRatio = width / height;
  if (ratio > imageRatio) {
    const h = imageRatio / ratio;
    return { x: 0, y: (1 - h) / 2, w: 1, h };
  }
  const w = ratio / imageRatio;
  return { x: (1 - w) / 2, y: 0, w, h: 1 };
}

const clamp = (value: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, value));

/**
 * Edits an image before it becomes a booking page background: crop (free or
 * a fixed shape), rotate, mirror, and how strongly it shows (opacity). The
 * crop, rotation and mirroring are drawn into the image; the opacity is
 * handed back as a separate value so it can be changed again later without
 * fading the image twice.
 */
export function ImageEditModal({
  src,
  opacity: initialOpacity,
  onCancel,
  onApply,
}: {
  src: string;
  opacity: number;
  onCancel: () => void;
  onApply: (result: { dataUrl: string; opacity: number }) => void;
}) {
  const area = useContentArea(true);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState("");
  const [turns, setTurns] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]["id"]>("free");
  const [crop, setCrop] = useState<Crop>(FULL);
  const [opacity, setOpacity] = useState(initialOpacity);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    start: Crop;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    loadImage(src)
      .then((img) => alive && setImage(img))
      .catch(
        (err: unknown) =>
          alive &&
          setLoadError(
            err instanceof Error
              ? err.message
              : "This image could not be read.",
          ),
      );
    return () => {
      alive = false;
    };
  }, [src]);

  // Redrawn whenever the rotation or mirroring changes.
  const preview = useMemo(() => {
    if (!image) return null;
    const canvas = transformed(image, turns, flipX, flipY);
    return {
      url: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  }, [image, turns, flipX, flipY]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const ratio = ASPECTS.find((item) => item.id === aspect)?.ratio ?? null;

  function chooseAspect(id: (typeof ASPECTS)[number]["id"]) {
    setAspect(id);
    if (!preview) return;
    setCrop(
      centredCrop(
        ASPECTS.find((item) => item.id === id)?.ratio ?? null,
        preview.width,
        preview.height,
      ),
    );
  }

  function rotate(by: 1 | -1) {
    setTurns((t) => (t + by + 4) % 4);
    // The image changes shape, so a fixed-shape crop is recentred.
    setCrop(FULL);
    setAspect("free");
  }

  function startDrag(handle: Handle, event: ReactPointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    drag.current = {
      handle,
      startX: event.clientX,
      startY: event.clientY,
      start: crop,
    };
  }

  function onDrag(event: ReactPointerEvent) {
    const state = drag.current;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!state || !rect || !preview) return;
    const dx = (event.clientX - state.startX) / rect.width;
    const dy = (event.clientY - state.startY) / rect.height;
    const s = state.start;
    if (state.handle === "move") {
      setCrop({
        ...s,
        x: clamp(s.x + dx, 0, 1 - s.w),
        y: clamp(s.y + dy, 0, 1 - s.h),
      });
      return;
    }
    const west = state.handle === "nw" || state.handle === "sw";
    const north = state.handle === "nw" || state.handle === "ne";
    const right = s.x + s.w;
    const bottom = s.y + s.h;
    let w = clamp(west ? s.w - dx : s.w + dx, MIN, west ? right : 1 - s.x);
    let h = clamp(north ? s.h - dy : s.h + dy, MIN, north ? bottom : 1 - s.y);
    if (ratio) {
      // Keep the chosen shape: height follows width, in pixel terms.
      const hForW = (w * preview.width) / ratio / preview.height;
      const maxH = north ? bottom : 1 - s.y;
      if (hForW <= maxH) h = Math.max(hForW, MIN);
      else {
        h = maxH;
        w = (h * preview.height * ratio) / preview.width;
      }
    }
    setCrop({ x: west ? right - w : s.x, y: north ? bottom - h : s.y, w, h });
  }

  function endDrag() {
    drag.current = null;
  }

  function reset() {
    setTurns(0);
    setFlipX(false);
    setFlipY(false);
    setAspect("free");
    setCrop(FULL);
    setOpacity(100);
  }

  async function apply() {
    if (!image) return;
    setSaving(true);
    setSaveError("");
    try {
      const full = transformed(image, turns, flipX, flipY);
      const sx = Math.round(crop.x * full.width);
      const sy = Math.round(crop.y * full.height);
      const sw = Math.max(1, Math.round(crop.w * full.width));
      const sh = Math.max(1, Math.round(crop.h * full.height));
      const out = document.createElement("canvas");
      out.width = sw;
      out.height = sh;
      out.getContext("2d")?.drawImage(full, sx, sy, sw, sh, 0, 0, sw, sh);
      // PNG keeps it lossless; fitImageDataUrl re-encodes it under the CRM's limit.
      const dataUrl = await fitImageDataUrl(out.toDataURL("image/png"));
      onApply({ dataUrl, opacity });
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "This image could not be saved.",
      );
      setSaving(false);
    }
  }

  if (typeof document === "undefined") return null;

  const tool =
    "inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50";

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
        aria-label="Edit background image"
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-[15px] font-semibold text-slate-900">
            Edit background image
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex min-h-[260px] items-center justify-center rounded-xl bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] bg-[length:20px_20px] p-3">
            {loadError ? (
              <p className="text-[13px] text-rose-600">{loadError}</p>
            ) : !preview ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : (
              <div
                ref={frameRef}
                className="relative max-w-full touch-none select-none"
                style={{
                  aspectRatio: `${preview.width} / ${preview.height}`,
                  height: "min(380px, 34vh)",
                }}
                onPointerMove={onDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a data URL preview */}
                <img
                  src={preview.url}
                  alt=""
                  draggable={false}
                  className="h-full w-full"
                  style={{ opacity: opacity / 100 }}
                />
                {/* Everything outside the crop is dimmed, within the image only. */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div
                    className="absolute shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]"
                    style={{
                      left: `${crop.x * 100}%`,
                      top: `${crop.y * 100}%`,
                      width: `${crop.w * 100}%`,
                      height: `${crop.h * 100}%`,
                    }}
                  />
                </div>
                <div
                  className="absolute border-2 border-white"
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.w * 100}%`,
                    height: `${crop.h * 100}%`,
                    cursor: "move",
                  }}
                  onPointerDown={(e) => startDrag("move", e)}
                >
                  {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                    <span
                      key={corner}
                      onPointerDown={(e) => startDrag(corner, e)}
                      aria-hidden
                      className={cn(
                        "absolute h-3.5 w-3.5 rounded-sm border-2 border-white bg-[var(--brand-primary)]",
                        corner === "nw" && "-top-2 -left-2 cursor-nwse-resize",
                        corner === "ne" && "-top-2 -right-2 cursor-nesw-resize",
                        corner === "sw" &&
                          "-bottom-2 -left-2 cursor-nesw-resize",
                        corner === "se" &&
                          "-right-2 -bottom-2 cursor-nwse-resize",
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-3">
            <div>
              <p className="mb-2 text-[12px] font-semibold text-slate-700">
                Crop
              </p>
              <div className="flex flex-wrap gap-2">
                {ASPECTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => chooseAspect(item.id)}
                    aria-pressed={aspect === item.id}
                    className={cn(
                      tool,
                      aspect === item.id &&
                        "border-[var(--brand-primary)] bg-[var(--brand-primary-faint)] text-[var(--brand-primary)]",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[12px] font-semibold text-slate-700">
                Rotate &amp; mirror
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={tool}
                  onClick={() => rotate(-1)}
                >
                  <RotateCcw className="h-4 w-4" /> Rotate left
                </button>
                <button
                  type="button"
                  className={tool}
                  onClick={() => rotate(1)}
                >
                  <RotateCw className="h-4 w-4" /> Rotate right
                </button>
                <button
                  type="button"
                  className={cn(
                    tool,
                    flipX &&
                      "border-[var(--brand-primary)] text-[var(--brand-primary)]",
                  )}
                  aria-pressed={flipX}
                  onClick={() => setFlipX((v) => !v)}
                >
                  <FlipHorizontal2 className="h-4 w-4" /> Mirror
                </button>
                <button
                  type="button"
                  className={cn(
                    tool,
                    flipY &&
                      "border-[var(--brand-primary)] text-[var(--brand-primary)]",
                  )}
                  aria-pressed={flipY}
                  onClick={() => setFlipY((v) => !v)}
                >
                  <FlipVertical2 className="h-4 w-4" /> Flip vertical
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="bg-opacity"
                  className="text-[12px] font-semibold text-slate-700"
                >
                  Opacity
                </label>
                <span className="text-[12px] tabular-nums text-slate-500">
                  {opacity}%
                </span>
              </div>
              <input
                id="bg-opacity"
                type="range"
                min={0}
                max={100}
                step={1}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full accent-[var(--brand-primary)]"
              />
            </div>
          </div>
          {saveError ? (
            <p className="mt-3 text-[12px] text-rose-600">{saveError}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <button type="button" className={tool} onClick={reset}>
            <Undo2 className="h-4 w-4" /> Reset
          </button>
          <div className="flex gap-2">
            <button type="button" className={tool} onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void apply()}
              disabled={!image || saving}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 text-[12px] font-semibold text-white hover:bg-[var(--brand-primary-strong)] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
