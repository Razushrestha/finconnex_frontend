"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cropAvatarToDataUrl } from "@/lib/broker-hub/avatar";

const FRAME = 240;

function containScale(width: number, height: number) {
  return Math.min(FRAME / Math.max(width, 1), FRAME / Math.max(height, 1));
}

function clampOffset(
  offset: { x: number; y: number },
  drawW: number,
  drawH: number,
) {
  const limitX =
    drawW < FRAME ? (FRAME - drawW) / 2 : (drawW - FRAME) / 2;
  const limitY =
    drawH < FRAME ? (FRAME - drawH) / 2 : (drawH - FRAME) / 2;
  return {
    x: Math.min(limitX, Math.max(-limitX, offset.x)),
    y: Math.min(limitY, Math.max(-limitY, offset.y)),
  };
}

export function AvatarAdjustDialog({
  source,
  onClose,
  onApply,
}: {
  source: string;
  onClose: () => void;
  onApply: (dataUrl: string) => void;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNatural(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }, [source]);

  const base = natural ? containScale(natural.w, natural.h) : 1;
  const scale = base * zoom;
  const drawW = natural ? natural.w * scale : 0;
  const drawH = natural ? natural.h * scale : 0;

  function applyZoom(next: number) {
    setZoom(next);
    if (!natural) return;
    const nextScale = containScale(natural.w, natural.h) * next;
    setOffset((current) =>
      clampOffset(current, natural.w * nextScale, natural.h * nextScale),
    );
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-labelledby="avatar-adjust-title"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <h3 id="avatar-adjust-title" className="text-[15px] font-semibold text-slate-900">
          Adjust photo
        </h3>
        <p className="mt-1 text-[13px] text-slate-500">
          Drag to reposition. Use the slider to resize.
        </p>

        <div className="mt-4 flex justify-center">
          <div
            className="relative h-60 w-60 cursor-grab touch-none overflow-hidden rounded-full bg-slate-100 ring-4 ring-violet-100 active:cursor-grabbing"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = {
                x: event.clientX,
                y: event.clientY,
                ox: offset.x,
                oy: offset.y,
              };
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || !natural) return;
              setOffset(
                clampOffset(
                  {
                    x: drag.ox + (event.clientX - drag.x),
                    y: drag.oy + (event.clientY - drag.y),
                  },
                  drawW,
                  drawH,
                ),
              );
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={source}
              alt=""
              draggable={false}
              onLoad={(event) => {
                setNatural({
                  w: event.currentTarget.naturalWidth,
                  h: event.currentTarget.naturalHeight,
                });
              }}
              className="absolute max-w-none select-none"
              style={{
                width: drawW || undefined,
                height: drawH || undefined,
                left: (FRAME - drawW) / 2 + offset.x,
                top: (FRAME - drawH) / 2 + offset.y,
              }}
            />
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 flex items-center justify-between text-[13px] font-medium text-slate-700">
            Resize
            <span className="font-normal text-slate-400">{Math.round(zoom * 100)}%</span>
          </span>
          <input
            type="range"
            min={0.6}
            max={3}
            step={0.02}
            value={zoom}
            onChange={(event) => applyZoom(Number(event.target.value))}
            className="w-full accent-violet-600"
            aria-label="Resize photo"
          />
        </label>

        {error ? (
          <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!natural}
            onClick={() => {
              const current = imageRef.current;
              if (!current) return;
              try {
                onApply(cropAvatarToDataUrl(current, FRAME, scale, offset.x, offset.y));
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not process image");
              }
            }}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
