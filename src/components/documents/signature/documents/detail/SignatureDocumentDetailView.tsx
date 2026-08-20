"use client";

import React from "react";
import { DocumentDetailToolbar } from "./DocumentDetailToolbar";
import {
  DocumentSummaryCard,
  type DocumentSummaryData,
} from "./DocumentSummaryCard";
import { RecipientStatusSection } from "./RecipientStatusSection";
import type { RecipientStatusData } from "./RecipientStatusRow";
import type { DocumentActionsMenuProps } from "./DocumentActionMenu";

interface SignatureDocumentDetailViewProps extends DocumentActionsMenuProps {
  document: DocumentSummaryData;
  recipients: RecipientStatusData[];
  onBack?: () => void;
  onViewDocument?: () => void;
  onEdit?: () => void;
  onCorrectDocument?: () => void;
  onExtend?: () => void;
  onSendReminder?: () => void;
  onReminderSettings?: () => void;
}

export const SignatureDocumentDetailView: React.FC<
  SignatureDocumentDetailViewProps
> = ({
  document,
  recipients,
  onBack,
  onViewDocument,
  onEdit,
  onCorrectDocument,
  onExtend,
  onSendReminder,
  onReminderSettings,
  ...actionsMenuProps
}) => {
  return (
    <div className="min-h-screen bg-background">
      <DocumentDetailToolbar
        onBack={onBack}
        onViewDocument={onViewDocument}
        onEdit={onEdit}
        onCorrectDocument={onCorrectDocument}
        onExtend={onExtend}
        onSendReminder={onSendReminder}
        onReminderSettings={onReminderSettings}
        {...actionsMenuProps}
      />

      <div className="p-6 space-y-8 w-full">
        <DocumentSummaryCard {...document} />
        <RecipientStatusSection recipients={recipients} />
      </div>
    </div>
  );
};
