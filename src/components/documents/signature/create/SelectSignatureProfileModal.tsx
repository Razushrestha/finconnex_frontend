"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Eraser, Image as ImageIcon, PenLine, Type, X } from "lucide-react";
import {
  loadSavedSenderProfile,
  saveSavedSenderProfile,
  type SavedSenderProfile,
} from "@/lib/documents/signature/saved-sender-profile";
import { cn } from "@/lib/utils";

const SCRIPT_STYLES = [
  {
    id: "elegant",
    signature: "font-serif italic",
    initial: "font-serif italic",
  },
  {
    id: "cursive",
    signature: "italic",
    initial: "italic",
    family: "Segoe Script, Brush Script MT, cursive",
  },
  {
    id: "formal",
    signature: "font-serif italic tracking-wide",
    initial: "font-serif italic tracking-wide",
  },
] as const;

type Tab = "type" | "draw" | "upload";
type Screen = "profile" | "editor";

export type SignatureProfilePayload = SavedSenderProfile;

export function SelectSignatureProfileModal({
  open,
  fieldType,
  existingValue,
  onClose,
  onUse,
}: {
  open: boolean;
  fieldType: "signature" | "initials" | "stamp" | "company" | "job_title";
  existingValue?: string;
  onClose: () => void;
  onUse: (payload: SignatureProfilePayload) => void;
}) {
  const [screen, setScreen] = useState<Screen>("profile");
  const [tab, setTab] = useState<Tab>("draw");
  const [profile, setProfile] = useState("default");
  const [signatureText, setSignatureText] = useState("Your signature");
  const [initialText, setInitialText] = useState("Your initial");
  const [styleId, setStyleId] = useState<(typeof SCRIPT_STYLES)[number]["id"]>(
    "elegant",
  );
  const [uploaded, setUploaded] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [saved, setSaved] = useState<SavedSenderProfile>({
    signature: "",
    initial: "",
    company: "",
    jobTitle: "",
    stamp: "",
  });

  useEffect(() => {
    if (!open) return;
    const stored = loadSavedSenderProfile();
    const raw = existingValue?.trim() ?? "";
    const next = { ...stored };
    if (raw) {
      if (fieldType === "initials") next.initial = raw;
      else if (fieldType === "stamp") next.stamp = raw;
      else if (fieldType === "company") next.company = raw;
      else if (fieldType === "job_title") next.jobTitle = raw;
      else next.signature = raw;
    }
    setSaved(next);
    setScreen("profile");
    setTab("draw");
    setHasInk(Boolean((next.signature || raw).trim()));
    if ((next.signature || raw).startsWith("data:")) {
      setUploaded(next.signature || raw);
    } else {
      setUploaded(null);
    }
    if ((next.signature || raw).startsWith("typed:")) {
      const text = (next.signature || raw)
        .replace(/^typed:/, "")
        .replace(/\|style:.*$/, "");
      if (fieldType === "initials") setInitialText(text || "Your initial");
      else setSignatureText(text || "Your signature");
    }
  }, [open, existingValue, fieldType]);

  useEffect(() => {
    if (!open || screen !== "editor" || tab !== "draw") return;
    let cancelled = false;
    const raw = (existingValue?.trim() || saved.signature || "").trim();

    const paintPrevious = (
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D,
      cssWidth: number,
      cssHeight: number,
    ) => {
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      if (raw.startsWith("data:")) {
        const image = new Image();
        image.onload = () => {
          if (cancelled) return;
          const scale = Math.min(
            cssWidth / Math.max(image.width, 1),
            cssHeight / Math.max(image.height, 1),
            1,
          );
          const drawW = image.width * scale;
          const drawH = image.height * scale;
          const dx = (cssWidth - drawW) / 2;
          const dy = (cssHeight - drawH) / 2;
          ctx.drawImage(image, dx, dy, drawW, drawH);
          setHasInk(true);
        };
        image.src = raw;
        return;
      }
      if (raw.startsWith("typed:")) {
        const text = raw.replace(/^typed:/, "").replace(/\|style:.*$/, "");
        ctx.fillStyle = "#1f2937";
        ctx.font = `32px "Segoe Script", "Brush Script MT", cursive`;
        ctx.textBaseline = "middle";
        ctx.fillText(text || "Signature", 28, cssHeight / 2);
        setHasInk(true);
      }
    };

    const setup = (attempts = 0) => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        if (attempts < 20) requestAnimationFrame(() => setup(attempts + 1));
        return;
      }
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) {
        if (attempts < 20) requestAnimationFrame(() => setup(attempts + 1));
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1f2937";
      paintPrevious(canvas, ctx, rect.width, rect.height);
    };

    const frame = requestAnimationFrame(() => setup());
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [open, tab, screen, existingValue, saved.signature]);

  if (!open) return null;

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function clearDrawing() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f2937";
    drawing.current = false;
    setHasInk(false);
  }

  function persistProfile(patch: Partial<SavedSenderProfile>) {
    const next = { ...saved, ...patch };
    setSaved(next);
    saveSavedSenderProfile(next);
    return next;
  }

  function captureEditorSignature() {
    const selected = SCRIPT_STYLES.find((item) => item.id === styleId);
    const signatureTyped = `typed:${signatureText.trim() || "Your signature"}`;
    const initialTyped = `typed:${initialText.trim() || "Your initial"}`;

    if (tab === "draw") {
      const canvas = canvasRef.current;
      if (!canvas || !hasInk) return null;
      return {
        signature: canvas.toDataURL("image/png"),
        initial: saved.initial || initialTyped,
      };
    }
    if (tab === "upload") {
      if (!uploaded) return null;
      return { signature: uploaded, initial: saved.initial || initialTyped };
    }
    return {
      signature: selected
        ? `${signatureTyped}|style:${selected.id}`
        : signatureTyped,
      initial: selected
        ? `${initialTyped}|style:${selected.id}`
        : initialTyped,
    };
  }

  function handleEditorUse() {
    const captured = captureEditorSignature();
    if (!captured) return;
    persistProfile(captured);
    setScreen("profile");
  }

  function handleApplyProfile() {
    persistProfile(saved);
    onUse(saved);
  }

  const canUse =
    tab === "type"
      ? Boolean(signatureText.trim() || initialText.trim())
      : tab === "draw"
        ? hasInk
        : Boolean(uploaded);

  return createPortal(
    <div className="fixed inset-0 z-[420] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="signature-profile-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2
            id="signature-profile-title"
            className="text-[20px] font-semibold text-slate-800"
          >
            Select Signature Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-6 grid grid-cols-[160px_minmax(0,1fr)] items-center gap-4">
            <span className="text-[13px] text-slate-600">Signature Profile</span>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="h-9 max-w-[280px] rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none"
            >
              <option value="default">Default</option>
            </select>
          </div>

          {screen === "profile" ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-slate-800">
                  Signature & Initial
                </h3>
                <button
                  type="button"
                  onClick={() => setScreen("editor")}
                  className="inline-flex h-8 items-center rounded-md border border-slate-200 px-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </button>
              </div>
              <div className="mb-6 grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] gap-4">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Signature
                  </p>
                  <div className="flex h-[92px] items-center rounded-lg bg-slate-100 px-4">
                    {saved.signature.startsWith("data:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={saved.signature}
                        alt=""
                        className="max-h-16 max-w-full object-contain"
                      />
                    ) : (
                      <span className="truncate font-serif text-[28px] italic text-slate-800">
                        {signatureDisplayText(saved.signature) || "—"}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Initial
                  </p>
                  <div className="flex h-[92px] items-center justify-center rounded-lg bg-slate-100 px-4">
                    {saved.initial.startsWith("data:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={saved.initial}
                        alt=""
                        className="max-h-16 object-contain"
                      />
                    ) : (
                      <span className="font-serif text-[28px] italic text-slate-800">
                        {signatureDisplayText(saved.initial) || "—"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <h3 className="mb-2 text-[16px] font-semibold text-slate-800">
                Stamp
              </h3>
              <label className="mb-6 flex h-[92px] w-[92px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {saved.stamp ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={saved.stamp}
                    alt="Stamp"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="px-2 text-center text-[11px] text-slate-400">
                    Click to add
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string") {
                        persistProfile({ stamp: reader.result });
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>

              <h3 className="mb-3 text-[16px] font-semibold text-slate-800">
                Profile Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] text-slate-600">
                    Company
                  </span>
                  <input
                    value={saved.company}
                    onChange={(e) =>
                      setSaved((prev) => ({ ...prev, company: e.target.value }))
                    }
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-[#12875a]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] text-slate-600">
                    Job title
                  </span>
                  <input
                    value={saved.jobTitle}
                    onChange={(e) =>
                      setSaved((prev) => ({ ...prev, jobTitle: e.target.value }))
                    }
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-[#12875a]"
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-slate-800">
                  Signature & Initial
                </h3>
                <button
                  type="button"
                  onClick={() => setScreen("profile")}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-[12px] text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex items-center gap-6 border-b border-slate-200 bg-slate-50 px-4">
              {(
                [
                  { id: "type", label: "Type", icon: Type },
                  { id: "draw", label: "Draw", icon: PenLine },
                  { id: "upload", label: "Upload", icon: ImageIcon },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={cn(
                      "relative flex items-center gap-1.5 py-3 text-[13px] font-medium",
                      active ? "text-[#12875a]" : "text-slate-600 hover:text-slate-800",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {active ? (
                      <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#12875a]" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="p-4">
              {tab === "type" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-1.5 block text-[13px] text-slate-600">
                        Signature
                      </span>
                      <input
                        value={signatureText}
                        onChange={(e) => setSignatureText(e.target.value)}
                        className="h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-[#12875a]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[13px] text-slate-600">
                        Initial
                      </span>
                      <input
                        value={initialText}
                        onChange={(e) => setInitialText(e.target.value)}
                        className="h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-[#12875a]"
                      />
                    </label>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
                    {SCRIPT_STYLES.map((style) => {
                      const selected = styleId === style.id;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setStyleId(style.id)}
                          className={cn(
                            "grid w-full grid-cols-2 items-center gap-4 border-b border-slate-100 px-4 py-3.5 text-left last:border-b-0",
                            selected ? "bg-[#e8fbf4]" : "bg-white hover:bg-slate-50",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {selected ? (
                              <Check className="h-4 w-4 shrink-0 text-[#12875a]" />
                            ) : (
                              <span className="w-4" />
                            )}
                            <span
                              className={cn(
                                "truncate text-[22px] text-slate-800",
                                style.signature,
                              )}
                              style={
                                "family" in style
                                  ? { fontFamily: style.family }
                                  : undefined
                              }
                            >
                              {signatureText || "Your signature"}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "truncate text-[22px] text-slate-800",
                              style.initial,
                            )}
                            style={
                              "family" in style
                                ? { fontFamily: style.family }
                                : undefined
                            }
                          >
                            {initialText || "Your initial"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {tab === "draw" ? (
                <div>
                  <div className="mb-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={clearDrawing}
                      disabled={!hasInk}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Eraser className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    className="h-44 w-full touch-none cursor-crosshair rounded-lg border border-dashed border-slate-300 bg-[#f4f7fb]"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const canvas = canvasRef.current;
                      const ctx = canvas?.getContext("2d");
                      if (!canvas || !ctx) return;
                      drawing.current = true;
                      canvas.setPointerCapture(e.pointerId);
                      const { x, y } = pointerPos(e);
                      ctx.beginPath();
                      ctx.moveTo(x, y);
                      ctx.lineTo(x + 0.01, y + 0.01);
                      ctx.stroke();
                      setHasInk(true);
                    }}
                    onPointerMove={(e) => {
                      if (!drawing.current) return;
                      e.preventDefault();
                      const ctx = canvasRef.current?.getContext("2d");
                      if (!ctx) return;
                      const { x, y } = pointerPos(e);
                      ctx.lineTo(x, y);
                      ctx.stroke();
                      ctx.beginPath();
                      ctx.moveTo(x, y);
                    }}
                    onPointerUp={(e) => {
                      drawing.current = false;
                      canvasRef.current?.releasePointerCapture(e.pointerId);
                    }}
                    onPointerLeave={() => {
                      drawing.current = false;
                    }}
                  />
                </div>
              ) : null}

              {tab === "upload" ? (
                <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-[13px] text-slate-500 hover:bg-slate-100">
                  {uploaded ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={uploaded}
                      alt="Uploaded signature"
                      className="max-h-32 object-contain"
                    />
                  ) : (
                    <span>Click to upload a signature image</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") {
                          setUploaded(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              ) : null}
            </div>
          </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={
              screen === "editor" ? () => setScreen("profile") : onClose
            }
            className="h-9 rounded-md border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={screen === "editor" ? handleEditorUse : handleApplyProfile}
            disabled={screen === "editor" ? !canUse : false}
            className="h-9 min-w-[72px] rounded-md bg-[#12875a] px-4 text-[13px] font-semibold text-white hover:bg-[#0f734d] disabled:opacity-50"
          >
            Use
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function signatureDisplayText(value?: string) {
  if (!value) return "";
  if (value.startsWith("typed:")) {
    return value.replace(/^typed:/, "").replace(/\|style:.*$/, "");
  }
  return "";
}
