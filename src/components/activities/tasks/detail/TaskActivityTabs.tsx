"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

export function TaskActivityTabs() {
  const [activeTab, setActiveTab] = useState<
    "notes" | "attachments" | "emails"
  >("notes");
  const [newNote, setNewNote] = useState("");

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-6 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`text-xs font-medium pb-1 relative transition-colors ${activeTab === "notes" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
        >
          Notes (1)
          {activeTab === "notes" && (
            <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("attachments")}
          className={`text-xs font-medium pb-1 relative transition-colors ${activeTab === "attachments" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
        >
          Attachments (2)
          {activeTab === "attachments" && (
            <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("emails")}
          className={`text-xs font-medium pb-1 relative transition-colors ${activeTab === "emails" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
        >
          Emails
          {activeTab === "emails" && (
            <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {activeTab === "notes" && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground">
            Client confirmed the Q3 targets during the morning sync. Need to
            ensure the churn metrics account for the recent platform update.
          </div>
          <div className="space-y-2">
            <textarea
              rows={3}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setNewNote("")}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "attachments" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <FileText className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                Financial_Model_Q3.xlsx
              </p>
              <p className="text-[10px] text-muted-foreground">
                2.4 MB • Uploaded Today
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <FileText className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                Strategy_Deck.pdf
              </p>
              <p className="text-[10px] text-muted-foreground">
                5.1 MB • Uploaded Yesterday
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "emails" && (
        <div className="mt-4 text-center py-6 text-xs text-muted-foreground">
          No emails linked to this task yet.
        </div>
      )}
    </div>
  );
}
