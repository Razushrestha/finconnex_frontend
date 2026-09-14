"use client";

import { useEffect, useRef, useState } from "react";
import {
  PenLine,
  Type,
  UploadCloud,
  Sparkles,
  Eraser,
  X,
  Check,
  Image as ImageIcon,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  existingSignature?: string | null;
  onSaveSignature: (signatureData: string) => void;
}

type Mode = "type" | "draw" | "upload" | "ai";

const FONT_STYLES = [
  { id: "font-serif", name: "Classic Serif", style: "font-serif italic" },
  { id: "font-cursive", name: "Cursive Script", style: "font-[cursive] italic font-normal" },
  { id: "font-[monospace]", name: "Modern Code", style: "font-[monospace] font-bold" },
  { id: "font-[fantasy]", name: "Elegant Flow", style: "font-[fantasy] tracking-wide" },
];

const INK_COLORS = [
  { id: "black", color: "#000000", label: "Black" },
  { id: "navy", color: "#1e293b", label: "Navy" },
  { id: "blue", color: "#1d4ed8", label: "Royal Blue" },
];

const AI_PRESETS = [
  { id: "executive", name: "Executive Calligraphy", desc: "Fluid, formal corporate signature flow" },
  { id: "minimal", name: "Modern Minimalist", desc: "Sleek geometric script signature" },
  { id: "artistic", name: "Artistic Expressive", desc: "Expressive flourish with balanced loop dynamics" },
  { id: "seal", name: "Official Stamp Seal", desc: "Stamp-style signature seal vector" },
];

export function SignatureModal({
  isOpen,
  onClose,
  initialName,
  existingSignature,
  onSaveSignature,
}: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState<Mode>("type");
  
  // Type mode state
  const [typedName, setTypedName] = useState(initialName || "");
  const [selectedFontIndex, setSelectedFontIndex] = useState(0);

  // Draw mode state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [selectedColor, setSelectedColor] = useState(INK_COLORS[0].color);

  // Upload mode state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");

  // AI mode state
  const [selectedAiPreset, setSelectedAiPreset] = useState(AI_PRESETS[0].id);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSignaturePreview, setAiSignaturePreview] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiRequestId = useRef(0);

  useEffect(() => {
    if (initialName && !existingSignature?.startsWith("typed:")) {
      setTypedName(initialName);
    }
  }, [initialName, existingSignature]);

  useEffect(() => {
    if (!isOpen) return;
    const existing = existingSignature?.trim();
    if (!existing) {
      setHasInk(false);
      setUploadedImage(null);
      setAiSignaturePreview(null);
      return;
    }
    if (existing.startsWith("typed:")) {
      setActiveTab("type");
      setTypedName(existing.replace(/^typed:/, ""));
      return;
    }
    if (existing.includes("image/svg") || existing.includes("svg+xml")) {
      setActiveTab("ai");
      setAiSignaturePreview(existing);
      return;
    }
    if (existing.startsWith("data:")) {
      setActiveTab("draw");
      setUploadedImage(existing);
      setHasInk(true);
    }
  }, [isOpen, existingSignature]);

  function styleCanvas(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";
  }

  function paintExistingDrawing(dataUrl: string) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const image = new Image();
    image.onload = () => {
      const paint = (attempts = 0) => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) {
          if (attempts < 20) requestAnimationFrame(() => paint(attempts + 1));
          return;
        }
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = selectedColor;
        setHasInk(true);
      };
      paint();
    };
    image.src = dataUrl;
  }

  // Setup canvas context when switching to draw tab
  useEffect(() => {
    if (!isOpen || activeTab !== "draw") return;

    const frame = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const existing =
        existingSignature?.startsWith("data:") &&
        !existingSignature.includes("svg")
          ? existingSignature
          : null;

      if (existing) {
        paintExistingDrawing(existing);
        return;
      }

      styleCanvas(ctx, canvas);
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen, activeTab, existingSignature]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.strokeStyle = selectedColor;
  }, [selectedColor]);

  if (!isOpen) return null;

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    canvas?.setPointerCapture(e.pointerId);
    const { x, y } = pointerPos(e);
    ctx.strokeStyle = selectedColor;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  }

  function onPointerUp() {
    drawing.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";
    setHasInk(false);
  }

  function handleImageUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setUploadedImage(result);
        setUploadFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  }

  async function generateAiSignature(presetId: string) {
    const name = (typedName || initialName || "").trim();
    setSelectedAiPreset(presetId);
    if (name.length < 2) {
      setAiError("Enter your name above, then generate a signature.");
      setAiSignaturePreview(null);
      return;
    }

    const requestId = ++aiRequestId.current;
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const res = await fetch("/api/ai/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, style: presetId }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        dataUrl?: string;
        error?: string;
      };
      if (requestId !== aiRequestId.current) return;
      if (!res.ok || !json.dataUrl) {
        throw new Error(json.error || "Google AI could not generate this signature.");
      }
      setAiSignaturePreview(json.dataUrl);
    } catch (err) {
      if (requestId !== aiRequestId.current) return;
      setAiSignaturePreview(null);
      setAiError(
        err instanceof Error
          ? err.message
          : "Google AI could not generate this signature.",
      );
    } finally {
      if (requestId === aiRequestId.current) setIsGeneratingAi(false);
    }
  }

  function handleSave() {
    let finalSignatureData = "";

    if (activeTab === "type") {
      if (!typedName.trim()) return;
      finalSignatureData = `typed:${typedName.trim()}`;
    } else if (activeTab === "draw") {
      if (!hasInk || !canvasRef.current) return;
      finalSignatureData = canvasRef.current.toDataURL("image/png");
    } else if (activeTab === "upload") {
      if (!uploadedImage) return;
      finalSignatureData = uploadedImage;
    } else if (activeTab === "ai") {
      if (!aiSignaturePreview) {
        generateAiSignature(selectedAiPreset);
        return;
      }
      finalSignatureData = aiSignaturePreview;
    }

    if (finalSignatureData) {
      onSaveSignature(finalSignatureData);
      onClose();
    }
  }

  const isValid =
    (activeTab === "type" && typedName.trim().length > 0) ||
    (activeTab === "draw" && hasInk) ||
    (activeTab === "upload" && Boolean(uploadedImage)) ||
    (activeTab === "ai" && Boolean(aiSignaturePreview) && !isGeneratingAi);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Create Your Signature
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Choose how you want to sign this document
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab("type")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all",
              activeTab === "type"
                ? "bg-white text-violet-700 shadow-sm dark:bg-zinc-900 dark:text-violet-400"
                : "text-slate-600 hover:text-slate-900 dark:text-zinc-400",
            )}
          >
            <Type className="h-3.5 w-3.5" />
            Type
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("draw")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all",
              activeTab === "draw"
                ? "bg-white text-violet-700 shadow-sm dark:bg-zinc-900 dark:text-violet-400"
                : "text-slate-600 hover:text-slate-900 dark:text-zinc-400",
            )}
          >
            <PenLine className="h-3.5 w-3.5" />
            Draw
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all",
              activeTab === "upload"
                ? "bg-white text-violet-700 shadow-sm dark:bg-zinc-900 dark:text-violet-400"
                : "text-slate-600 hover:text-slate-900 dark:text-zinc-400",
            )}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Import File
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("ai");
              if (!aiSignaturePreview) generateAiSignature(selectedAiPreset);
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all",
              activeTab === "ai"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-violet-700 hover:bg-violet-100/70 dark:text-violet-400",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Smart Signature
          </button>
        </div>

        {/* Tab Contents */}
        <div className="mt-5 min-h-[190px]">
          {/* TAB 1: TYPE */}
          {activeTab === "type" && (
            <div className="space-y-4">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your full name"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center font-serif text-2xl font-extrabold text-black outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white"
              />

              <div className="grid grid-cols-2 gap-2">
                {FONT_STYLES.map((f, idx) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFontIndex(idx)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all",
                      selectedFontIndex === idx
                        ? "border-violet-500 bg-violet-50/50 text-violet-900 ring-2 ring-violet-500/20 dark:bg-violet-950/30 dark:text-violet-300"
                        : "border-slate-200 hover:border-slate-300 dark:border-zinc-800",
                    )}
                  >
                    <span className="text-[10px] text-slate-400 font-sans mb-1">{f.name}</span>
                    <span className={cn("text-lg font-extrabold truncate max-w-full text-black", f.style)}>
                      {typedName || "Signature"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: DRAW */}
          {activeTab === "draw" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">Ink Color:</span>
                  {INK_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={cn(
                        "h-5 w-5 rounded-full transition-transform",
                        selectedColor === c.color ? "scale-125 ring-2 ring-violet-500 ring-offset-1" : "hover:scale-110",
                      )}
                      title={c.label}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <Eraser className="h-3 w-3" />
                  Clear
                </button>
              </div>

              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="h-36 w-full touch-none rounded-xl border border-slate-200 bg-slate-50 shadow-inner dark:border-zinc-800 dark:bg-zinc-800/50"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                />
                {!hasInk && (
                  <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                    Draw your signature inside this box
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT FILE */}
          {activeTab === "upload" && (
            <div className="space-y-3">
              {uploadedImage ? (
                <div className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-violet-300 bg-violet-50/40 p-4 dark:border-violet-800 dark:bg-violet-950/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadedImage}
                    alt="Uploaded signature"
                    className="max-h-28 object-contain"
                  />
                  <p className="mt-2 text-[11px] text-slate-500 truncate max-w-xs">{uploadFileName}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedImage(null);
                      setUploadFileName("");
                    }}
                    className="mt-2 text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    Remove &amp; Upload Another
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-all dark:border-zinc-800 dark:bg-zinc-800/40">
                  <ImageIcon className="mb-2 h-8 w-8 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                    Click to browse signature image
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Supports PNG, JPG, JPEG, SVG with transparent background
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </label>
              )}
            </div>
          )}

          {/* TAB 4: AI SMART SIGNATURE */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-violet-50 p-3 text-xs text-violet-900 border border-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900">
                <Wand2 className="h-4 w-4 text-violet-600 shrink-0" />
                <span>
                  <strong>AI Smart Signature:</strong> Gemini draws a handwritten signature from your name and the style you pick.
                </span>
              </div>

              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Name to sign"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white"
              />

              <div className="grid grid-cols-2 gap-2">
                {AI_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => generateAiSignature(preset.id)}
                    className={cn(
                      "flex flex-col items-start rounded-xl border p-2.5 text-left transition-all",
                      selectedAiPreset === preset.id
                        ? "border-violet-600 bg-violet-50/60 ring-2 ring-violet-500/20 dark:bg-violet-950/40"
                        : "border-slate-200 hover:border-slate-300 dark:border-zinc-800",
                    )}
                  >
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-zinc-100">
                      {preset.name}
                    </span>
                    <span className="text-[9.5px] text-slate-400 mt-0.5">{preset.desc}</span>
                  </button>
                ))}
              </div>

              <div className="relative flex h-24 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
                {isGeneratingAi ? (
                  <div className="flex items-center gap-2 text-xs text-violet-600">
                    <Sparkles className="h-4 w-4 animate-spin" />
                    Gemini is drawing your signature…
                  </div>
                ) : aiError ? (
                  <p className="px-3 text-center text-xs text-rose-600">{aiError}</p>
                ) : aiSignaturePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={aiSignaturePreview}
                    alt="AI Signature Preview"
                    className="max-h-20 object-contain"
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" />
            Apply Signature
          </button>
        </div>
      </div>
    </div>
  );
}
