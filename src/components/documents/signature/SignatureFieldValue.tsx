import type { SignatureField } from "@/lib/documents/signature/types";
import { isSignatureCaptureKind } from "@/lib/documents/signature/field-kinds";
import { cn } from "@/lib/utils";

export function SignatureFieldValue({
  field,
  ink = false,
}: {
  field: SignatureField;
  ink?: boolean;
}) {
  if (!field.value) return null;

  if (field.kind === "checkbox") {
    return (
      <span className={cn("font-bold text-slate-800", ink ? "text-base" : "text-sm")}>
        {field.value === "true" ? "✓" : ""}
      </span>
    );
  }

  if (
    field.kind === "image" ||
    field.kind === "stamp" ||
    field.value.startsWith("data:image") ||
    (isSignatureCaptureKind(field.kind) && field.value.startsWith("data:"))
  ) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={field.value}
        alt=""
        className={cn(
          "w-full object-contain",
          ink ? "h-full max-h-full" : "h-full max-h-8 brightness-0 contrast-150",
        )}
      />
    );
  }

  if (isSignatureCaptureKind(field.kind) && field.value.startsWith("typed:")) {
    return (
      <span
        className={cn(
          "font-serif font-extrabold leading-tight text-black",
          ink ? "text-[15px]" : "text-[13px]",
        )}
      >
        {field.value.replace(/^typed:/, "")}
      </span>
    );
  }

  if (field.kind === "attachment") {
    const label = field.value.startsWith("file:")
      ? field.value.slice(5)
      : field.value.startsWith("data:")
        ? "File attached"
        : field.value;
    return (
      <span className="truncate text-[10px] font-semibold text-slate-800">
        {label}
      </span>
    );
  }

  return (
    <span className="truncate text-[10px] font-semibold text-slate-800">
      {field.value}
    </span>
  );
}
