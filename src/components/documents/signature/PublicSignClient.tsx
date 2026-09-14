"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  applySignerDecline,
  applySignerSignature,
  applySignerViewed,
  canSignerAccess,
  DEMO_SIGNER_IP,
  getRequestDocuments,
  getSignatureByToken,
  fieldKindLabel,
  type SignatureField,
  type SignatureRequest,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import { resolveSignatureDocumentFileUrl } from "@/lib/documents/signature/file-cache";
import {
  declineCrmSignatureRequest,
  isCrmSignatureRequestId,
  persistRemoteSignatureRequest,
  signCrmSignatureRequest,
  tryCrmSignatureRequest,
  viewCrmSignatureRequest,
} from "@/lib/documents/signature/api";
import { syncQuotationFromSignature } from "@/lib/finance/quotations/signatureBridge";
import { persistSignedPackage } from "@/lib/documents/signed-artifacts";
import { SignatureDocPreview } from "./SignatureDocPreview";
import { SignedCompleteView } from "./SignedCompleteView";
import { SignatureModal } from "./SignatureModal";
import { SigningFieldInputModal } from "./SigningFieldInputModal";
import {
  defaultStampValue,
  isSameFieldOnOtherDocument,
  isSignatureCaptureKind,
  signingFieldAction,
  signingGuidePrompt,
} from "@/lib/documents/signature/field-kinds";
import { SigningGuideCallout } from "./SigningGuideCallout";
import {
  CheckCircle2,
  Clock,
  PenLine,
  Sparkles,
  Send,
  ShieldCheck,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

function fieldIsComplete(field: SignatureField): boolean {
  if (field.required === false) return true;
  const action = signingFieldAction(field.kind);
  if (action === "checkbox") return field.value === "true";
  return Boolean(field.value?.trim());
}

function incompleteFieldsForSigner(
  fields: SignatureField[],
  signerId: string,
): SignatureField[] {
  return fields.filter(
    (field) => field.signerId === signerId && !fieldIsComplete(field),
  );
}

export function PublicSignClient({ token }: { token: string }) {
  const [req, setReq] = useState<SignatureRequest | null>(null);
  const [signer, setSigner] = useState<SignatureSigner | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeInputField, setActiveInputField] =
    useState<SignatureField | null>(null);
  const [pendingSignatureData, setPendingSignatureData] = useState<
    string | null
  >(null);

  // Top Consent & Disclosure state
  const [hasAgreedConsent, setHasAgreedConsent] = useState(false);
  const [signingEnabled, setSigningEnabled] = useState(false);
  const [isDisclosureModalOpen, setIsDisclosureModalOpen] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);
  const [submitError, setSubmitError] = useState("");

  // Which of the request's (possibly several) attached documents is
  // currently shown. Defaults to the first document once it's known.
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const packScrollRef = useRef<HTMLDivElement | null>(null);

  const guideFields = useMemo(() => {
    if (!req || !signer) return [];
    const documents = getRequestDocuments(req);
    const docOrder = new Map(documents.map((doc, index) => [doc.id, index]));
    return req.fields
      .filter((field) => field.signerId === signer.id)
      .sort((a, b) => {
        const docA = docOrder.get(a.documentId ?? "primary") ?? 0;
        const docB = docOrder.get(b.documentId ?? "primary") ?? 0;
        if (docA !== docB) return docA - docB;
        if ((a.page || 1) !== (b.page || 1)) return (a.page || 1) - (b.page || 1);
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });
  }, [req, signer]);

  const guidedField = guideFields[guideIndex] ?? null;

  useEffect(() => {
    if (signingEnabled && guideFields.length) {
      setGuideIndex(0);
      setGuideOpen(true);
    } else {
      setGuideOpen(false);
    }
  }, [signingEnabled, guideFields.length]);

  useEffect(() => {
    if (!guideOpen || !req || !signer) return;
    const current = guideFields[guideIndex];
    if (!current || !fieldIsComplete(current)) return;
    const missing = incompleteFieldsForSigner(req.fields, signer.id);
    if (!missing.length) return;
    const nextIndex = guideFields.findIndex((field) => field.id === missing[0].id);
    if (nextIndex >= 0 && nextIndex !== guideIndex) setGuideIndex(nextIndex);
  }, [guideOpen, guideIndex, guideFields, req, signer]);

  useEffect(() => {
    if (!guideOpen || !guidedField) return;
    const docId = guidedField.documentId ?? "primary";
    setActiveDocId((prev) => (prev === docId ? prev : docId));
  }, [guideOpen, guidedField]);

  useEffect(() => {
    const root = packScrollRef.current;
    if (!root) return;
    const sections = root.querySelectorAll<HTMLElement>("[data-sign-doc]");
    if (sections.length < 2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.getAttribute("data-sign-doc");
        if (id) setActiveDocId(id);
      },
      { root, threshold: [0.2, 0.45, 0.7] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [req?.id, req?.documents?.length, hydrated]);

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
    setHydrated(true);
    if (isCrmSignatureRequestId(liveReq.id)) {
      void tryCrmSignatureRequest(() => viewCrmSignatureRequest(liveReq.id)).then(
        (remote) => {
          if (!remote) return;
          persistRemoteSignatureRequest(remote);
        },
      );
    }

    const requestId = liveReq.id;
    void (async () => {
      const docs = getRequestDocuments(liveReq);
      const publicRes = await fetch(
        `/api/sign/${encodeURIComponent(token)}/document`,
      )
        .then((res) => res.json() as Promise<{ documentUrl?: string | null }>)
        .catch(() => ({ documentUrl: null }));
      const publicUrl = publicRes.documentUrl?.trim() || undefined;

      const nextDocs = await Promise.all(
        docs.map(async (doc) => ({
          ...doc,
          fileUrl:
            (await resolveSignatureDocumentFileUrl(
              requestId,
              doc.id,
              doc.fileUrl,
            )) ||
            (docs.length === 1 || doc.id === "primary" ? publicUrl : undefined) ||
            doc.fileUrl,
        })),
      );
      setReq((prev) => {
        if (!prev || prev.id !== requestId) return prev;
        const firstUrl = nextDocs[0]?.fileUrl || publicUrl || prev.documentFileUrl;
        return {
          ...prev,
          documents: nextDocs,
          documentFileUrl: firstUrl,
        };
      });
    })();
  }, [token]);

  function afterPersist(next: SignatureRequest) {
    setReq(next);
    const nextSigner = next.signers.find((s) => s.id === signer?.id) ?? signer;
    setSigner(nextSigner);
    if (next.status === "Signed" || next.status === "Declined") {
      syncQuotationFromSignature(next);
    }
    if (next.status === "Signed") {
      persistSignedPackage(next);
    }
  }

  function patchFieldValue(fieldId: string, value: string) {
    if (!req) return;
    const source = req.fields.find((field) => field.id === fieldId);
    setSubmitError("");
    setReq({
      ...req,
      fields: req.fields.map((f) => {
        if (f.id === fieldId) return { ...f, value };
        if (source && isSameFieldOnOtherDocument(source, f)) {
          return { ...f, value };
        }
        return f;
      }),
    });
  }

  function handleSaveSignature(signatureData: string) {
    if (!req || !signer) return;

    const updatedFields = req.fields.map((f) => {
      if (f.signerId !== signer.id) return f;
      if (isSignatureCaptureKind(f.kind)) {
        return { ...f, value: signatureData };
      }
      return f;
    });

    setReq({ ...req, fields: updatedFields });
    setPendingSignatureData(signatureData);
    setSubmitError("");
  }

  function focusFirstIncomplete(fields: SignatureField[]) {
    if (!fields.length) return;
    const index = guideFields.findIndex((field) => field.id === fields[0].id);
    setGuideIndex(index >= 0 ? index : 0);
    setGuideOpen(true);
    const docId = fields[0].documentId ?? "primary";
    setActiveDocId(docId);
  }

  function handleFinalSubmit() {
    if (!req || !signer || !pendingSignatureData) return;
    if (!signingEnabled) {
      setConsentError(true);
      return;
    }
    const missing = incompleteFieldsForSigner(req.fields, signer.id);
    if (missing.length) {
      const labels = missing
        .map((field) => field.label || fieldKindLabel(field.kind))
        .slice(0, 4)
        .join(", ");
      setSubmitError(`Complete every field before submitting: ${labels}.`);
      focusFirstIncomplete(missing);
      return;
    }
    setSubmitError("");
    const next = applySignerSignature(req, signer.id, pendingSignatureData);
    afterPersist(next);
    if (isCrmSignatureRequestId(req.id)) {
      void tryCrmSignatureRequest(() =>
        signCrmSignatureRequest(req.id, {
          signatureData: pendingSignatureData,
        }),
      ).then((remote) => {
        if (remote) persistRemoteSignatureRequest(remote);
      });
    }
  }

  function startSigningGuide() {
    setGuideIndex(0);
    setGuideOpen(true);
  }

  function handleFieldClick(fieldId: string) {
    if (!req || !signer) return;
    const targetField = req.fields.find((f) => f.id === fieldId);
    if (!targetField) return;

    // Do not allow editing another signer's fields
    if (targetField.signerId !== signer.id) return;

    if (!signingEnabled) {
      setConsentError(true);
      return;
    }

    const guidedIndex = guideFields.findIndex((field) => field.id === fieldId);
    if (guidedIndex >= 0) {
      setGuideIndex(guidedIndex);
      setGuideOpen(true);
    }

    const action = signingFieldAction(targetField.kind);
    if (action === "signature") {
      setIsModalOpen(true);
      return;
    }
    if (action === "checkbox") {
      patchFieldValue(
        targetField.id,
        targetField.value === "true" ? "" : "true",
      );
      return;
    }
    if (action === "stamp") {
      patchFieldValue(targetField.id, defaultStampValue(signer.name));
      return;
    }
    setActiveInputField(targetField);
  }

  function decline() {
    if (!req || !signer) return;
    const next = applySignerDecline(req, signer.id);
    afterPersist(next);
    if (isCrmSignatureRequestId(req.id)) {
      void tryCrmSignatureRequest(() =>
        declineCrmSignatureRequest(req.id),
      ).then((remote) => {
        if (remote) persistRemoteSignatureRequest(remote);
      });
    }
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
    return <SignedCompleteView req={req} signer={signer} token={token} />;
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
  const missingFields = incompleteFieldsForSigner(req.fields, signer.id);
  const canSubmit =
    Boolean(pendingSignatureData) && missingFields.length === 0;

  const documents = getRequestDocuments(req);
  const activeDoc =
    documents.find((d) => d.id === activeDocId) ?? documents[0] ?? null;
  const activeDocFields = myFields.filter(
    (f) => (f.documentId ?? "primary") === (activeDoc?.id ?? "primary"),
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-4 py-6">
      {/* Electronic Record & Signature Disclosure Top Consent Bar */}
      <div
        data-sign-consent
        className={cn(
          "sticky top-2 z-30 mb-6 rounded-2xl border bg-white/95 backdrop-blur-md p-4 shadow-md transition-all dark:bg-zinc-900/95",
          consentError && !signingEnabled
            ? "border-rose-400 ring-2 ring-rose-400/30 bg-rose-50/40"
            : "border-slate-200/90 dark:border-zinc-800",
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasAgreedConsent}
              onChange={(e) => {
                setHasAgreedConsent(e.target.checked);
                if (!e.target.checked) setSigningEnabled(false);
              }}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0"
            />
            <span className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
              I confirm that I have read and understood the{" "}
              <button
                type="button"
                onClick={() => setIsDisclosureModalOpen(true)}
                className="font-semibold text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
              >
                Electronic Record and Signature Disclosure
              </button>{" "}
              and consent to use electronic records and signatures.
            </span>
          </label>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!hasAgreedConsent) {
                  setConsentError(true);
                  return;
                }
                setSigningEnabled(true);
                setConsentError(false);
                startSigningGuide();
              }}
              className={cn(
                "h-9 rounded-xl px-4 text-xs font-semibold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer",
                signingEnabled
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : hasAgreedConsent
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-emerald-600/80 opacity-90",
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Agree &amp; Continue
            </button>
          </div>
        </div>

        {consentError && !signingEnabled && (
          <p className="mt-2 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Check the box, then click Agree &amp; Continue before filling
            fields.
          </p>
        )}
      </div>

      <div className="mb-6 text-center">
        <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">
          FinConnex
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Review &amp; sign
        </h1>
        <p className="mt-1 text-sm text-slate-500">{req.documentName}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          Signing as {signer.name} · Requested by {req.createdBy} · Expires{" "}
          {req.expiryDate}
        </p>
      </div>

      <div className="mb-6">
        {documents.length > 1 ? (
          <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
            {documents.map((doc, i) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  setActiveDocId(doc.id);
                  document
                    .getElementById(`sign-doc-${doc.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                  (activeDoc?.id ?? documents[0].id) === doc.id
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-900/80 text-[9px] text-white">
                  {i + 1}
                </span>
                {doc.name}
              </button>
            ))}
          </div>
        ) : null}

        {documents.length > 1 ? (
          <div
            ref={packScrollRef}
            className="relative mx-auto flex max-h-[68vh] w-full max-w-3xl flex-col overflow-y-auto rounded-xl border border-slate-200 bg-slate-100/80 p-4 shadow-inner custom-scrollbar"
          >
            {documents.map((doc, index) => (
              <section
                key={doc.id}
                id={`sign-doc-${doc.id}`}
                data-sign-doc={doc.id}
                className={cn("w-full", index > 0 && "mt-8 border-t border-slate-200 pt-6")}
              >
                <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Document {index + 1} of {documents.length}
                  {doc.name ? ` · ${doc.name}` : ""}
                </p>
                <SignatureDocPreview
                  fileName={doc.fileName}
                  fileUrl={doc.fileUrl}
                  fields={myFields.filter(
                    (field) =>
                      (field.documentId ?? "primary") === doc.id,
                  )}
                  signers={req.signers}
                  selectedFieldId={guidedField?.id}
                  highlightSignerId={signer.id}
                  interactive={signingEnabled}
                  onFieldClick={handleFieldClick}
                  pageWidth={700}
                  embedded
                />
              </section>
            ))}
          </div>
        ) : activeDoc ? (
          <SignatureDocPreview
            key={activeDoc.id}
            fileName={activeDoc.fileName}
            fileUrl={activeDoc.fileUrl}
            fields={activeDocFields}
            signers={req.signers}
            selectedFieldId={guidedField?.id}
            highlightSignerId={signer.id}
            interactive={signingEnabled}
            onFieldClick={handleFieldClick}
            className="shadow-sm"
            pageWidth={700}
          />
        ) : null}
        {guideOpen && guidedField && !isModalOpen && !activeInputField ? (
          <SigningGuideCallout
            fieldId={guidedField.id}
            title={
              missingFields.length === 0
                ? "All fields are complete."
                : signingGuidePrompt(guidedField.kind)
            }
            step={guideIndex}
            total={guideFields.length}
            remaining={missingFields.length}
            onPrevious={() => {
              const previous = [...guideFields]
                .slice(0, guideIndex)
                .reverse()
                .find((field) => !fieldIsComplete(field));
              const index = previous
                ? guideFields.findIndex((field) => field.id === previous.id)
                : guideIndex - 1;
              setGuideIndex(Math.max(0, index));
            }}
            onNext={() => {
              const nextIncomplete = guideFields
                .slice(guideIndex + 1)
                .find((field) => !fieldIsComplete(field));
              if (nextIncomplete) {
                setGuideIndex(
                  guideFields.findIndex((field) => field.id === nextIncomplete.id),
                );
                return;
              }
              if (missingFields.length === 0 || guideIndex >= guideFields.length - 1) {
                setGuideOpen(false);
                return;
              }
              setGuideIndex((index) => index + 1);
            }}
            onClose={() => setGuideOpen(false)}
          />
        ) : null}
        {myFields.length ? (
          <p className="mt-2 text-center text-xs text-slate-500">
            {signingEnabled
              ? `Click each highlighted field to complete it · ${myFields.length} assigned to you${documents.length > 1 ? " across all documents" : ""}`
              : "Check the box, then click Agree & Continue to fill fields"}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        {pendingSignatureData ? (
          <div className="space-y-3">
            {canSubmit ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 border border-emerald-200">
                <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>All of your fields are complete.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  Change Signature
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                Fill every highlighted field before submitting
                {missingFields.length
                  ? `: ${missingFields
                      .map((field) => field.label || fieldKindLabel(field.kind))
                      .join(", ")}`
                  : "."}
              </div>
            )}

            {submitError ? (
              <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {submitError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={
                canSubmit
                  ? handleFinalSubmit
                  : () => {
                      setSubmitError(
                        `Complete every field before submitting: ${missingFields
                          .map((field) => field.label || fieldKindLabel(field.kind))
                          .slice(0, 4)
                          .join(", ")}.`,
                      );
                      focusFirstIncomplete(missingFields);
                    }
              }
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-md transition-all",
                canSubmit
                  ? "cursor-pointer bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700"
                  : "cursor-not-allowed bg-slate-300 shadow-none",
              )}
            >
              <Send className="h-4 w-4" />
              Finalize &amp; Submit Document
            </button>

            <button
              type="button"
              onClick={decline}
              className="mt-1 h-8 w-full text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors"
            >
              Decline Request
            </button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => {
                if (!signingEnabled) {
                  setConsentError(true);
                } else {
                  setIsModalOpen(true);
                }
              }}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-md transition-all cursor-pointer",
                signingEnabled
                  ? "bg-violet-600 shadow-violet-600/20 hover:bg-violet-700"
                  : "bg-slate-400 shadow-none cursor-pointer",
              )}
            >
              <PenLine className="h-4 w-4" />
              Click to Sign Document
            </button>

            <button
              type="button"
              onClick={decline}
              className="mt-3 h-9 w-full text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors"
            >
              Decline Request
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[10px] text-slate-400">
        By signing you agree this is your legal signature. IP {DEMO_SIGNER_IP}{" "}
        will be recorded.
      </p>

      {/* Signature Creation Modal */}
      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialName={signer.name}
        existingSignature={
          pendingSignatureData ||
          req.fields.find(
            (field) =>
              field.signerId === signer.id &&
              isSignatureCaptureKind(field.kind) &&
              Boolean(field.value),
          )?.value
        }
        onSaveSignature={handleSaveSignature}
      />

      {activeInputField ? (
        <SigningFieldInputModal
          field={activeInputField}
          signerName={signer.name}
          signerEmail={signer.email}
          onClose={() => setActiveInputField(null)}
          onSave={(value) => {
            patchFieldValue(activeInputField.id, value);
            setActiveInputField(null);
          }}
        />
      ) : null}

      {/* Electronic Record & Signature Disclosure Modal */}
      {isDisclosureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Electronic Record and Signature Disclosure
                </h2>
              </div>
              <button
                onClick={() => setIsDisclosureModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed pr-2">
              <p>
                From time to time, FinConnex (we, us or Company) may be required
                by law to provide to you certain written notices or disclosures.
                Described below are the terms and conditions for providing to
                you such notices and disclosures electronically through the
                FinConnex eSign system.
              </p>
              <h4 className="font-semibold text-slate-800 dark:text-white mt-2">
                1. Getting Paper Copies
              </h4>
              <p>
                At any time, you may request from us a paper copy of any record
                provided or made available electronically to you by us. You will
                have the ability to download and print documents sent to you
                through FinConnex.
              </p>
              <h4 className="font-semibold text-slate-800 dark:text-white mt-2">
                2. Withdrawing Your Consent
              </h4>
              <p>
                If you decide to receive notices and disclosures from us
                electronically, you may at any time change your mind and tell us
                that thereafter you want to receive required notices and
                disclosures only in paper format.
              </p>
              <h4 className="font-semibold text-slate-800 dark:text-white mt-2">
                3. Legal Validity
              </h4>
              <p>
                By checking the agreement box, you confirm that you consent to
                conduct electronic business transactions and execute documents
                with legally binding electronic signatures under standard E-SIGN
                / UETA laws.
              </p>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setHasAgreedConsent(true);
                  setConsentError(false);
                  setIsDisclosureModalOpen(false);
                }}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-700"
              >
                I Agree &amp; Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
