"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEMO_SIGNER_IP,
  formatAuditAt,
  getSignatureByToken,
  upsertSignatureRequest,
  type SignatureRequest,
} from "@/lib/documents/signature/types";
import { syncQuotationFromSignature } from "@/lib/finance/quotations/signatureBridge";
import { pushLibraryDoc } from "@/lib/documents/library/types";
import { CheckCircle2, Eraser, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

export function PublicSignClient({ token }: { token: string }) {
  const [req, setReq] = useState<SignatureRequest | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("type");
  const [typed, setTyped] = useState("");
  const [hasInk, setHasInk] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    let live = getSignatureByToken(token) ?? null;
    if (live?.status === "Sent") {
      live = {
        ...live,
        status: "Viewed",
        audit: [
          ...live.audit,
          {
            id: `a-view-${Date.now()}`,
            at: formatAuditAt(),
            action: "Viewed",
            actor: live.signer,
            ip: DEMO_SIGNER_IP,
          },
        ],
      };
      upsertSignatureRequest(live);
    }
    setReq(live);
    setHydrated(true);
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== "draw") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
  }, [mode]);

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
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    setHasInk(false);
  }

  function persist(next: SignatureRequest) {
    upsertSignatureRequest(next);
    setReq(next);
    if (next.status === "Signed" || next.status === "Declined") {
      syncQuotationFromSignature(next);
    }
    if (next.status === "Signed") {
      const today = new Date().toLocaleDateString("en-AU");
      pushLibraryDoc({
        id: `lib-signed-${next.id}`,
        fileName: next.documentFile.replace(/\.pdf$/i, "") + "_Signed.pdf",
        folder: "Signed",
        owner: next.createdBy,
        relatedTo: next.relatedTo,
        version: 1,
        tags: ["signed", "e-signature"],
        uploadedAt: today,
        accessLevel: "Team",
        sizeLabel: "320 KB",
        versions: [
          {
            version: 1,
            uploadedAt: today,
            uploadedBy: "System",
            sizeLabel: "320 KB",
            note: "From e-signature",
          },
        ],
      });
    }
  }

  function submit() {
    if (!req) return;
    if (mode === "type" && !typed.trim()) return;
    if (mode === "draw" && !hasInk) return;
    const signatureData =
      mode === "type"
        ? `typed:${typed.trim()}`
        : (canvasRef.current?.toDataURL("image/png") ?? "");
    const next: SignatureRequest = {
      ...req,
      status: "Signed",
      signedDate: new Date().toLocaleDateString("en-AU"),
      ipAddress: DEMO_SIGNER_IP,
      signatureData,
      audit: [
        ...req.audit,
        {
          id: `a-sign-${Date.now()}`,
          at: formatAuditAt(),
          action: "Signed",
          actor: req.signer,
          ip: DEMO_SIGNER_IP,
        },
      ],
    };
    persist(next);
  }

  function decline() {
    if (!req) return;
    persist({
      ...req,
      status: "Declined",
      audit: [
        ...req.audit,
        {
          id: `a-dec-${Date.now()}`,
          at: formatAuditAt(),
          action: "Declined",
          actor: req.signer,
          ip: DEMO_SIGNER_IP,
        },
      ],
    });
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[13px] text-slate-400">
        Loading…
      </div>
    );
  }

  if (!req) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <PenLine className="mb-3 h-10 w-10 text-slate-300" />
        <h1 className="text-lg font-bold text-slate-900">Link invalid</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          This signature link is expired or incorrect.
        </p>
      </div>
    );
  }

  if (req.status === "Declined") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">Declined</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          You declined to sign {req.documentName}.
        </p>
      </div>
    );
  }

  if (req.status === "Signed") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500" />
        <h1 className="text-xl font-bold text-slate-900">Document signed</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          {req.documentName}
          <br />A copy has been recorded in FinConnex.
        </p>
        {req.signatureData?.startsWith("typed:") ? (
          <p className="mt-4 font-serif text-2xl text-slate-800">
            {req.signatureData.replace(/^typed:/, "")}
          </p>
        ) : req.signatureData?.startsWith("data:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={req.signatureData}
            alt="Your signature"
            className="mt-4 h-16 object-contain"
          />
        ) : null}
      </div>
    );
  }

  if (req.status === "Cancelled" || req.status === "Expired") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-lg font-bold text-slate-900">
          Link no longer active
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          This request is {req.status.toLowerCase()}.
        </p>
      </div>
    );
  }

  const canSubmit =
    mode === "type" ? typed.trim().length > 0 : hasInk;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">
          FinConnex
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">
          Review &amp; sign
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">{req.documentName}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Requested by {req.createdBy} · Expires {req.expiryDate}
        </p>
      </div>

      <div className="mb-5 aspect-[3/4] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex h-full flex-col justify-between p-8">
          <div className="space-y-2">
            <div className="h-3 w-2/3 rounded bg-slate-200" />
            <div className="h-2 w-full rounded bg-slate-100" />
            <div className="h-2 w-full rounded bg-slate-100" />
            <div className="h-2 w-5/6 rounded bg-slate-100" />
            <p className="pt-4 text-[12px] font-medium text-slate-300">
              {req.documentFile}
            </p>
          </div>
          <div className="rounded-lg border border-dashed border-violet-300 bg-violet-50/50 px-3 py-4 text-center">
            <p className="text-[11px] font-semibold text-violet-700">
              Signature field
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-3 flex gap-1 rounded-lg bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setMode("type")}
            className={cn(
              "flex-1 rounded-md py-1.5 text-[11px] font-semibold",
              mode === "type"
                ? "bg-white text-violet-700 shadow-sm"
                : "text-slate-500",
            )}
          >
            Type
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("draw");
              setHasInk(false);
            }}
            className={cn(
              "flex-1 rounded-md py-1.5 text-[11px] font-semibold",
              mode === "draw"
                ? "bg-white text-violet-700 shadow-sm"
                : "text-slate-500",
            )}
          >
            Draw
          </button>
        </div>

        {mode === "type" ? (
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type your full name"
            className="h-12 w-full rounded-xl border border-slate-200 px-3 text-center font-serif text-xl text-slate-800 outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
          />
        ) : (
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="h-28 w-full touch-none rounded-xl border border-slate-200 bg-slate-50"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
            <button
              type="button"
              onClick={clearCanvas}
              className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200"
            >
              <Eraser className="h-3 w-3" />
              Clear
            </button>
            {!hasInk ? (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] text-slate-400">
                Draw your signature
              </p>
            ) : null}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="mt-4 h-10 w-full rounded-xl bg-violet-600 text-[13px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-40"
        >
          Sign document
        </button>
        <button
          type="button"
          onClick={decline}
          className="mt-2 h-9 w-full text-[12px] font-medium text-slate-500 hover:text-rose-600"
        >
          Decline
        </button>
      </div>

      <p className="mt-6 text-center text-[10px] text-slate-400">
        By signing you agree this is your legal signature. IP {DEMO_SIGNER_IP}{" "}
        will be recorded.
      </p>
    </div>
  );
}
