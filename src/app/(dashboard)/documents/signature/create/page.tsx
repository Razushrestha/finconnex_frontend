"use client";

import { AdvancedOptionsSection } from "@/components/documents/signature/create/AdvancedOptionsSection";
import { DocumentDetailsSection } from "@/components/documents/signature/create/DocumentDetailsSection";
import { EmailMessageSection } from "@/components/documents/signature/create/EmailMessageSection";
import { RecipientsSection } from "@/components/documents/signature/create/RecipientsSection";
import { SignersSection } from "@/components/documents/signature/create/SignersSection";
import {
  makeSigner,
  nextSignatureIds,
  SignatureSigner,
  upsertSignatureRequest,
} from "@/lib/documents/signature/types";
import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import type {
  PlacedField,
  DraggingFieldType,
} from "@/components/documents/signature/create/PdfFieldEditor";

// react-pdf uses canvas/browser-only APIs — must never render on the server
const PdfFieldEditor = dynamic(
  () => import("@/components/documents/signature/create/PdfFieldEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16 text-xs text-slate-400">
        Loading PDF viewer…
      </div>
    ),
  },
);

export default function CreateSignatureRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get("step");
  const isPlacingFields = step === "place-fields";

  const ids = nextSignatureIds();

  const [documentName, setDocumentName] = useState(
    "Engagement Letter: Anderson",
  );

  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const fileUrl = useMemo(() => {
    if (!documentFile || !(documentFile instanceof File)) return "";
    return URL.createObjectURL(documentFile);
  }, [documentFile]);

  const fileName = documentFile?.name || "Engagement Letter";

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const [signers, setSigners] = useState<SignatureSigner[]>([
    makeSigner({
      id: `sg-${ids.id}-1`,
      name: "",
      email: "",
      order: 1,
      token: `${ids.manageToken}-1`,
      status: "Pending",
    }),
  ]);

  const [recipients, setRecipients] = useState<SignatureSigner[]>([]);

  const [signingOrder, setSigningOrder] = useState<"sequential" | "parallel">(
    "sequential",
  );
  const [enableReminders, setEnableReminders] = useState(true);
  const [reminderDays, setReminderDays] = useState("5");
  const [enableExpiry, setEnableExpiry] = useState(true);
  const [expiryDate, setExpiryDate] = useState("2024-10-31");
  const [expiryTime, setExpiryTime] = useState("");

  const [emailTitle, setEmailTitle] = useState(`Please sign: ${documentName}`);
  const [emailMessage, setEmailMessage] = useState("");

  const [fileError, setFileError] = useState("");

  // ---- Field placement state ----
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [draggingFieldType, setDraggingFieldType] =
    useState<DraggingFieldType | null>(null);

  const handleFileChange = (file: File | null) => {
    setDocumentFile(file);
    setFileError("");
  };

  const handleSaveDraft = () => {
    if (!documentName.trim()) return;
    upsertSignatureRequest({
      id: ids.id,
      signatureRequestId: ids.signatureRequestId,
      documentName,
      documentFile: documentFile?.name || "",
      signer: signers[0]?.name || "",
      signerEmail: signers[0]?.email || "",
      signers,
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
          action: "Draft created",
          actor: "Current User",
        },
      ],
    });
    alert("Draft saved successfully!");
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
      documentFile: documentFile?.name || "",
      signer: signers[0]?.name || "",
      signerEmail: signers[0]?.email || "",
      signers,
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
          action: "Initialized field placement",
          actor: "Current User",
        },
      ],
    });

    router.push("/documents/signature/create?step=place-fields");
  };

  const handleBackToForm = () => {
    router.push("/documents/signature/create");
  };

  const standardFields = [
    { type: "signature", label: "Signature" },
    { type: "initials", label: "Initials" },
    { type: "date", label: "Date" },
    { type: "name", label: "Name" },
    { type: "email", label: "Email" },
    { type: "text", label: "Text" },
    { type: "stamp", label: "Stamp" },
    { type: "image", label: "Image" },
    { type: "company", label: "Company" },
    { type: "sign_date", label: "Sign Date" },
    { type: "job_title", label: "Job title" },
    { type: "checkbox", label: "Checkbox" },
    { type: "dropdown", label: "Dropdown" },
    { type: "radio", label: "Radio" },
    { type: "payment", label: "Payment" },
    { type: "attachment", label: "Attachment" },
  ];

  const handleSidebarDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    field: (typeof standardFields)[number],
  ) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", field.type);
    setDraggingFieldType(field);
  };

  const handleSidebarDragEnd = () => {
    setDraggingFieldType(null);
  };

  const handleDropField = (page: number, xPct: number, yPct: number) => {
    if (!draggingFieldType) return;
    setPlacedFields((prev) => [
      ...prev,
      {
        id: `field-${Date.now()}-${prev.length}`,
        type: draggingFieldType.type,
        label: draggingFieldType.label,
        page,
        xPct,
        yPct,
      },
    ]);
    setDraggingFieldType(null);
  };

  const handleRepositionField = (
    id: string,
    page: number,
    xPct: number,
    yPct: number,
  ) => {
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, page, xPct, yPct } : f)),
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
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBackToForm}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Create Signature Request</span>
            </button>
            <span className="text-slate-300">/</span>
            <h1 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Place Fields
            </h1>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row p-6 gap-6 max-w-[1600px] mx-auto w-full">
          {/* Document Canvas Area (Displays uploaded PDF, page by page) */}
          <div className="flex-1 bg-slate-100/80 rounded-sm border border-slate-200/80 flex items-start justify-center p-3 overflow-auto min-h-[750px] relative shadow-inner">
            <div className="w-full max-w-[800px] flex flex-col gap-4">
              <h2 className="text-sm font-bold text-slate-900">{fileName}</h2>

              {fileUrl ? (
                <PdfFieldEditor
                  fileUrl={fileUrl}
                  placedFields={placedFields}
                  draggingFieldType={draggingFieldType}
                  pageWidth={700}
                  onDropField={handleDropField}
                  onRepositionField={handleRepositionField}
                  onRemoveField={handleRemovePlacedField}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-16">
                  No document preview available. Please go back and upload a
                  PDF.
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Standard Fields */}
          <aside className="w-full md:w-80 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Standard Fields
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                {standardFields.map((field) => {
                  return (
                    <div
                      key={field.type}
                      draggable
                      onDragStart={(e) => handleSidebarDragStart(e, field)}
                      onDragEnd={handleSidebarDragEnd}
                      className="flex flex-col items-start gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group"
                    >
                      <span className="text-xs font-semibold text-slate-700">
                        {field.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
              <p className="text-[11px] text-slate-500 font-medium">
                Drag fields onto the document.
              </p>
            </div>
          </aside>
        </div>

        <footer className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between shadow-lg">
          <button
            type="button"
            onClick={handleBackToForm}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
          >
            Back to Recipients
          </button>

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Preview
            </button>
            <button
              type="button"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <span>Send Request</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // ==========================================
  // STEP 1: CREATE FORM VIEW (Default URL)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Create Signature Request
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
            MULTI-SIGNER
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-indigo-50/60 border border-indigo-100 px-3 py-1.5 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          <span>Document + signer required</span>
        </div>
      </div>

      <div className="w-full space-y-4">
        <DocumentDetailsSection
          documentName={documentName}
          documentFile={documentFile}
          onChangeName={setDocumentName}
          onChangeFile={handleFileChange}
          error={fileError}
        />

        <SignersSection
          signers={signers}
          onChangeSigners={setSigners}
          signingOrder={signingOrder}
          onChangeSigningOrder={setSigningOrder}
        />

        <RecipientsSection
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

      <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-slate-200 w-full p-3 flex items-center justify-between rounded-xl shadow-lg">
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
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <span>Continue to place fields</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
