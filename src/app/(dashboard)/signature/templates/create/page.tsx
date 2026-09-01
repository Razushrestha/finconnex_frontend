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
  renamedStoredFileName,
  type AdditionalDocument,
} from "@/components/documents/signature/create/DocumentDetailsSection";
import { EmailMessageSection } from "@/components/documents/signature/create/EmailMessageSection";
import {
  PlaceFieldsView,
  type SignatureDocumentPreview,
} from "@/components/documents/signature/create/PlaceFieldsView";
import type { StandardFieldType } from "@/components/documents/signature/create/StandardFieldsSidebar";
import {
  nextSignatureIds,
  SignatureField,
  upsertSignatureRequest,
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

function CreateTemplateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get("step");
  const isPlacingFields = step === "place-fields";

  const [ids] = useState(() => nextSignatureIds());

  const [documentName, setDocumentName] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const fileUrl = useMemo(() => {
    if (!documentFile || !(documentFile instanceof File)) return "";
    return URL.createObjectURL(documentFile);
  }, [documentFile]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
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

  const [recipients, setRecipients] = useState<SignatureSigner[]>([
    {
      id: "",
      name: "",
      email: "",
      colorIndex: 0,
      order: 1,
      role: "" as any, // Or dynamic user-entered role name
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

  // Field placement state
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [draggingFieldType, setDraggingFieldType] =
    useState<DraggingFieldType | null>(null);

  const handleFileChange = (file: File | null) => {
    setDocumentFile(file);
    setFileError("");
  };

  const handleResizeField = (id: string, width: number, height: number) => {
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, width, height } : f)),
    );
  };

  const handleSaveDraft = () => {
    if (!documentName.trim()) return;
    upsertSignatureRequest({
      id: ids.id,
      signatureRequestId: ids.signatureRequestId,
      documentName,
      documentFile: storedFileName,
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
          action: "Template draft created",
          actor: "Current User",
        },
      ],
    });
    toast.success("Template draft saved successfully!");
  };

  const handleSaveTemplate = () => {
    upsertSignatureRequest({
      id: ids.id,
      signatureRequestId: ids.signatureRequestId,
      documentName,
      documentFile: storedFileName,
      signer: recipients[0]?.name || "",
      signerEmail: recipients[0]?.email || "",
      signers: recipients,
      fields: placedFields as unknown as SignatureField[],
      signingOrder,
      status: "Template" as any,
      expiryDate: expiryDate || "31/10/2026",
      createdBy: "Current User",
      manageToken: ids.manageToken,
      audit: [
        {
          id: `a-${Date.now()}`,
          at: new Date().toLocaleString(),
          action: "Template created",
          actor: "Current User",
        },
      ],
    });
    toast.success("Template created successfully!", {
      description: "Redirecting to templates...",
    });
    router.push("/signature/templates");
  };

  const handleContinue = () => {
    if (!documentFile) {
      setFileError("Document file is required");
      return;
    }

    upsertSignatureRequest({
      id: ids.id,
      signatureRequestId: ids.signatureRequestId,
      documentName,
      documentFile: storedFileName,
      signer: recipients[0]?.name || "",
      signerEmail: recipients[0]?.email || "",
      signers: recipients,
      fields: [],
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

    router.push("/signature/templates/create?step=place-fields");
  };

  const handleBackToForm = () => {
    router.push("/signature/templates/create");
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
            Create Template
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
          onClick={() => window.history.back()}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
        >
          Cancel
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
          >
            Save & New
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold transition-colors shadow-sm flex items-center gap-2"
          >
            <span>Continue to place fields</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
