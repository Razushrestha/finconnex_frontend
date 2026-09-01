import {
  User,
  MapPin,
  Phone,
  Mail,
  Globe,
  Search,
  Type,
  AlignLeft,
  Asterisk,
  Hash,
  Percent,
  Calculator,
  DollarSign,
  ChevronDown,
  List,
  Circle,
  CheckSquare,
  ListChecks,
  Image as ImageIcon,
  Grid3x3,
  Calendar,
  Clock,
  CalendarClock,
  CalendarDays,
  CalendarCheck,
  Upload,
  ImagePlus,
  Music,
  Video,
  Star,
  SlidersHorizontal,
  FileText,
  Shuffle,
  FileCheck2,
  PenTool,
  FileSignature,
  CheckCheck,
  Columns2,
  Columns3,
} from "lucide-react";
import {
  CHOICE_FIELD_TYPES,
  FormField,
  type FieldCategory,
  type FieldDefinition,
} from "./types";

// Note: verify Columns2/Columns3 exist in your installed lucide-react version —
// swap for an available icon name if TS flags them.

export const FIELD_CATEGORIES: Record<FieldCategory, string> = {
  grid: "Grid",
  basicInfo: "Basic Info",
  textbox: "Textbox",
  number: "Number",
  choices: "Choices",
  matrixChoices: "Matrix Choices",
  dateTime: "Date & Time",
  availability: "Availability",
  uploads: "Uploads",
  ratingScales: "Rating Scales",
  instructions: "Instructions",
  identifier: "Identifier",
  legalConsent: "Legal & Consent",
};

export const FIELD_LIBRARY: FieldDefinition[] = [
  { type: "col-2", label: "2-Column", category: "grid", icon: Columns2 },
  { type: "col-3", label: "3-Column", category: "grid", icon: Columns3 },

  { type: "name", label: "Name", category: "basicInfo", icon: User },
  { type: "address", label: "Address", category: "basicInfo", icon: MapPin },
  { type: "phone", label: "Phone", category: "basicInfo", icon: Phone },
  { type: "email", label: "Email", category: "basicInfo", icon: Mail },
  { type: "website", label: "Website", category: "basicInfo", icon: Globe },
  {
    type: "geo-complete",
    label: "GeoComplete",
    category: "basicInfo",
    icon: Search,
  },

  {
    type: "single-line",
    label: "Single Line",
    category: "textbox",
    icon: Type,
  },
  {
    type: "multi-line",
    label: "Multi Line",
    category: "textbox",
    icon: AlignLeft,
  },
  { type: "regex", label: "Regex", category: "textbox", icon: Asterisk },

  { type: "number", label: "Number", category: "number", icon: Hash },
  { type: "decimal", label: "Decimal", category: "number", icon: Percent },
  { type: "formula", label: "Formula", category: "number", icon: Calculator },
  { type: "currency", label: "Currency", category: "number", icon: DollarSign },

  {
    type: "dropdown",
    label: "Dropdown",
    category: "choices",
    icon: ChevronDown,
  },
  {
    type: "grouped-dropdown",
    label: "Grouped Dropdown",
    category: "choices",
    icon: List,
  },
  { type: "radio", label: "Radio", category: "choices", icon: Circle },
  {
    type: "checkbox",
    label: "Checkbox",
    category: "choices",
    icon: CheckSquare,
  },
  {
    type: "multiple-choice",
    label: "Multiple Choice",
    category: "choices",
    icon: ListChecks,
  },
  {
    type: "large-list",
    label: "Large List",
    category: "choices",
    icon: Search,
  },
  {
    type: "image-choices",
    label: "Image Choices",
    category: "choices",
    icon: ImageIcon,
  },

  {
    type: "matrix-radio",
    label: "Radio",
    category: "matrixChoices",
    icon: Grid3x3,
  },
  {
    type: "matrix-checkbox",
    label: "Checkbox",
    category: "matrixChoices",
    icon: Grid3x3,
  },
  {
    type: "matrix-dropdown",
    label: "Dropdown",
    category: "matrixChoices",
    icon: Grid3x3,
  },
  {
    type: "matrix-textbox",
    label: "Textbox",
    category: "matrixChoices",
    icon: Grid3x3,
  },
  {
    type: "matrix-number",
    label: "Number",
    category: "matrixChoices",
    icon: Grid3x3,
  },
  {
    type: "matrix-currency",
    label: "Currency",
    category: "matrixChoices",
    icon: Grid3x3,
  },
  {
    type: "matrix-multi-type",
    label: "Multi-Type",
    category: "matrixChoices",
    icon: Grid3x3,
  },

  { type: "date", label: "Date", category: "dateTime", icon: Calendar },
  { type: "time", label: "Time", category: "dateTime", icon: Clock },
  {
    type: "date-time",
    label: "Date-Time",
    category: "dateTime",
    icon: CalendarClock,
  },
  {
    type: "month-year",
    label: "Month-Year",
    category: "dateTime",
    icon: CalendarDays,
  },

  {
    type: "day-availability",
    label: "Day Availability",
    category: "availability",
    icon: CalendarCheck,
  },
  {
    type: "date-time-availability",
    label: "Date-Time Availability",
    category: "availability",
    icon: CalendarClock,
  },

  {
    type: "file-upload",
    label: "File Upload",
    category: "uploads",
    icon: Upload,
  },
  {
    type: "image-upload",
    label: "Image Upload",
    category: "uploads",
    icon: ImagePlus,
  },
  {
    type: "audio-video-upload",
    label: "Audio/Video Upload",
    category: "uploads",
    icon: Music,
  },

  { type: "rating", label: "Rating", category: "ratingScales", icon: Star },
  {
    type: "slider",
    label: "Slider",
    category: "ratingScales",
    icon: SlidersHorizontal,
  },

  {
    type: "description",
    label: "Description",
    category: "instructions",
    icon: Type,
  },
  {
    type: "audio-embed",
    label: "Audio Embed",
    category: "instructions",
    icon: Music,
  },
  {
    type: "video-embed",
    label: "Video Embed",
    category: "instructions",
    icon: Video,
  },
  {
    type: "pdf-embed",
    label: "PDF Embed",
    category: "instructions",
    icon: FileText,
  },
  {
    type: "map-location",
    label: "Map Location",
    category: "instructions",
    icon: MapPin,
  },
  {
    type: "image-slider",
    label: "Image Slider",
    category: "instructions",
    icon: ImageIcon,
  },

  { type: "unique-id", label: "Unique ID", category: "identifier", icon: Hash },
  {
    type: "random-id",
    label: "Random ID",
    category: "identifier",
    icon: Shuffle,
  },

  {
    type: "terms",
    label: "Terms and Conditions",
    category: "legalConsent",
    icon: FileCheck2,
  },
  {
    type: "signature",
    label: "Signature",
    category: "legalConsent",
    icon: PenTool,
  },

  {
    type: "consent-checkbox",
    label: "Consent",
    category: "legalConsent",
    icon: CheckSquare,
  },
  {
    type: "yes-no",
    label: "Yes / No",
    category: "legalConsent",
    icon: CheckCheck,
  },
];

export const FIELD_CATEGORY_ORDER: FieldCategory[] = [
  "grid",
  "basicInfo",
  "textbox",
  "number",
  "choices",
  "matrixChoices",
  "dateTime",
  "availability",
  "uploads",
  "ratingScales",
  "instructions",
  "identifier",
  "legalConsent",
];

export function createDefaultField(
  defn: FieldDefinition,
): Omit<FormField, "id"> {
  if (defn.type === "col-2") {
    return {
      type: defn.type,
      label: defn.label,
      columns: [[], []],
      columnWidths: [50, 50],
    };
  }
  if (defn.type === "col-3") {
    return {
      type: defn.type,
      label: defn.label,
      columns: [[], [], []],
      columnWidths: [33, 34, 33],
    };
  }

  const hasOptions = CHOICE_FIELD_TYPES.includes(defn.type);
  return {
    type: defn.type,
    label: defn.label,
    required: false,
    ...(hasOptions ? { options: ["Option 1", "Option 2", "Option 3"] } : {}),
  };
}
