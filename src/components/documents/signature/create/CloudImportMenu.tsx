import React, { useState } from "react";
import { Cloud, ChevronDown } from "lucide-react";

interface CloudImportMenuProps {
  onImportFromGoogleDrive: () => void;
  onImportFromOneDrive: () => void;
  /** Compact renders just an icon button (used inside the small "add more" trigger). */
  variant?: "default" | "compact";
}

export const CloudImportMenu: React.FC<CloudImportMenuProps> = ({
  onImportFromGoogleDrive,
  onImportFromOneDrive,
  variant = "default",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={
          variant === "compact"
            ? "px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 cursor-pointer shadow-xs flex items-center"
            : "px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs flex items-center gap-1.5 text-center leading-tight"
        }
      >
        {variant === "compact" ? (
          <Cloud className="w-3.5 h-3.5 text-indigo-600" />
        ) : (
          <span>
            Import
            <br />
            from cloud
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* click-away layer */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1.5 text-left">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onImportFromGoogleDrive();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                  <path fill="#4285F4" d="M7.71 3.5 12 11l4.29-7.5H7.71Z" />
                  <path fill="#34A853" d="m2.5 16.5 4.29 7.5 4.29-7.5H2.5Z" />
                  <path fill="#FBBC05" d="M12 11 7.71 3.5H2.5l4.29 7.5H12Z" />
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
              onClick={() => {
                setIsOpen(false);
                onImportFromOneDrive();
              }}
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
  );
};
