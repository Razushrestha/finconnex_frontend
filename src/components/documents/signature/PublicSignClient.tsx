"use client";

import { useEffect, useRef, useState } from "react";
import {
  applySignerDecline,
  applySignerSignature,
  applySignerViewed,
  canSignerAccess,
  DEMO_SIGNER_IP,
  getSignatureByToken,
  type SignatureField,
  type SignatureRequest,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import { syncQuotationFromSignature } from "@/lib/finance/quotations/signatureBridge";
import { persistSignedPackage } from "@/lib/documents/signed-artifacts";
import { SignatureDocPreview } from "./SignatureDocPreview";
import { CheckCircle2, Clock, Eraser, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

export function PublicSignClient({ token }: { token: string }) {
  const [req, setReq] = useState<SignatureRequest | null>(null);
  const [signer, setSigner] = useState<SignatureSigner | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("type");
  const [typed, setTyped] = useState("");
  const [hasInk, setHasInk] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const hit = getSignatureByToken(token);
    if (!hit) {
      setReq(null);
      setSigner(null);
      setHydrated(true);
      return;
    }

    let liveReq = hit.request;
    let liveSigner = hit.signer;

    if (
      liveReq.status !== "Draft" &&
      liveReq.status !== "Cancelled" &&
      liveReq.status !== "Expired" &&
      liveSigner.status !== "Signed" &&
      liveSigner.status !== "Declined" &&
      canSignerAccess(liveReq, liveSigner.id)
    ) {
      liveReq = applySignerViewed(liveReq, liveSigner.id);
      liveSigner =
        liveReq.signers.find((s) => s.id === liveSigner.id) ?? liveSigner;
    }

    setReq(liveReq);
    setSigner(liveSigner);
    setTyped(liveSigner.name);
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

  function afterPersist(next: SignatureRequest) {
    setReq(next);
    const nextSigner =
      next.signers.find((s) => s.id === signer?.id) ?? signer;
    setSigner(nextSigner);
    if (next.status === "Signed" || next.status === "Declined") {
      syncQuotationFromSignature(next);
    }
    if (next.status === "Signed") {
      persistSignedPackage(next);
    }
  }

  function submit() {
    if (!req || !signer) return;
    if (mode === "type" && !typed.trim()) return;
    if (mode === "draw" && !hasInk) return;
    const signatureData =
      mode === "type"
        ? `typed:${typed.trim()}`
        : (canvasRef.current?.toDataURL("image/png") ?? "");
    const next = applySignerSignature(req, signer.id, signatureData);
    afterPersist(next);
  }

  function decline() {
    if (!req || !signer) return;
    const next = applySignerDecline(req, signer.id);
    afterPersist(next);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[13px] text-slate-400">
        Loading…
      </div>
    );
  }

  if (!req || !signer) {
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

  if (req.status === "Draft") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <Clock className="mb-3 h-10 w-10 text-slate-300" />
        <h1 className="text-lg font-bold text-slate-900">Not sent yet</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          This document has not been sent for signature.
        </p>
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

  if (signer.status === "Declined" || req.status === "Declined") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">Declined</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          You declined to sign {req.documentName}.
        </p>
      </div>
    );
  }

  if (signer.status === "Signed") {
    const waitingOthers =
      req.status !== "Signed" &&
      req.signers.some(
        (s) =>
          s.role !== "CC" &&
          s.id !== signer.id &&
          s.status !== "Signed",
      );
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500" />
        <h1 className="text-xl font-bold text-slate-900">
          {waitingOthers ? "You're done" : "Document signed"}
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          {req.documentName}
          <br />
          {waitingOthers
            ? "Waiting for the remaining signers."
            : "A copy has been recorded in FinConnex."}
        </p>
        {signer.signatureData?.startsWith("typed:") ? (
          <p className="mt-4 font-serif text-2xl text-slate-800">
            {signer.signatureData.replace(/^typed:/, "")}
          </p>
        ) : signer.signatureData?.startsWith("data:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signer.signatureData}
            alt="Your signature"
            className="mt-4 h-16 object-contain"
          />
        ) : null}
      </div>
    );
  }

  if (!canSignerAccess(req, signer.id)) {
    const earlier = [...req.signers]
      .filter((s) => s.role !== "CC")
      .sort((a, b) => a.order - b.order)
      .find((s) => s.status !== "Signed" && s.status !== "Declined");
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <Clock className="mb-3 h-10 w-10 text-amber-400" />
        <h1 className="text-lg font-bold text-slate-900">Not your turn yet</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          This request uses sequential signing.
          {earlier
            ? ` Waiting for ${earlier.name} to sign first.`
            : " Please check back later."}
        </p>
      </div>
    );
  }

  const myFields: SignatureField[] = req.fields.filter(
    (f) => f.signerId === signer.id,
  );
  const canSubmit = mode === "type" ? typed.trim().length > 0 : hasInk;

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
          Signing as {signer.name} · Requested by {req.createdBy} · Expires{" "}
          {req.expiryDate}
        </p>
      </div>

      <div className="mb-5">
        <SignatureDocPreview
          fileName={req.documentFile}
          fields={req.fields}
          signers={req.signers}
          highlightSignerId={signer.id}
          className="shadow-sm"
        />
        {myFields.length ? (
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Your fields are highlighted · {myFields.length} assigned to you
          </p>
        ) : null}
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
