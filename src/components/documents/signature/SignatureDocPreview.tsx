"use client";

import {
  Calendar,
  PenLine,
  Type,
  User,
} from "lucide-react";
import {
  SIGNER_COLORS,
  fieldKindLabel,
  type SignatureField,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import { cn } from "@/lib/utils";

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
      <span className="font-serif text-[13px] leading-tight text-slate-800">
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
        className="h-full max-h-10 w-full object-contain"
      />
    );
  }
  return (
    <span className="text-[11px] font-semibold text-slate-800">
      {field.value}
    </span>
  );
}

export function SignatureDocPreview({
  fileName,
  fields,
  signers,
  selectedFieldId,
  highlightSignerId,
  interactive,
  onCanvasClick,
  onFieldClick,
  onFieldPointerDown,
  className,
}: {
  fileName: string;
  fields: SignatureField[];
  signers: SignatureSigner[];
  selectedFieldId?: string | null;
  highlightSignerId?: string | null;
  interactive?: boolean;
  onCanvasClick?: (xPct: number, yPct: number) => void;
  onFieldClick?: (fieldId: string) => void;
  onFieldPointerDown?: (
    fieldId: string,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
  className?: string;
}) {
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!interactive || !onCanvasClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onCanvasClick(x, y);
  }

  return (
    <div
      role={interactive ? "button" : undefined}
      onClick={handleClick}
      className={cn(
        "relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner",
        interactive && "cursor-crosshair",
        className,
      )}
    >
      <div className="absolute inset-x-8 top-10 space-y-2">
        <div className="h-3 w-2/3 rounded bg-slate-200/80" />
        <div className="h-2 w-full rounded bg-slate-100" />
        <div className="h-2 w-full rounded bg-slate-100" />
        <div className="h-2 w-5/6 rounded bg-slate-100" />
        <div className="mt-6 h-2 w-full rounded bg-slate-100" />
        <div className="h-2 w-full rounded bg-slate-100" />
        <div className="h-2 w-4/5 rounded bg-slate-100" />
        <div className="mt-4 h-2 w-full rounded bg-slate-100" />
        <div className="h-2 w-3/4 rounded bg-slate-100" />
      </div>
      <p className="absolute top-[38%] left-1/2 -translate-x-1/2 text-[11px] font-medium text-slate-300">
        {fileName}
      </p>

      {fields.map((f) => {
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
              "absolute flex items-center justify-center gap-1 overflow-hidden rounded border-2 border-dashed px-1.5 py-1 text-[10px] font-semibold shadow-sm transition-shadow",
              color.bg,
              color.text,
              color.border,
              dim,
              selected && "ring-2 ring-offset-1 ring-violet-500 shadow-md",
              filled && "border-solid bg-white/95",
              interactive && "cursor-grab active:cursor-grabbing",
            )}
            style={{
              left: `${f.x}%`,
              top: `${f.y}%`,
              width: `${f.w}%`,
              height: `${f.h}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onFieldClick?.(f.id);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onFieldPointerDown?.(f.id, e);
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
  );
}
