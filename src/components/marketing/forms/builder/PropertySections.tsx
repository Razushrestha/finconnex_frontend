"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  FieldSettings,
  ImageChoiceOption,
  MatrixRowCol,
} from "@/lib/form-builder/types";

type Patch = (p: Partial<FieldSettings>) => void;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

function SectionDivider({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-border pt-5">{children}</div>;
}

export function ChoiceOptionsSection({
  settings,
  patch,
}: {
  settings: FieldSettings;
  patch: Patch;
}) {
  const options = settings.choiceOptions ?? [
    "Option 1",
    "Option 2",
    "Option 3",
  ];

  const update = (i: number, value: string) => {
    const next = [...options];
    next[i] = value;
    patch({ choiceOptions: next });
  };
  const remove = (i: number) =>
    patch({ choiceOptions: options.filter((_, idx) => idx !== i) });
  const add = () =>
    patch({ choiceOptions: [...options, `Option ${options.length + 1}`] });

  return (
    <SectionDivider>
      <SectionLabel>Choices</SectionLabel>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={opt} onChange={(e) => update(i, e.target.value)} />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="mt-2" onClick={add}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add option
      </Button>

      <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={!!settings.allowOther}
          onChange={(e) => patch({ allowOther: e.target.checked })}
        />
        Allow &ldquo;Other&rdquo; option
      </label>
    </SectionDivider>
  );
}

export function ImageChoicesSection({
  settings,
  patch,
}: {
  settings: FieldSettings;
  patch: Patch;
}) {
  const items: ImageChoiceOption[] = settings.imageChoiceOptions ?? [
    { id: "1", label: "Option 1" },
    { id: "2", label: "Option 2" },
  ];

  const update = (id: string, p: Partial<ImageChoiceOption>) =>
    patch({
      imageChoiceOptions: items.map((it) =>
        it.id === id ? { ...it, ...p } : it,
      ),
    });
  const remove = (id: string) =>
    patch({ imageChoiceOptions: items.filter((it) => it.id !== id) });
  const add = () =>
    patch({
      imageChoiceOptions: [
        ...items,
        { id: crypto.randomUUID(), label: `Option ${items.length + 1}` },
      ],
    });

  return (
    <SectionDivider>
      <SectionLabel>Image Choices</SectionLabel>
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center gap-2">
              <Input
                value={it.label}
                onChange={(e) => update(it.id, { label: e.target.value })}
              />
              <button
                type="button"
                onClick={() => remove(it.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <Input
              placeholder="Image URL"
              value={it.imageUrl ?? ""}
              onChange={(e) => update(it.id, { imageUrl: e.target.value })}
            />
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="mt-2" onClick={add}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add image option
      </Button>
    </SectionDivider>
  );
}

export function DateTimeSection({
  settings,
  patch,
}: {
  settings: FieldSettings;
  patch: Patch;
}) {
  return (
    <SectionDivider>
      <SectionLabel>Date &amp; Time</SectionLabel>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Format
          </label>
          <Input
            value={settings.dateFormat ?? "MM/DD/YYYY"}
            onChange={(e) => patch({ dateFormat: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Min date
            </label>
            <Input
              type="date"
              value={settings.minDate ?? ""}
              onChange={(e) => patch({ minDate: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Max date
            </label>
            <Input
              type="date"
              value={settings.maxDate ?? ""}
              onChange={(e) => patch({ maxDate: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Default value
          </label>
          <Input
            type="date"
            value={settings.defaultDate ?? ""}
            onChange={(e) => patch({ defaultDate: e.target.value })}
          />
        </div>
      </div>
    </SectionDivider>
  );
}

export function NumberSection({
  settings,
  patch,
  isFormula,
  isCurrency,
}: {
  settings: FieldSettings;
  patch: Patch;
  isFormula: boolean;
  isCurrency: boolean;
}) {
  if (isFormula) {
    return (
      <SectionDivider>
        <SectionLabel>Formula</SectionLabel>
        <Textarea
          rows={3}
          placeholder="e.g. {field_a} + {field_b}"
          value={settings.formulaExpression ?? ""}
          onChange={(e) => patch({ formulaExpression: e.target.value })}
        />
      </SectionDivider>
    );
  }

  return (
    <SectionDivider>
      <SectionLabel>Number Settings</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Min value
          </label>
          <Input
            type="number"
            value={settings.numberMin ?? ""}
            onChange={(e) =>
              patch({
                numberMin: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Max value
          </label>
          <Input
            type="number"
            value={settings.numberMax ?? ""}
            onChange={(e) =>
              patch({
                numberMax: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>
      <div className="mt-2">
        <label className="mb-1 block text-xs text-muted-foreground">
          Decimal places
        </label>
        <Input
          type="number"
          min={0}
          value={settings.decimalPlaces ?? 0}
          onChange={(e) => patch({ decimalPlaces: Number(e.target.value) })}
        />
      </div>
      {isCurrency && (
        <div className="mt-2">
          <label className="mb-1 block text-xs text-muted-foreground">
            Currency symbol
          </label>
          <Input
            value={settings.currencySymbol ?? "$"}
            onChange={(e) => patch({ currencySymbol: e.target.value })}
          />
        </div>
      )}
    </SectionDivider>
  );
}

export function RatingSection({
  settings,
  patch,
}: {
  settings: FieldSettings;
  patch: Patch;
}) {
  return (
    <SectionDivider>
      <SectionLabel>Rating Settings</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Max rating
          </label>
          <Input
            type="number"
            min={1}
            max={10}
            value={settings.ratingMax ?? 5}
            onChange={(e) => patch({ ratingMax: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Icon
          </label>
          <select
            value={settings.ratingIcon ?? "star"}
            onChange={(e) =>
              patch({
                ratingIcon: e.target.value as FieldSettings["ratingIcon"],
              })
            }
            className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
          >
            <option value="star">Star</option>
            <option value="heart">Heart</option>
            <option value="thumb">Thumb</option>
          </select>
        </div>
      </div>
    </SectionDivider>
  );
}

export function SliderSection({
  settings,
  patch,
}: {
  settings: FieldSettings;
  patch: Patch;
}) {
  return (
    <SectionDivider>
      <SectionLabel>Slider Settings</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Min
          </label>
          <Input
            type="number"
            value={settings.sliderMin ?? 0}
            onChange={(e) => patch({ sliderMin: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Max
          </label>
          <Input
            type="number"
            value={settings.sliderMax ?? 100}
            onChange={(e) => patch({ sliderMax: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Step
          </label>
          <Input
            type="number"
            value={settings.sliderStep ?? 1}
            onChange={(e) => patch({ sliderStep: Number(e.target.value) })}
          />
        </div>
      </div>
    </SectionDivider>
  );
}

export function UploadSection({
  settings,
  patch,
}: {
  settings: FieldSettings;
  patch: Patch;
}) {
  return (
    <SectionDivider>
      <SectionLabel>Upload Settings</SectionLabel>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Allowed file types
        </label>
        <Input
          placeholder=".pdf, .jpg, .png"
          value={settings.allowedFileTypes ?? ""}
          onChange={(e) => patch({ allowedFileTypes: e.target.value })}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Max file size (MB)
          </label>
          <Input
            type="number"
            value={settings.maxFileSizeMb ?? 10}
            onChange={(e) => patch({ maxFileSizeMb: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Max files
          </label>
          <Input
            type="number"
            value={settings.maxFiles ?? 1}
            onChange={(e) => patch({ maxFiles: Number(e.target.value) })}
          />
        </div>
      </div>
    </SectionDivider>
  );
}

function RowColEditor({
  title,
  items,
  onChange,
}: {
  title: string;
  items: MatrixRowCol[];
  onChange: (items: MatrixRowCol[]) => void;
}) {
  const update = (id: string, label: string) =>
    onChange(items.map((it) => (it.id === id ? { ...it, label } : it)));
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));
  const add = () =>
    onChange([
      ...items,
      { id: crypto.randomUUID(), label: `${title} ${items.length + 1}` },
    ]);

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {title}
      </label>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2">
            <Input
              value={it.label}
              onChange={(e) => update(it.id, e.target.value)}
            />
            <button
              type="button"
              onClick={() => remove(it.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="mt-2" onClick={add}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add {title.toLowerCase()}
      </Button>
    </div>
  );
}

export function MatrixSection({
  settings,
  patch,
}: {
  settings: FieldSettings;
  patch: Patch;
}) {
  const rows = settings.matrixRows ?? [
    { id: "r1", label: "Row 1" },
    { id: "r2", label: "Row 2" },
  ];
  const cols = settings.matrixColumns ?? [
    { id: "c1", label: "Column 1" },
    { id: "c2", label: "Column 2" },
  ];

  return (
    <SectionDivider>
      <SectionLabel>Matrix Grid</SectionLabel>
      <div className="space-y-4">
        <RowColEditor
          title="Rows"
          items={rows}
          onChange={(v) => patch({ matrixRows: v })}
        />
        <RowColEditor
          title="Columns"
          items={cols}
          onChange={(v) => patch({ matrixColumns: v })}
        />
      </div>
    </SectionDivider>
  );
}

export function EmbedSection({
  settings,
  patch,
  fieldType,
}: {
  settings: FieldSettings;
  patch: Patch;
  fieldType: string;
}) {
  const label =
    fieldType === "map-location" ? "Location / address" : "Source URL";
  return (
    <SectionDivider>
      <SectionLabel>
        {fieldType === "map-location" ? "Map" : "Embed"}
      </SectionLabel>
      <Input
        placeholder={label}
        value={settings.embedUrl ?? ""}
        onChange={(e) => patch({ embedUrl: e.target.value })}
      />
      <div className="mt-2">
        <label className="mb-1 block text-xs text-muted-foreground">
          Caption
        </label>
        <Input
          value={settings.embedCaption ?? ""}
          onChange={(e) => patch({ embedCaption: e.target.value })}
        />
      </div>
    </SectionDivider>
  );
}

export function IdentifierSection({
  settings,
  patch,
}: {
  settings: FieldSettings;
  patch: Patch;
}) {
  return (
    <SectionDivider>
      <SectionLabel>ID Format</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Prefix
          </label>
          <Input
            value={settings.idPrefix ?? ""}
            onChange={(e) => patch({ idPrefix: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Digits
          </label>
          <Input
            type="number"
            min={1}
            value={settings.idDigits ?? 4}
            onChange={(e) => patch({ idDigits: Number(e.target.value) })}
          />
        </div>
      </div>
    </SectionDivider>
  );
}

export function LegalSection({
  settings,
  patch,
  fieldType,
}: {
  settings: FieldSettings;
  patch: Patch;
  fieldType: string;
}) {
  return (
    <SectionDivider>
      <SectionLabel>
        {fieldType === "terms" ? "Terms Text" : "Consent Label"}
      </SectionLabel>
      <Textarea
        rows={4}
        value={
          fieldType === "terms"
            ? (settings.legalText ?? "")
            : (settings.consentLabel ?? "")
        }
        onChange={(e) =>
          fieldType === "terms"
            ? patch({ legalText: e.target.value })
            : patch({ consentLabel: e.target.value })
        }
      />
    </SectionDivider>
  );
}

export function SignatureSection() {
  return (
    <SectionDivider>
      <SectionLabel>Signature</SectionLabel>
      <p className="text-sm text-muted-foreground">
        TODO(api): signer configuration (self-sign vs. request signature, signer
        roles)
      </p>
    </SectionDivider>
  );
}
