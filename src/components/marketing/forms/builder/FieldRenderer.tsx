"use client";

import {
  User,
  Star,
  Upload,
  PenTool,
  FileSignature,
  Grid3x3,
  Music,
  Video,
  FileText,
  MapPin,
  Image as ImageIcon,
} from "lucide-react";
import type { FormField } from "@/lib/form-builder/types";
import {
  CHOICE_FIELD_TYPES,
  MATRIX_FIELD_TYPES,
  DEFAULT_NAME_ELEMENTS,
} from "@/lib/form-builder/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const TEXT_LIKE = new Set([
  "single-line",
  "address",
  "website",
  "geo-complete",
  "regex",
]);
const NUMBER_LIKE = new Set(["number", "decimal", "currency", "formula"]);
const DATE_LIKE: Record<string, string> = {
  date: "date",
  "date-time": "datetime-local",
  time: "time",
  "month-year": "month",
  "day-availability": "date",
  "date-time-availability": "datetime-local",
};
const EMBED_LIKE: Record<string, { icon: typeof Music; label: string }> = {
  "audio-embed": { icon: Music, label: "Audio embed" },
  "video-embed": { icon: Video, label: "Video embed" },
  "pdf-embed": { icon: FileText, label: "PDF embed" },
  "map-location": { icon: MapPin, label: "Map location" },
  "image-slider": { icon: ImageIcon, label: "Image slider" },
};

export function FieldRenderer({
  field,
  disabled = true,
}: {
  field: FormField;
  disabled?: boolean;
}) {
  const { type, label, options } = field;

  return (
    <div className="w-full">
      {(() => {
        if (type === "name") {
          const nameElements =
            field.settings?.nameElements ?? DEFAULT_NAME_ELEMENTS;
          const visibleElements = nameElements.filter(
            (el) => el.visible !== false,
          );
          const count = visibleElements.length;

          const gridColsClass =
            count === 3
              ? "grid-cols-1 sm:grid-cols-3"
              : count === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1";

          return (
            <div className={`grid gap-3 ${gridColsClass}`}>
              {visibleElements.map((el) => (
                <div key={el.id} className="space-y-1">
                  <FieldShell
                    iconPrefix={
                      <User className="h-4 w-4 text-muted-foreground" />
                    }
                  >
                    <Input placeholder={el.label} disabled={disabled} />
                  </FieldShell>
                  {field.settings?.showElementsLabel !== false && (
                    <span className="text-xs text-muted-foreground">
                      {el.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        }

        if (type === "multi-line" || type === "description") {
          return (
            <Textarea
              disabled={disabled}
              placeholder={
                type === "description" ? "Enter descriptive text…" : ""
              }
              rows={3}
            />
          );
        }

        if (type === "email")
          return (
            <Input
              type="email"
              placeholder="name@example.com"
              disabled={disabled}
            />
          );
        if (type === "phone")
          return (
            <Input
              type="tel"
              placeholder="+977 98XXXXXXXX"
              disabled={disabled}
            />
          );

        if (TEXT_LIKE.has(type))
          return <Input disabled={disabled} placeholder="Enter text" />;

        if (NUMBER_LIKE.has(type)) {
          const prefix =
            type === "currency" ? "$" : type === "formula" ? "fx" : undefined;
          return (
            <div className="flex items-center gap-2">
              {prefix && (
                <span className="text-sm text-muted-foreground">{prefix}</span>
              )}
              <Input type="number" disabled={disabled} placeholder="0" />
            </div>
          );
        }

        if (CHOICE_FIELD_TYPES.includes(type)) {
          if (
            type === "dropdown" ||
            type === "grouped-dropdown" ||
            type === "large-list"
          ) {
            return (
              <select
                disabled={disabled}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
              >
                {(options ?? []).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            );
          }
          if (type === "image-choices") {
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(options ?? []).map((o) => (
                  <div
                    key={o}
                    className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-3"
                  >
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{o}</span>
                  </div>
                ))}
              </div>
            );
          }
          // radio, checkbox, multiple-choice
          return (
            <div className="space-y-2">
              {(options ?? []).map((o) => (
                <label
                  key={o}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  {type === "checkbox" || type === "multiple-choice" ? (
                    <Checkbox disabled={disabled} />
                  ) : (
                    <input
                      type="radio"
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                  )}
                  {o}
                </label>
              ))}
            </div>
          );
        }

        if (MATRIX_FIELD_TYPES.includes(type)) {
          return (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <Grid3x3 className="h-4 w-4" />
              Matrix grid editor — TODO(api): rows/columns configuration
            </div>
          );
        }

        if (type in DATE_LIKE) {
          return (
            <Input
              type={DATE_LIKE[type]}
              disabled={disabled}
              className="w-full"
            />
          );
        }

        if (
          type === "file-upload" ||
          type === "image-upload" ||
          type === "audio-video-upload"
        ) {
          return (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-6 text-muted-foreground">
              <Upload className="h-5 w-5" />
              <span className="text-xs">
                Drag a file here or click to upload
              </span>
            </div>
          );
        }

        if (type === "rating") {
          return (
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 text-muted-foreground" />
              ))}
            </div>
          );
        }

        if (type === "slider") {
          return <input type="range" disabled={disabled} className="w-full" />;
        }

        if (type in EMBED_LIKE) {
          const { icon: Icon, label: embedLabel } = EMBED_LIKE[type];
          return (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-6 text-muted-foreground">
              <Icon className="h-5 w-5" />
              <span className="text-sm">{embedLabel} will render here</span>
            </div>
          );
        }

        if (type === "unique-id" || type === "random-id") {
          return (
            <Input
              disabled={disabled}
              placeholder={type === "unique-id" ? "1001" : "ZF-8F3K2A"}
            />
          );
        }

        if (
          type === "terms" ||
          type === "consent-checkbox" ||
          type === "yes-no"
        ) {
          return (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox disabled={disabled} />
              {type === "terms"
                ? "I agree to the Terms and Conditions"
                : type === "yes-no"
                  ? "Yes / No"
                  : label}
            </label>
          );
        }

        if (type === "signature") {
          const Icon = type === "signature" ? PenTool : FileSignature;
          return (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-muted-foreground">
              <Icon className="h-5 w-5" />
              <span className="text-sm">Signature capture area</span>
            </div>
          );
        }

        if (type === "col-2" || type === "col-3") {
          const colsClass =
            type === "col-2"
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-3";
          const totalCols = type === "col-2" ? 2 : 3;
          return (
            <div className={`grid gap-3 ${colsClass}`}>
              {Array.from({ length: totalCols }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground"
                >
                  Column {i + 1}
                </div>
              ))}
            </div>
          );
        }

        return <Input disabled={disabled} placeholder="Field preview" />;
      })()}
    </div>
  );
}

function FieldShell({
  iconPrefix,
  children,
}: {
  iconPrefix?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {iconPrefix && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2">
          {iconPrefix}
        </span>
      )}
      <div className={iconPrefix ? "[&_input]:pl-8" : ""}>{children}</div>
    </div>
  );
}
