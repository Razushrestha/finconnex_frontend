import type { SignatureField } from "@/lib/documents/signature/types";
import { isSignatureCaptureKind } from "@/lib/documents/signature/field-kinds";

export function SignatureFieldValue({ field }: { field: SignatureField }) {
  if (!field.value) return null;

  if (field.kind === "checkbox") {
    return (
      <span className="text-sm font-bold text-slate-800">
        {field.value === "true" ? "✓" : ""}
      </span>
    );
  }

  if (
    field.kind === "image" ||
    field.value.startsWith("data:image") ||
    (isSignatureCaptureKind(field.kind) && field.value.startsWith("data:"))
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

  if (isSignatureCaptureKind(field.kind) && field.value.startsWith("typed:")) {
    return (
      <span className="font-serif text-[12px] leading-tight text-slate-800">
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
