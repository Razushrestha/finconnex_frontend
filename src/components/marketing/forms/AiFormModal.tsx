"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Sparkles,
  Pencil,
  Check,
  User,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AI_SAMPLE_PROMPTS,
  CONTENT_TONES,
  generateAiForm,
  type ContentTone,
} from "@/lib/form-builder/ai-generator";
import type { FormField, FormPage } from "@/lib/form-builder/types";
import { DEFAULT_NAME_ELEMENTS } from "@/lib/form-builder/types";

interface AiFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user clicks "Create Form" on the preview step. */
  onCreate: (title: string, pages: FormPage[]) => void;
}

type Step = "describe" | "preview";

export function AiFormModal({
  open,
  onOpenChange,
  onCreate,
}: AiFormModalProps) {
  const [step, setStep] = useState<Step>("describe");
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState<ContentTone>("Professional");
  const [multiColumn, setMultiColumn] = useState(true);

  const [title, setTitle] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [pages, setPages] = useState<FormPage[]>([]);

  const reset = () => {
    setStep("describe");
    setDescription("");
    setTone("Professional");
    setMultiColumn(true);
    setTitle("");
    setTitleEditing(false);
    setTitleTouched(false);
    setPages([]);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const runGeneration = (nextMultiColumn = multiColumn) => {
    const result = generateAiForm(description, tone, nextMultiColumn);
    setPages(result.pages);
    if (!titleTouched) setTitle(result.title);
    return result;
  };

  const handleGenerate = () => {
    if (!description.trim()) return;
    runGeneration();
    setStep("preview");
  };

  const handleRegenerate = () => {
    if (!description.trim()) return;
    runGeneration();
  };

  const handleToggleMultiColumn = (checked: boolean) => {
    setMultiColumn(checked);
    const result = generateAiForm(description, tone, checked);
    setPages(result.pages);
  };

  const handleCreate = () => {
    onCreate(title || "Untitled Form", pages);
    reset();
    onOpenChange(false);
  };

  const previewFields = useMemo(() => pages.flatMap((p) => p.fields), [pages]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex flex-col overflow-hidden p-0",
          step === "describe"
            ? "w-[95vw] sm:max-w-2xl"
            : "w-[95vw] sm:max-w-5xl",
        )}
      >
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-blue-500 via-violet-500 to-rose-500" />

        {step === "describe" ? (
          <DescribeStep
            description={description}
            onDescriptionChange={setDescription}
            tone={tone}
            onToneChange={setTone}
            onSelectSample={(prompt) => setDescription(prompt)}
            onGenerate={handleGenerate}
          />
        ) : (
          <PreviewStep
            title={title}
            onTitleChange={(v) => {
              setTitle(v);
              setTitleTouched(true);
            }}
            titleEditing={titleEditing}
            onToggleTitleEditing={() => setTitleEditing((v) => !v)}
            fields={previewFields}
            description={description}
            onDescriptionChange={setDescription}
            tone={tone}
            onToneChange={setTone}
            multiColumn={multiColumn}
            onToggleMultiColumn={handleToggleMultiColumn}
            onRegenerate={handleRegenerate}
            onCreate={handleCreate}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Step 1 — Describe your form

function DescribeStep({
  description,
  onDescriptionChange,
  tone,
  onToneChange,
  onSelectSample,
  onGenerate,
}: {
  description: string;
  onDescriptionChange: (v: string) => void;
  tone: ContentTone;
  onToneChange: (t: ContentTone) => void;
  onSelectSample: (prompt: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 p-8 sm:p-10">
      <h2 className="text-xl font-semibold text-foreground">
        Create Smarter Forms with AI
      </h2>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Describe your form
        </label>
        <Textarea
          autoFocus
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Create a small business review form…"
          className="min-h-32 resize-none rounded-xl border-violet-200 focus-visible:border-violet-400 focus-visible:ring-violet-500/20"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Content Tone
        </label>
        <Select
          value={tone}
          onValueChange={(v) => v && onToneChange(v as ContentTone)}
        >
          <SelectTrigger className="h-11 w-full rounded-xl px-4 text-sm">
            <SelectValue placeholder="Professional" />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TONES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2.5">
        <p className="text-sm font-medium text-foreground">
          Try a Sample Prompt
        </p>
        <div className="flex flex-wrap gap-2">
          {AI_SAMPLE_PROMPTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => onSelectSample(sample.prompt)}
              className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <Button
          type="button"
          disabled={!description.trim()}
          onClick={onGenerate}
          className="h-11 rounded-full bg-gradient-to-r from-blue-500 to-rose-500 px-10 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          Generate Form
        </Button>
      </div>
    </div>
  );
}

// Step 2 — Preview + regenerate

function PreviewStep({
  title,
  onTitleChange,
  titleEditing,
  onToggleTitleEditing,
  fields,
  description,
  onDescriptionChange,
  tone,
  onToneChange,
  multiColumn,
  onToggleMultiColumn,
  onRegenerate,
  onCreate,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  titleEditing: boolean;
  onToggleTitleEditing: () => void;
  fields: FormField[];
  description: string;
  onDescriptionChange: (v: string) => void;
  tone: ContentTone;
  onToneChange: (t: ContentTone) => void;
  multiColumn: boolean;
  onToggleMultiColumn: (v: boolean) => void;
  onRegenerate: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex max-h-[85vh] flex-col">
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <span className="flex items-center gap-1.5 text-lg font-bold">
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            AI Forms
          </span>
          <Sparkles className="h-4 w-4 text-violet-500" />
        </span>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden p-6 sm:grid-cols-[1fr_320px]">
        <div className="flex flex-col overflow-hidden">
          <div className="mb-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Form Title
            </p>
            {titleEditing ? (
              <Input
                autoFocus
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                onBlur={onToggleTitleEditing}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onToggleTitleEditing();
                }}
                className="h-9 max-w-sm"
              />
            ) : (
              <button
                type="button"
                onClick={onToggleTitleEditing}
                className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
              >
                {title || "Untitled Form"}
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto rounded-xl bg-slate-100 p-6">
            <FormPreviewCard title={title} fields={fields} />
          </div>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto">
          <div className="rounded-xl bg-gradient-to-b from-violet-50 to-rose-50 p-4">
            <p className="mb-1 text-sm font-semibold text-foreground">
              Regenerate Form
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              Update your form description
            </p>
            <Textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="min-h-28 resize-none rounded-lg bg-white"
            />

            <p className="mt-4 mb-1.5 text-xs font-medium text-foreground">
              Content Tone
            </p>
            <Select
              value={tone}
              onValueChange={(v) => v && onToneChange(v as ContentTone)}
            >
              <SelectTrigger className="h-10 w-full rounded-lg bg-white px-3 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                disabled={!description.trim()}
                onClick={onRegenerate}
                className="h-9 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Regenerate
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">
              Form properties
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">
                Multi-Column Layout
              </span>
              <Switch
                checked={multiColumn}
                onCheckedChange={(checked) =>
                  onToggleMultiColumn(Boolean(checked))
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center border-t px-6 py-4">
        <Button
          type="button"
          onClick={onCreate}
          className="h-10 rounded-full bg-emerald-600 px-8 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Create Form
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lightweight, read-only preview of the generated fields
// ---------------------------------------------------------------------------

function FormPreviewCard({
  title,
  fields,
}: {
  title: string;
  fields: FormField[];
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-8 py-6 text-center">
        <h3 className="font-serif text-2xl text-slate-900">
          {title || "Untitled Form"}
        </h3>
      </div>

      <div className="space-y-6 px-8 py-6">
        {fields.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Describe your form to see a preview here.
          </p>
        ) : (
          fields.map((field) => <PreviewField key={field.id} field={field} />)
        )}
      </div>
    </div>
  );
}

function PreviewField({ field }: { field: FormField }) {
  if (field.type === "col-2" || field.type === "col-3") {
    const cols = field.columns ?? [];
    return (
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`,
        }}
      >
        {cols.map((col, i) => (
          <div key={i} className="space-y-4">
            {col.map((f) => (
              <PreviewField key={f.id} field={f} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-900">
        {field.label}
        {field.required && <span className="text-rose-500"> *</span>}
      </p>
      <PreviewInput field={field} />
    </div>
  );
}

function PreviewInput({ field }: { field: FormField }) {
  const shell = (icon: ReactNode, node: ReactNode) => (
    <div className="relative [&_input]:pl-9 [&_select]:pl-9">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        {icon}
      </span>
      {node}
    </div>
  );

  switch (field.type) {
    case "name": {
      const elements =
        field.settings?.nameElements?.filter((e) => e.visible !== false) ??
        DEFAULT_NAME_ELEMENTS.filter((e) => e.visible !== false);
      return (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${elements.length}, minmax(0, 1fr))`,
          }}
        >
          {elements.map((el, i) => (
            <div key={el.id} className="space-y-1">
              {i === 0 ? (
                shell(<User className="h-4 w-4" />, <Input disabled />)
              ) : (
                <Input disabled />
              )}
              <span className="text-xs text-muted-foreground">{el.label}</span>
            </div>
          ))}
        </div>
      );
    }
    case "email":
      return shell(
        <Mail className="h-4 w-4" />,
        <Input disabled type="email" />,
      );
    case "phone":
      return shell(
        <Phone className="h-4 w-4" />,
        <Input disabled type="tel" />,
      );
    case "address":
      return (
        <div className="space-y-1">
          {shell(<MapPin className="h-4 w-4" />, <Input disabled />)}
          <span className="text-xs text-muted-foreground">Street Address</span>
        </div>
      );
    case "multi-line":
      return <Textarea disabled rows={3} />;
    case "date":
      return <Input disabled type="date" />;
    case "time":
      return <Input disabled type="time" />;
    case "number":
      return <Input disabled type="number" />;
    case "file-upload":
      return (
        <div className="flex h-11 items-center rounded-xl border border-dashed border-slate-300 px-4 text-sm text-slate-400">
          Click or drag a file to upload
        </div>
      );
    case "dropdown":
      return (
        <select
          disabled
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-400"
        >
          <option>Select an option</option>
        </select>
      );
    case "checkbox":
      return (
        <div className="space-y-2">
          {(field.options ?? []).map((o) => (
            <label
              key={o}
              className="flex items-center gap-2 text-sm text-slate-600"
            >
              <span className="h-4 w-4 rounded border border-slate-300" />
              {o}
            </label>
          ))}
        </div>
      );
    case "consent-checkbox":
      return (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Check className="h-4 w-4 rounded border border-slate-300 p-0.5" />I
          agree
        </label>
      );
    default:
      return <Input disabled placeholder="Enter text" />;
  }
}
