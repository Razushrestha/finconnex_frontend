import React, { useRef, useState } from "react";
import { FileStack } from "lucide-react";
import { CloudImportMenu } from "./CloudImportMenu";

interface DocumentUploadCardProps {
  onFiles: (files: File[]) => void;
  onImportFromGoogleDrive: () => void;
  onImportFromOneDrive: () => void;
  accept: string;
}

export const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  onFiles,
  onImportFromGoogleDrive,
  onImportFromOneDrive,
  accept,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    onFiles(Array.from(e.dataTransfer.files ?? []));
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`min-h-[150px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 p-4 text-center transition-colors ${
        isDragging
          ? "border-indigo-400 bg-indigo-50/60"
          : "border-slate-200 hover:bg-slate-50/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      <FileStack className="w-8 h-8 text-slate-300" />
      <p className="text-base font-medium text-slate-700">Drag files here</p>
      <p className="text-xs text-slate-400">or</p>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
        >
          Upload
          <br />
          from computer
        </button>
        <CloudImportMenu
          onImportFromGoogleDrive={onImportFromGoogleDrive}
          onImportFromOneDrive={onImportFromOneDrive}
        />
      </div>
    </div>
  );
};
