"use client";

import React from "react";
import { Shield } from "lucide-react";

interface AuditSigner {
  name: string;
  roleTitle: string;
  statusBadge: string;
  ipAddress: string;
  location: string;
  timestamp: string;
  verificationMethod: string;
}

interface AuditTrailProps {
  auditData?: {
    overallStatus?: string;
    signers?: AuditSigner[];
  };
}

export function ESignatureAuditTrail({ auditData }: AuditTrailProps) {
  const signers = auditData?.signers || [];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            E-Signature Audit Trail
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          {auditData?.overallStatus || "Pending Compliance"}
        </span>
      </div>

      <div className="space-y-3">
        {signers.length > 0 ? (
          signers.map((signer, index) => (
            <div
              key={index}
              className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {signer.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({signer.roleTitle})
                  </span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-500">
                  {signer.statusBadge}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <p>
                  IP: {signer.ipAddress} • {signer.location}
                </p>
                <p>Timestamp: {signer.timestamp}</p>
                <p className="font-mono text-[10px]">
                  Verification: {signer.verificationMethod}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-muted-foreground text-xs italic">
            No e-signature records or audit logs available.
          </div>
        )}
      </div>
    </div>
  );
}
