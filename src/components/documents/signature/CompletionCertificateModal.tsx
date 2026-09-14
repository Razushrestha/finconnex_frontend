"use client";

import { Download, FilePenLine, Printer, X } from "lucide-react";
import {
  buildCompletionCertificatePdf,
  completionCertificateFromRequest,
  type CompletionCertificate,
} from "@/lib/documents/signature/completion-certificate";
import type { SignatureRequest } from "@/lib/documents/signature/types";

const BLUE = "#2B9FE2";

function Field({
  label,
  value,
  stacked,
}: {
  label: string;
  value?: string | number;
  stacked?: boolean;
}) {
  return (
    <p className={`text-[13px] leading-6 text-slate-900 ${stacked ? "pl-[92px] -mt-1" : ""}`}>
      {stacked ? null : (
        <span className="font-bold text-slate-900">{label} </span>
      )}
      <span className="font-normal">{value ?? "—"}</span>
    </p>
  );
}

function Pair({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  leftLabel: string;
  leftValue?: string | number;
  rightLabel: string;
  rightValue?: string | number;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
      <Field label={leftLabel} value={leftValue} />
      <Field label={rightLabel} value={rightValue} />
    </div>
  );
}

function SignatureMark({
  signer,
}: {
  signer: CompletionCertificate["signers"][number];
}) {
  if (signer.signatureData?.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={signer.signatureData}
        alt={`${signer.name} signature`}
        className="mt-1 h-10 max-w-[180px] object-contain object-left"
      />
    );
  }
  const typed = signer.signatureData?.startsWith("typed:")
    ? signer.signatureData.replace(/^typed:/, "")
    : signer.name;
  return (
    <p
      className="mt-0.5 text-[22px] leading-none text-slate-800"
      style={{ fontFamily: `"Segoe Script", "Apple Chancery", "Snell Roundhand", cursive` }}
    >
      {typed}
    </p>
  );
}

function CertificateBody({ cert }: { cert: CompletionCertificate }) {
  return (
    <div className="mx-auto w-full max-w-[820px] bg-white px-10 py-8 text-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-md border"
            style={{ borderColor: BLUE, color: BLUE }}
          >
            <FilePenLine className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold" style={{ color: BLUE }}>
              FinConnex
            </p>
            <p className="text-[13px] font-semibold" style={{ color: BLUE }}>
              Sign
            </p>
          </div>
        </div>
        <p className="pt-1 text-[13px] text-slate-400">
          Generated on {cert.generatedAt}
        </p>
      </div>

      <h1
        className="mt-8 text-center text-[32px] font-semibold tracking-tight"
        style={{ color: BLUE }}
      >
        Certificate of Completion
      </h1>
      <div className="mt-3 h-px bg-slate-300" />

      <h2 className="mt-5 text-[22px] font-semibold" style={{ color: BLUE }}>
        Summary
      </h2>
      <div className="mt-2 space-y-0.5">
        <Field label="Document ID:" value={cert.envelopeId} />
        <Field label="Document name:" value={cert.documentName} />
        <Field
          label="Sent by:"
          value={
            cert.sentByEmail
              ? `${cert.sentByName} <${cert.sentByEmail}>`
              : cert.sentByName
          }
        />
        <Field label="Organization:" value={cert.organizationName} />
        <Field label="" value={cert.organizationAddress} stacked />
      </div>

      <div className="mt-3 space-y-0.5">
        <Pair
          leftLabel="Sent on:"
          leftValue={cert.sentOn}
          rightLabel="Signers:"
          rightValue={cert.signerCount}
        />
        <Pair
          leftLabel="Completed on:"
          leftValue={cert.completedOn}
          rightLabel="Receives a copy:"
          rightValue={cert.ccCount}
        />
        <Pair
          leftLabel="Sign order:"
          leftValue={cert.signOrder}
          rightLabel="Approvers:"
          rightValue={cert.approverCount}
        />
        <Pair
          leftLabel="No. of documents:"
          leftValue={cert.documentCount}
          rightLabel="Witnesses:"
          rightValue={cert.witnessCount}
        />
        <Pair
          leftLabel="Time zone:"
          leftValue={cert.timezone}
          rightLabel="Recipient reviewers:"
          rightValue={cert.reviewerCount}
        />
      </div>

      <h2 className="mt-6 text-[22px] font-semibold" style={{ color: BLUE }}>
        Recipients
      </h2>
      <div className="mt-3 space-y-8">
        {cert.signers.map((signer) => (
          <div key={`${signer.email}-${signer.name}`}>
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-3">
                <div className="text-center">
                  <FilePenLine className="mx-auto h-8 w-8" style={{ color: BLUE }} />
                  <p className="mt-0.5 text-[13px]" style={{ color: BLUE }}>
                    {signer.role}
                  </p>
                </div>
                <div className="pt-1">
                  <p className="text-[14px] font-medium text-slate-800">
                    {signer.name}
                  </p>
                  <p className="text-[13px] text-slate-600">{signer.email}</p>
                </div>
              </div>
              <div className="min-w-[160px] text-left">
                <p className="text-[13px]" style={{ color: BLUE }}>
                  Signature
                </p>
                <SignatureMark signer={signer} />
              </div>
            </div>

            <div className="mt-4 space-y-0.5">
              <Pair
                leftLabel="Emailed on:"
                leftValue={signer.emailedAt}
                rightLabel="Accessed from:"
                rightValue={signer.ip}
              />
              <Pair
                leftLabel="Viewed on:"
                leftValue={signer.viewedAt}
                rightLabel="Device used:"
                rightValue={signer.device}
              />
              <Pair
                leftLabel="Terms agreed on:"
                leftValue={signer.termsAgreedAt}
                rightLabel="Authentication type:"
                rightValue={signer.authenticationType}
              />
              <Field label="Signed on:" value={signer.signedAt} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompletionCertificateModal({
  req,
  onClose,
}: {
  req: SignatureRequest;
  onClose: () => void;
}) {
  const cert = completionCertificateFromRequest(req);

  function downloadPdf() {
    const bytes = buildCompletionCertificatePdf(cert);
    const blob = new Blob([bytes.buffer as ArrayBuffer], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${req.documentName.replace(/[^\w.-]+/g, "_")}_Certificate.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:bg-white print:p-0">
      <div className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl print:h-auto print:max-w-none print:rounded-none print:shadow-none">
        <div className="flex items-center justify-between border-b px-4 py-3 print:hidden">
          <p className="text-sm font-semibold text-slate-900">
            Certificate of Completion
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium text-white hover:opacity-90"
              style={{ backgroundColor: BLUE }}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto print:overflow-visible">
          <CertificateBody cert={cert} />
        </div>
      </div>
    </div>
  );
}
