import React from "react";
import { FileText, Upload, X } from "lucide-react";

interface DocumentDetailsSectionProps {
  documentName: string;
  documentFile: File | null;
  onChangeName: (name: string) => void;
  onChangeFile: (file: File | null) => void;
  error?: string;
}

export const DocumentDetailsSection: React.FC<DocumentDetailsSectionProps> = ({
  documentName,
  documentFile,
  onChangeName,
  onChangeFile,
  error,
}) => {
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
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50/50 transition-colors flex flex-col items-center justify-center gap-3">
          {documentFile ? (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium">
              <FileText className="w-4 h-4" />
              <span>{documentFile.name}</span>
              <button
                type="button"
                onClick={() => onChangeFile(null)}
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
                  or click to browse from library
                </p>
              </div>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                id="file-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  onChangeFile(file);
                  // allow re-selecting the same file later
                  e.target.value = "";
                }}
              />
              <label
                htmlFor="file-upload"
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
              >
                Browse File
              </label>
            </>
          )}
        </div>
        {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
      </div>
    </div>
  );
};
