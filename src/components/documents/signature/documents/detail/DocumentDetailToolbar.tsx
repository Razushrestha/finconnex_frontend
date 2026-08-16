import React from "react";
import {
  ArrowLeft,
  FileSearch,
  Pencil,
  FileCheck2,
  Clock,
  BellRing,
  Settings,
} from "lucide-react";
import { ToolbarButton } from "./ToolbarButton";
import {
  DocumentActionsMenu,
  type DocumentActionsMenuProps,
} from "./DocumentActionMenu";

interface DocumentDetailToolbarProps extends DocumentActionsMenuProps {
  onBack?: () => void;
  onViewDocument?: () => void;
  onEdit?: () => void;
  onCorrectDocument?: () => void;
  onExtend?: () => void;
  onSendReminder?: () => void;
  onReminderSettings?: () => void;
}

export const DocumentDetailToolbar: React.FC<DocumentDetailToolbarProps> = ({
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
    <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-1.5">
      <button
        type="button"
        onClick={onBack}
        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors mr-1 shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1 overflow-x-auto">
        <ToolbarButton
          icon={FileSearch}
          label="View document"
          onClick={onViewDocument}
        />
        <ToolbarButton icon={Pencil} label="Edit" onClick={onEdit} />
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
        <DocumentActionsMenu {...actionsMenuProps} />
      </div>
    </div>
  );
};
