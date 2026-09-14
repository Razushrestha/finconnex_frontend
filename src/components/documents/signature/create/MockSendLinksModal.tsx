"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, FileText, X } from "lucide-react";
import type { SignatureSigner } from "@/lib/documents/signature/types";
import { getSigningLink } from "@/lib/documents/signature/mock-send";

export function MockSendLinksModal({
  signers,
  onClose,
}: {
  signers: SignatureSigner[];
  onClose: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const primary = signers[0];
  const signingPath = primary ? `/sign/${primary.token}` : "";
  const signingLink = primary ? getSigningLink(primary.token) : "";

  useEffect(() => {
    if (!moreOpen) return;
    function handleClick(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  function handleAgree() {
    if (!agreed) {
      setShowHint(true);
      return;
    }
    if (signingPath) {
      window.location.assign(signingPath);
      return;
    }
    onClose();
  }

  async function copyLink() {
    if (!signingLink) return;
    try {
      await navigator.clipboard.writeText(signingLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
    setMoreOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-w-0 cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => {
                setAgreed(event.target.checked);
                if (event.target.checked) setShowHint(false);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
            />
            <span className="text-[13px] leading-relaxed text-slate-800">
              I confirm that I have read and understood the{" "}
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDisclosureOpen(true);
                }}
                className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
              >
                “Electronic Record and Signature Disclosure”
              </button>{" "}
              and consent to use electronic records and signatures.
            </span>
          </label>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleAgree}
              className="h-9 rounded-md bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Agree &amp; Continue
            </button>
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                className="inline-flex h-9 items-center gap-1 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                More actions
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {moreOpen ? (
                <div className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={copyLink}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Link copied" : "Copy signing link"}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Go to documents
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {!agreed ? (
          <div className="bg-[#555] px-4 py-2 text-[13px] font-medium text-white">
            Check this and click{" "}
            <span className="font-semibold">Agree &amp; Continue</span> to start
            signing
          </div>
        ) : null}
      </div>

      {disclosureOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDisclosureOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Electronic Record and Signature Disclosure
              </h3>
              <button
                type="button"
                onClick={() => setDisclosureOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto px-5 py-4 text-xs leading-relaxed text-slate-600">
              <p>
                By checking the box and clicking Agree &amp; Continue, you
                confirm that you can access and retain electronic records, and
                you consent to use electronic signatures in place of handwritten
                ones for this document.
              </p>
              <p>
                You may request a paper copy, withdraw consent, or update your
                contact details by contacting the sender. Withdrawing consent
                does not affect documents you have already signed.
              </p>
              <p>
                Please review all fields placed on the document. Completing
                required signature and date fields indicates your agreement to
                the terms of this request.
              </p>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  setAgreed(true);
                  setShowHint(false);
                  setDisclosureOpen(false);
                }}
                className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                I Agree &amp; Accept
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
