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
const splitFileName = (fileName: string) => {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0) return { base: fileName, ext: "" };
  return { base: fileName.slice(0, lastDot), ext: fileName.slice(lastDot + 1) };
};

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

  const handleRenameAdditionalFile = (id: string, name: string) => {
    setAdditionalFiles(
      additionalFiles.map((doc) => (doc.id === id ? { ...doc, name } : doc)),
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

  const selectedAdditionalDoc =
    selectedDocId !== "primary"
      ? additionalFiles.find((doc) => doc.id === selectedDocId)
      : undefined;

  const nameFieldValue =
    selectedDocId === "primary"
      ? documentName
      : (selectedAdditionalDoc?.name ?? "");

  const handleNameFieldChange = (value: string) => {
    if (selectedDocId === "primary") {
      onChangeName(value);
    } else if (selectedAdditionalDoc) {
      handleRenameAdditionalFile(selectedAdditionalDoc.id, value);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-center gap-2 text-slate-800 font-semibold">
        <FileText className="w-5 h-5 text-indigo-600" />
        <h2>Document Details</h2>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          Document Name <span className="text-rose-500">*</span>
          {documentFile && additionalFiles.length > 0 && (
            <span className="ml-2 normal-case font-medium text-slate-400 tracking-normal">
              — editing{" "}
              {selectedDocId === "primary"
                ? "primary document"
                : `"${selectedAdditionalDoc?.name ?? ""}"`}
            </span>
          )}
        </label>
        <input
          type="text"
          value={nameFieldValue}
          onChange={(e) => handleNameFieldChange(e.target.value)}
          placeholder="e.g. Enter the title"
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-800 bg-slate-50/50"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          Document File <span className="text-rose-500">*</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {documentFile && (
            <DocumentCard
              name={documentName || documentFile.name}
              extension={fileExtension}
              onRemove={handleRemovePrimary}
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
