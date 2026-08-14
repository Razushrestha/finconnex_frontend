import React from "react";

interface DocumentThumbnailProps {
  /** File extension, e.g. "pdf" / "docx". Used only for the small corner badge. */
  extension?: string;
}

export const DocumentThumbnail: React.FC<DocumentThumbnailProps> = ({
  extension,
}) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox="0 0 120 150"
        className="h-full max-h-[140px] w-auto drop-shadow-sm"
      >
        <rect
          x="4"
          y="4"
          width="112"
          height="142"
          rx="6"
          fill="white"
          stroke="#e2e8f0"
          strokeWidth="2"
        />
        {/* logo mark */}
        <rect x="16" y="16" width="14" height="10" rx="2" fill="#6366f1" />
        {/* title line */}
        <rect x="16" y="34" width="60" height="6" rx="2" fill="#334155" />
        {/* body lines */}
        <rect x="16" y="52" width="88" height="4" rx="2" fill="#cbd5e1" />
        <rect x="16" y="61" width="88" height="4" rx="2" fill="#cbd5e1" />
        <rect x="16" y="70" width="60" height="4" rx="2" fill="#cbd5e1" />
        <rect x="16" y="86" width="88" height="4" rx="2" fill="#cbd5e1" />
        <rect x="16" y="95" width="88" height="4" rx="2" fill="#cbd5e1" />
        <rect x="16" y="104" width="40" height="4" rx="2" fill="#cbd5e1" />
        <rect x="16" y="122" width="34" height="4" rx="2" fill="#94a3b8" />
      </svg>
      {extension && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-700 text-white text-[9px] font-bold uppercase tracking-wide">
          {extension}
        </span>
      )}
    </div>
  );
};
