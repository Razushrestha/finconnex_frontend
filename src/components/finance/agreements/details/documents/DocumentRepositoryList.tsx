"use client";

import React from "react";
import { FileText, Download, Eye } from "lucide-react";

interface DocumentItem {
  id: string;
  title: string;
  meta: string;
  fileSize: string;
  fileType?: string;
}

interface DocumentRepositoryProps {
  documents?: DocumentItem[];
  onDownload?: (id: string) => void;
  onPreview?: (id: string) => void;
}

export function DocumentRepositoryList({
  documents = [],
  onDownload,
  onPreview,
}: DocumentRepositoryProps) {
  const displayDocs = documents;

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
        Agreement Documents Repository
      </h3>

      {displayDocs.length > 0 ? (
        <div className="space-y-3">
          {displayDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">
                    {doc.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {doc.meta} • {doc.fileSize}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => onPreview?.(doc.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => onDownload?.(doc.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-xs">
          No documents uploaded or generated yet.
        </div>
      )}
    </div>
  );
}
