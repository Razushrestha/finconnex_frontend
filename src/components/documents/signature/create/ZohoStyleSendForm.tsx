"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronDown,
  CloudUpload,
  FileText,
  GripVertical,
  LayoutTemplate,
  MessageSquare,
  Plus,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
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
  renamedStoredFileName,
  splitFileName,
  type AdditionalDocument,
} from "@/components/documents/signature/create/DocumentDetailsSection";
import { getRulesActor } from "@/lib/rules/actor";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png";

const ROLE_OPTIONS: { value: SignerRole; label: string }[] = [
  { value: "Signer", label: "Needs to sign" },
  { value: "Approver", label: "Needs to approve" },
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

const DOCUMENT_TYPES = [
  "Others",
  "Contract",
  "NDA",
  "Proposal",
  "Agreement",
  "Invoice",
  "HR document",
];

const FOLDERS = ["None", "Sales", "Legal", "HR", "Finance", "Clients"];

const AGREEMENT_VALIDITY = [
  "Forever",
  "30 days after completion",
  "90 days after completion",
  "1 year after completion",
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

function formatFileSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExt(name: string) {
  return splitFileName(name).ext.toUpperCase() || "FILE";
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="w-[150px] shrink-0 text-[13px] text-slate-600">
      {children}
    </label>
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
  const [dragging, setDragging] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(isTemplate);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [crmResults, setCrmResults] = useState<SignatureCrmEntityOption[]>([]);
  const [crmSearching, setCrmSearching] = useState(false);
  const [signerSearchQueries, setSignerSearchQueries] = useState<
    Record<string, string>
  >({});
  const searchSeq = useRef(0);

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
    name: string;
    fileName: string;
    sizeLabel: string;
    ext: string;
    onRemove: () => void;
  }[] = [
    ...(documentFile
      ? [
          {
            id: "primary",
            name:
              documentName ||
              splitFileName(documentFile.name).base ||
              documentFile.name,
            fileName: renamedStoredFileName(documentName, documentFile.name),
            sizeLabel: formatFileSize(documentFile.size),
            ext: fileExt(documentFile.name),
            onRemove: onRemovePrimary,
          },
        ]
      : []),
    ...additionalFiles.map((doc) => ({
      id: doc.id,
      name: doc.name,
      fileName: `${doc.name}.${doc.extension}`,
      sizeLabel: formatFileSize(doc.file.size),
      ext: doc.extension.toUpperCase(),
      onRemove: () => onRemoveAdditional(doc.id),
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

  const addMe = () => {
    const actor = getRulesActor();
    const email = (actor.email || "").trim().toLowerCase();
    if (
      email &&
      recipients.some((r) => r.email.trim().toLowerCase() === email)
    ) {
      return;
    }
    const empty = recipients.find((r) => !r.email.trim() && !r.name.trim());
    if (empty) {
      updateRecipient(empty.id, {
        name: actor.name || "Me",
        email: actor.email || "",
        entityType: "email",
      });
      return;
    }
    const next = makeSigner({
      id: `sg-me-${Date.now()}`,
      name: actor.name || "Me",
      email: actor.email || "",
      order: recipients.length + 1,
      token: `sig-me-${Date.now()}`,
      colorIndex: recipients.length,
      entityType: "email",
    });
    onChangeRecipients([...recipients, next]);
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
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
                  "flex min-h-[168px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center lg:w-[320px] lg:shrink-0",
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-primary/25 bg-primary/[0.03]",
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
                <CloudUpload className="h-8 w-8 text-primary" strokeWidth={1.6} />
                <p className="mt-2 text-[13px] font-medium text-slate-700">
                  Drag files here
                </p>
                <p className="text-[12px] text-slate-400">or</p>
                <div className="relative mt-2">
                  <button
                    type="button"
                    onClick={() => setAddMenuOpen((v) => !v)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[12px] font-semibold text-white shadow-sm hover:bg-primary/90"
                  >
                    Add document
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {addMenuOpen ? (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setAddMenuOpen(false)}
                      />
                      <div className="absolute left-1/2 top-full z-20 mt-1.5 w-48 -translate-x-1/2 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setAddMenuOpen(false);
                            fileInputRef.current?.click();
                          }}
                        >
                          <Upload className="h-3.5 w-3.5 text-primary" />
                          From computer
                        </button>
                        {!isTemplate ? (
                          <Link
                            href="/signature/templates"
                            className="flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
                            onClick={() => setAddMenuOpen(false)}
                          >
                            <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
                            Use template
                          </Link>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 25MB)
                </p>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {uploadedDocs.length === 0 ? (
                  <div className="flex min-h-[168px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center text-[13px] text-slate-400">
                    Uploaded files will appear here
                  </div>
                ) : (
                  uploadedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[#F8F7FC] px-3 py-3"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary shadow-sm ring-1 ring-slate-200/80">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-slate-800">
                          {doc.fileName || doc.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {doc.sizeLabel}
                          {doc.sizeLabel ? " · " : ""}
                          {doc.ext}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={doc.onRemove}
                        className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                        aria-label={`Remove ${doc.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {fileError ? (
              <p className="mt-3 text-[12px] text-rose-600">{fileError}</p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <FormLabel>Document name</FormLabel>
              <div className="relative min-w-0 flex-1">
                <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => onChangeName(e.target.value)}
                  placeholder="Enter name"
                  className={cn(fieldClass, "pl-9")}
                />
              </div>
            </div>
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
              <button type="button" onClick={addRecipient} className={chipBtn}>
                <Users className="h-3.5 w-3.5" />
                Add bulk recipients
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

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
                        value={signer.role ?? "Signer"}
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
            <div className="mt-3 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)]">
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                  <FormLabel>Days to complete</FormLabel>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={settings.daysToComplete}
                    onChange={(e) =>
                      onChangeSettings({
                        daysToComplete: Math.max(
                          1,
                          Number(e.target.value) || 1,
                        ),
                      })
                    }
                    className={cn(fieldClass, "w-[88px]")}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                  <FormLabel>Agreement valid until</FormLabel>
                  <div className="relative min-w-0 flex-1">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                      value={settings.agreementValidUntil}
                      onChange={(e) =>
                        onChangeSettings({
                          agreementValidUntil: e.target.value,
                        })
                      }
                      className={cn(selectClass, "w-full pl-9")}
                    >
                      {AGREEMENT_VALIDITY.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                  <FormLabel>Document type</FormLabel>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <select
                      value={settings.documentType}
                      onChange={(e) =>
                        onChangeSettings({ documentType: e.target.value })
                      }
                      className={cn(selectClass, "min-w-0 flex-1")}
                    >
                      {DOCUMENT_TYPES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 text-primary hover:bg-primary/5"
                      title="Add document type"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                  <FormLabel>Folder</FormLabel>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <select
                      value={settings.folder}
                      onChange={(e) =>
                        onChangeSettings({ folder: e.target.value })
                      }
                      className={cn(selectClass, "min-w-0 flex-1")}
                    >
                      {FOLDERS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 text-primary hover:bg-primary/5"
                      title="Add folder"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                  <FormLabel>Description</FormLabel>
                  <div className="relative min-w-0 flex-1">
                    <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={settings.description}
                      onChange={(e) =>
                        onChangeSettings({ description: e.target.value })
                      }
                      placeholder="Add description"
                      className={cn(fieldClass, "pl-9")}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2 text-[13px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.allowComments}
                    onChange={(e) =>
                      onChangeSettings({ allowComments: e.target.checked })
                    }
                    className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary/20"
                  />
                  Allow recipient comments
                </label>
                <label className="flex items-center gap-2 text-[13px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.automaticReminders}
                    onChange={(e) =>
                      onChangeSettings({
                        automaticReminders: e.target.checked,
                      })
                    }
                    className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary/20"
                  />
                  Automatic reminders
                </label>
                {settings.automaticReminders ? (
                  <>
                    <p className="text-[12px] leading-5 text-slate-400">
                      Automatic reminders will only be delivered via email even
                      if the delivery mode is set to &quot;Email + SMS&quot;.
                    </p>
                    <div className="flex flex-col gap-3 text-[13px] text-slate-600">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>Send a reminder every</span>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={settings.reminderEveryDays}
                          onChange={(e) =>
                            onChangeSettings({
                              reminderEveryDays: Math.max(
                                1,
                                Number(e.target.value) || 1,
                              ),
                            })
                          }
                          className={cn(fieldClass, "w-[72px]")}
                          aria-label="Reminder interval in days"
                        />
                        <span>day(s)</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span>on</span>
                        <input
                          type="date"
                          value={settings.reminderDay}
                          onChange={(e) =>
                            onChangeSettings({ reminderDay: e.target.value })
                          }
                          className={cn(fieldClass, "w-[168px]")}
                          aria-label="Reminder day"
                        />
                        <span>at</span>
                        <input
                          type="time"
                          value={settings.reminderTime}
                          onChange={(e) =>
                            onChangeSettings({ reminderTime: e.target.value })
                          }
                          className={cn(fieldClass, "w-[128px]")}
                          aria-label="Reminder time"
                        />
                      </div>
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
