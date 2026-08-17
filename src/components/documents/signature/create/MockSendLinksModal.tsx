"use client";

import { useState } from "react";
import { Mail, Copy, ExternalLink, Check } from "lucide-react";
import type { SignatureSigner } from "@/lib/documents/signature/types";
import { getSigningLink } from "@/lib/documents/signature/mock-send";

export function MockSendLinksModal({
  signers,
  onClose,
}: {
  signers: SignatureSigner[];
  onClose: () => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(id: string, link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard may be unavailable (e.g. non-HTTPS) — link is still selectable text
    }
  }

  if (signers.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-violet-50 p-2 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Sent (test mode)
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              No real email/SMS API is wired up yet — use these links to test
              the signing flow yourself.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {signers.map((signer) => {
            const link = getSigningLink(signer.token);
            return (
              <div
                key={signer.id}
                className="rounded-lg border border-slate-200 p-3 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-900 dark:text-white">
                      {signer.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-zinc-400">
                      {signer.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => handleCopy(signer.id, link)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      title="Copy link"
                    >
                      {copiedId === signer.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      title="Open signing page"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
                <p className="mt-2 truncate rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-500 dark:bg-zinc-900 dark:text-zinc-500">
                  {link}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
