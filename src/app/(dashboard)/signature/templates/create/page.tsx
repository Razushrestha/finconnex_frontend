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
import { AdvancedOptionsSection } from "@/components/documents/signature/create/AdvancedOptionsSection";
import {
  DocumentDetailsSection,
  type AdditionalDocument,
} from "@/components/documents/signature/create/DocumentDetailsSection";
import { EmailMessageSection } from "@/components/documents/signature/create/EmailMessageSection";
import {
  PlaceFieldsView,
  type SignatureDocumentPreview,
} from "@/components/documents/signature/create/PlaceFieldsView";
import type { StandardFieldType } from "@/components/documents/signature/create/StandardFieldsSidebar";
import {
  listSignatureRequests,
  nextSignatureIds,
  SignatureField,
  upsertSignatureRequest,
  fileToDataUrl,
  type SignatureDocument,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import type {
  PlacedField,
  DraggingFieldType,
} from "@/components/documents/signature/create/PdfFieldEditor";
import AddRecipients from "@/components/documents/signature/templates/AddRecipients";
import { toast } from "sonner";

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
async function buildPersistableDocuments(
  documentFile: File | null,
  documentName: string,
  additionalFiles: AdditionalDocument[],
  existingDocumentFileUrl?: string,
): Promise<{ documentFileUrl?: string; documents: SignatureDocument[] }> {
  const documents: SignatureDocument[] = [];
  let documentFileUrl: string | undefined = existingDocumentFileUrl;

  if (documentFile && documentFile.size > 0) {
    documentFileUrl = await fileToDataUrl(documentFile);
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
    const url = await fileToDataUrl(doc.file);
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

  const [recipients, setRecipients] = useState<SignatureSigner[]>([
    {
      id: "",
      name: "",
      email: "",
      colorIndex: 0,
      order: 1,
      role: "" as any,
      status: "Pending",
      token: "",
      deliveryMethod: "email",
    },
  ]);
  const [signingOrder, setSigningOrder] = useState<"sequential" | "parallel">(
    "sequential",
  );
  const [enableReminders, setEnableReminders] = useState(false);
  const [reminderDays, setReminderDays] = useState("5");
  const [enableExpiry, setEnableExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryTime, setExpiryTime] = useState("");

  const [emailTitle, setEmailTitle] = useState(`Please sign: ${documentName}`);
  const [emailMessage, setEmailMessage] = useState("");

  const [fileError, setFileError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Field placement state
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [draggingFieldType, setDraggingFieldType] =
    useState<DraggingFieldType | null>(null);

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
          setRecipients(existing.signers);
        }
        if (existing.signingOrder) {
          setSigningOrder(existing.signingOrder);
        }
        if (existing.fields) {
          setPlacedFields(existing.fields as unknown as PlacedField[]);
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

  const handleFileChange = (file: File | null) => {
    setDocumentFile(file);
    setFileError("");
    // A fresh pick replaces whatever was previously persisted; the new
    // file's own data: URL (built at save time) is now the source of truth.
    setExistingDocumentFileUrl(undefined);
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
        documentFile: documentFile?.name || "",
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
        expiryDate: expiryDate || "31/10/2026",
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

      upsertSignatureRequest({
        id: ids.id,
        signatureRequestId: ids.signatureRequestId,
        documentName,
        documentFile: documentFile?.name || "",
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
        expiryDate: expiryDate || "31/10/2026",
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
        documentFile: documentFile?.name || "",
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
        expiryDate: expiryDate || "31/10/2026",
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
    setDraggingFieldType(recipient ? { ...field, recipient } : field);
  };

  const handleSidebarDragEnd = () => {
    setDraggingFieldType(null);
  };

  const handleDropField = (
    documentId: string,
    page: number,
    xPct: number,
    yPct: number,
  ) => {
    if (!draggingFieldType) return;
    setPlacedFields((prev) => [
      ...prev,
      {
        id: `field-${Date.now()}-${prev.length}`,
        type: draggingFieldType.type,
        label: draggingFieldType.label,
        documentId,
        page,
        xPct,
        yPct,
        recipientId: draggingFieldType.recipient?.id,
        colorIndex: draggingFieldType.recipient?.colorIndex,
      },
    ]);
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

  // ==========================================
  // STEP 2: PLACE FIELDS VIEW (?step=place-fields)
  // ==========================================
  if (isPlacingFields) {
    return (
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
        handleResizeField={handleResizeField}
        handleSaveTemplate={handleSaveTemplate}
      />
    );
  }

  // ==========================================
  // STEP 1: CREATE FORM VIEW (Default URL)
  // ==========================================
  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            {editId ? "Edit Template" : "Create Template"}
          </h1>
        </div>
      </div>

      <hr className="border-border" />

      <div className="w-full space-y-4">
        <DocumentDetailsSection
          documentName={documentName}
          documentFile={documentFile}
          onChangeName={setDocumentName}
          onChangeFile={handleFileChange}
          error={fileError}
          additionalFiles={additionalFiles}
          onChangeAdditionalFiles={setAdditionalFiles}
        />

        <AddRecipients
          signers={recipients}
          onChange={setRecipients}
          signingOrder={signingOrder}
          onToggleOrder={setSigningOrder}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdvancedOptionsSection
            enableReminders={enableReminders}
            setEnableReminders={setEnableReminders}
            reminderDays={reminderDays}
            setReminderDays={setReminderDays}
            enableExpiry={enableExpiry}
            setEnableExpiry={setEnableExpiry}
            expiryDate={expiryDate}
            setExpiryDate={setExpiryDate}
            expiryTime={expiryTime}
            setExpiryTime={setExpiryTime}
          />

          <EmailMessageSection
            title={emailTitle}
            setTitle={setEmailTitle}
            message={emailMessage}
            setMessage={setEmailMessage}
          />
        </div>
      </div>

      <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-slate-200 w-full p-2 flex items-center justify-between rounded-xl shadow-lg">
        <button
          type="button"
          onClick={() => router.push("/signature/templates")}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
        >
          Cancel
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <span>{isSaving ? "Saving…" : "Continue to place fields"}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
