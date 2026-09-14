import React from "react";
import {
  ArrowLeft,
  FileSearch,
  Pencil,
  FileCheck2,
  Clock,
  BellRing,
  Settings,
  Award,
  Mail,
  Cloud,
} from "lucide-react";
import { ToolbarButton } from "./ToolbarButton";
import {
  DocumentActionsMenu,
  type DocumentActionsMenuProps,
} from "./DocumentActionMenu";

export type DocumentToolbarMode = "signing" | "completed";

interface DocumentDetailToolbarProps extends DocumentActionsMenuProps {
  mode?: DocumentToolbarMode;
  onBack?: () => void;
  onViewDocument?: () => void;
  onEdit?: () => void;
  onCorrectDocument?: () => void;
  onExtend?: () => void;
  onSendReminder?: () => void;
  onReminderSettings?: () => void;
  onCompletionCertificate?: () => void;
}

export const DocumentDetailToolbar: React.FC<DocumentDetailToolbarProps> = ({
  mode = "signing",
  onBack,
  onViewDocument,
  onEdit,
  onCorrectDocument,
  onExtend,
  onSendReminder,
  onReminderSettings,
  onCompletionCertificate,
  onEmailDocument,
  onSaveToCloud,
  ...actionsMenuProps
}) => {
  return (
    <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-1.5">
      <button
        type="button"
        onClick={onBack}
        className="mr-1 shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1 overflow-x-auto">
        <ToolbarButton
          icon={FileSearch}
          label="View document"
          onClick={onViewDocument}
        />
        <ToolbarButton icon={Pencil} label="Edit" onClick={onEdit} />
        {mode === "completed" ? (
          <>
            <ToolbarButton
              icon={Award}
              label="Completion certificate"
              onClick={onCompletionCertificate}
            />
            <ToolbarButton
              icon={Mail}
              label="Email document"
              onClick={onEmailDocument}
            />
            <ToolbarButton
              icon={Cloud}
              label="Save to cloud"
              onClick={onSaveToCloud}
            />
          </>
        ) : (
          <>
            <ToolbarButton
              icon={FileCheck2}
              label="Correct document"
              onClick={onCorrectDocument}
            />
            <ToolbarButton icon={Clock} label="Extend" onClick={onExtend} />
            <ToolbarButton
              icon={BellRing}
              label="Send reminder"
              onClick={onSendReminder}
            />
            <ToolbarButton
              icon={Settings}
              label="Reminder settings"
              onClick={onReminderSettings}
            />
          </>
        )}
        <DocumentActionsMenu
          mode={mode}
          onEmailDocument={onEmailDocument}
          onSaveToCloud={onSaveToCloud}
          onSendReminder={onSendReminder}
          {...actionsMenuProps}
        />
      </div>
    </div>
  );
};
