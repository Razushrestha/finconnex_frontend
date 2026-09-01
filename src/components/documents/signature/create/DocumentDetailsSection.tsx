import React, { useState } from "react";
import { FileText } from "lucide-react";
import { DocumentCard } from "./DocumentCard";
import { DocumentUploadCard } from "./DocumentUploadCard";

export interface AdditionalDocument {
  id: string;
  file: File;
  fileUrl: string;
  name: string;
  extension: string;
}

interface DocumentDetailsSectionProps {
  documentName: string;
  documentFile: File | null;
  documentFileUrl?: string;
  onChangeName: (name: string) => void;
  onChangeFile: (file: File | null, url?: string) => void;
  error?: string;
  additionalFiles?: AdditionalDocument[];
  onChangeAdditionalFiles?: (files: AdditionalDocument[]) => void;
}

const ACCEPTED_TYPES =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Splits "Engagement Letter.pdf" into { base: "Engagement Letter", ext: "pdf" } */
export const splitFileName = (fileName: string) => {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0) return { base: fileName, ext: "" };
  return { base: fileName.slice(0, lastDot), ext: fileName.slice(lastDot + 1) };
};

/** Strip path characters and a trailing extension so the stored title stays clean. */
export function sanitizeDocumentBaseName(raw: string, extension = ""): string {
  let name = raw.trim();
  if (extension) {
    const suffix = `.${extension}`;
    if (name.toLowerCase().endsWith(suffix.toLowerCase())) {
      name = name.slice(0, -suffix.length).trim();
    }
  }
  return name.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
}

/** Display + download name the client receives, e.g. Mohit_TEST_File.pdf */
export function renamedStoredFileName(
  base: string,
  originalFileName: string,
): string {
  const { base: originalBase, ext } = splitFileName(originalFileName);
  const clean = sanitizeDocumentBaseName(base || originalBase, ext);
  const fallback = clean || originalBase || "document";
  return ext ? `${fallback}.${ext}` : fallback;
}

let additionalDocIdCounter = 0;
const nextAdditionalDocId = () =>
  `additional-doc-${Date.now()}-${additionalDocIdCounter++}`;

export const DocumentDetailsSection: React.FC<DocumentDetailsSectionProps> = ({
  documentName,
  documentFile,
  onChangeName,
  onChangeFile,
  error,
  additionalFiles: controlledAdditionalFiles,
  onChangeAdditionalFiles,
}) => {
  const [fileExtension, setFileExtension] = useState("");
  const fileExt =
    fileExtension || (documentFile ? splitFileName(documentFile.name).ext : "");

  const [selectedDocId, setSelectedDocId] = useState<string>("primary");

  const [internalAdditionalFiles, setInternalAdditionalFiles] = useState<
    AdditionalDocument[]
  >([]);
  const additionalFiles = controlledAdditionalFiles ?? internalAdditionalFiles;
  const setAdditionalFiles = (files: AdditionalDocument[]) => {
    if (onChangeAdditionalFiles) {
      onChangeAdditionalFiles(files);
    } else {
      setInternalAdditionalFiles(files);
    }
  };

  const applyPrimaryFile = (file: File) => {
    const { base, ext } = splitFileName(file.name);
    setFileExtension(ext);
    onChangeName(base);

    const fileUrl = URL.createObjectURL(file);
    onChangeFile(file, fileUrl);

    setSelectedDocId("primary");
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
    setAdditionalFiles([...additionalFiles, ...newEntries]);
  };

  // Routes a batch of incoming files (from browse, drop, or cloud import):
  // the first one fills the primary slot if it's empty; everything else —
  // or all of it, if the primary slot is already filled — becomes
  // additional documents.
  const handleIncomingFiles = (files: File[]) => {
    if (files.length === 0) return;
    if (!documentFile) {
      const [first, ...rest] = files;
      applyPrimaryFile(first);
      addAdditionalFiles(rest);
    } else {
      addAdditionalFiles(files);
    }
  };

  const handleRemovePrimary = () => {
    if (additionalFiles.length > 0) {
      const [next, ...rest] = additionalFiles;
      onChangeName(next.name);
      onChangeFile(next.file);
      setFileExtension(next.extension);
      setAdditionalFiles(rest);
    } else {
      setFileExtension("");
      onChangeName("");
      onChangeFile(null);
    }
    setSelectedDocId("primary");
  };

  const handleRemoveAdditionalFile = (id: string) => {
    setAdditionalFiles(additionalFiles.filter((doc) => doc.id !== id));
    if (selectedDocId === id) {
      setSelectedDocId("primary");
    }
  };

  const handleRenamePrimary = (next: string) => {
    const clean = sanitizeDocumentBaseName(next, fileExt);
    if (clean) onChangeName(clean);
  };

  const handleRenameAdditionalFile = (id: string, next: string) => {
    setAdditionalFiles(
      additionalFiles.map((doc) => {
        if (doc.id !== id) return doc;
        const clean = sanitizeDocumentBaseName(next, doc.extension);
        return clean ? { ...doc, name: clean } : doc;
      }),
    );
  };

  const handleImportFromGoogleDrive = () => {
    // TODO: open Google Picker, download selected file(s), then:
    // handleIncomingFiles(downloadedFiles);
    console.warn("Google Drive import not yet wired up.");
  };

  const handleImportFromOneDrive = () => {
    // TODO: open OneDrive picker, download selected file(s), then:
    // handleIncomingFiles(downloadedFiles);
    console.warn("OneDrive import not yet wired up.");
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-center gap-2 text-slate-800 font-semibold">
        <FileText className="w-5 h-5 text-indigo-600" />
        <h2>Document Details</h2>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          Document File <span className="text-rose-500">*</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {documentFile && (
            <DocumentCard
              name={documentName || splitFileName(documentFile.name).base}
              extension={fileExt}
              onRemove={handleRemovePrimary}
              onRename={handleRenamePrimary}
              isSelected={selectedDocId === "primary"}
              onSelect={() => setSelectedDocId("primary")}
            />
          )}

          {additionalFiles.map((doc) => (
            <DocumentCard
              key={doc.id}
              name={doc.name}
              extension={doc.extension}
              onRemove={() => handleRemoveAdditionalFile(doc.id)}
              onRename={(next) => handleRenameAdditionalFile(doc.id, next)}
              isSelected={selectedDocId === doc.id}
              onSelect={() => setSelectedDocId(doc.id)}
            />
          ))}

          <DocumentUploadCard
            accept={ACCEPTED_TYPES}
            onFiles={handleIncomingFiles}
            onImportFromGoogleDrive={handleImportFromGoogleDrive}
            onImportFromOneDrive={handleImportFromOneDrive}
          />
        </div>

        {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
      </div>
    </div>
  );
};
