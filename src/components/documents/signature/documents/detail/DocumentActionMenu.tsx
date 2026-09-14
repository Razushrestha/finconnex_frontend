import React from "react";
import {
  MoreHorizontal,
  Undo2,
  UploadCloud,
  Mail,
  Cloud,
  Download,
  CopyPlus,
  BookmarkPlus,
  UserCog,
  Printer,
  History,
  ClipboardCopy,
  Trash2,
  ClipboardList,
  Scale,
  BellRing,
} from "lucide-react";
import { DropdownMenu, type DropdownMenuItem } from "./DropdownMenu";

export interface DocumentActionsMenuProps {
  mode?: "signing" | "completed";
  onRecall?: () => void;
  onUploadSignedDocument?: () => void;
  onEmailDocument?: () => void;
  onSaveToCloud?: () => void;
  onDownload?: () => void;
  onEditAsNew?: () => void;
  onSaveAsTemplate?: () => void;
  onChangeOwnership?: () => void;
  onPrint?: () => void;
  onFormData?: () => void;
  onActivityHistory?: () => void;
  onCopyDebugInfo?: () => void;
  onViewLegalDisclosure?: () => void;
  onSendReminder?: () => void;
  onDelete?: () => void;
}

export const DocumentActionsMenu: React.FC<DocumentActionsMenuProps> = ({
  mode = "signing",
  onRecall,
  onUploadSignedDocument,
  onEmailDocument,
  onSaveToCloud,
  onDownload,
  onEditAsNew,
  onSaveAsTemplate,
  onChangeOwnership,
  onPrint,
  onFormData,
  onActivityHistory,
  onCopyDebugInfo,
  onViewLegalDisclosure,
  onSendReminder,
  onDelete,
}) => {
  const completedItems: DropdownMenuItem[] = [
    { key: "download", label: "Download", icon: Download, onClick: onDownload },
    {
      key: "edit-as-new",
      label: "Edit as new",
      icon: CopyPlus,
      onClick: onEditAsNew,
    },
    {
      key: "save-template",
      label: "Save as template",
      icon: BookmarkPlus,
      onClick: onSaveAsTemplate,
    },
    {
      key: "change-ownership",
      label: "Change ownership",
      icon: UserCog,
      onClick: onChangeOwnership,
    },
    { key: "print", label: "Print", icon: Printer, onClick: onPrint },
    {
      key: "form-data",
      label: "Form data",
      icon: ClipboardList,
      onClick: onFormData,
    },
    {
      key: "activity-history",
      label: "Activity history",
      icon: History,
      onClick: onActivityHistory,
    },
    {
      key: "copy-debug-info",
      label: "Copy debug info",
      icon: ClipboardCopy,
      onClick: onCopyDebugInfo,
    },
    {
      key: "legal",
      label: "View legal disclosure",
      icon: Scale,
      onClick: onViewLegalDisclosure,
    },
    {
      key: "delete",
      label: "Delete",
      icon: Trash2,
      onClick: onDelete,
      destructive: true,
    },
  ];

  const signingItems: DropdownMenuItem[] = [
    { key: "recall", label: "Recall", icon: Undo2, onClick: onRecall },
    {
      key: "upload-signed",
      label: "Upload signed document",
      icon: UploadCloud,
      onClick: onUploadSignedDocument,
    },
    {
      key: "email",
      label: "Email document",
      icon: Mail,
      onClick: onEmailDocument,
    },
    {
      key: "save-cloud",
      label: "Save to cloud",
      icon: Cloud,
      onClick: onSaveToCloud,
    },
    { key: "download", label: "Download", icon: Download, onClick: onDownload },
    {
      key: "edit-as-new",
      label: "Edit as new",
      icon: CopyPlus,
      onClick: onEditAsNew,
    },
    {
      key: "save-template",
      label: "Save as template",
      icon: BookmarkPlus,
      onClick: onSaveAsTemplate,
    },
    {
      key: "change-ownership",
      label: "Change ownership",
      icon: UserCog,
      onClick: onChangeOwnership,
    },
    { key: "print", label: "Print", icon: Printer, onClick: onPrint },
    {
      key: "remind",
      label: "Send reminder",
      icon: BellRing,
      onClick: onSendReminder,
    },
    {
      key: "activity-history",
      label: "Activity history",
      icon: History,
      onClick: onActivityHistory,
    },
    {
      key: "copy-debug-info",
      label: "Copy debug info",
      icon: ClipboardCopy,
      onClick: onCopyDebugInfo,
    },
    {
      key: "delete",
      label: "Delete",
      icon: Trash2,
      onClick: onDelete,
      destructive: true,
    },
  ];

  return (
    <DropdownMenu
      align="right"
      items={mode === "completed" ? completedItems : signingItems}
      trigger={
        <button
          type="button"
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label="More actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      }
    />
  );
};
