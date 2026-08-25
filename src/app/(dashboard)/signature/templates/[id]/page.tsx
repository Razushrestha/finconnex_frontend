"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Send,
  Edit3,
  Layers,
  ShieldCheck,
  Clock,
} from "lucide-react";
import {
  listSignatureRequests,
  type SignatureRequest,
} from "@/lib/documents/signature/types";

export default function TemplateDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params?.id as string;

  const [template, setTemplate] = useState<SignatureRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!templateId) return;

    try {
      const allRequests = listSignatureRequests();
      const found = allRequests.find((req) => req.id === templateId);
      if (found) {
        setTemplate(found);
      }
    } catch (error) {
      console.error("Failed to load template details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [templateId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">
        Loading template details...
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
          Template Not Found
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          The template you are looking for doesn't exist or may have been
          deleted.
        </p>
        <button
          onClick={() => router.push("/signature/templates")}
          className="px-3.5 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold shadow-xs hover:opacity-95 transition-opacity"
        >
          Back to Templates
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full flex-col p-4 space-y-6">
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
        <button
          onClick={() => router.push("/signature/templates")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Templates
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              router.push(`/signature/templates/create?edit=${template.id}`)
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
          >
            <Edit3 className="h-3.5 w-3.5 text-slate-400" />
            Edit Template
          </button>
          <button
            onClick={() =>
              router.push(`/signature/send?templateId=${template.id}`)
            }
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold shadow-2xs hover:opacity-95 transition-opacity"
          >
            <Send className="h-3.5 w-3.5" />
            Use Template
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Primary Details & Metadata (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Identity Card */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-violet-50 text-violet-700 rounded dark:bg-violet-950/60 dark:text-violet-400">
                  {template.status || "Template"}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ID: {template.id}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Updated Today
              </span>
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {template.documentName || "Untitled Template"}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Standard document configuration template optimized for recurring
                client execution pipelines.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-zinc-900 text-sm">
              <div>
                <p className="text-[10px] uppercase font-semibold text-slate-400">
                  Source Document
                </p>
                <p className="font-medium text-slate-800 dark:text-zinc-200 truncate mt-0.5">
                  {template.documentFile || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-slate-400">
                  Created By
                </p>
                <p className="font-medium text-slate-800 dark:text-zinc-200 truncate mt-0.5">
                  {template.createdBy || "Current User"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-slate-400">
                  Category
                </p>
                <p className="font-medium text-slate-800 dark:text-zinc-200 truncate mt-0.5">
                  Compliance / Agreement
                </p>
              </div>
            </div>
          </div>

          {/* Pre-configured Recipients Panel */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Pre-configured Recipients ({template.signers?.length || 0})
                </h2>
              </div>
            </div>

            {!template.signers || template.signers.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-zinc-900/50 border border-dashed border-slate-200 dark:border-zinc-800 text-center text-sm text-slate-400">
                No specific recipients defined in this template.
              </div>
            ) : (
              <div className="space-y-2">
                {template.signers.map((signer: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-zinc-900 dark:bg-zinc-900/40 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold flex items-center justify-center text-[10px]">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-zinc-200">
                          {signer.name || `Signer Slot ${index + 1}`}
                        </p>
                        <p className="text-slate-400 text-[11px]">
                          {signer.email || "No placeholder email set"}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 font-medium text-[10px]">
                      {signer.role || "Signer"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: CRM Sidebar Properties & Fields Summary */}
        <div className="space-y-6">
          {/* Embedded Fields Card */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Field Mapping
              </h2>
            </div>

            <div className="p-3 rounded-lg bg-violet-50/50 border border-violet-100 dark:bg-violet-950/20 dark:border-violet-900/40 text-sm space-y-1">
              <p className="font-semibold text-violet-900 dark:text-violet-300">
                {template.fields?.length || 0} Anchors Embedded
              </p>
              <p className="text-[11px] text-violet-700/80 dark:text-violet-400/80">
                Signature boxes, date stamps, and form fields are mapped and
                pre-locked for instant deployment.
              </p>
            </div>
          </div>

          {/* Quick Actions / Audit Helper */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Template Integrity
              </h2>
            </div>
            <div className="text-sm text-slate-500 space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-900">
                <span className="text-slate-400">Security Rule</span>
                <span className="font-medium text-slate-700 dark:text-zinc-300">
                  Strict Lock
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-900">
                <span className="text-slate-400">Version</span>
                <span className="font-medium text-slate-700 dark:text-zinc-300">
                  v1.0.0
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Workflow Scope</span>
                <span className="font-medium text-slate-700 dark:text-zinc-300">
                  Global CRM
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
