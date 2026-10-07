"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  GripVertical,
  MessageSquare,
  Plus,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import {
  makeSigner,
  type DeliveryMethod,
  type RecipientSource,
  type SignatureSigner,
  type SignerRole,
} from "@/lib/documents/signature/types";
import {
  searchSignatureCrmEntities,
  type SignatureCrmEntityOption,
} from "@/lib/documents/signature/search-crm-entities";
import {
  isEmailSmsDelivery,
  mobileNumberError,
  requiresDirectEmailMobile,
} from "@/components/documents/signature/create/RecipientsSection";
import {
  sanitizeDocumentBaseName,
  splitFileName,
  type AdditionalDocument,
} from "@/components/documents/signature/create/DocumentDetailsSection";
import {
  fetchSignatureSelf,
  selfFromStores,
  type SignatureSelf,
} from "@/lib/documents/signature/current-user";
import {
  mergeBulkRecipients,
  parseRecipientFile,
} from "@/lib/documents/signature/bulk-recipients";
import { AddDocumentMenu } from "@/components/documents/signature/create/AddDocumentMenu";
import { SignatureFileCard } from "@/components/documents/signature/create/SignatureFileCard";
import {
  DaysToCompleteInput,
  ReminderEveryDaysInput,
} from "@/components/documents/signature/create/DaysToCompleteInput";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png";

const ROLE_OPTIONS: { value: SignerRole; label: string }[] = [
  { value: "Signer", label: "Needs to sign" },
  { value: "CC", label: "Receives a copy" },
];

const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "email_sms", label: "Email + SMS" },
];

const SOURCE_OPTIONS: { value: RecipientSource; label: string }[] = [
  { value: "email", label: "Direct Email" },
  { value: "contact", label: "Contact" },
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "organization", label: "Organization" },
];

export type ZohoSendFormSettings = {
  daysToComplete: number;
  agreementValidUntil: string;
  documentType: string;
  folder: string;
  description: string;
  allowComments: boolean;
  automaticReminders: boolean;
  reminderEveryDays: number;
  reminderDay: string;
  reminderTime: string;
};

interface ZohoStyleSendFormProps {
  mode: "send" | "self";
  /** Template create uses the same layout with a free-text Role field. */
  variant?: "send" | "template";
  documentName: string;
  onChangeName: (name: string) => void;
  documentFile: File | null;
  additionalFiles: AdditionalDocument[];
  onIncomingFiles: (files: File[]) => void;
  onRemovePrimary: () => void;
  onRemoveAdditional: (id: string) => void;
  onRenameAdditional?: (id: string, name: string) => void;
  fileError?: string;
  recipients: SignatureSigner[];
  onChangeRecipients: (next: SignatureSigner[]) => void;
  signingOrder: "sequential" | "parallel";
  onToggleOrder: (order: "sequential" | "parallel") => void;
  settings: ZohoSendFormSettings;
  onChangeSettings: (patch: Partial<ZohoSendFormSettings>) => void;
  noteToRecipients: string;
  onChangeNote: (value: string) => void;
  showRecipientErrors?: boolean;
  onContinue: () => void;
  onClose: () => void;
  onSaveDraft?: () => void;
  isSaving?: boolean;
}

const fieldClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15";

const selectClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15";

const chipBtn =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 hover:border-primary/30 hover:text-primary";

const colLabel =
  "mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400";

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

function formatAgreementDate(value: string) {
  const date = parseIsoDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function sameDay(left: Date, right: Date) {
  return isoDate(left) === isoDate(right);
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid items-start gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center sm:gap-8">
      <span className="pt-2 text-[13px] text-slate-600 sm:pt-0">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, onClose]);
  return ref;
}

function CheckedMenu({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useDismiss(open, close);
  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(selectClass, "flex items-center justify-between text-left")}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  value === option ? "text-slate-800" : "opacity-0",
                )}
              />
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MonthCalendar({
  cursor,
  selected,
  onCursor,
  onSelect,
}: {
  cursor: Date;
  selected: Date;
  onCursor: (date: Date) => void;
  onSelect: (date: Date) => void;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date; outside: boolean }> = [];
  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({
      date: new Date(year, month, index - firstWeekday + 1),
      outside: true,
    });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), outside: false });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      outside: true,
    });
  }
  const title = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onCursor(new Date(year, month - 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-[13px] font-semibold text-slate-800">{title}</p>
        <button
          type="button"
          onClick={() => onCursor(new Date(year, month + 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-slate-400">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center">
        {cells.map((cell) => {
          const active = !cell.outside && sameDay(cell.date, selected);
          return (
            <button
              key={isoDate(cell.date)}
              type="button"
              onClick={() => onSelect(cell.date)}
              className={cn(
                "mx-auto my-0.5 flex h-8 w-8 items-center justify-center rounded-full text-[13px]",
                cell.outside ? "text-slate-300" : "text-slate-700 hover:bg-slate-100",
                active && "bg-[var(--brand-primary)] font-semibold text-white hover:bg-[var(--brand-primary)]",
              )}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AgreementValidUntilField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = parseIsoDate(value);
  const [menuOpen, setMenuOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [cursor, setCursor] = useState(() => selected ?? new Date());
  const open = menuOpen || calendarOpen;
  const close = () => {
    setMenuOpen(false);
    setCalendarOpen(false);
  };
  const ref = useDismiss(open, close);

  const pickDateMode = () => {
    const next = selected ?? new Date();
    onChange(isoDate(next));
    setCursor(next);
    setMenuOpen(false);
    setCalendarOpen(true);
  };

  return (
    <div ref={ref} className="relative">
      {selected ? (
        <button
          type="button"
          onClick={() => {
            setCursor(selected);
            setMenuOpen(false);
            setCalendarOpen((current) => !current);
          }}
          className={cn(
            selectClass,
            "flex items-center justify-between text-left",
            calendarOpen && "border-emerald-500 ring-2 ring-emerald-100",
          )}
        >
          <span>{formatAgreementDate(value)}</span>
          <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setCalendarOpen(false);
            setMenuOpen((current) => !current);
          }}
          className={cn(selectClass, "flex items-center justify-between text-left")}
        >
          <span>Forever</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      )}
      {menuOpen ? (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onChange("Forever");
              close();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
          >
            <Check className={cn("h-3.5 w-3.5", selected ? "opacity-0" : "text-slate-800")} />
            Forever
          </button>
          <button
            type="button"
            onClick={pickDateMode}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
          >
            <Check className="h-3.5 w-3.5 opacity-0" />
            Select date
          </button>
        </div>
      ) : null}
      {calendarOpen && selected ? (
        <div className="absolute top-full left-0 z-40 mt-1 w-[280px] rounded-lg border border-slate-200 bg-white shadow-xl">
          <MonthCalendar
            cursor={cursor}
            selected={selected}
            onCursor={setCursor}
            onSelect={(date) => {
              onChange(isoDate(date));
              setCalendarOpen(false);
            }}
          />
          <button
            type="button"
            onClick={() => {
              onChange("Forever");
              close();
            }}
            className="w-full border-t border-slate-100 px-3 py-2 text-left text-[12px] font-medium text-slate-600 hover:bg-slate-50"
          >
            Forever
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ZohoStyleSendForm({
  mode: _mode,
  variant = "send",
  documentName,
  onChangeName,
  documentFile,
  additionalFiles,
  onIncomingFiles,
  onRemovePrimary,
  onRemoveAdditional,
  onRenameAdditional,
  fileError,
  recipients,
  onChangeRecipients,
  signingOrder,
  onToggleOrder,
  settings,
  onChangeSettings,
  noteToRecipients,
  onChangeNote,
  showRecipientErrors,
  onContinue,
  onClose,
  onSaveDraft,
  isSaving,
}: ZohoStyleSendFormProps) {
  const isTemplate = variant === "template";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkReading, setBulkReading] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [crmResults, setCrmResults] = useState<SignatureCrmEntityOption[]>([]);
  const [crmSearching, setCrmSearching] = useState(false);
  const [signerSearchQueries, setSignerSearchQueries] = useState<
    Record<string, string>
  >({});
  const [me, setMe] = useState<SignatureSelf>(() => selfFromStores());
  const searchSeq = useRef(0);

  useEffect(() => {
    let alive = true;
    void fetchSignatureSelf().then((self) => {
      if (alive && (self.email || self.name)) setMe(self);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-crm-suggest]")) return;
      setActiveDropdownId(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const uploadedDocs: {
    id: string;
    file: File;
    label: string;
    onRemove: () => void;
    onRename: (name: string) => void;
  }[] = [
    ...(documentFile
      ? [
          {
            id: "primary",
            file: documentFile,
            label:
              documentName ||
              splitFileName(documentFile.name).base ||
              documentFile.name,
            onRemove: onRemovePrimary,
            onRename: (name: string) => {
              const { ext } = splitFileName(documentFile.name);
              const clean = sanitizeDocumentBaseName(name, ext);
              if (clean) onChangeName(clean);
            },
          },
        ]
      : []),
    ...additionalFiles.map((doc) => ({
      id: doc.id,
      file: doc.file,
      label: doc.extension ? `${doc.name}.${doc.extension}` : doc.name,
      onRemove: () => onRemoveAdditional(doc.id),
      onRename: (name: string) => {
        const clean = sanitizeDocumentBaseName(name, doc.extension);
        if (clean) onRenameAdditional?.(doc.id, clean);
      },
    })),
  ];

  const updateRecipient = (id: string, patch: Partial<SignatureSigner>) => {
    onChangeRecipients(
      recipients.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const addRecipient = () => {
    const next = makeSigner({
      id: `sg-${Date.now()}`,
      name: "",
      email: "",
      order: recipients.length + 1,
      token: `sig-${Date.now()}`,
      colorIndex: recipients.length,
      entityType: "email",
    });
    onChangeRecipients([...recipients, next]);
  };

  const applySelf = (self: SignatureSelf) => {
    const email = self.email.trim();
    const name = (self.name || email).trim();
    if (!email && !name) return;
    const key = email.toLowerCase();
    if (
      key &&
      recipients.some((row) => row.email.trim().toLowerCase() === key)
    ) {
      return;
    }
    const patch = {
      name,
      email,
      entityType: "email" as const,
    };
    const empty = recipients.find((row) => !row.email.trim() && !row.name.trim());
    if (empty) {
      updateRecipient(empty.id, patch);
      return;
    }
    onChangeRecipients([
      ...recipients,
      makeSigner({
        id: `sg-me-${Date.now()}`,
        name,
        email,
        order: recipients.length + 1,
        token: `sig-me-${Date.now()}`,
        colorIndex: recipients.length,
        entityType: "email",
      }),
    ]);
  };

  const addMe = () => {
    if (me.email || me.name) {
      applySelf(me);
      return;
    }
    void fetchSignatureSelf().then((self) => {
      setMe(self);
      applySelf(self);
    });
  };

  const importRecipients = async (file: File | undefined) => {
    if (!file) return;
    setBulkError("");
    setBulkReading(true);
    try {
      const imported = await parseRecipientFile(file);
      const merged = mergeBulkRecipients(recipients, imported);
      if (!merged.added) {
        setBulkError(
          imported.length
            ? "Those recipients are already on the list."
            : "No recipients with an email address were found. Use columns Email and Name.",
        );
        return;
      }
      onChangeRecipients(merged.recipients);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setBulkReading(false);
      if (bulkInputRef.current) bulkInputRef.current.value = "";
    }
  };

  const removeRecipient = (id: string) => {
    if (recipients.length <= 1) {
      updateRecipient(id, { name: "", email: "" });
      return;
    }
    onChangeRecipients(
      recipients
        .filter((row) => row.id !== id)
        .map((row, index) => ({ ...row, order: index + 1 })),
    );
  };

  const moveRecipient = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= recipients.length) return;
    const next = [...recipients];
    [next[index], next[target]] = [next[target], next[index]];
    onChangeRecipients(next.map((row, i) => ({ ...row, order: i + 1 })));
  };

  const searchCrm = async (
    signer: SignatureSigner,
    source: RecipientSource,
    query: string,
    preserve = false,
  ) => {
    if (source === "email") {
      setActiveDropdownId(null);
      return;
    }
    setSignerSearchQueries((prev) => ({ ...prev, [signer.id]: query }));
    if (!query.trim() && !preserve) {
      updateRecipient(signer.id, { name: "", email: "" });
    }
    const seq = ++searchSeq.current;
    setActiveDropdownId(signer.id);
    setCrmSearching(true);
    try {
      const results = await searchSignatureCrmEntities(source, query);
      if (seq !== searchSeq.current) return;
      setCrmResults(results);
    } catch {
      if (seq !== searchSeq.current) return;
      setCrmResults([]);
    } finally {
      if (seq === searchSeq.current) setCrmSearching(false);
    }
  };

  const changeSource = (signer: SignatureSigner, source: RecipientSource) => {
    setSignerSearchQueries((prev) => ({ ...prev, [signer.id]: "" }));
    updateRecipient(signer.id, {
      entityType: source,
      email: "",
      name: "",
    });
    if (source === "email") {
      setActiveDropdownId(null);
      setCrmResults([]);
      return;
    }
    void searchCrm({ ...signer, entityType: source }, source, "", true);
  };

  const selectCrmEntity = (
    signerId: string,
    entity: SignatureCrmEntityOption,
  ) => {
    setSignerSearchQueries((prev) => ({
      ...prev,
      [signerId]: entity.email || entity.name,
    }));
    updateRecipient(signerId, {
      name: entity.name,
      email: entity.email,
      phone: entity.phone || undefined,
    });
    setActiveDropdownId(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#F6F5FA] p-3 sm:p-4">
      <form
        className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        onSubmit={(e) => {
          e.preventDefault();
          onContinue();
        }}
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <h2 className="mb-4 text-[14px] font-semibold text-slate-800">
                Add documents
              </h2>
            <div className="flex flex-wrap items-start gap-4">
              {uploadedDocs.map((doc) => (
                <SignatureFileCard
                  key={doc.id}
                  file={doc.file}
                  label={doc.label}
                  selected={selectedDocId === doc.id}
                  onSelect={() =>
                    setSelectedDocId((current) =>
                      current === doc.id ? null : doc.id,
                    )
                  }
                  onRename={doc.onRename}
                  onRemove={doc.onRemove}
                />
              ))}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  onIncomingFiles(Array.from(e.dataTransfer.files ?? []));
                }}
                className={cn(
                  "flex h-[322px] w-[220px] shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white px-4 text-center",
                  dragging ? "border-emerald-600 bg-emerald-50" : "border-slate-300",
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onIncomingFiles(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                />
                <FileText className="h-10 w-10 text-slate-400" strokeWidth={1.4} />
                <p className="mt-3 text-[15px] font-medium text-slate-800">
                  Drag files here
                </p>
                <p className="mt-1 text-[13px] text-slate-400">or</p>
                <AddDocumentMenu
                  onDesktop={() => fileInputRef.current?.click()}
                  onFiles={onIncomingFiles}
                  showTemplates={!isTemplate}
                  buttonClassName="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#1e9e57] px-3.5 text-[13px] font-semibold text-white hover:bg-[#18864b]"
                />
              </div>
            </div>

            {fileError ? (
              <p className="mt-3 text-[12px] text-rose-600">{fileError}</p>
            ) : null}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h2 className="mb-3 text-[14px] font-semibold text-slate-800">
                Add recipients
              </h2>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="mr-1 inline-flex items-center gap-2 text-[13px] text-slate-700">
                <input
                  type="checkbox"
                  checked={signingOrder === "sequential"}
                  onChange={(e) =>
                    onToggleOrder(e.target.checked ? "sequential" : "parallel")
                  }
                  className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary/20"
                />
                Send in order
              </label>
              <button type="button" onClick={addMe} className={chipBtn}>
                <UserPlus className="h-3.5 w-3.5" />
                Add me
              </button>
              <button
                type="button"
                onClick={() => bulkInputRef.current?.click()}
                disabled={bulkReading}
                className={chipBtn}
              >
                <Upload className="h-3.5 w-3.5" />
                {bulkReading ? "Reading file…" : "Bulk recipients"}
              </button>
              <input
                ref={bulkInputRef}
                type="file"
                accept=".xlsx,.xls,.xml,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/xml,application/xml,text/csv"
                className="hidden"
                aria-label="Upload recipient spreadsheet"
                onChange={(event) => void importRecipients(event.target.files?.[0])}
              />
            </div>
            {bulkError ? (
              <p className="mb-3 text-[12px] text-rose-600">{bulkError}</p>
            ) : null}

            <div className="space-y-3">
              {recipients.map((signer, index) => {
                const source = signer.entityType ?? "email";
                const hasSelectedCrm =
                  source !== "email" && Boolean(signer.name);
                const emailInvalid =
                  showRecipientErrors &&
                  (!signer.email.trim() || !signer.email.includes("@"));
                const nameInvalid =
                  showRecipientErrors && !signer.name.trim();
                const needsMobile = requiresDirectEmailMobile({
                  entityType: source,
                  deliveryMethod: signer.deliveryMethod,
                });
                const phoneError = mobileNumberError({
                  entityType: source,
                  deliveryMethod: signer.deliveryMethod,
                  phone: signer.phone,
                });
                return (
                  <div
                    key={signer.id}
                    className="flex flex-wrap items-start gap-x-3 gap-y-3 rounded-xl border border-slate-200/80 bg-[#F8F7FC] p-3.5"
                  >
                    <div className="flex items-center gap-2 pt-5 text-slate-400">
                      <button
                        type="button"
                        title="Reorder"
                        onClick={() => moveRecipient(index, -1)}
                        className="hover:text-slate-600"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">
                        {index + 1}
                      </span>
                    </div>

                    {isTemplate ? (
                      <div className="w-[140px]">
                        <label className={colLabel}>Role</label>
                        <input
                          type="text"
                          value={signer.roleLabel ?? ""}
                          onChange={(e) =>
                            updateRecipient(signer.id, {
                              roleLabel: e.target.value,
                            })
                          }
                          placeholder="e.g. Landlord"
                          className={cn(
                            fieldClass,
                            "h-9",
                            showRecipientErrors &&
                              !(signer.roleLabel ?? "").trim() &&
                              "border-rose-400",
                          )}
                        />
                      </div>
                    ) : null}

                    <div className="w-[148px] space-y-0">
                      <label className={colLabel}>Recipient Source</label>
                      <select
                        value={source}
                        onChange={(e) =>
                          changeSource(
                            signer,
                            e.target.value as RecipientSource,
                          )
                        }
                        className={cn(selectClass, "h-9 text-xs font-medium")}
                      >
                        {SOURCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      className="relative min-w-[180px] flex-1"
                      data-crm-suggest
                    >
                      <label className={colLabel}>Email Address</label>
                      <input
                        type={source === "email" ? "email" : "text"}
                        value={
                          source === "email"
                            ? signer.email
                            : hasSelectedCrm
                              ? signer.email
                              : (signerSearchQueries[signer.id] ?? "")
                        }
                        onChange={(e) => {
                          if (source === "email") {
                            updateRecipient(signer.id, {
                              email: e.target.value,
                            });
                            return;
                          }
                          void searchCrm(signer, source, e.target.value);
                        }}
                        onFocus={() => {
                          if (source === "email") return;
                          const query = hasSelectedCrm
                            ? signer.email || signer.name
                            : (signerSearchQueries[signer.id] ?? "");
                          void searchCrm(signer, source, query, true);
                        }}
                        autoComplete="off"
                        placeholder={
                          source === "email"
                            ? "Enter the email address"
                            : `Search ${source} by name or email`
                        }
                        className={cn(
                          fieldClass,
                          "h-9",
                          emailInvalid && "border-rose-400",
                        )}
                      />
                      {activeDropdownId === signer.id && source !== "email" ? (
                        <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-52 divide-y divide-slate-50 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                          <div className="bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Matching {source}s
                          </div>
                          {crmSearching ? (
                            <div className="px-3 py-2 text-xs text-slate-500">
                              Searching…
                            </div>
                          ) : crmResults.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-500">
                              No matching {source}s
                            </div>
                          ) : (
                            crmResults.map((result) => (
                              <button
                                key={result.id}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() =>
                                  selectCrmEntity(signer.id, result)
                                }
                                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-primary/5"
                              >
                                <span>
                                  <span className="block text-xs font-semibold text-slate-800">
                                    {result.name}
                                  </span>
                                  <span className="block text-[11px] text-slate-500">
                                    {result.email || "No email on file"}
                                  </span>
                                </span>
                                {result.subtitle ? (
                                  <span className="text-[10px] text-slate-400">
                                    {result.subtitle}
                                  </span>
                                ) : null}
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>

                    {source === "email" || hasSelectedCrm ? (
                      <div className="min-w-[160px] flex-1">
                        <label className={colLabel}>Name</label>
                        <input
                          type="text"
                          value={signer.name}
                          onChange={(e) =>
                            updateRecipient(signer.id, {
                              name: e.target.value,
                            })
                          }
                          placeholder="Recipient's name"
                          className={cn(
                            fieldClass,
                            "h-9",
                            nameInvalid && "border-rose-400",
                          )}
                        />
                      </div>
                    ) : null}

                    <div className="w-[148px]">
                      <label className={colLabel}>
                        {isTemplate ? "Action" : "Role"}
                      </label>
                      <select
                        value={signer.role === "CC" ? "CC" : "Signer"}
                        onChange={(e) =>
                          updateRecipient(signer.id, {
                            role: e.target.value as SignerRole,
                          })
                        }
                        className={cn(selectClass, "h-9")}
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-[128px]">
                      <label className={colLabel}>Deliver via</label>
                      <select
                        value={
                          isEmailSmsDelivery(signer.deliveryMethod)
                            ? "email_sms"
                            : "email"
                        }
                        onChange={(e) =>
                          updateRecipient(signer.id, {
                            deliveryMethod: e.target.value as DeliveryMethod,
                          })
                        }
                        className={cn(selectClass, "h-9")}
                      >
                        {DELIVERY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {needsMobile ? (
                      <div className="w-48">
                        <label className={colLabel}>
                          Mobile Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={signer.phone ?? ""}
                          onChange={(e) =>
                            updateRecipient(signer.id, {
                              phone: e.target.value,
                            })
                          }
                          placeholder="e.g. 0412 345 678"
                          className={cn(
                            fieldClass,
                            "h-9",
                            showRecipientErrors &&
                              phoneError &&
                              "border-rose-400",
                          )}
                        />
                        {showRecipientErrors && phoneError ? (
                          <p className="mt-1 text-[11px] font-medium text-rose-500">
                            {phoneError}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="pt-5">
                      <button
                        type="button"
                        onClick={() => removeRecipient(signer.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Remove recipient"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addRecipient}
              className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary/80"
            >
              <Plus className="h-4 w-4" />
              Add recipient
            </button>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="flex w-full items-center justify-between py-1 text-left"
                aria-expanded={moreOpen}
              >
                <h2 className="text-[14px] font-semibold text-slate-800">
                  More settings
                </h2>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-slate-400 transition-transform",
                    moreOpen && "rotate-180",
                  )}
                />
              </button>
              {moreOpen ? (
                <div className="mt-4 max-w-[760px] space-y-4">
                  <SettingRow label="Days to complete">
                    <DaysToCompleteInput
                      value={settings.daysToComplete}
                      onChange={(daysToComplete) =>
                        onChangeSettings({ daysToComplete })
                      }
                      className={fieldClass}
                    />
                  </SettingRow>
                  <SettingRow label="Agreement valid until">
                    <AgreementValidUntilField
                      value={
                        parseIsoDate(settings.agreementValidUntil)
                          ? settings.agreementValidUntil
                          : "Forever"
                      }
                      onChange={(agreementValidUntil) =>
                        onChangeSettings({ agreementValidUntil })
                      }
                    />
                  </SettingRow>
                  <SettingRow label="Description">
                    <textarea
                      rows={2}
                      value={settings.description}
                      onChange={(event) =>
                        onChangeSettings({ description: event.target.value })
                      }
                      placeholder="Add description"
                      className="min-h-[72px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                    />
                  </SettingRow>
                  <label className="flex items-center gap-2 pt-1 text-[13px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={settings.allowComments}
                      onChange={(event) =>
                        onChangeSettings({ allowComments: event.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary/20"
                    />
                    Allow recipient comments
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[13px] text-slate-700">
                      <input
                        type="checkbox"
                        checked={settings.automaticReminders}
                        onChange={(event) =>
                          onChangeSettings({
                            automaticReminders: event.target.checked,
                          })
                        }
                        className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary/20"
                      />
                      Automatic reminders
                    </label>
                    {settings.automaticReminders ? (
                      <>
                        <p className="max-w-xl text-[12px] leading-5 text-slate-400">
                          Automatic reminders will only be delivered via email
                          even if the delivery mode is set to &quot;Email +
                          SMS&quot;.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
                          <span>Send a reminder every</span>
                          <ReminderEveryDaysInput
                            value={settings.reminderEveryDays}
                            onChange={(reminderEveryDays) =>
                              onChangeSettings({ reminderEveryDays })
                            }
                            className={cn(fieldClass, "w-[72px]")}
                          />
                          <span>day(s)</span>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <h2 className="mb-2 text-[14px] font-semibold text-slate-800">
                Note to all recipients
              </h2>
              <div className="relative">
                <MessageSquare className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea
                  rows={3}
                  value={noteToRecipients}
                  onChange={(e) => onChangeNote(e.target.value)}
                  placeholder="Add a note to all recipients (optional)"
                  className="min-h-[72px] w-full resize-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </div>
          </div>

        <div className="flex shrink-0 items-center gap-2.5 border-t border-slate-200 bg-white px-6 py-2.5">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-8 items-center rounded-md bg-[#0E9F6E] px-4 text-[13px] font-semibold text-white hover:bg-[#0B8A5F] disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Continue"}
            </button>
            {onSaveDraft ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={onSaveDraft}
                className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save Draft"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
      </form>
    </div>
  );
}
