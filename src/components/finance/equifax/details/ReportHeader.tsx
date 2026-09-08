import React from "react";
import { ChevronLeft, Download, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReportHeaderProps {
  backLabel?: string;
  onBack?: () => void;
  entityName: string;
  fileType?: string;
  fileRef?: string;
  metaLine?: string;
  pulledLine?: string;
  onDownloadPdf?: () => void;
  onRerunInquiry?: () => void;
}

export default function ReportHeader({
  backLabel = "Back to all credit checks",
  onBack,
  entityName,
  fileType,
  fileRef,
  metaLine,
  pulledLine,
  onDownloadPdf,
  onRerunInquiry,
}: ReportHeaderProps) {
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {backLabel}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onDownloadPdf}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </button>

          <button
            onClick={onRerunInquiry}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Re-run Inquiry
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">
              {entityName}
            </h1>
            {fileType && (
              <Badge
                variant="secondary"
                className="bg-violet-50 text-violet-700 border-violet-200"
              >
                {fileType}
              </Badge>
            )}
            {fileRef && <Badge variant="outline">{fileRef}</Badge>}
          </div>
          {metaLine && (
            <p className="mt-2 text-xs text-slate-500">{metaLine}</p>
          )}
          {pulledLine && (
            <p className="mt-1 text-xs text-slate-400">{pulledLine}</p>
          )}
        </div>
      </div>
    </div>
  );
}
