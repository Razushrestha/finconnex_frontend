"use client";

import { useEffect, useState } from "react";
import mammoth from "mammoth";
import type { SignatureField, SignatureSigner } from "@/lib/documents/signature/types";
import { cn } from "@/lib/utils";
import {
  SigningFieldOverlay,
  signingFieldsForPage,
} from "./SigningFieldOverlay";

/**
 * Mirrors PdfDocViewer's props/overlay behavior so SignatureDocPreview can
 * swap between the two based on file type without the caller knowing the
 * difference. Word docs are treated as a single flowing "page".
 */

interface DocxDocViewerProps {
  fileUrl: string;
  fileName: string;
  fields: SignatureField[];
  signers: SignatureSigner[];
  selectedFieldId?: string | null;
  highlightSignerId?: string | null;
  interactive?: boolean;
  onFieldClick?: (fieldId: string) => void;
  className?: string;
  embedded?: boolean;
}

export default function DocxDocViewer({
  fileUrl,
  fileName,
  fields,
  signers,
  selectedFieldId,
  highlightSignerId,
  interactive,
  onFieldClick,
  className,
  embedded = false,
}: DocxDocViewerProps) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(false);

      if (!fileUrl) {
        if (!cancelled) {
          setLoading(false);
          setLoadError(true);
        }
        return;
      }

      try {
        const res = await fetch(fileUrl);
        const arrayBuffer = await res.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setHtml(result.value);
      } catch (error) {
        console.error("Error converting docx:", error);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500">
        <p className="font-medium text-rose-500">
          Unable to render Word document preview
        </p>
        <p className="mt-1 text-[11px] text-slate-400">{fileName}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-xs text-slate-400">
        Loading document preview…
      </div>
    );
  }

  const pageFields = signingFieldsForPage(fields, 1, 1, highlightSignerId);

  return (
    <div
      className={cn(
        embedded
          ? "relative mx-auto w-full bg-transparent p-0"
          : "relative mx-auto max-h-[68vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-slate-100/80 p-4 shadow-inner custom-scrollbar",
        className,
      )}
    >
      <div className="relative mx-auto min-h-[900px] max-w-[700px] rounded-lg border border-slate-200/60 bg-white p-8 shadow-md">
        <div
          className="prose prose-sm max-w-none text-slate-800"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {pageFields.map((field) => (
          <SigningFieldOverlay
            key={field.id}
            field={field}
            signers={signers}
            selectedFieldId={selectedFieldId}
            highlightSignerId={highlightSignerId}
            interactive={interactive}
            onFieldClick={onFieldClick}
          />
        ))}
      </div>
    </div>
  );
}
