import { Phone } from "lucide-react";
import type { OverviewField } from "./types";

interface OverviewCardProps {
  fields: OverviewField[];
}

export function OverviewCard({ fields }: OverviewCardProps) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white">
      <div className="divide-y divide-slate-100">
        {fields.map((field) => (
          <div
            key={field.id}
            className="grid grid-cols-[140px_1fr] items-center gap-4 px-6 py-2.5"
          >
            <span className="text-right text-[13px] font-medium text-slate-500">
              {field.label}
            </span>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-800">
              {field.icon}
              {field.href ? (
                <a
                  href={field.href}
                  className="text-indigo-600 hover:underline"
                >
                  {field.value}
                </a>
              ) : (
                field.value
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Convenience field for phone numbers, matching the reference layout's green phone icon. */
export function phoneField(
  id: string,
  label: string,
  value: string,
): OverviewField {
  return {
    id,
    label,
    value,
    icon: (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Phone className="h-2.5 w-2.5" />
      </span>
    ),
  };
}
