"use client";

import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  widthClassName = "max-w-sm",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        className={`relative w-full ${widthClassName} bg-white rounded-lg shadow-xl overflow-hidden`}
      >
        <div className="bg-primary px-5 py-3.5">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>

        <div className="px-5 py-5 space-y-4">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
