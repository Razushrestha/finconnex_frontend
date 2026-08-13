// import React from "react";
// import { FileText, Upload, X } from "lucide-react";

// interface DocumentDetailsSectionProps {
//   documentName: string;
//   documentFile: File | null;
//   onChangeName: (name: string) => void;
//   onChangeFile: (file: File | null) => void;
//   error?: string;
// }

// export const DocumentDetailsSection: React.FC<DocumentDetailsSectionProps> = ({
//   documentName,
//   documentFile,
//   onChangeName,
//   onChangeFile,
//   error,
// }) => {
//   return (
//     <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
//       <div className="flex items-center gap-2 text-slate-800 font-semibold">
//         <FileText className="w-5 h-5 text-indigo-600" />
//         <h2>Document Details</h2>
//       </div>

//       <div className="space-y-1.5">
//         <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
//           Document Name <span className="text-rose-500">*</span>
//         </label>
//         <input
//           type="text"
//           value={documentName}
//           onChange={(e) => onChangeName(e.target.value)}
//           placeholder="e.g. Enter the title"
//           className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-800 bg-slate-50/50"
//         />
//       </div>

//       <div className="space-y-1.5">
//         <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
//           Document File <span className="text-rose-500">*</span>
//         </label>
//         <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50/50 transition-colors flex flex-col items-center justify-center gap-3">
//           {documentFile ? (
//             <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium">
//               <FileText className="w-4 h-4" />
//               <span>{documentFile.name}</span>
//               <button
//                 type="button"
//                 onClick={() => onChangeFile(null)}
//                 className="p-1 hover:bg-indigo-100 rounded-full transition-colors"
//               >
//                 <X className="w-3.5 h-3.5" />
//               </button>
//             </div>
//           ) : (
//             <>
//               <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
//                 <Upload className="w-5 h-5" />
//               </div>
//               <div>
//                 <p className="text-sm font-medium text-slate-700">
//                   Drag and drop file here
//                 </p>
//                 <p className="text-xs text-slate-400 mt-0.5">
//                   or click to browse from library
//                 </p>
//               </div>
//               <input
//                 type="file"
//                 accept="application/pdf"
//                 className="hidden"
//                 id="file-upload"
//                 onChange={(e) => {
//                   const file = e.target.files?.[0] ?? null;
//                   onChangeFile(file);
//                   // allow re-selecting the same file later
//                   e.target.value = "";
//                 }}
//               />
//               <label
//                 htmlFor="file-upload"
//                 className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
//               >
//                 Browse File
//               </label>
//             </>
//           )}
//         </div>
//         {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
//       </div>
//     </div>
//   );
// };

import React, { useRef, useState } from "react";
import { FileText, Upload, X, Cloud, ChevronDown } from "lucide-react";

interface DocumentDetailsSectionProps {
  documentName: string;
  documentFile: File | null;
  onChangeName: (name: string) => void;
  onChangeFile: (file: File | null) => void;
  error?: string;
}

const ACCEPTED_TYPES =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Splits "Engagement Letter.pdf" into { base: "Engagement Letter", ext: "pdf" } */
const splitFileName = (fileName: string) => {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0) return { base: fileName, ext: "" };
  return { base: fileName.slice(0, lastDot), ext: fileName.slice(lastDot + 1) };
};

export const DocumentDetailsSection: React.FC<DocumentDetailsSectionProps> = ({
  documentName,
  documentFile,
  onChangeName,
  onChangeFile,
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCloudMenuOpen, setIsCloudMenuOpen] = useState(false);
  // Extension of the currently attached file, kept separately so the
  // displayed file name can track edits to the Document Name field.
  const [fileExtension, setFileExtension] = useState("");

  // Applies a newly chosen/dropped/imported file: fills Document Name from
  // the file's name (minus extension) and remembers the extension so the
  // displayed file name stays in sync if the user edits the name field.
  const applyNewFile = (file: File) => {
    const { base, ext } = splitFileName(file.name);
    setFileExtension(ext);
    onChangeName(base);
    onChangeFile(file);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) {
      applyNewFile(file);
    }
  };

  const handleRemoveFile = () => {
    setFileExtension("");
    onChangeFile(null);
  };

  // The name shown next to the file icon: the editable Document Name plus
  // the original file's extension, so renaming the field renames the file.
  const displayFileName = documentFile
    ? fileExtension
      ? `${documentName || documentFile.name}.${fileExtension}`
      : documentName || documentFile.name
    : "";

  // --- Cloud import ---
  // These are stubs. Wire up the real pickers here:
  //   Google Drive -> Google Picker API (needs an API key + OAuth client)
  //   OneDrive     -> OneDrive File Picker SDK (needs an Azure AD app registration)
  // Both should resolve to a File/Blob (download the selected item) and then
  // call applyNewFile(file) the same way local uploads do.
  const handleImportFromGoogleDrive = () => {
    setIsCloudMenuOpen(false);
    // TODO: open Google Picker, download selected file, then:
    // applyNewFile(downloadedFile);
    console.warn("Google Drive import not yet wired up.");
  };

  const handleImportFromOneDrive = () => {
    setIsCloudMenuOpen(false);
    // TODO: open OneDrive picker, download selected file, then:
    // applyNewFile(downloadedFile);
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
          Document Name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={documentName}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="e.g. Enter the title"
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-800 bg-slate-50/50"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          Document File <span className="text-rose-500">*</span>
        </label>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? "border-indigo-400 bg-indigo-50/60"
              : "border-slate-200 hover:bg-slate-50/50"
          }`}
        >
          {documentFile ? (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium">
              <FileText className="w-4 h-4" />
              <span>{displayFileName}</span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1 hover:bg-indigo-100 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Drag and drop file here
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  PDF or Word document
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                id="file-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file) {
                    applyNewFile(file);
                  }
                  // allow re-selecting the same file later
                  e.target.value = "";
                }}
              />

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Upload from computer</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCloudMenuOpen((v) => !v)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Cloud className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Import from cloud</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                        isCloudMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isCloudMenuOpen && (
                    <>
                      {/* click-away layer */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsCloudMenuOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1.5 text-left">
                        <button
                          type="button"
                          onClick={handleImportFromGoogleDrive}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <span className="w-4 h-4 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                              <path
                                fill="#4285F4"
                                d="M7.71 3.5 12 11l4.29-7.5H7.71Z"
                              />
                              <path
                                fill="#34A853"
                                d="m2.5 16.5 4.29 7.5 4.29-7.5H2.5Z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M12 11 7.71 3.5H2.5l4.29 7.5H12Z"
                              />
                              <path
                                fill="#EA4335"
                                d="m16.29 3.5-4.29 7.5 4.29 7.5L21.5 11l-5.21-7.5Z"
                              />
                            </svg>
                          </span>
                          <span>Google Drive</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleImportFromOneDrive}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <span className="w-4 h-4 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                              <path
                                fill="#0364B8"
                                d="M10.5 6.5c2.9 0 5.3 2.1 5.8 4.8h.4c2.1 0 3.8 1.7 3.8 3.8s-1.7 3.8-3.8 3.8H7.2C4.9 19 3 17.1 3 14.7c0-2 1.3-3.7 3.1-4.3.3-2.2 2.2-3.9 4.4-3.9Z"
                              />
                            </svg>
                          </span>
                          <span>OneDrive</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
      </div>
    </div>
  );
};
