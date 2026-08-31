"use client";

import { useEffect, useState } from "react";
import { X, GripVertical, Eye, EyeOff, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DEFAULT_NAME_ELEMENTS,
  INPUT_TYPE_OPTIONS,
  TEXT_INPUT_FIELD_TYPES,
  NUMBER_FIELD_TYPES,
  DATE_FIELD_TYPES,
  UPLOAD_FIELD_TYPES,
  EMBED_FIELD_TYPES,
  IDENTIFIER_FIELD_TYPES,
  LEGAL_FIELD_TYPES,
  SIGNATURE_FIELD_TYPES,
  CHOICE_FIELD_TYPES,
  MATRIX_FIELD_TYPES,
  type FieldSettings,
  type FormField,
  type NameElement,
} from "@/lib/form-builder/types";
import {
  ChoiceOptionsSection,
  ImageChoicesSection,
  DateTimeSection,
  NumberSection,
  RatingSection,
  SliderSection,
  UploadSection,
  MatrixSection,
  EmbedSection,
  IdentifierSection,
  LegalSection,
  SignatureSection,
} from "./PropertySections";

interface FieldPropertiesPanelProps {
  field: FormField | null;
  onClose: () => void;
  onSave: (fieldId: string, label: string, settings: FieldSettings) => void;
}

export function FieldPropertiesPanel({
  field,
  onClose,
  onSave,
}: FieldPropertiesPanelProps) {
  const [label, setLabel] = useState("");
  const [settings, setSettings] = useState<FieldSettings>({});

  // Sync local state when a new field is selected
  useEffect(() => {
    if (!field) return;
    setLabel(field.label);
    setSettings({
      fieldSize: "large",
      textCase: "none",
      visibility: "show",
      nameElements: DEFAULT_NAME_ELEMENTS,
      showElementsLabel: true,
      inputType: INPUT_TYPE_OPTIONS[0],
      ...field.settings,
    });
  }, [field]);

  if (!field) return null;

  // Safe live auto-update patch function using queueMicrotask to avoid render-phase updates
  const patch = (p: Partial<FieldSettings>) => {
    setSettings((prev) => {
      const nextSettings = { ...prev, ...p };
      queueMicrotask(() => {
        onSave(field.id, label, nextSettings);
      });
      return nextSettings;
    });
  };

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    queueMicrotask(() => {
      onSave(field.id, newLabel, settings);
    });
  };

  const updateNameElement = (id: string, p: Partial<NameElement>) => {
    const updatedNameElements = (settings.nameElements ?? []).map((el) =>
      el.id === id ? { ...el, ...p } : el,
    );
    patch({ nameElements: updatedNameElements });
  };

  const type = field.type;
  const isTextLike = TEXT_INPUT_FIELD_TYPES.includes(type);
  const isChoice =
    CHOICE_FIELD_TYPES.includes(type) && type !== "image-choices";
  const isImageChoices = type === "image-choices";
  const isDate = DATE_FIELD_TYPES.includes(type);
  const isNumber = NUMBER_FIELD_TYPES.includes(type);
  const isRating = type === "rating";
  const isSlider = type === "slider";
  const isUpload = UPLOAD_FIELD_TYPES.includes(type);
  const isMatrix = MATRIX_FIELD_TYPES.includes(type);
  const isEmbed = EMBED_FIELD_TYPES.includes(type);
  const isIdentifier = IDENTIFIER_FIELD_TYPES.includes(type);
  const isLegal = LEGAL_FIELD_TYPES.includes(type);
  const isSignature = SIGNATURE_FIELD_TYPES.includes(type);
  const isName = type === "name";
  const isLayout = type === "col-2" || type === "col-3";
  const isDescription = type === "description";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      <div className="fixed right-0 top-0 z-50 flex h-full w-[420px] flex-col bg-background shadow-xl">
        <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
          <span className="text-base font-medium">Properties</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {!isLayout && (
            <>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-destructive">
                    Field Label
                  </label>
                  <button
                    type="button"
                    className="text-xs text-primary underline underline-offset-2"
                  >
                    Rich Text
                  </button>
                </div>
                <Input
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={!!settings.hideLabel}
                  onCheckedChange={(v) => patch({ hideLabel: !!v })}
                />
                Hide Field Label
              </label>

              {!isDescription && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Instructions
                  </label>
                  <Textarea
                    rows={3}
                    value={settings.instructions ?? ""}
                    onChange={(e) => patch({ instructions: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Field Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["small", "medium", "large"] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => patch({ fieldSize: size })}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm capitalize",
                        settings.fieldSize === size
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/30",
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Hover Text
                </label>
                <Input
                  value={settings.hoverText ?? ""}
                  onChange={(e) => patch({ hoverText: e.target.value })}
                />
              </div>
            </>
          )}

          {isDescription && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Text
              </label>
              <Textarea
                rows={5}
                value={settings.instructions ?? ""}
                onChange={(e) => patch({ instructions: e.target.value })}
              />
            </div>
          )}

          {/* Type-specific sections */}
          {isName && (
            <div className="border-t border-border pt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Name Elements
                </span>
                <span className="text-sm font-medium text-foreground">
                  Mandatory
                </span>
              </div>
              <div className="space-y-1.5">
                {(settings.nameElements ?? []).map((el) => (
                  <div key={el.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={el.mandatory}
                      onCheckedChange={(v) =>
                        updateNameElement(el.id, { mandatory: !!v })
                      }
                    />
                    <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-2">
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                      <span className="flex-1 text-sm text-foreground">
                        {el.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateNameElement(el.id, { visible: !el.visible })
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {el.visible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={!!settings.showElementsLabel}
                  onCheckedChange={(v) => patch({ showElementsLabel: !!v })}
                />
                Show Elements Label
                <span className="mx-1 text-muted-foreground">|</span>
                <button
                  type="button"
                  className="text-primary underline underline-offset-2"
                >
                  Set Character Limit
                </button>
              </label>
            </div>
          )}

          {isChoice && (
            <ChoiceOptionsSection settings={settings} patch={patch} />
          )}
          {isImageChoices && (
            <ImageChoicesSection settings={settings} patch={patch} />
          )}
          {isDate && <DateTimeSection settings={settings} patch={patch} />}
          {isNumber && (
            <NumberSection
              settings={settings}
              patch={patch}
              isFormula={type === "formula"}
              isCurrency={type === "currency"}
            />
          )}
          {isRating && <RatingSection settings={settings} patch={patch} />}
          {isSlider && <SliderSection settings={settings} patch={patch} />}
          {isUpload && <UploadSection settings={settings} patch={patch} />}
          {isMatrix && <MatrixSection settings={settings} patch={patch} />}
          {isEmbed && (
            <EmbedSection settings={settings} patch={patch} fieldType={type} />
          )}
          {isIdentifier && (
            <IdentifierSection settings={settings} patch={patch} />
          )}
          {isLegal && (
            <LegalSection settings={settings} patch={patch} fieldType={type} />
          )}
          {isSignature && <SignatureSection />}

          {isTextLike && (
            <>
              <div className="border-t border-border pt-5">
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Initial Value
                </span>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={!!settings.autoFillFromProfile}
                    onCheckedChange={(v) => patch({ autoFillFromProfile: !!v })}
                  />
                  Auto-fill from logged-in user&apos;s profile
                </label>
              </div>

              <div className="border-t border-border pt-5">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Input Type
                </label>
                <select
                  value={settings.inputType}
                  onChange={(e) => patch({ inputType: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {INPUT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-border pt-5">
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Placeholder Text
                </span>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={!!settings.configurePlaceholders}
                    onCheckedChange={(v) =>
                      patch({ configurePlaceholders: !!v })
                    }
                  />
                  Configure Placeholders
                </label>
              </div>
            </>
          )}

          {!isLayout && (
            <>
              <div className="border-t border-border pt-5">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Visibility
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["show", "hide", "disable"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => patch({ visibility: v })}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm capitalize",
                        settings.visibility === v
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/35",
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Privacy
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={!!settings.markAsPersonal}
                      onCheckedChange={(v) => patch({ markAsPersonal: !!v })}
                    />
                    Mark as Personal
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={!!settings.encrypt}
                      onCheckedChange={(v) => patch({ encrypt: !!v })}
                    />
                    Encrypt
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                  </label>
                </div>
              </div>

              {isTextLike && (
                <div className="border-t border-border pt-5">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Input Text Case
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        { key: "none", display: "—" },
                        { key: "lower", display: "aa" },
                        { key: "upper", display: "AA" },
                        { key: "capitalize", display: "Aa" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => patch({ textCase: opt.key })}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm",
                          settings.textCase === opt.key
                            ? "border-primary text-primary"
                            : "border-border text-muted-foreground hover:border-foreground/30",
                        )}
                      >
                        {opt.display}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-muted/40 px-5 py-4">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </>
  );
}
