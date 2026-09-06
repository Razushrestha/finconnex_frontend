"use client";

import React from "react";
import { X, Sparkles } from "lucide-react";
import { RenewalRecipientsSection } from "./RenewalRecipientsSection";
import { RenewalTermsSection } from "./RenewalTermsSection";
import { RenewalDispatchSection } from "./RenewalDispatchSection";
import { RenewalMessagePreviewSection } from "./RenewalMessagePreviewSection";

interface SendRenewalNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend?: () => void;
}

export function SendRenewalNoticeModal({
  isOpen,
  onClose,
  onSend,
}: SendRenewalNoticeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-background border border-border rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Send Agreement Renewal Notice
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  Contract Ref: AGR-2026-01
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Prepare and dispatch automated contract renewal terms, rate
                adjustments, and updated SLA documentation to client
                stakeholders.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          <RenewalRecipientsSection />
          <RenewalTermsSection />
          <RenewalDispatchSection />
          <RenewalMessagePreviewSection />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <button
            type="button"
            className="px-4 py-2 text-xs font-medium bg-card text-foreground border border-border rounded-xl hover:bg-muted transition-all cursor-pointer"
          >
            Save Template Draft
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSend}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Send Renewal Notice & E-Sign Invite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
