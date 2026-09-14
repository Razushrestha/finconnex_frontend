"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, Mail, Printer } from "lucide-react";
import { filesFromSignatureRequest } from "@/lib/documents/signature/compose-email";
import {
  getRequestDocuments,
  type SignatureRequest,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import { SignatureComposeEmailModal } from "./SignatureComposeEmailModal";
import {
  downloadArtifactBlob,
  getSignedArtifact,
  persistSignedPackage,
} from "@/lib/documents/signed-artifacts";
import { cn } from "@/lib/utils";

function actionButtonClass(extra?: string) {
  return cn(
    "inline-flex h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70",
    extra,
  );
}

function downloadFile(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

function printFile(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Print signed document");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = objectUrl;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.open(objectUrl, "_blank", "noopener,noreferrer")?.print();
    }
    window.setTimeout(() => {
      iframe.remove();
      URL.revokeObjectURL(objectUrl);
    }, 1500);
  };
  document.body.appendChild(iframe);
}

export function SignedCompleteView({
  req,
  signer,
}: {
  req: SignatureRequest;
  signer: SignatureSigner;
  token: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const documents = getRequestDocuments(req);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4000);
  }

  async function signedCopies() {
    const files = await filesFromSignatureRequest(req);
    if (files.length) return files;
    flash("Could not prepare the signed document yet.");
    return [];
  }

  async function printCopy() {
    setBusy(true);
    try {
      const files = await signedCopies();
      for (const file of files) printFile(file);
      if (files.length) flash("Opening print for the signed copy");
    } finally {
      setBusy(false);
    }
  }

  function downloadCertificate() {
    const doc = persistSignedPackage(req);
    const artifact = getSignedArtifact(doc.id);
    if (artifact) {
      downloadArtifactBlob(artifact, doc.fileName);
      flash(`Downloaded ${doc.fileName}`);
      return;
    }
    flash("Could not prepare a download.");
  }

  async function downloadSigned(files?: File[]) {
    setBusy(true);
    try {
      const copies = files ?? (await signedCopies());
      for (const file of copies) downloadFile(file);
      if (copies.length) flash("Downloaded signed document");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-4">
      <h1 className="text-center text-[22px] font-normal tracking-tight text-slate-400">
        You have signed this document.
      </h1>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className={actionButtonClass()}
        >
          <Mail className="h-4 w-4 text-slate-500" />
          Email to me
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void printCopy()}
          className={actionButtonClass()}
        >
          <Printer className="h-4 w-4 text-slate-500" />
          Print
        </button>

        <div className="relative" ref={menuRef}>
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
            <button
              type="button"
              disabled={busy}
              onClick={() => void downloadSigned()}
              className="inline-flex h-11 items-center gap-2 px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
            >
              <Download className="h-4 w-4 text-slate-500" />
              Download
            </button>
            <button
              type="button"
              aria-label="More download options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-11 w-9 items-center justify-center border-l border-slate-300 text-slate-500 hover:bg-slate-50"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-1 min-w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setMenuOpen(false);
                  void downloadSigned();
                }}
              >
                Combined PDF
              </button>
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false);
                    void (async () => {
                      const copies = await signedCopies();
                      const match = copies.find((file) =>
                        file.name
                          .toLowerCase()
                          .includes(
                            (doc.fileName || doc.name || "")
                              .replace(/\.[^.]+$/, "")
                              .toLowerCase(),
                          ),
                      );
                      await downloadSigned(match ? [match] : copies);
                    })();
                  }}
                >
                  {doc.name || doc.fileName}
                </button>
              ))}
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setMenuOpen(false);
                  downloadCertificate();
                }}
              >
                Certificate of completion
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <Link
        href="/signature"
        className="mt-8 text-[13px] font-semibold text-blue-600 hover:underline"
      >
        Back to e-signature
      </Link>

      {notice ? (
        <p className="mt-6 text-center text-[12px] text-slate-500">{notice}</p>
      ) : null}

      <SignatureComposeEmailModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        req={req}
        documentName={req.documentName}
        toEmail={signer.email}
        toName={signer.name}
        onSent={flash}
      />
    </div>
  );
}
