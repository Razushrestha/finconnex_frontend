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
  Bug,
  Trash2,
} from "lucide-react";
import { DropdownMenu, type DropdownMenuItem } from "./DropdownMenu";

export interface DocumentActionsMenuProps {
  onRecall?: () => void;
  onUploadSignedDocument?: () => void;
  onEmailDocument?: () => void;
  onSaveToCloud?: () => void;
  onDownload?: () => void;
  onEditAsNew?: () => void;
  onSaveAsTemplate?: () => void;
  onChangeOwnership?: () => void;
  onPrint?: () => void;
  onActivityHistory?: () => void;
  onCopyDebugInfo?: () => void;
  onDelete?: () => void;
}

export const DocumentActionsMenu: React.FC<DocumentActionsMenuProps> = ({
  onRecall,
  onUploadSignedDocument,
  onEmailDocument,
  onSaveToCloud,
  onDownload,
  onEditAsNew,
  onSaveAsTemplate,
  onChangeOwnership,
  onPrint,
  onActivityHistory,
  onCopyDebugInfo,
  onDelete,
}) => {
  const items: DropdownMenuItem[] = [
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
      key: "activity-history",
      label: "Activity history",
      icon: History,
      onClick: onActivityHistory,
    },
    {
      key: "copy-debug-info",
      label: "Copy debug info",
      icon: Bug,
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
      items={items}
      trigger={
        <button
          type="button"
          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      }
    />
  );
};
