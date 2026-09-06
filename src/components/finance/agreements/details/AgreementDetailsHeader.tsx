"use client";

import React from "react";
import { ArrowLeft, Send, Pencil } from "lucide-react";
import Link from "next/link";

interface AgreementDetailsHeaderProps {
  onEdit?: () => void;
  onSendNotice?: () => void;
}

export function AgreementDetailsHeader({
  onEdit,
  onSendNotice,
}: AgreementDetailsHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href="/finance/agreements"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onSendNotice}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-card text-foreground border border-border rounded-xl hover:bg-muted transition-all shadow-sm cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-muted-foreground" />
            Send Renewal Notice
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-all shadow-sm cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Agreement
          </button>
        </div>
      </div>
    </div>
  );
}
