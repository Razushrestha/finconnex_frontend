"use client";

import {
  Suspense,
  useState,
  useEffect,
  useMemo,
  useRef,
  type DragEvent,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import mammoth from "mammoth";
import {
  renamedStoredFileName,
  splitFileName,
  type AdditionalDocument,
} from "@/components/documents/signature/create/DocumentDetailsSection";
import {
  ZohoStyleSendForm,
  type ZohoSendFormSettings,
} from "@/components/documents/signature/create/ZohoStyleSendForm";
import { defaultTemplateMoreSettings } from "@/components/documents/signature/create/AdvancedOptionsSection";
import {
  PlaceFieldsView,
  type SignatureDocumentPreview,
} from "@/components/documents/signature/create/PlaceFieldsView";
import type { StandardFieldType } from "@/components/documents/signature/create/StandardFieldsSidebar";
import {
  listSignatureRequests,
  makeSigner,
  nextSignatureIds,
  SignatureField,
  upsertSignatureRequest,
  deleteSignatureRequest,
  type SignatureDocument,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import type {
  PlacedField,
  DraggingFieldType,
} from "@/components/documents/signature/create/PdfFieldEditor";
import {
  DEFAULT_PLACED_FIELD_HEIGHT,
  DEFAULT_PLACED_FIELD_WIDTH,
} from "@/lib/documents/signature/field-placement";
import { toast } from "@/lib/notify/toast";
import { tryCrmStorage, uploadCrmStorageFile } from "@/lib/storage/api";
import {
  createCrmSignatureTemplate,
  isCrmSignatureTemplateId,
  persistRemoteSignatureTemplate,
  toCreateSignatureTemplateBody,
  tryCrmSignatureTemplate,
  updateCrmSignatureTemplate,
} from "@/lib/documents/signature/templates-api";

let additionalDocIdCounter = 0;
const nextAdditionalDocId = () =>
  `additional-doc-${Date.now()}-${additionalDocIdCounter++}`;

export default function CreateTemplatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[13px] text-slate-400">
          Loading…
        </div>
      }
    >
      <CreateTemplateForm />
    </Suspense>
  );
}

interface AdditionalDocPreview {
  fileUrl: string;
  docHtmlContent: string;
  isConvertingDoc: boolean;
}

const isDocxFile = (file: File) =>
  file.name.endsWith(".docx") || file.name.endsWith(".doc");

/**
 * Builds the persisted (data: URL) document payload for a template save.
 *
 * - New/changed primary file (size > 0) → convert to a data: URL, that's
 *   the source of truth going forward.
 * - No new primary file picked (e.g. editing a template without re-uploading,
 *   where `documentFile` is a zero-byte dummy File standing in for the
 *   already-saved doc) → fall back to `existingDocumentFileUrl` so we don't
 *   clobber a previously-persisted file with nothing.
 * - Additional files are always freshly converted (no edit-reload path for
 *   them yet).
 */
async function persistFileUrl(file: File, fallback?: string) {
  const stored = await tryCrmStorage(() => uploadCrmStorageFile(file));
  if (stored?.url) return stored.url;
  return fallback;
}

async function buildPersistableDocuments(
  documentFile: File | null,
  documentName: string,
  additionalFiles: AdditionalDocument[],
  existingDocumentFileUrl?: string,
): Promise<{ documentFileUrl?: string; documents: SignatureDocument[] }> {
  const documents: SignatureDocument[] = [];
  let documentFileUrl: string | undefined = existingDocumentFileUrl;

  if (documentFile && documentFile.size > 0) {
    documentFileUrl =
      (await persistFileUrl(documentFile, existingDocumentFileUrl)) ||
      URL.createObjectURL(documentFile);
    documents.push({
      id: "primary",
      name: documentName || documentFile.name,
      fileName: documentFile.name,
      fileUrl: documentFileUrl,
    });
  } else if (existingDocumentFileUrl) {
    documents.push({
      id: "primary",
      name: documentName || documentFile?.name || "",
      fileName: documentFile?.name || documentName,
      fileUrl: existingDocumentFileUrl,
    });
  }

  for (const doc of additionalFiles) {
    const url =
      (await persistFileUrl(doc.file)) || URL.createObjectURL(doc.file);
    documents.push({
      id: doc.id,
      name: doc.name,
      fileName: doc.file.name,
      fileUrl: url,
    });
  }

  return { documentFileUrl, documents };
}

function CreateTemplateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get("step");
  const isPlacingFields = step === "place-fields";

  // Support both ?edit=ID and ?id=ID query parameters
  const editId = searchParams.get("edit") || searchParams.get("id");

  const [ids, setIds] = useState(() => nextSignatureIds());

  const [documentName, setDocumentName] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  // The already-persisted data: URL when editing an existing template.
  // Only set from the edit-load effect; never touched by a fresh file pick.
  const [existingDocumentFileUrl, setExistingDocumentFileUrl] = useState<
    string | undefined
  >();

  const [recipients, setRecipients] = useState<SignatureSigner[]>(() => [
    makeSigner({
      id: "sg-1",
      name: "",
      email: "",
      order: 1,
      token: `sig-1-${Date.now()}`,
      colorIndex: 0,
      role: "Signer",
    }),
  ]);
  const [signingOrder, setSigningOrder] = useState<"sequential" | "parallel">(
    "sequential",
  );
  const [moreSettings, setMoreSettings] = useState<ZohoSendFormSettings>(
    defaultTemplateMoreSettings,
  );
  const [expiryDate, setExpiryDate] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [showRecipientErrors, setShowRecipientErrors] = useState(false);

  const [fileError, setFileError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function expiryFromDays(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + Math.max(1, days));
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function resolvedExpiryDate() {
    return expiryDate || expiryFromDays(moreSettings.daysToComplete);
  }

  // Field placement state
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [draggingFieldType, setDraggingFieldType] =
    useState<DraggingFieldType | null>(null);
  const draggingRef = useRef<DraggingFieldType | null>(null);
  draggingRef.current = draggingFieldType;

  // --- Load existing template data when editing ---
  useEffect(() => {
    if (!editId) return;

    try {
      const allRequests = listSignatureRequests();
      const existing = allRequests.find((req) => req.id === editId);

      if (existing) {
        setIds({
          id: existing.id,
          signatureRequestId: existing.signatureRequestId || existing.id,
          manageToken: existing.manageToken || "",
        });

        setDocumentName(existing.documentName || "");

        if (existing.documentFile) {
          const dummyBlob = new Blob([""], { type: "application/pdf" });
          const mockFile = new File([dummyBlob], existing.documentFile, {
            type: "application/pdf",
          });
          setDocumentFile(mockFile);
          setExistingDocumentFileUrl(existing.documentFileUrl);
        }

        if (existing.signers && existing.signers.length > 0) {
          setRecipients(
            existing.signers.map((signer) => {
              const knownRoles = ["Signer", "Approver", "CC"] as const;
              const roleIsKnown = knownRoles.includes(
                signer.role as (typeof knownRoles)[number],
              );
              if (roleIsKnown || signer.roleLabel) return signer;
              return {
                ...signer,
                roleLabel: String(signer.role || ""),
                role: "Signer" as const,
              };
            }),
          );
        }
        if (existing.signingOrder) {
          setSigningOrder(existing.signingOrder);
        }
        if (existing.fields) {
          setPlacedFields(existing.fields as unknown as PlacedField[]);
        }
        if (existing.expiryDate) {
          setExpiryDate(existing.expiryDate);
        }
      }
    } catch (error) {
      console.error("Failed to load template for editing:", error);
    }
  }, [editId]);

  const fileUrl = useMemo(() => {
    if (!documentFile || !(documentFile instanceof File)) return "";
    // Zero-byte dummy file from edit-load has nothing real to preview via
    // blob: URL — prefer the persisted data: URL for the live preview too.
    if (documentFile.size === 0) return existingDocumentFileUrl ?? "";
    return URL.createObjectURL(documentFile);
  }, [documentFile, existingDocumentFileUrl]);

  useEffect(() => {
    return () => {
      if (fileUrl && fileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  // Word Document conversion state (primary document)
  const [docHtmlContent, setDocHtmlContent] = useState<string>("");
  const [isConvertingDoc, setIsConvertingDoc] = useState(false);

  useEffect(() => {
    async function convertDocx() {
      if (!documentFile) {
        setDocHtmlContent("");
        return;
      }
      // Skip conversion if this is an empty dummy file loaded from edit mode
      if (documentFile.size === 0) {
        setDocHtmlContent("<p>Existing document loaded.</p>");
        setIsConvertingDoc(false);
        return;
      }
      if (!isDocxFile(documentFile)) {
        setDocHtmlContent("");
        return;
      }

      setIsConvertingDoc(true);
      try {
        const arrayBuffer = await documentFile.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocHtmlContent(result.value);
      } catch (error) {
        console.error("Error converting docx:", error);
        setDocHtmlContent("<p>Error loading document preview.</p>");
      } finally {
        setIsConvertingDoc(false);
      }
    }

    convertDocx();
  }, [documentFile]);

  // --- Additional documents
  const [additionalFiles, setAdditionalFiles] = useState<AdditionalDocument[]>(
    [],
  );
  const [additionalPreviews, setAdditionalPreviews] = useState<
    Record<string, AdditionalDocPreview>
  >({});
  const processedAdditionalIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(additionalFiles.map((doc) => doc.id));

    setAdditionalPreviews((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (!currentIds.has(id)) {
          URL.revokeObjectURL(next[id].fileUrl);
          delete next[id];
          processedAdditionalIds.current.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    additionalFiles.forEach((doc) => {
      if (processedAdditionalIds.current.has(doc.id)) return;
      processedAdditionalIds.current.add(doc.id);

      const docFileUrl = URL.createObjectURL(doc.file);
      const isDocx = isDocxFile(doc.file);

      setAdditionalPreviews((prev) => ({
        ...prev,
        [doc.id]: {
          fileUrl: docFileUrl,
          docHtmlContent: "",
          isConvertingDoc: isDocx,
        },
      }));

      if (isDocx) {
        doc.file
          .arrayBuffer()
          .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
          .then((result) => {
            setAdditionalPreviews((prev) =>
              prev[doc.id]
                ? {
                    ...prev,
                    [doc.id]: {
                      ...prev[doc.id],
                      docHtmlContent: result.value,
                      isConvertingDoc: false,
                    },
                  }
                : prev,
            );
          })
          .catch((error) => {
            console.error("Error converting docx:", error);
            setAdditionalPreviews((prev) =>
              prev[doc.id]
                ? {
                    ...prev,
                    [doc.id]: {
                      ...prev[doc.id],
                      docHtmlContent: "<p>Error loading document preview.</p>",
                      isConvertingDoc: false,
                    },
                  }
                : prev,
            );
          });
      }
    });
  }, [additionalFiles]);

  useEffect(() => {
    return () => {
      Object.values(additionalPreviews).forEach((preview) =>
        URL.revokeObjectURL(preview.fileUrl),
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const documents: SignatureDocumentPreview[] = useMemo(() => {
    const list: SignatureDocumentPreview[] = [];
    if (documentFile) {
      list.push({
        id: "primary",
        name: documentName || documentFile.name,
        file: documentFile,
        fileUrl,
        docHtmlContent,
        isConvertingDoc,
      });
    }
    additionalFiles.forEach((doc) => {
      const preview = additionalPreviews[doc.id];
      list.push({
        id: doc.id,
        name: doc.name,
        file: doc.file,
        fileUrl: preview?.fileUrl ?? "",
        docHtmlContent: preview?.docHtmlContent ?? "",
        isConvertingDoc: preview?.isConvertingDoc ?? false,
      });
    });
    return list;
  }, [
    documentFile,
    documentName,
    fileUrl,
    docHtmlContent,
    isConvertingDoc,
    additionalFiles,
    additionalPreviews,
  ]);

  const storedFileName = documentFile
    ? renamedStoredFileName(documentName, documentFile.name)
    : "";

  const handleFileChange = (file: File | null) => {
    setDocumentFile(file);
    setFileError("");
    // A fresh pick replaces whatever was previously persisted; the new
    // file's own data: URL (built at save time) is now the source of truth.
    setExistingDocumentFileUrl(undefined);
  };

  const applyPrimaryFile = (file: File) => {
    const { base } = splitFileName(file.name);
    setDocumentName(base);
    handleFileChange(file);
  };

  const addAdditionalFiles = (files: File[]) => {
    if (files.length === 0) return;
    const newEntries: AdditionalDocument[] = files.map((file) => {
      const { base, ext } = splitFileName(file.name);
      return {
        id: nextAdditionalDocId(),
        file,
        fileUrl: URL.createObjectURL(file),
        name: base,
        extension: ext,
      };
    });
    setAdditionalFiles((prev) => [...prev, ...newEntries]);
  };

  const handleIncomingFiles = (files: File[]) => {
    if (files.length === 0) return;
    setFileError("");
    if (!documentFile) {
      const [first, ...rest] = files;
      applyPrimaryFile(first);
      addAdditionalFiles(rest);
      return;
    }
    addAdditionalFiles(files);
  };

  const handleRemovePrimary = () => {
    if (additionalFiles.length > 0) {
      const [next, ...rest] = additionalFiles;
      setDocumentName(next.name);
      handleFileChange(next.file);
      setAdditionalFiles(rest);
      return;
    }
    setDocumentName("");
    handleFileChange(null);
  };

  const handleRemoveAdditional = (id: string) => {
    setAdditionalFiles((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleResizeField = (id: string, width: number, height: number) => {
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, width, height } : f)),
    );
  };

  const handleSaveDraft = async () => {
    if (!documentName.trim()) return;
    setIsSaving(true);
    try {
      const { documentFileUrl, documents: persistedDocuments } =
        await buildPersistableDocuments(
          documentFile,
          documentName,
          additionalFiles,
          existingDocumentFileUrl,
        );

      upsertSignatureRequest({
        id: ids.id,
        signatureRequestId: ids.signatureRequestId,
        documentName,
        documentFile: storedFileName || documentFile?.name || "",
        documentFileUrl,
        documents:
          persistedDocuments.length > 0 ? persistedDocuments : undefined,
        recordType: "template",
        signer: recipients[0]?.name || "",
        signerEmail: recipients[0]?.email || "",
        signers: recipients,
        fields: placedFields as unknown as SignatureField[],
        signingOrder,
        status: "Draft",
        expiryDate: resolvedExpiryDate(),
        createdBy: "Current User",
        manageToken: ids.manageToken,
        audit: [
          {
            id: `a-${Date.now()}`,
            at: new Date().toLocaleString(),
            action: "Template draft saved/updated",
            actor: "Current User",
          },
        ],
      });
      toast.success("Template draft saved successfully!");
    } catch (error) {
      console.error("Failed to save template draft:", error);
      toast.error("Failed to save template draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
      const { documentFileUrl, documents: persistedDocuments } =
        await buildPersistableDocuments(
          documentFile,
          documentName,
          additionalFiles,
          existingDocumentFileUrl,
        );

      const saved = upsertSignatureRequest({
        id: ids.id,
        signatureRequestId: ids.signatureRequestId,
        documentName,
        documentFile: storedFileName || documentFile?.name || "",
        documentFileUrl,
        documents:
          persistedDocuments.length > 0 ? persistedDocuments : undefined,
        recordType: "template",
        signer: recipients[0]?.name || "",
        signerEmail: recipients[0]?.email || "",
        signers: recipients,
        fields: placedFields as unknown as SignatureField[],
        signingOrder,
        status: "Draft",
        expiryDate: resolvedExpiryDate(),
        createdBy: "Current User",
        manageToken: ids.manageToken,
        audit: [
          {
            id: `a-${Date.now()}`,
            at: new Date().toLocaleString(),
            action: "Template created/updated",
            actor: "Current User",
          },
        ],
      });
      const body = toCreateSignatureTemplateBody(saved);
      if (isCrmSignatureTemplateId(saved.id)) {
        await tryCrmSignatureTemplate(() =>
          updateCrmSignatureTemplate(saved.id, body),
        );
      } else {
        const remote = await tryCrmSignatureTemplate(() =>
          createCrmSignatureTemplate(body),
        );
        if (remote) {
          deleteSignatureRequest(saved.id);
          persistRemoteSignatureTemplate({
            ...saved,
            ...remote,
            recordType: "template",
          });
        }
      }
      toast.success("Template saved successfully!", {
        description: "Redirecting to templates...",
      });
      router.push("/signature/templates");
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Failed to save template.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!documentFile) {
      setFileError("Document file is required");
      return;
    }
    const missingRole = recipients.some(
      (r) => !(r.roleLabel ?? "").trim() && !r.name.trim(),
    );
    if (missingRole) {
      setShowRecipientErrors(true);
      toast.error("Add a Role for each recipient");
      return;
    }

    setIsSaving(true);
    try {
      const { documentFileUrl, documents: persistedDocuments } =
        await buildPersistableDocuments(
          documentFile,
          documentName,
          additionalFiles,
          existingDocumentFileUrl,
        );

      upsertSignatureRequest({
        id: ids.id,
        signatureRequestId: ids.signatureRequestId,
        documentName,
        documentFile: storedFileName || documentFile?.name || "",
        documentFileUrl,
        documents:
          persistedDocuments.length > 0 ? persistedDocuments : undefined,
        recordType: "template",
        signer: recipients[0]?.name || recipients[0]?.roleLabel || "",
        signerEmail: recipients[0]?.email || "",
        signers: recipients,
        fields: placedFields as unknown as SignatureField[],
        signingOrder,
        status: "Draft",
        expiryDate: resolvedExpiryDate(),
        createdBy: "Current User",
        manageToken: ids.manageToken,
        audit: [
          {
            id: `a-${Date.now()}`,
            at: new Date().toLocaleString(),
            action: "Initialized template field placement",
            actor: "Current User",
          },
        ],
      });

      const editParam = editId ? `&edit=${editId}` : "";
      router.push(`/signature/templates/create?step=place-fields${editParam}`);
    } catch (error) {
      console.error("Failed to save template before field placement:", error);
      toast.error("Failed to save document. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToForm = () => {
    const editParam = editId ? `?edit=${editId}` : "";
    router.push(`/signature/templates/create${editParam}`);
  };

  const handleSidebarDragStart = (
    e: DragEvent<HTMLDivElement>,
    field: StandardFieldType,
    recipient?: { id: string; name: string; email: string; colorIndex: number },
  ) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", field.type);
    const next = recipient ? { ...field, recipient } : field;
    draggingRef.current = next;
    setDraggingFieldType(next);
  };

  const handleSidebarDragEnd = () => {
    draggingRef.current = null;
    setDraggingFieldType(null);
  };

  const handleArmField = (
    field: StandardFieldType,
    recipient?: { id: string; name: string; email: string; colorIndex: number },
  ) => {
    const next = recipient ? { ...field, recipient } : field;
    draggingRef.current = next;
    setDraggingFieldType(next);
  };

  const handleDropField = (
    documentId: string,
    page: number,
    xPct: number,
    yPct: number,
  ) => {
    const current = draggingRef.current;
    if (!current) return;
    setPlacedFields((prev) => [
      ...prev,
      {
        id: `field-${Date.now()}-${prev.length}`,
        type: current.type,
        label: current.label,
        documentId,
        page,
        xPct,
        yPct,
        width: DEFAULT_PLACED_FIELD_WIDTH,
        height: DEFAULT_PLACED_FIELD_HEIGHT,
        recipientId: current.recipient?.id,
        colorIndex: current.recipient?.colorIndex,
      },
    ]);
    draggingRef.current = null;
    setDraggingFieldType(null);
  };

  const handleRepositionField = (
    id: string,
    documentId: string,
    page: number,
    xPct: number,
    yPct: number,
  ) => {
    setPlacedFields((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, documentId, page, xPct, yPct } : f,
      ),
    );
  };

  const handleRemovePlacedField = (id: string) => {
    setPlacedFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleChangeFieldValue = (id: string, value: string) => {
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, value } : f)),
    );
  };

  // ==========================================
  // STEP 2: PLACE FIELDS VIEW (?step=place-fields)
  // ==========================================
  if (isPlacingFields) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <PlaceFieldsView
          documentName={documentName}
          documents={documents}
          placedFields={placedFields}
          draggingFieldType={draggingFieldType}
          recipients={recipients}
          isTemplate={true}
          handleBackToForm={handleBackToForm}
          handleDropField={handleDropField}
          handleRepositionField={handleRepositionField}
          handleRemovePlacedField={handleRemovePlacedField}
          handleSidebarDragStart={handleSidebarDragStart}
          handleSidebarDragEnd={handleSidebarDragEnd}
          handleArmField={handleArmField}
          handleResizeField={handleResizeField}
          handleChangeFieldValue={handleChangeFieldValue}
          handleSaveTemplate={handleSaveTemplate}
        />
      </div>
    );
  }

  // ==========================================
  // STEP 1: CREATE FORM VIEW (Default URL)
  // ==========================================
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <ZohoStyleSendForm
        mode="send"
        variant="template"
        documentName={documentName}
        onChangeName={setDocumentName}
        documentFile={documentFile}
        additionalFiles={additionalFiles}
        onIncomingFiles={handleIncomingFiles}
        onRemovePrimary={handleRemovePrimary}
        onRemoveAdditional={handleRemoveAdditional}
        fileError={fileError}
        recipients={recipients}
        onChangeRecipients={setRecipients}
        signingOrder={signingOrder}
        onToggleOrder={setSigningOrder}
        settings={moreSettings}
        onChangeSettings={(patch) =>
          setMoreSettings((prev) => ({ ...prev, ...patch }))
        }
        noteToRecipients={emailMessage}
        onChangeNote={setEmailMessage}
        showRecipientErrors={showRecipientErrors}
        onContinue={() => void handleContinue()}
        onClose={() => router.push("/signature/templates")}
        onSaveDraft={() => void handleSaveDraft()}
        isSaving={isSaving}
      />
    </div>
  );
}
