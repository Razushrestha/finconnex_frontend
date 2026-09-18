import { Calendar, PenLine, Type, User } from "lucide-react";
import {
  SIGNER_COLORS,
  fieldKindLabel,
  type SignatureField,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import { placedFieldOverlayStyle } from "@/lib/documents/signature/field-placement";
import { cn } from "@/lib/utils";
import { SignatureFieldValue } from "./SignatureFieldValue";

function FieldIcon({ kind }: { kind: SignatureField["kind"] }) {
  switch (kind) {
    case "signature":
    case "initials":
      return <PenLine className="h-3 w-3 shrink-0" />;
    case "date":
    case "sign_date":
      return <Calendar className="h-3 w-3 shrink-0" />;
    case "name":
      return <User className="h-3 w-3 shrink-0" />;
    default:
      return <Type className="h-3 w-3 shrink-0" />;
  }
}

export function signingFieldsForPage(
  fields: SignatureField[],
  pageNum: number,
  numPages: number,
  highlightSignerId?: string | null,
) {
  return fields.filter((field) => {
    const onPage = (field.page || 1) === pageNum || numPages === 1;
    if (!onPage) return false;
    if (!highlightSignerId) return true;
    if (field.signerId === highlightSignerId) return true;
    return Boolean(field.value?.trim());
  });
}

export function SigningFieldOverlay({
  field,
  signers,
  selectedFieldId,
  highlightSignerId,
  interactive,
  onFieldClick,
}: {
  field: SignatureField;
  signers: SignatureSigner[];
  selectedFieldId?: string | null;
  highlightSignerId?: string | null;
  interactive?: boolean;
  onFieldClick?: (fieldId: string) => void;
}) {
  const signer = signers.find((row) => row.id === field.signerId);
  const color = SIGNER_COLORS[signer?.colorIndex ?? 0];
  const isMine = !highlightSignerId || field.signerId === highlightSignerId;
  const filled = Boolean(field.value?.trim());
  const selected = selectedFieldId === field.id;

  if (!isMine && filled) {
    return (
      <div
        data-signing-field={field.id}
        className="pointer-events-none absolute z-10 flex items-center overflow-hidden px-0.5"
        style={placedFieldOverlayStyle(field)}
      >
        <SignatureFieldValue field={field} ink />
      </div>
    );
  }

  return (
    <div
      data-signing-field={field.id}
      className={cn(
        "absolute z-10 flex cursor-pointer items-center justify-center gap-1 overflow-hidden rounded border-2 border-dashed px-1.5 py-1 text-[10px] font-semibold shadow-sm transition-all scroll-mt-40 select-none",
        color.bg,
        color.text,
        color.border,
        selected && "ring-2 ring-violet-500 ring-offset-1 shadow-md",
        filled && "border-solid bg-white/95",
        interactive ? "cursor-pointer" : "cursor-default",
      )}
      style={placedFieldOverlayStyle(field)}
      onClick={(event) => {
        event.stopPropagation();
        onFieldClick?.(field.id);
      }}
    >
      {filled ? (
        <SignatureFieldValue field={field} />
      ) : (
        <>
          <FieldIcon kind={field.kind} />
          <span className="truncate">
            {field.label || fieldKindLabel(field.kind)}
            {signer ? ` · ${signer.name.split(" ")[0]}` : ""}
          </span>
        </>
      )}
    </div>
  );
}
