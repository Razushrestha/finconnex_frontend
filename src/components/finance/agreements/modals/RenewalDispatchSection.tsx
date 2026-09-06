"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";

export function RenewalDispatchSection() {
  const [channels, setChannels] = useState({
    portal: true,
    email: true,
    sms: false,
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground font-semibold text-[11px] flex items-center justify-center">
            3
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Dispatch Channels & Deadlines
          </h3>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          Standard 60-Day Advance Renewal Window
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Authorized Delivery Channels */}
        <div className="space-y-2">
          <span className="text-[11px] font-medium text-muted-foreground block">
            Authorized Delivery Channels
          </span>

          <div
            onClick={() =>
              setChannels({ ...channels, portal: !channels.portal })
            }
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
              channels.portal
                ? "bg-primary/5 border-primary/30"
                : "bg-muted/30 border-border"
            }`}
          >
            <div
              className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${channels.portal ? "bg-primary border-primary text-white" : "border-border bg-card"}`}
            >
              {channels.portal && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                Secure Client Portal & In-App Banner
              </p>
              <p className="text-[10px] text-muted-foreground">
                Instant alert upon next stakeholder login
              </p>
            </div>
          </div>

          <div
            onClick={() => setChannels({ ...channels, email: !channels.email })}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
              channels.email
                ? "bg-primary/5 border-primary/30"
                : "bg-muted/30 border-border"
            }`}
          >
            <div
              className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${channels.email ? "bg-primary border-primary text-white" : "border-border bg-card"}`}
            >
              {channels.email && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                Executive Email + Dynamic E-Sign Packet
              </p>
              <p className="text-[10px] text-muted-foreground">
                Delivers cryptographic signature link to inboxes
              </p>
            </div>
          </div>

          <div
            onClick={() => setChannels({ ...channels, sms: !channels.sms })}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
              channels.sms
                ? "bg-primary/5 border-primary/30"
                : "bg-muted/30 border-border"
            }`}
          >
            <div
              className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${channels.sms ? "bg-primary border-primary text-white" : "border-border bg-card"}`}
            >
              {channels.sms && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                SMS Notification Alert
              </p>
              <p className="text-[10px] text-muted-foreground">
                To mobile +61 412 890 234 (Signatory verification)
              </p>
            </div>
          </div>
        </div>

        {/* Due Date & Reminders */}
        <div className="space-y-3 p-3.5 rounded-xl bg-muted/30 border border-border flex flex-col justify-between">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-foreground block">
              Response / Execution Due Date
            </label>
            <input
              type="date"
              defaultValue="2026-11-30"
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-[10px] text-muted-foreground block">
              Allows 30 days prior to contract expiration for review.
            </span>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-border text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Notice Timing:</span>
              <strong className="text-foreground">Immediate Dispatch</strong>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Auto-Reminders:</span>
              <span className="font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                Every 14 days if unsigned
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
