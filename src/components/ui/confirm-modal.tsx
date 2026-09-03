"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, Info, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "warning":
        return {
          iconBg: "bg-amber-500/10 text-amber-500",
          icon: <AlertTriangle className="w-5 h-5" />,
          confirmButton: "bg-amber-600 hover:bg-amber-500 text-white",
        };
      case "info":
        return {
          iconBg: "bg-indigo-500/10 text-indigo-500",
          icon: <Info className="w-5 h-5" />,
          confirmButton: "bg-indigo-600 hover:bg-indigo-500 text-white",
        };
      case "danger":
      default:
        return {
          iconBg: "bg-red-500/10 text-red-500",
          icon: <Trash2 className="w-5 h-5" />,
          confirmButton: "bg-red-600 hover:bg-red-500 text-white",
        };
    }
  };

  const styles = getVariantStyles();

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#111827] text-white border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header with Icon & Close button */}
        <div className="flex items-center justify-between">
          <div
            className={`w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center`}
          >
            {styles.icon}
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
          <div className="text-sm text-gray-400 leading-relaxed">
            {description}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={`${styles.confirmButton} font-medium flex items-center gap-2`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
