import type { ComponentType } from "react";

export type FieldCategory =
  | "grid"
  | "basicInfo"
  | "textbox"
  | "number"
  | "choices"
  | "matrixChoices"
  | "dateTime"
  | "availability"
  | "uploads"
  | "ratingScales"
  | "instructions"
  | "identifier"
  | "legalConsent";

export type FieldType =
  | "col-2"
  | "col-3"
  | "name"
  | "address"
  | "phone"
  | "email"
  | "website"
  | "geo-complete"
  | "single-line"
  | "multi-line"
  | "regex"
  | "number"
  | "decimal"
  | "formula"
  | "currency"
  | "dropdown"
  | "grouped-dropdown"
  | "radio"
  | "checkbox"
  | "multiple-choice"
  | "large-list"
  | "image-choices"
  | "matrix-radio"
  | "matrix-checkbox"
  | "matrix-dropdown"
  | "matrix-textbox"
  | "matrix-number"
  | "matrix-currency"
  | "matrix-multi-type"
  | "date"
  | "time"
  | "date-time"
  | "month-year"
  | "day-availability"
  | "date-time-availability"
  | "file-upload"
  | "image-upload"
  | "audio-video-upload"
  | "rating"
  | "slider"
  | "description"
  | "audio-embed"
  | "video-embed"
  | "pdf-embed"
  | "map-location"
  | "image-slider"
  | "unique-id"
  | "random-id"
  | "terms"
  | "signature"
  | "consent-checkbox"
  | "yes-no";

export interface FieldDefinition {
  type: FieldType;
  label: string;
  category: FieldCategory;
  icon: ComponentType<{ className?: string }>;
}

// ---------------------------------------------------------------------------
// Field-level settings (Properties panel)
// ---------------------------------------------------------------------------

export interface NameElement {
  id: string;
  label: string;
  visible: boolean;
  mandatory: boolean;
}

export interface ImageChoiceOption {
  id: string;
  label: string;
  imageUrl?: string;
}

export interface MatrixRowCol {
  id: string;
  label: string;
}

export interface FieldSettings {
  richText?: boolean;
  hideLabel?: boolean;
  instructions?: string;
  fieldSize?: "small" | "medium" | "large";
  hoverText?: string;

  // "name" field
  nameElements?: NameElement[];
  showElementsLabel?: boolean;

  // text-like fields
  autoFillFromProfile?: boolean;
  inputType?: string;
  configurePlaceholders?: boolean;
  placeholders?: Record<string, string>;

  // choices (dropdown, radio, checkbox, multiple-choice, large-list, grouped-dropdown)
  choiceOptions?: string[];
  defaultOption?: string;
  allowOther?: boolean;

  // image-choices
  imageChoiceOptions?: ImageChoiceOption[];

  // date/time family
  dateFormat?: string;
  minDate?: string;
  maxDate?: string;
  defaultDate?: string;

  // number/decimal/currency/formula
  numberMin?: number;
  numberMax?: number;
  decimalPlaces?: number;
  currencySymbol?: string;
  formulaExpression?: string;

  // rating
  ratingMax?: number;
  ratingIcon?: "star" | "heart" | "thumb";

  // slider
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;

  // uploads
  allowedFileTypes?: string;
  maxFileSizeMb?: number;
  maxFiles?: number;

  // matrix
  matrixRows?: MatrixRowCol[];
  matrixColumns?: MatrixRowCol[];

  // instructions/embeds
  embedUrl?: string;
  embedCaption?: string;

  // identifier
  idPrefix?: string;
  idDigits?: number;

  // legal & consent
  legalText?: string;
  consentLabel?: string;

  visibility?: "show" | "hide" | "disable";
  markAsPersonal?: boolean;
  encrypt?: boolean;
  textCase?: "none" | "lower" | "upper" | "capitalize";
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  options?: string[];
  settings?: FieldSettings;
  columns?: FormField[][];
  columnWidths?: number[];
}
export interface FormPage {
  id: string;
  title: string;
  fields: FormField[];
  hidden?: boolean;
}

export const LAYOUT_FIELD_TYPES: FieldType[] = ["col-2", "col-3"];

// ---------------------------------------------------------------------------
// Field type groupings
// ---------------------------------------------------------------------------

export const CHOICE_FIELD_TYPES: FieldType[] = [
  "dropdown",
  "grouped-dropdown",
  "radio",
  "checkbox",
  "multiple-choice",
  "large-list",
  "image-choices",
];

export const MATRIX_FIELD_TYPES: FieldType[] = [
  "matrix-radio",
  "matrix-checkbox",
  "matrix-dropdown",
  "matrix-textbox",
  "matrix-number",
  "matrix-currency",
  "matrix-multi-type",
];

export const TEXT_INPUT_FIELD_TYPES: FieldType[] = [
  "single-line",
  "email",
  "phone",
  "website",
  "geo-complete",
  "regex",
  "multi-line",
  "address",
];

export const NUMBER_FIELD_TYPES: FieldType[] = [
  "number",
  "decimal",
  "currency",
  "formula",
];

export const DATE_FIELD_TYPES: FieldType[] = [
  "date",
  "time",
  "date-time",
  "month-year",
  "day-availability",
  "date-time-availability",
];

export const UPLOAD_FIELD_TYPES: FieldType[] = [
  "file-upload",
  "image-upload",
  "audio-video-upload",
];

export const EMBED_FIELD_TYPES: FieldType[] = [
  "audio-embed",
  "video-embed",
  "pdf-embed",
  "map-location",
  "image-slider",
];

export const IDENTIFIER_FIELD_TYPES: FieldType[] = ["unique-id", "random-id"];

export const LEGAL_FIELD_TYPES: FieldType[] = [
  "terms",
  "consent-checkbox",
  "yes-no",
];

export const SIGNATURE_FIELD_TYPES: FieldType[] = ["signature"];

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_NAME_ELEMENTS: NameElement[] = [
  { id: "title", label: "Title", visible: false, mandatory: false },
  { id: "first", label: "First Name", visible: true, mandatory: true },
  { id: "last", label: "Last Name", visible: true, mandatory: false },
  { id: "middle", label: "Middle Name", visible: false, mandatory: false },
];

export const INPUT_TYPE_OPTIONS = [
  "Any Character",
  "Numbers Only",
  "Alphabets Only",
  "Alphanumeric",
  "Email Format",
] as const;
