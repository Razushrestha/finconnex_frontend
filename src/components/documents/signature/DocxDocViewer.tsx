"use client";

import { useEffect, useState } from "react";
import mammoth from "mammoth";
import { Calendar, PenLine, Type, User } from "lucide-react";
import {
  SIGNER_COLORS,
  fieldKindLabel,
  type SignatureField,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import { cn } from "@/lib/utils";

/**
 * Mirrors PdfDocViewer's props/overlay behavior so SignatureDocPreview can
 * swap between the two based on file type without the caller knowing the
 * difference. Word docs are treated as a single flowing "page" — fields
 * placed on a docx are always page 1 (see PlaceFieldsView's docx branch,
 * which places fields the same way on the sender side).
 */

function FieldIcon({ kind }: { kind: SignatureField["kind"] }) {
  switch (kind) {
    case "signature":
    case "initials":
      return <PenLine className="h-3 w-3 shrink-0" />;
    case "date":
      return <Calendar className="h-3 w-3 shrink-0" />;
    case "name":
      return <User className="h-3 w-3 shrink-0" />;
    default:
      return <Type className="h-3 w-3 shrink-0" />;
  }
}

function renderValue(field: SignatureField) {
  if (!field.value) return null;
  if (
    (field.kind === "signature" || field.kind === "initials") &&
    field.value.startsWith("typed:")
  ) {
    return (
      <span className="font-serif text-[12px] leading-tight text-slate-800">
        {field.value.replace(/^typed:/, "")}
      </span>
    );
  }
  if (
    (field.kind === "signature" || field.kind === "initials") &&
    field.value.startsWith("data:")
  ) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={field.value}
        alt=""
        className="h-full max-h-8 w-full object-contain"
      />
    );
  }
  return (
    <span className="text-[10px] font-semibold text-slate-800 truncate">
      {field.value}
    </span>
  );
}

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
        // fileUrl is a data: URL (persistent) or a blob: URL (same-tab
        // preview) — both are fetchable, unlike a bare File object which
        // the recipient's browser never has.
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

  const visibleFields = highlightSignerId
    ? fields.filter((f) => f.signerId === highlightSignerId)
    : fields;

  return (
    <div
      className={cn(
        "relative mx-auto max-h-[68vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-slate-100/80 p-4 shadow-inner custom-scrollbar",
        className,
      )}
    >
      <div className="relative mx-auto min-h-[900px] max-w-[700px] rounded-lg border border-slate-200/60 bg-white p-8 shadow-md">
        <div
          className="prose prose-sm max-w-none text-slate-800"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {visibleFields.map((f) => {
          const signer = signers.find((s) => s.id === f.signerId);
          const color = SIGNER_COLORS[signer?.colorIndex ?? 0];
          const dim =
            highlightSignerId && f.signerId !== highlightSignerId
              ? "opacity-35"
              : "";
          const selected = selectedFieldId === f.id;
          const filled = Boolean(f.value);

          return (
            <div
              key={f.id}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1 overflow-hidden rounded border-2 border-dashed px-1.5 py-1 text-[10px] font-semibold shadow-sm transition-all z-10 select-none",
                color.bg,
                color.text,
                color.border,
                dim,
                selected && "ring-2 ring-violet-500 ring-offset-1 shadow-md",
                filled && "border-solid bg-white/95",
                interactive && "cursor-pointer hover:scale-105",
              )}
              style={{
                left: `${f.x}%`,
                top: `${f.y}%`,
                width: f.w && f.w <= 100 ? `${f.w}%` : "140px",
                height: "34px",
                minHeight: "34px",
                maxHeight: "34px",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onFieldClick?.(f.id);
              }}
            >
              {filled ? (
                renderValue(f)
              ) : (
                <>
                  <FieldIcon kind={f.kind} />
                  <span className="truncate">
                    {f.label || fieldKindLabel(f.kind)}
                    {signer ? ` · ${signer.name.split(" ")[0]}` : ""}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
