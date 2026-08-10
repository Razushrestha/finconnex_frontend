"use client";

import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { createAttachment } from "@/lib/attachments/store";
import type { AttachmentKind } from "@/lib/attachments/types";
import { getUploadAdapter } from "@/lib/attachments/upload";
import { createCall } from "@/lib/calls/store";
import { createMeeting } from "@/lib/meetings/store";
import { createNote } from "@/lib/notes/store";
import { createTask } from "@/lib/tasks/store";
import { formatRulesAt } from "@/lib/rules/storage";
import type { DealQuickActionKind } from "@/components/sales/deals/DealRecordCard";

export interface DealQuickActionPanelState {
  type: "quick-action";
  kind: DealQuickActionKind;
  dealId: string;
  dealName: string;
  account: string;
  owner: string;
}

export type DealPanelState = DealQuickActionPanelState;

interface DealCardPanelHostProps {
  panel: DealPanelState | null;
  onClose: () => void;
  onQuickActionSuccess: (message: string) => void;
}

const PANEL_TITLES: Record<DealQuickActionKind, string> = {
  call: "Log a Call",
  email: "Send Email",
  sms: "Send SMS",
  meeting: "Schedule Appointment",
  task: "Create Task",
  note: "Add a Note",
  attachment: "Add Attachment",
};

export function DealCardPanelHost({
  panel,
  onClose,
  onQuickActionSuccess,
}: DealCardPanelHostProps) {
  if (!panel) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative flex h-full w-96 flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {PANEL_TITLES[panel.kind]}
            </h2>
            <p className="text-xs text-slate-500">{panel.dealName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {panel.kind === "attachment" ? (
          <AttachmentForm
            panel={panel}
            onCancel={onClose}
            onSuccess={(message) => {
              onQuickActionSuccess(message);
              onClose();
            }}
          />
        ) : (
          <QuickActionForm
            panel={panel}
            onCancel={onClose}
            onSuccess={(message) => {
              onQuickActionSuccess(message);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}

function guessAttachmentKind(fileName: string): AttachmentKind {
  const lower = fileName.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|heic)$/.test(lower)) return "Image";
  if (/\.(xlsx?|csv)$/.test(lower)) return "Spreadsheet";
  if (/\.(pdf|docx?|txt)$/.test(lower)) return "Document";
  return "Other";
}

function AttachmentForm({
  panel,
  onCancel,
  onSuccess,
}: {
  panel: DealQuickActionPanelState;
  onCancel: () => void;
  onSuccess: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const name = (fileName.trim() || file?.name || "").trim();
    if (!name) {
      setError("Choose a file or enter a file name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const relatedTo = `Deal: ${panel.dealName}`;
      const data = file
        ? await file.arrayBuffer()
        : `deal-card-upload:${name}`;
      const uploaded = await getUploadAdapter().upload({
        fileName: name,
        data,
        contentType: file?.type || "application/octet-stream",
        relatedTo,
      });
      if (!uploaded.ok) {
        setError(uploaded.message);
        return;
      }
      createAttachment({
        fileName: uploaded.fileName,
        kind: guessAttachmentKind(uploaded.fileName),
        relatedTo,
        uploadedBy: panel.owner || "You",
        notes: notes.trim() || undefined,
        sizeLabel: uploaded.sizeLabel,
        storageUrl: uploaded.storageUrl,
        contentType: uploaded.contentType,
        byteSize: uploaded.byteSize,
      });
      onSuccess(`Attachment added to ${panel.dealName}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-between overflow-y-auto px-5 py-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            File
          </label>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              setFile(next);
              if (next) setFileName(next.name);
              setError(null);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-[13px] font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700"
          >
            <Paperclip className="h-4 w-4" />
            {file ? file.name : "Choose file to upload"}
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            File name
          </label>
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="proposal.pdf"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={`Notes about this file for ${panel.dealName}...`}
            className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {error && (
          <p className="text-[12px] font-medium text-rose-600" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy || (!file && !fileName.trim())}
          onClick={() => void handleSubmit()}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Uploading…" : "Add Attachment"}
        </button>
      </div>
    </div>
  );
}

const FIELD_CONFIG: Record<
  Exclude<DealQuickActionKind, "attachment">,
  {
    label: string;
    placeholder: (p: DealQuickActionPanelState) => string;
    successVerb: string;
  }
> = {
  call: {
    label: "Call notes",
    placeholder: (p) => `Notes from your call about ${p.dealName}...`,
    successVerb: "Logged call for",
  },
  email: {
    label: "Message",
    placeholder: (p) => `Write your email regarding ${p.dealName}...`,
    successVerb: "Logged email for",
  },
  sms: {
    label: "Message",
    placeholder: (p) => `Write your SMS regarding ${p.dealName}...`,
    successVerb: "Logged SMS for",
  },
  note: {
    label: "Note",
    placeholder: (p) => `Add a note about ${p.dealName}...`,
    successVerb: "Added note for",
  },
  task: {
    label: "Task",
    placeholder: (p) => `What needs to be done for ${p.dealName}?`,
    successVerb: "Created task for",
  },
  meeting: {
    label: "Details",
    placeholder: (p) => `Appointment details for ${p.dealName}...`,
    successVerb: "Scheduled appointment for",
  },
};

async function persistQuickAction(
  panel: DealQuickActionPanelState,
  value: string,
): Promise<string> {
  const relatedTo = `Deal: ${panel.dealName}`;
  const owner = panel.owner || "You";
  const body = value.trim();

  switch (panel.kind) {
    case "call": {
      createCall({
        subject: body.slice(0, 80) || `Call · ${panel.dealName}`,
        relatedTo,
        contact: panel.account || panel.dealName,
        callType: "Outbound",
        status: "Completed",
        date: formatRulesAt(new Date()),
        assignedTo: owner,
        notes: body || undefined,
      });
      break;
    }
    case "meeting": {
      const start = new Date();
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      createMeeting({
        title: body.slice(0, 80) || `Meeting · ${panel.dealName}`,
        relatedTo,
        type: "Video Call",
        startDateTime: formatRulesAt(start),
        endDateTime: formatRulesAt(end),
        organizer: owner,
        agenda: body || undefined,
      });
      break;
    }
    case "task": {
      createTask({
        title: body.slice(0, 80) || `Follow-up · ${panel.dealName}`,
        taskType: "Follow-up",
        priority: "Medium",
        status: "Not Started",
        dueDate: new Date().toLocaleDateString("en-GB"),
        assignedTo: owner,
        relatedTo: { kind: "Deal", name: panel.dealName },
        notes: body || undefined,
        createdBy: owner,
      });
      break;
    }
    case "note":
    case "email":
    case "sms":
    default: {
      createNote({
        title:
          panel.kind === "note"
            ? body.slice(0, 60) || "Note"
            : `${PANEL_TITLES[panel.kind]} · ${panel.dealName}`,
        body,
        relatedTo,
        noteType: "General",
        createdBy: owner,
      });
      break;
    }
  }

  return `${FIELD_CONFIG[panel.kind as Exclude<DealQuickActionKind, "attachment">].successVerb} ${panel.dealName}`;
}

function QuickActionForm({
  panel,
  onCancel,
  onSuccess,
}: {
  panel: DealQuickActionPanelState;
  onCancel: () => void;
  onSuccess: (message: string) => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kind = panel.kind as Exclude<DealQuickActionKind, "attachment">;
  const config = FIELD_CONFIG[kind];

  return (
    <div className="flex flex-1 flex-col justify-between overflow-y-auto px-5 py-5">
      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {config.label}
        </label>
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          placeholder={config.placeholder(panel)}
          className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
        {error && (
          <p className="text-[12px] font-medium text-rose-600" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy || !value.trim()}
          onClick={() => {
            setBusy(true);
            void persistQuickAction(panel, value)
              .then(onSuccess)
              .catch((e) =>
                setError(e instanceof Error ? e.message : "Something went wrong"),
              )
              .finally(() => setBusy(false));
          }}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {PANEL_TITLES[panel.kind]}
        </button>
      </div>
    </div>
  );
}
