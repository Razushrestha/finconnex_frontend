"use client";

import { useMemo, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  GripVertical,
  Plus,
  X,
} from "lucide-react";
import type { PlacedField } from "@/components/documents/signature/create/PdfFieldEditor";
import {
  PREFILL_COLOR_INDEX,
  PREFILL_RECIPIENT_ID,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import { cn } from "@/lib/utils";

const PROPERTY_TYPES = new Set([
  "signature",
  "initials",
  "name",
  "email",
  "date",
  "sign_date",
  "job_title",
  "text",
  "company",
  "stamp",
  "image",
  "checkbox",
  "dropdown",
  "radio",
  "checkbox_group",
]);

const PANEL_TITLE: Record<string, string> = {
  signature: "Signature",
  initials: "Initial",
  name: "Name",
  email: "Email",
  date: "CustomDate",
  sign_date: "Date",
  job_title: "Jobtitle",
  text: "Textfield",
  company: "Company",
  stamp: "Stamp",
  image: "Image",
  checkbox: "Checkbox",
  dropdown: "Dropdown",
  radio: "Radiogroup",
  checkbox_group: "Checkboxgroup",
};

const PLAIN_DATA_LABEL: Record<string, string> = {
  signature: "Signature",
  initials: "Initial",
  name: "Full name",
  email: "Email",
  sign_date: "Sign date",
  job_title: "Job title",
  company: "Company",
  stamp: "Stamp",
};

const INDEXED_DATA_LABEL: Record<string, string> = {
  date: "Date",
  text: "Text",
  image: "Image",
  checkbox: "Checkbox",
  dropdown: "Dropdown",
  radio: "Radio",
  checkbox_group: "Checkbox group",
};

const FONTS = [
  "Roboto",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Courier New",
];

const FONT_SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24];

const NAME_FORMATS = ["Full Name", "First Name", "Last Name"];

const DATE_FORMATS = [
  "MMM dd yyyy",
  "MM/dd/yyyy",
  "dd/MM/yyyy",
  "yyyy-MM-dd",
  "MMMM d, yyyy",
];

const SIGN_DATE_FORMATS = [
  "MMM dd yyyy HH:mm z",
  "MMM dd yyyy HH:mm",
  "MMM dd yyyy",
  "MM/dd/yyyy HH:mm",
  "dd/MM/yyyy HH:mm z",
  "yyyy-MM-dd HH:mm",
];

const TEXT_VALIDATIONS = ["None", "Email", "Numbers", "Letters"];
const GROUP_VALIDATIONS = ["Select at least", "Select at most", "Select exactly"];

export function fieldHasPropertiesPanel(type: string) {
  return PROPERTY_TYPES.has(type);
}

export function placedFieldDataLabel(field: PlacedField, fields: PlacedField[]) {
  const indexed = INDEXED_DATA_LABEL[field.type];
  if (indexed) {
    const same = fields.filter((item) => item.type === field.type);
    const index = Math.max(
      1,
      same.findIndex((item) => item.id === field.id) + 1,
    );
    return `${indexed} - ${index}`;
  }
  return PLAIN_DATA_LABEL[field.type] ?? field.label;
}

function formatDateExample(pattern: string, date = new Date()) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthsFull = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const zone = `${offsetSign}${String(Math.floor(absoluteOffset / 60)).padStart(2, "0")}${String(absoluteOffset % 60).padStart(2, "0")}`;
  return pattern
    .replaceAll("MMMM", monthsFull[date.getMonth()] ?? "")
    .replaceAll("MMM", months[date.getMonth()] ?? "")
    .replaceAll("yyyy", String(date.getFullYear()))
    .replaceAll("dd", dd)
    .replaceAll("MM", mm)
    .replaceAll("HH", hours)
    .replaceAll("mm", minutes)
    .replaceAll("z", zone)
    .replaceAll("d", String(date.getDate()));
}

function GreenCheck({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[#12875a]"
      />
      {label}
    </label>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <p className="mb-1 text-[13px] text-slate-800">{children}</p>;
}

const inputClass =
  "h-9 w-full rounded-[3px] border border-slate-300 bg-white px-2.5 text-[13px] text-slate-800 outline-none focus:border-slate-400";

function FormattingControls({
  fontFamily,
  fontSize,
  bold,
  italic,
  textColor,
  textAlign,
  onChange,
}: {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  textColor: string;
  textAlign: "left" | "center" | "right";
  onChange: (patch: Partial<PlacedField>) => void;
}) {
  const [alignOpen, setAlignOpen] = useState(false);
  const AlignIcon =
    textAlign === "center"
      ? AlignCenter
      : textAlign === "right"
        ? AlignRight
        : AlignLeft;

  return (
    <div>
      <FieldLabel>Formatting</FieldLabel>
      <select
        value={fontFamily}
        onChange={(e) => onChange({ fontFamily: e.target.value })}
        className={inputClass}
      >
        {FONTS.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </select>
      <div className="mt-1.5 flex items-center gap-1">
        <select
          value={fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className="h-8 w-[58px] rounded-[3px] border border-slate-300 bg-white px-1.5 text-[13px] text-slate-800 outline-none"
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Bold"
          onClick={() => onChange({ bold: !bold })}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[3px] border border-slate-300 text-[14px] font-bold text-slate-800",
            bold && "bg-slate-100",
          )}
        >
          B
        </button>
        <button
          type="button"
          aria-label="Italic"
          onClick={() => onChange({ italic: !italic })}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[3px] border border-slate-300 text-[14px] italic text-slate-800",
            italic && "bg-slate-100",
          )}
        >
          I
        </button>
        <label className="flex h-8 items-center gap-1 rounded-[3px] border border-slate-300 px-1.5">
          <span
            className="h-3.5 w-3.5 border border-slate-400"
            style={{ backgroundColor: textColor }}
          />
          <ChevronDown className="h-3 w-3 text-slate-500" />
          <input
            type="color"
            value={textColor}
            aria-label="Text color"
            onChange={(e) => onChange({ textColor: e.target.value })}
            className="sr-only"
          />
        </label>
        <div className="relative">
          <button
            type="button"
            aria-label="Alignment"
            onClick={() => setAlignOpen((open) => !open)}
            className="flex h-8 items-center gap-0.5 rounded-[3px] border border-slate-300 px-1.5 text-slate-800"
          >
            <AlignIcon className="h-3.5 w-3.5" />
            <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>
          {alignOpen ? (
            <div className="absolute right-0 z-30 mt-1 w-28 rounded border border-slate-200 bg-white py-1 shadow-md">
              {(
                [
                  ["left", "Left", AlignLeft],
                  ["center", "Center", AlignCenter],
                  ["right", "Right", AlignRight],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    onChange({ textAlign: value });
                    setAlignOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OptionRows({
  options,
  variant,
  onChange,
}: {
  options: string[];
  variant: "dropdown" | "radio" | "checkbox";
  onChange: (options: string[]) => void;
}) {
  const update = (index: number, value: string) => {
    const next = options.slice();
    next[index] = value;
    onChange(next);
  };
  const remove = (index: number) => {
    if (options.length <= 1) return;
    onChange(options.filter((_, itemIndex) => itemIndex !== index));
  };
  const add = () => onChange([...options, ""]);

  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <div key={`${variant}-${index}`} className="flex items-center gap-1.5">
          {variant === "dropdown" ? (
            <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
          ) : variant === "radio" ? (
            <span className="h-4 w-4 shrink-0 rounded-full border border-slate-400" />
          ) : (
            <span className="h-3.5 w-3.5 shrink-0 rounded-[2px] border border-slate-400" />
          )}
          <input
            value={option}
            onChange={(e) => update(index, e.target.value)}
            className={cn(
              "h-8 min-w-0 flex-1 rounded-[3px] border px-2 text-[13px] text-slate-800 outline-none focus:border-[#12875a]",
              variant !== "dropdown" && index === 0
                ? "border-[#12875a]"
                : "border-slate-300",
            )}
          />
          <button
            type="button"
            aria-label="Remove option"
            onClick={() => remove(index)}
            className="px-1 text-[16px] leading-none text-slate-500 hover:text-slate-800"
          >
            −
          </button>
          {index === options.length - 1 ? (
            <button
              type="button"
              aria-label="Add option"
              onClick={add}
              className="px-1 text-[16px] leading-none text-slate-500 hover:text-slate-800"
            >
              +
            </button>
          ) : (
            <span className="w-4" />
          )}
        </div>
      ))}
    </div>
  );
}

export function FieldPropertiesSidebar({
  field,
  fields,
  recipients,
  onClose,
  onDelete,
  onChange,
}: {
  field: PlacedField;
  fields: PlacedField[];
  recipients: SignatureSigner[];
  onClose: () => void;
  onDelete: () => void;
  onChange: (patch: Partial<PlacedField>) => void;
}) {
  const [extraDateFormats, setExtraDateFormats] = useState<string[]>([]);
  const [addingFormat, setAddingFormat] = useState(false);
  const [customFormat, setCustomFormat] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const title = PANEL_TITLE[field.type] ?? field.label;
  const isSignatureLike =
    field.type === "signature" ||
    field.type === "initials" ||
    field.type === "stamp";
  const isCustomDate = field.type === "date";
  const isSignDate = field.type === "sign_date";
  const showFormatting =
    field.type === "email" ||
    field.type === "name" ||
    field.type === "company" ||
    field.type === "job_title" ||
    field.type === "text" ||
    field.type === "dropdown" ||
    isCustomDate ||
    isSignDate;
  const showDescription = showFormatting || field.type === "checkbox";
  const showFixedWidth =
    field.type === "email" ||
    field.type === "name" ||
    field.type === "company" ||
    field.type === "job_title";
  const dataLabel = useMemo(
    () => placedFieldDataLabel(field, fields),
    [field, fields],
  );
  const dateFormat =
    field.dateFormat ||
    (isSignDate ? "MMM dd yyyy HH:mm z" : "MMM dd yyyy");
  const dateFormats = Array.from(
    new Set([
      ...(isSignDate ? SIGN_DATE_FORMATS : DATE_FORMATS),
      ...extraDateFormats,
      dateFormat,
    ]),
  );
  const dropdownOptions = field.options?.length
    ? field.options
    : ["Dropdown1", "Dropdown2"];
  const radioBase = field.fieldName || field.label || "Radio";
  const radioOptions = field.options?.length
    ? field.options
    : [radioBase, `${radioBase}2`];
  const checkboxGroupOptions = field.options?.length
    ? field.options
    : [field.fieldName || field.label || "Checkbox"];

  const applyBulkOptions = () => {
    const lines = bulkText
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length) onChange({ options: [...dropdownOptions, ...lines] });
    setBulkText("");
    setBulkOpen(false);
  };

  const commitCustomFormat = () => {
    const next = customFormat.trim();
    setAddingFormat(false);
    setCustomFormat("");
    if (!next) return;
    setExtraDateFormats((prev) => (prev.includes(next) ? prev : [...prev, next]));
    onChange({ dateFormat: next });
  };

  return (
    <aside className="relative z-20 flex h-full w-[300px] shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white pointer-events-auto">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-[16px] font-semibold text-slate-900">{title}</h2>
        <button
          type="button"
          aria-label="Close field properties"
          onClick={onClose}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        {field.type !== "text" ? (
        <div>
          <FieldLabel>Recipient</FieldLabel>
          <select
            value={field.recipientId ?? ""}
            onChange={(e) => {
              const recipientId = e.target.value;
              if (recipientId === PREFILL_RECIPIENT_ID) {
                onChange({ recipientId, colorIndex: PREFILL_COLOR_INDEX });
                return;
              }
              const signer = recipients.find((item) => item.id === recipientId);
              onChange({
                recipientId,
                colorIndex: signer?.colorIndex ?? 0,
              });
            }}
            className={inputClass}
          >
            {field.recipientId === PREFILL_RECIPIENT_ID ? (
              <option value={PREFILL_RECIPIENT_ID}>Prefill by you</option>
            ) : null}
            {recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.name || recipient.email}
              </option>
            ))}
          </select>
        </div>
        ) : null}

        {isSignatureLike ? (
          <div className="space-y-2.5">
            <GreenCheck
              checked={field.required !== false}
              label="Required"
              onChange={(required) => onChange({ required })}
            />
            <GreenCheck
              checked={field.resizable !== false}
              label="Resizable"
              onChange={(resizable) => onChange({ resizable })}
            />
            <GreenCheck
              checked={field.movable === true}
              label="Movable"
              onChange={(movable) => onChange({ movable })}
            />
          </div>
        ) : null}

        {field.type === "image" ? (
          <div className="space-y-2.5">
            <GreenCheck
              checked={field.required !== false}
              label="Required"
              onChange={(required) => onChange({ required })}
            />
            <GreenCheck
              checked={field.resizable !== false}
              label="Resizable"
              onChange={(resizable) => onChange({ resizable })}
            />
          </div>
        ) : null}

        {isCustomDate ? (
          <GreenCheck
            checked={field.required !== false}
            label="Required"
            onChange={(required) => onChange({ required })}
          />
        ) : null}

        {field.type === "text" ? (
          <div className="space-y-2.5">
            <GreenCheck
              checked={field.required !== false}
              label="Required"
              onChange={(required) => onChange({ required })}
            />
            <GreenCheck
              checked={field.readOnly === true}
              label="Read only"
              onChange={(readOnly) => onChange({ readOnly })}
            />
            <GreenCheck
              checked={field.fixedWidth === true}
              label="Fixed width"
              onChange={(fixedWidth) => onChange({ fixedWidth })}
            />
            <GreenCheck
              checked={field.fixedHeight !== false}
              label="Fixed height"
              onChange={(fixedHeight) => onChange({ fixedHeight })}
            />
          </div>
        ) : null}

        {field.type === "checkbox" ? (
          <div className="space-y-2.5">
            <GreenCheck
              checked={field.required === true}
              label="Required"
              onChange={(required) => onChange({ required })}
            />
            <GreenCheck
              checked={field.readOnly === true}
              label="Read only"
              onChange={(readOnly) => onChange({ readOnly })}
            />
            <GreenCheck
              checked={field.checked === true}
              label="Checked"
              onChange={(checked) =>
                onChange({ checked, value: checked ? "true" : "" })
              }
            />
          </div>
        ) : null}

        {field.type === "dropdown" ? (
          <div className="space-y-2.5">
            <GreenCheck
              checked={field.required !== false}
              label="Required"
              onChange={(required) => onChange({ required })}
            />
            <GreenCheck
              checked={field.readOnly === true}
              label="Read only"
              onChange={(readOnly) => onChange({ readOnly })}
            />
          </div>
        ) : null}

        {field.type === "radio" ? (
          <GreenCheck
            checked={field.required !== false}
            label="Required"
            onChange={(required) => onChange({ required })}
          />
        ) : null}

        {showFixedWidth ? (
          <GreenCheck
            checked={field.fixedWidth === true}
            label="Fixed width"
            onChange={(fixedWidth) => onChange({ fixedWidth })}
          />
        ) : null}

        {field.type === "text" ? (
          <div>
            <FieldLabel>Default value</FieldLabel>
            <input
              value={field.defaultValue ?? ""}
              onChange={(e) => onChange({ defaultValue: e.target.value })}
              className={inputClass}
            />
          </div>
        ) : null}

        <div>
          <FieldLabel>Field name</FieldLabel>
          <input
            value={field.fieldName ?? field.label}
            onChange={(e) =>
              onChange({ fieldName: e.target.value, label: e.target.value })
            }
            className={inputClass}
          />
        </div>

        {field.type === "text" ? (
          <div>
            <FieldLabel>Character limit</FieldLabel>
            <input
              value={String(field.characterLimit ?? 2048)}
              onChange={(e) =>
                onChange({
                  characterLimit: Number(e.target.value.replace(/\D/g, "")) || 0,
                })
              }
              className={inputClass}
            />
          </div>
        ) : null}

        <div>
          <FieldLabel>Data label</FieldLabel>
          <input
            value={dataLabel}
            readOnly
            className="h-9 w-full rounded-[3px] border border-slate-200 bg-slate-100 px-2.5 text-[13px] text-slate-600 outline-none"
          />
        </div>

        {field.type === "name" ? (
          <div>
            <FieldLabel>Format</FieldLabel>
            <select
              value={field.nameFormat || "Full Name"}
              onChange={(e) => onChange({ nameFormat: e.target.value })}
              className={inputClass}
            >
              {NAME_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {field.type === "text" ? (
          <div>
            <FieldLabel>Validation</FieldLabel>
            <select
              value={field.validation || "None"}
              onChange={(e) => onChange({ validation: e.target.value })}
              className={inputClass}
            >
              {TEXT_VALIDATIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {isCustomDate || isSignDate ? (
          <div>
            <FieldLabel>Format</FieldLabel>
            <div className="flex items-center gap-2">
              <select
                value={dateFormat}
                onChange={(e) => onChange({ dateFormat: e.target.value })}
                className="h-9 min-w-0 flex-1 rounded-[3px] border border-slate-300 bg-white px-2.5 text-[13px] text-slate-800 outline-none focus:border-slate-400"
              >
                {dateFormats.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Add date format"
                onClick={() => setAddingFormat(true)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {addingFormat ? (
              <input
                autoFocus
                value={customFormat}
                placeholder="MMM dd yyyy"
                onChange={(e) => setCustomFormat(e.target.value)}
                onBlur={commitCustomFormat}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitCustomFormat();
                  if (e.key === "Escape") {
                    setAddingFormat(false);
                    setCustomFormat("");
                  }
                }}
                className={`${inputClass} mt-2`}
              />
            ) : null}
            <p className="mt-1.5 text-[13px] text-slate-800">
              <span className="font-semibold">Example:</span>
              {formatDateExample(dateFormat)}
            </p>
          </div>
        ) : null}

        {showFormatting ? (
          <FormattingControls
            fontFamily={field.fontFamily || "Roboto"}
            fontSize={field.fontSize || 11}
            bold={field.bold === true}
            italic={field.italic === true}
            textColor={field.textColor || "#111827"}
            textAlign={field.textAlign || "left"}
            onChange={onChange}
          />
        ) : null}

        {field.type === "dropdown" ? (
          <div className="space-y-2">
            <FieldLabel>Options</FieldLabel>
            <p className="text-[13px] text-slate-800">Fill in those options</p>
            <OptionRows
              variant="dropdown"
              options={dropdownOptions}
              onChange={(options) => onChange({ options })}
            />
            <button
              type="button"
              onClick={() => setBulkOpen((open) => !open)}
              className="text-[13px] text-slate-800"
            >
              Add options in bulk
            </button>
            {bulkOpen ? (
              <div className="space-y-2">
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="One option per line"
                  rows={4}
                  className="w-full rounded-[3px] border border-slate-300 px-2.5 py-2 text-[13px] text-slate-800 outline-none"
                />
                <button
                  type="button"
                  onClick={applyBulkOptions}
                  className="text-[13px] font-medium text-[#12875a]"
                >
                  Add
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {field.type === "dropdown" ? (
          <div>
            <FieldLabel>Default value</FieldLabel>
            <select
              value={field.defaultValue ?? ""}
              onChange={(e) => onChange({ defaultValue: e.target.value })}
              className={inputClass}
            >
              <option value="">--select--</option>
              {dropdownOptions.filter(Boolean).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {field.type === "radio" ? (
          <div>
            <FieldLabel>Radio Button Values</FieldLabel>
            <OptionRows
              variant="radio"
              options={radioOptions}
              onChange={(options) => onChange({ options })}
            />
          </div>
        ) : null}

        {field.type === "checkbox_group" ? (
          <div className="space-y-3">
            <div>
              <FieldLabel>Validation</FieldLabel>
              <select
                value={field.groupValidation || "Select at least"}
                onChange={(e) => onChange({ groupValidation: e.target.value })}
                className={inputClass}
              >
                {GROUP_VALIDATIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={String(field.groupValidationCount ?? 1)}
              onChange={(e) =>
                onChange({
                  groupValidationCount:
                    Number(e.target.value.replace(/\D/g, "")) || 0,
                })
              }
              className={inputClass}
            />
            <div>
              <FieldLabel>Checkboxgroup values</FieldLabel>
              <OptionRows
                variant="checkbox"
                options={checkboxGroupOptions}
                onChange={(options) => onChange({ options })}
              />
            </div>
          </div>
        ) : null}

        {showDescription ? (
          <div>
            <FieldLabel>Description</FieldLabel>
            <input
              value={field.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value })}
              className={inputClass}
            />
          </div>
        ) : null}
      </div>

      <div className="flex justify-center px-4 py-6">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-[3px] border border-[#e24b4b] px-4 py-1.5 text-[13px] font-medium text-[#e24b4b] hover:bg-red-50"
        >
          Delete field
        </button>
      </div>
    </aside>
  );
}
