"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";

const BRAND = "var(--brand-primary)";
const VIEW = 280;
const OUT = 256;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read that image"));
    };
    reader.onerror = () => reject(new Error("Could not read that image"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load that image"));
    img.src = src;
  });
}

async function exportSquare(src: string, zoom: number, panX: number, panY: number) {
  const img = await loadImage(src);
  const minSide = Math.min(img.naturalWidth, img.naturalHeight);
  const visible = Math.max(8, minSide / zoom);
  const cx = img.naturalWidth / 2 - (panX / VIEW) * visible;
  const cy = img.naturalHeight / 2 - (panY / VIEW) * visible;
  const sx = Math.max(0, Math.min(img.naturalWidth - visible, cx - visible / 2));
  const sy = Math.max(0, Math.min(img.naturalHeight - visible, cy - visible / 2));
  const canvas = document.createElement("canvas");
  canvas.width = OUT;
  canvas.height = OUT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop the image");
  ctx.drawImage(img, sx, sy, visible, visible, 0, 0, OUT, OUT);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function ConsultationCoverPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be under 8 MB");
      return;
    }
    try {
      setError("");
      setDraft(await readFileAsDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open that image");
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e)}
      />
      <button
        type="button"
        onClick={() => {
          if (value) setDraft(value);
          else inputRef.current?.click();
        }}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg text-white transition hover:brightness-110"
        style={{ backgroundColor: BRAND }}
        title={value ? "Change consultation image" : "Upload consultation image"}
        aria-label={value ? "Change consultation image" : "Upload consultation image"}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-5 w-5" strokeWidth={2} />
        )}
      </button>
      {error ? (
        <span className="sr-only" role="alert">
          {error}
        </span>
      ) : null}
      {draft ? (
        <CoverAdjustModal
          src={draft}
          onCancel={() => setDraft(null)}
          onReplace={() => {
            setDraft(null);
            inputRef.current?.click();
          }}
          onApply={(next) => {
            onChange(next);
            setDraft(null);
          }}
        />
      ) : null}
    </>
  );
}

function CoverAdjustModal({
  src,
  onCancel,
  onReplace,
  onApply,
}: {
  src: string;
  onCancel: () => void;
  onReplace: () => void;
  onApply: (url: string) => void;
}) {
  const [zoom, setZoom] = useState(1.2);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!drag.current) return;
      setPan({
        x: drag.current.panX + (e.clientX - drag.current.x),
        y: drag.current.panY + (e.clientY - drag.current.y),
      });
    }
    function onUp() {
      drag.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-slate-900">Adjust image</h3>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          className="relative mx-auto overflow-hidden rounded-xl bg-slate-100"
          style={{ width: VIEW, height: VIEW, touchAction: "none" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            className="absolute top-1/2 left-1/2 max-w-none select-none"
            style={{
              height: `${zoom * 100}%`,
              width: "auto",
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
            }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-white/80" />
        </div>
        <label className="mt-4 block text-[12px] font-medium text-slate-600">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-1 w-full accent-[var(--brand-primary)]"
          />
        </label>
        <p className="mt-1 text-[11px] text-slate-400">
          Drag the photo to reposition it inside the square.
        </p>
        {error ? (
          <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onReplace}
            className="h-10 rounded-lg px-3 text-[13px] font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)]"
          >
            Choose another
          </button>
          <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-[#E5E7EB] px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setSaving(true);
              setError("");
              void exportSquare(src, zoom, pan.x, pan.y)
                .then(onApply)
                .catch((err) => {
                  setError(err instanceof Error ? err.message : "Could not save");
                  setSaving(false);
                });
            }}
            className={cn(
              "h-10 rounded-lg px-4 text-[13px] font-semibold text-white",
              saving && "opacity-70",
            )}
            style={{ backgroundColor: BRAND }}
          >
            {saving ? "Saving…" : "Apply"}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
