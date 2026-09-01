"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import mammoth from "mammoth";
import { DocumentDetailsSection } from "@/components/documents/signature/create/DocumentDetailsSection";
import {
  PlaceFieldsView,
  type SignatureDocumentPreview,
} from "@/components/documents/signature/create/PlaceFieldsView";
import {
  createDocumentFromTemplate,
  upsertSignatureRequest,
  markRequestSent,
  getRequestDocuments,
  type SignatureRequest,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import type { PlacedField } from "@/components/documents/signature/create/PdfFieldEditor";
import AddRecipients from "@/components/documents/signature/templates/AddRecipients";
import { toast } from "sonner";

export default function CreateDocumentFromTemplatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[13px] text-slate-400">
          Loading…
        </div>
      }
    >
      <CreateDocumentForm />
    </Suspense>
  );
}

const isDocxFile = (fileName: string) =>
  fileName.endsWith(".docx") || fileName.endsWith(".doc");

function CreateDocumentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("fromTemplate");
  const step = searchParams.get("step");
  const isPlacingFields = step === "place-fields";

  const [draft, setDraft] = useState<SignatureRequest | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [recipients, setRecipients] = useState<SignatureSigner[]>([]);
  const [signingOrder, setSigningOrder] = useState<"sequential" | "parallel">(
    "sequential",
  );
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);

  // Load the template-derived draft once, on mount.
  useEffect(() => {
    if (!templateId) {
      setNotFound(true);
      return;
    }
    const built = createDocumentFromTemplate(templateId);
    if (!built) {
      setNotFound(true);
      return;
    }
    setDraft(built);
    setRecipients(built.signers);
    setSigningOrder(built.signingOrder);
    setPlacedFields(built.fields as unknown as PlacedField[]);
  }, [templateId]);

  // --- Real document bytes ---
  // The template's actual file content lives in its persisted data: URL
  // (documentFileUrl / documents[].fileUrl) — never fabricate PDF bytes.
  // fetch() the data: URL into a Blob, then wrap it as a File so
  // PlaceFieldsView has something real to render/convert.
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [docHtmlContent, setDocHtmlContent] = useState("");
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);

  useEffect(() => {
    const sourceDoc = draft ? getRequestDocuments(draft)[0] : null;

    if (!sourceDoc?.fileUrl) {
      setDocumentFile(null);
      setDocHtmlContent("");
      return;
    }

    let cancelled = false;
    setIsLoadingDocument(true);

    fetch(sourceDoc.fileUrl)
      .then((res) => res.blob())
      .then(async (blob) => {
        if (cancelled) return;

        const file = new File([blob], sourceDoc.fileName, {
          type: blob.type || "application/pdf",
        });
        setDocumentFile(file);

        // docx/doc needs conversion to HTML for the previewer — same
        // approach as CreateTemplateForm, so both pages render docx
        // consistently instead of only PDFs working here.
        if (isDocxFile(sourceDoc.fileName)) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (!cancelled) setDocHtmlContent(result.value);
          } catch (error) {
            console.error("Error converting docx:", error);
            if (!cancelled) {
              setDocHtmlContent("<p>Error loading document preview.</p>");
            }
          }
        } else {
          setDocHtmlContent("");
        }
      })
      .catch((err) => {
        console.error("Failed to load template document bytes:", err);
        if (!cancelled) {
          setDocumentFile(null);
          setDocHtmlContent("");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDocument(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draft]);

  const documents: SignatureDocumentPreview[] = useMemo(() => {
    if (!draft) return [];
    return getRequestDocuments(draft).map((doc) => ({
      id: doc.id,
      name: doc.name,
      file:
        documentFile ?? new File([], doc.fileName, { type: "application/pdf" }),
      // The real persisted data: URL — stable, nothing to revoke.
      fileUrl: doc.fileUrl ?? "",
      docHtmlContent,
      isConvertingDoc: isLoadingDocument,
    }));
  }, [draft, documentFile, docHtmlContent, isLoadingDocument]);

  function persist(status: "Draft" | "Sent") {
    if (!draft) return;
    const saved = upsertSignatureRequest({
      ...draft,
      signers: recipients,
      signingOrder,
      fields: placedFields as unknown as SignatureRequest["fields"],
      status: "Draft",
      audit: draft.audit,
    });

    if (status === "Sent") {
      const sent = markRequestSent(saved, "Current User");
      toast.success("Document sent for signature!");
      router.push(`/signature/${sent.id}`);
    } else {
      toast.success("Draft saved.");
      router.push(`/signature/${saved.id}`);
    }
  }

  /**
   * Wired to PlaceFieldsView's `onSend` prop (NOT `handleSaveTemplate` —
   * that prop is only read by PlaceFieldsView when `isTemplate` is true).
   * Persists the current signers/fields, marks the request sent, and
   * returns the notified signers so PlaceFieldsView can show the
   * (mock) send-links modal before navigating away.
   */
  const handleSend = async (): Promise<SignatureSigner[]> => {
    if (!draft) return [];

    const missing = recipients.some((r) => !r.name.trim() || !r.email.trim());
    if (missing) {
      toast.error("Fill in a name and email for every recipient.");
      throw new Error("Missing recipient name/email");
    }

    const saved = upsertSignatureRequest({
      ...draft,
      signers: recipients,
      signingOrder,
      fields: placedFields as unknown as SignatureRequest["fields"],
      status: "Draft",
      audit: draft.audit,
    });

    const sent = markRequestSent(saved, "Current User");
    return sent.signers;
  };

  const handleContinue = () => {
    const missing = recipients.some((r) => !r.name.trim() || !r.email.trim());
    if (missing) {
      toast.error("Fill in a name and email for every recipient.");
      return;
    }
    router.push(
      `/signature/documents/create?fromTemplate=${templateId}&step=place-fields`,
    );
  };

  const handleBackToForm = () => {
    router.push(`/signature/documents/create?fromTemplate=${templateId}`);
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

  const handleResizeField = (id: string, width: number, height: number) => {
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, width, height } : f)),
    );
  };

  if (notFound) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-slate-700">
          That template couldn't be found.
        </p>
        <button
          onClick={() => router.push("/signature/templates")}
          className="text-xs font-semibold text-violet-600 hover:underline"
        >
          Back to templates
        </button>
      </div>
    );
  }

  if (!draft) return null;

  if (isPlacingFields) {
    return (
      <PlaceFieldsView
        documentName={draft.documentName}
        documents={documents}
        placedFields={placedFields}
        draggingFieldType={null}
        recipients={recipients}
        isTemplate={false}
        handleBackToForm={handleBackToForm}
        handleDropField={() => {}}
        handleRepositionField={handleRepositionField}
        handleRemovePlacedField={handleRemovePlacedField}
        handleSidebarDragStart={() => {}}
        handleSidebarDragEnd={() => {}}
        handleResizeField={handleResizeField}
        onSend={handleSend}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-foreground tracking-tight">
          Send: {draft.documentName}
        </h1>
      </div>

      <hr className="border-border" />

      <div className="w-full space-y-4">
        <DocumentDetailsSection
          documentName={draft.documentName}
          documentFile={documentFile}
          onChangeName={() => {}}
          onChangeFile={() => {}}
          error=""
          additionalFiles={[]}
          onChangeAdditionalFiles={() => {}}
        />

        <AddRecipients
          signers={recipients}
          onChange={setRecipients}
          signingOrder={signingOrder}
          onToggleOrder={setSigningOrder}
        />
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
            onClick={() => persist("Draft")}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold transition-colors shadow-sm flex items-center gap-2"
          >
            <span>Continue to review fields</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
