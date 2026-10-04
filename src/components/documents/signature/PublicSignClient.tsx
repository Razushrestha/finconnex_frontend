"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  applySignerDecline,
  applySignerSignature,
  applySignerViewed,
  canSignerAccess,
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
import { mapPublicSignatureView } from "@/lib/documents/signature/public-view";
import { parsePublicSignerStatus } from "@/lib/documents/signature/sync-public-status";
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
  ChevronDown,
  Clock,
  Download,
  Mail,
  PenLine,
  Printer,
  Search,
  ShieldCheck,
  X,
  AlertCircle,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
import { cn } from "@/lib/utils";

function fieldIsComplete(field: SignatureField): boolean {
  if (field.required === false) return true;
  const action = signingFieldAction(field.kind);
  if (action === "checkbox") return field.value === "true";
  return Boolean(field.value?.trim());
}

function SignPageRail({
  fileUrl,
  fileName,
  activePage,
  onSelectPage,
}: {
  fileUrl?: string;
  fileName: string;
  activePage: number;
  onSelectPage: (page: number) => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const isPdf = Boolean(
    fileUrl && !/\.docx?$/i.test(fileName || ""),
  );
  return (
    <div className="flex flex-col items-center gap-3 px-3 py-3">
      {isPdf && fileUrl ? (
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: count }) => setNumPages(count)}
          loading={
            <div className="h-28 w-[140px] animate-pulse bg-white" />
          }
          className="flex flex-col items-center gap-3"
        >
          {numPages > 0
            ? Array.from({ length: numPages }, (_, index) => {
                const page = index + 1;
                const selected = page === activePage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => onSelectPage(page)}
                    className="flex flex-col items-center gap-1"
                  >
                    <span
                      className={cn(
                        "block overflow-hidden border bg-white shadow-sm",
                        selected ? "border-[#12875a]" : "border-slate-300",
                      )}
                    >
                      <Page
                        pageNumber={page}
                        width={140}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                      />
                    </span>
                    <span className="text-[12px] text-slate-700">{page}</span>
                  </button>
                );
              })
            : null}
        </Document>
      ) : (
        <button
          type="button"
          onClick={() => onSelectPage(1)}
          className="flex flex-col items-center gap-1"
        >
          <span className="flex h-36 w-[140px] items-center justify-center border border-[#12875a] bg-white text-[12px] text-slate-500">
            {fileName || "Document"}
          </span>
          <span className="text-[12px] text-slate-700">1</span>
        </button>
      )}
    </div>
  );
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

  const [publicMode, setPublicMode] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const justFinishedRef = useRef(false);

  // Which of the request's (possibly several) attached documents is
  // currently shown. Defaults to the first document once it's known.
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [moreOpen, setMoreOpen] = useState(false);
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
    if (!missing.length) {
      setGuideOpen(false);
      return;
    }
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
    let cancelled = false;

    void (async () => {
      const hit = getSignatureByToken(token);
      const publicRes = await fetch(`/api/sign/${encodeURIComponent(token)}`)
        .then((res) => res.json() as Promise<Record<string, unknown>>)
        .catch(() => null);
      if (cancelled) return;

      if (
        !justFinishedRef.current &&
        (publicRes?.consumed ||
          parsePublicSignerStatus(publicRes?.status) === "Signed")
      ) {
        setLinkExpired(true);
        setHydrated(true);
        return;
      }

      const publicUrl = String(publicRes?.documentUrl ?? "").trim() || undefined;
      const publicFields = Array.isArray(publicRes?.fields)
        ? publicRes.fields
        : [];
      const publicName = String(publicRes?.documentName ?? "").trim();

      if (!hit) {
        if (publicUrl || publicFields.length || publicName) {
          const mapped = mapPublicSignatureView(token, {
            documentName: publicName,
            documentUrl: publicUrl,
            recipientName: String(publicRes?.recipientName ?? ""),
            role: String(publicRes?.role ?? ""),
            status: String(publicRes?.status ?? "Sent"),
            fields: publicFields as never,
          });
          setPublicMode(true);
          setReq(mapped.request);
          setSigner(mapped.signer);
          setHydrated(true);
          if (mapped.signer.status !== "Signed" && mapped.signer.status !== "Declined") {
            void fetch(`/api/sign/${encodeURIComponent(token)}/view`, {
              method: "POST",
            });
          }
          return;
        }
        setReq(null);
        setSigner(null);
        setHydrated(true);
        return;
      }

      let liveReq = hit.request;
      let liveSigner = hit.signer;
      if (liveReq.status === "Draft") {
        liveReq = { ...liveReq, status: "Sent" };
      }

      if (
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

      setPublicMode(false);
      setReq(liveReq);
      setSigner(liveSigner);
      setHydrated(true);
      if (liveSigner.status !== "Signed" && liveSigner.status !== "Declined") {
        void fetch(`/api/sign/${encodeURIComponent(token)}/view`, {
          method: "POST",
        });
      }
      if (isCrmSignatureRequestId(liveReq.id)) {
        void tryCrmSignatureRequest(() =>
          viewCrmSignatureRequest(liveReq.id),
        ).then((remote) => {
          if (remote) persistRemoteSignatureRequest(remote);
        });
      }

      const requestId = liveReq.id;
      const docs = getRequestDocuments(liveReq);
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
      if (cancelled) return;
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

    return () => {
      cancelled = true;
    };
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
    if (!req || !signer) return;
    const signatureData =
      pendingSignatureData ||
      req.fields.find(
        (field) =>
          field.signerId === signer.id &&
          isSignatureCaptureKind(field.kind) &&
          Boolean(field.value?.trim()),
      )?.value ||
      "signed";
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
    justFinishedRef.current = true;
    const next = applySignerSignature(req, signer.id, signatureData);
    afterPersist(next);
    if (publicMode) {
      void fetch(`/api/sign/${encodeURIComponent(token)}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureData,
          fields: next.fields
            .filter((field) => field.signerId === signer.id && field.value?.trim())
            .map((field) => ({ fieldId: field.id, value: field.value })),
        }),
      }).then(async (res) => {
        if (!res.ok) {
          setSubmitError("Could not submit your signature. Try the link again.");
        }
      });
      return;
    }
    if (isCrmSignatureRequestId(req.id)) {
      void tryCrmSignatureRequest(() =>
        signCrmSignatureRequest(req.id, {
          signatureData,
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
    if (publicMode) {
      void fetch(`/api/sign/${encodeURIComponent(token)}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return;
    }
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
      <div
        className="flex min-h-dvh items-center justify-center text-[13px] text-slate-400"
        suppressHydrationWarning
      >
        Loading…
      </div>
    );
  }

  if (linkExpired) {
    return (
      <div
        className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center"
        suppressHydrationWarning
      >
        <Clock className="mb-3 h-10 w-10 text-slate-300" />
        <h1 className="text-lg font-bold text-slate-900">
          This signing link has expired
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          The document has already been signed, so this email link can no longer
          be used.
        </p>
      </div>
    );
  }

  if (!req || !signer) {
    return (
      <div
        className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center"
        suppressHydrationWarning
      >
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

  const missingFields = incompleteFieldsForSigner(req.fields, signer.id);
  const fieldsComplete = missingFields.length === 0;
  const canSubmit = fieldsComplete;
  const finishMessage =
    "You've successfully filled all fields. Click Finish to complete.";

  const documents = getRequestDocuments(req);
  const activeDoc =
    documents.find((d) => d.id === activeDocId) ?? documents[0] ?? null;
  const fieldsForDoc = (docId: string) =>
    req.fields.filter((field) => (field.documentId ?? "primary") === docId);

  const pageAnchor =
    activeDoc != null ? `sign-doc-${activeDoc.id}` : "sign-doc";

  function showPage(page: number) {
    setActivePage(page);
    document
      .getElementById(`${pageAnchor}-page-${page}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className="flex h-dvh min-h-0 flex-col bg-[#d5d5d5]"
      suppressHydrationWarning
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <h1 className="text-[18px] font-semibold text-slate-900">Sign</h1>
        <select
          aria-label="Language"
          defaultValue="en"
          className="h-8 rounded border border-slate-300 bg-white px-2 text-[13px] text-slate-700"
        >
          <option value="en">English</option>
        </select>
      </header>

      {fieldsComplete ? (
        <div className="relative shrink-0 border-b border-slate-300 bg-[#e6e6e6]">
          <div className="flex items-center justify-between gap-4 px-4 py-2">
            <p className="min-w-0 text-[13px] text-slate-800">{finishMessage}</p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="Find"
                onClick={() => {
                  const term = window.prompt("Find in document");
                  if (!term) return;
                  const finder = (
                    window as Window & { find?: (query: string) => boolean }
                  ).find;
                  finder?.(term);
                }}
                className="flex h-8 w-8 items-center justify-center text-slate-600 hover:text-slate-900"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Download"
                onClick={() => {
                  const url = activeDoc?.fileUrl;
                  if (!url) return;
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = activeDoc?.fileName || "document.pdf";
                  link.target = "_blank";
                  link.rel = "noreferrer";
                  link.click();
                }}
                className="flex h-8 w-8 items-center justify-center text-slate-600 hover:text-slate-900"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Print"
                onClick={() => window.print()}
                className="flex h-8 w-8 items-center justify-center text-slate-600 hover:text-slate-900"
              >
                <Printer className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Email"
                onClick={() => {
                  const subject = encodeURIComponent(req.documentName || "Document");
                  window.location.href = `mailto:?subject=${subject}`;
                }}
                className="flex h-8 w-8 items-center justify-center text-slate-600 hover:text-slate-900"
              >
                <Mail className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="ml-2 h-8 rounded-[3px] bg-[#12875a] px-4 text-[13px] font-semibold text-white hover:bg-[#0f734d]"
              >
                Finish
              </button>
              <div className="relative ml-1">
                <button
                  type="button"
                  onClick={() => setMoreOpen((open) => !open)}
                  className="inline-flex h-8 items-center gap-1 rounded-[3px] border border-slate-300 bg-white px-3 text-[13px] text-slate-700 hover:bg-slate-50"
                >
                  More actions
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {moreOpen ? (
                  <div className="absolute right-0 z-40 mt-1 w-44 rounded border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setMoreOpen(false);
                        window.location.href = "/signature/documents";
                      }}
                    >
                      Finish later
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        setMoreOpen(false);
                        decline();
                      }}
                    >
                      Decline
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute top-full right-64 z-30 mt-2 max-w-[280px] rounded-[3px] border border-[#d7eee4] bg-[#f3fbf7] px-3 py-2 text-[13px] text-slate-800 shadow-sm">
            <span className="absolute -top-1.5 right-8 h-2.5 w-2.5 rotate-45 border-t border-l border-[#d7eee4] bg-[#f3fbf7]" />
            {finishMessage}
          </div>
        </div>
      ) : (
      <div
        data-sign-consent
        className={cn(
          "flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-2.5",
          consentError && !signingEnabled
            ? "border-rose-300"
            : "border-slate-200",
        )}
      >
        <label className="flex min-w-0 flex-1 items-start gap-2.5">
          <input
            type="checkbox"
            checked={hasAgreedConsent}
            onChange={(e) => {
              setHasAgreedConsent(e.target.checked);
              if (!e.target.checked) setSigningEnabled(false);
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#12875a]"
          />
          <span className="text-[13px] leading-5 text-slate-800">
            I confirm that I have read and understood the{" "}
            <button
              type="button"
              onClick={() => setIsDisclosureModalOpen(true)}
              className="text-[#1a73c7] underline"
            >
              &quot;Electronic Record and Signature Disclosure&quot;
            </button>{" "}
            and consent to use electronic records and signatures.
          </span>
        </label>
        <div className="flex shrink-0 items-center gap-2">
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
            className="h-8 rounded-[3px] bg-[#12875a] px-3 text-[13px] font-semibold text-white hover:bg-[#0f734d]"
          >
            Agree &amp; Continue
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className="inline-flex h-8 items-center gap-1 rounded-[3px] border border-slate-300 bg-white px-3 text-[13px] text-slate-700 hover:bg-slate-50"
            >
              More actions
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {moreOpen ? (
              <div className="absolute right-0 z-40 mt-1 w-44 rounded border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setMoreOpen(false);
                    if (!signingEnabled) {
                      setConsentError(true);
                      return;
                    }
                    if (canSubmit) {
                      handleFinalSubmit();
                      return;
                    }
                    setSubmitError(
                      `Complete every field before submitting: ${missingFields
                        .map((field) => field.label || fieldKindLabel(field.kind))
                        .slice(0, 4)
                        .join(", ")}.`,
                    );
                    focusFirstIncomplete(missingFields);
                  }}
                >
                  Finish
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setMoreOpen(false);
                    window.location.href = "/signature/documents";
                  }}
                >
                  Finish later
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    setMoreOpen(false);
                    decline();
                  }}
                >
                  Decline
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {consentError && !signingEnabled ? (
          <p className="basis-full text-[12px] font-medium text-rose-600">
            Check the box, then click Agree &amp; Continue before filling fields.
          </p>
        ) : null}
        {submitError ? (
          <p className="basis-full text-[12px] font-medium text-rose-600">
            {submitError}
          </p>
        ) : null}
      </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[188px] shrink-0 flex-col border-r border-slate-300 bg-[#ececec]">
          <div className="border-b border-slate-300 px-3 py-2 text-[13px] font-semibold text-slate-800">
            Documents
          </div>
          {documents.length > 1 ? (
            <div className="border-b border-slate-200 px-2 py-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setActiveDocId(doc.id);
                    setActivePage(1);
                  }}
                  className={cn(
                    "block w-full truncate rounded px-2 py-1.5 text-left text-[12px]",
                    activeDoc?.id === doc.id
                      ? "bg-white font-medium text-slate-900"
                      : "text-slate-600 hover:bg-white/70",
                  )}
                >
                  {doc.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="border-b border-slate-200 px-3 py-2">
              <p className="truncate text-[12px] font-medium text-slate-800">
                {activeDoc?.name || req.documentName}
              </p>
              <p className="text-[11px] text-slate-500">Document</p>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeDoc ? (
              <SignPageRail
                fileUrl={activeDoc.fileUrl}
                fileName={activeDoc.fileName}
                activePage={activePage}
                onSelectPage={showPage}
              />
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto py-6">
        {activeDoc ? (
          <div className="mx-auto w-fit shadow-[0_2px_16px_rgba(15,23,42,0.18)]">
            <SignatureDocPreview
              key={activeDoc.id}
              fileName={activeDoc.fileName}
              fileUrl={activeDoc.fileUrl}
              fields={fieldsForDoc(activeDoc.id)}
              signers={req.signers}
              selectedFieldId={guidedField?.id}
              highlightSignerId={signer.id}
              interactive={signingEnabled}
              onFieldClick={handleFieldClick}
              pageWidth={760}
              embedded
              pageAnchorPrefix={pageAnchor}
            />
          </div>
        ) : null}
        {guideOpen && guidedField && !fieldsComplete && !isModalOpen && !activeInputField ? (
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
      </div>
      </div>

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
