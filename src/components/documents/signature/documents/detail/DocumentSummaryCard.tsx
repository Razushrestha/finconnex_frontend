// import React from "react";
// import { FileText, Eye } from "lucide-react";
// import { CircularProgress } from "./CircularProgress";

// export interface DocumentSummaryData {
//   name: string;
//   ownerName: string;
//   description?: string;
//   /** Pre-formatted date, e.g. "Sep 13, 2024 08:46" */
//   submittedAtLabel: string;
//   /** Pre-formatted date, e.g. "Sep 13, 2024 08:48" */
//   lastUpdatedAtLabel: string;
//   completionPercent: number;
//   thumbnailUrl?: string;
//   onViewThumbnail?: () => void;
// }

// export const DocumentSummaryCard: React.FC<DocumentSummaryData> = ({
//   name,
//   ownerName,
//   description,
//   submittedAtLabel,
//   lastUpdatedAtLabel,
//   completionPercent,
//   thumbnailUrl,
//   onViewThumbnail,
// }) => {
//   return (
//     <div className="flex items-start justify-between gap-6 flex-wrap">
//       <div className="flex items-start gap-4">
//         <div className="relative w-24 h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group shrink-0">
//           {thumbnailUrl ? (
//             // eslint-disable-next-line @next/next/no-img-element
//             <img
//               src={thumbnailUrl}
//               alt={name}
//               className="w-full h-full object-cover"
//             />
//           ) : (
//             <div className="w-full h-full flex items-center justify-center text-slate-300">
//               <FileText className="w-8 h-8" />
//             </div>
//           )}
//           <button
//             type="button"
//             onClick={onViewThumbnail}
//             className="absolute bottom-0 left-0 right-0 py-1 text-[11px] font-semibold text-white bg-emerald-500/90 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
//           >
//             <Eye className="w-3 h-3" />
//             <span>View</span>
//           </button>
//         </div>

//         <div className="space-y-1 pt-1">
//           <h1 className="text-base font-bold text-slate-900">{name}</h1>
//           <p className="text-xs text-slate-500">Owned by {ownerName}</p>
//           <p className="text-xs text-slate-400">
//             {description || "No description given"}
//           </p>
//           <p className="text-xs text-slate-500">
//             Submitted on {submittedAtLabel}
//           </p>
//           <p className="text-xs text-slate-500">
//             Last updated on {lastUpdatedAtLabel}
//           </p>
//         </div>
//       </div>

//       <CircularProgress percent={completionPercent} />
//     </div>
//   );
// };

"use client";

import React, { useState } from "react";
import { FileText, Eye } from "lucide-react";
import { CircularProgress } from "./CircularProgress";

export interface DocumentSummaryData {
  name: string;
  ownerName: string;
  description?: string;
  /** Pre-formatted date, e.g. "Sep 13, 2024 08:46" */
  submittedAtLabel: string;
  /** Pre-formatted date, e.g. "Sep 13, 2024 08:48" */
  lastUpdatedAtLabel: string;
  completionPercent: number;
  thumbnailUrl?: string;
  documentFileUrl?: string; // Added to support direct PDF/image preview from API if available
  onViewThumbnail?: () => void;
}

export const DocumentSummaryCard: React.FC<DocumentSummaryData> = ({
  name,
  ownerName,
  description,
  submittedAtLabel,
  lastUpdatedAtLabel,
  completionPercent,
  thumbnailUrl,
  documentFileUrl,
  onViewThumbnail,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleViewClick = () => {
    if (onViewThumbnail) {
      onViewThumbnail();
    } else if (documentFileUrl) {
      setIsPreviewOpen(true);
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-6 flex-wrap dark:text-zinc-100">
        <div className="flex items-start gap-4">
          <div className="relative w-24 h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group shrink-0 dark:border-zinc-800 dark:bg-zinc-900">
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                <FileText className="w-8 h-8" />
              </div>
            )}
            <button
              type="button"
              onClick={handleViewClick}
              className="absolute bottom-0 left-0 right-0 py-1 text-[11px] font-semibold text-white bg-emerald-500/90 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Eye className="w-3 h-3" />
              <span>View</span>
            </button>
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              {name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Owned by {ownerName}
            </p>
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              {description || "No description given"}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Submitted on {submittedAtLabel}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Last updated on {lastUpdatedAtLabel}
            </p>
          </div>
        </div>

        <CircularProgress percent={completionPercent} />
      </div>

      {/* Optional Document Modal Previewer if documentFileUrl is passed */}
      {isPreviewOpen && documentFileUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {name} - Preview
              </h3>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="h-8 px-3 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200"
              >
                Close
              </button>
            </div>
            <div className="flex-1 bg-slate-50 dark:bg-zinc-900 p-4 overflow-auto flex items-center justify-center">
              <iframe
                src={documentFileUrl}
                className="w-full h-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white"
                title={name}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
