"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  assignableOwnerLabel,
  listAssignableOwnersLocal,
  loadAssignableOwners,
  type AssignableOwner,
} from "@/lib/users/assignable";

export type ActivityMassAction =
  | "transfer"
  | "delete"
  | "update"
  | "tags"
  | "assignment-rules"
  | "print";

export type PrintActivityRow = {
  id: string;
  name: string;
  owner: string;
  status?: string;
};

const TITLES: Record<ActivityMassAction, string> = {
  transfer: "Mass Transfer",
  delete: "Mass Delete",
  update: "Mass Update",
  tags: "Manage Tags",
  "assignment-rules": "Assignment Rules",
  print: "Print View",
};

type Props = {
  action: ActivityMassAction | null;
  entityLabel: string;
  onClose: () => void;
  selectedCount: number;
  busy?: boolean;
  error?: string | null;
  statusOptions: readonly string[];
  printRows: PrintActivityRow[];
  printHint?: string;
  onTransfer: (ownerId: string, ownerName: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onUpdate: (status: string) => void | Promise<void>;
  onAddTag: (tag: string) => void | Promise<void>;
};

export function ActivityMassActionDialog({
  action,
  entityLabel,
  onClose,
  selectedCount,
  busy = false,
  error,
  statusOptions,
  printRows,
  printHint,
  onTransfer,
  onDelete,
  onUpdate,
  onAddTag,
}: Props) {
  const router = useRouter();
  const [owners, setOwners] = useState<AssignableOwner[]>(
    listAssignableOwnersLocal,
  );
  const [ownerId, setOwnerId] = useState("");
  const [status, setStatus] = useState(statusOptions[0] ?? "");
  const [tag, setTag] = useState("");

  const noun = entityLabel.toLowerCase();
  const nouns = selectedCount === 1 ? noun : `${noun}s`;

  useEffect(() => {
    if (action !== "transfer") return;
    const local = listAssignableOwnersLocal();
    setOwners(local);
    setOwnerId((current) => current || local[0]?.id || "");
    void loadAssignableOwners().then((rows) => {
      setOwners(rows);
      setOwnerId((current) =>
        rows.some((row) => row.id === current) ? current : rows[0]?.id || "",
      );
    });
  }, [action]);

  useEffect(() => {
    if (!action) return;
    setTag("");
    setStatus(statusOptions[0] ?? "");
  }, [action, statusOptions]);

  const selectedOwner = useMemo(
    () => owners.find((row) => row.id === ownerId),
    [owners, ownerId],
  );

  const needsSelection =
    action !== null &&
    action !== "assignment-rules" &&
    action !== "print" &&
    selectedCount === 0;

  const blockedReason = needsSelection
    ? `Select one or more ${noun}s, then choose ${TITLES[action]}.`
    : null;

  const canSubmit = !blockedReason && !busy;

  return (
    <Dialog open={Boolean(action)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="activity-mass-action-dialog"
      >
        <DialogTitle>{action ? TITLES[action] : ""}</DialogTitle>
        <DialogDescription>
          {action === "print"
            ? printHint || `Print the ${noun}s currently on this board.`
            : action === "assignment-rules"
              ? "Routing is configured in Settings."
              : selectedCount
                ? `${selectedCount} ${nouns} selected.`
                : `No ${noun}s selected.`}
        </DialogDescription>

        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">
            {error}
          </p>
        ) : null}

        {blockedReason ? (
          <p
            role="alert"
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900"
          >
            {blockedReason}
          </p>
        ) : null}

        {action === "transfer" && !blockedReason ? (
          <label className="grid gap-1.5 text-[13px] font-medium text-slate-700">
            New owner
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-[13px] font-normal"
            >
              {owners.length === 0 ? (
                <option value="">No workspace members found</option>
              ) : (
                owners.map((row) => (
                  <option key={row.id} value={row.id}>
                    {assignableOwnerLabel(row)}
                  </option>
                ))
              )}
            </select>
          </label>
        ) : null}

        {action === "update" && !blockedReason ? (
          <label className="grid gap-1.5 text-[13px] font-medium text-slate-700">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-[13px] font-normal"
            >
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {action === "tags" && !blockedReason ? (
          <label className="grid gap-1.5 text-[13px] font-medium text-slate-700">
            Tag to add
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. follow-up"
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-[13px] font-normal"
            />
            <span className="font-normal text-[12px] text-slate-500">
              Saved on the call notes as a Tags line so it stays on the existing
              CRM fields.
            </span>
          </label>
        ) : null}

        {action === "delete" && !blockedReason ? (
          <p className="text-[13px] text-slate-600">
            This will delete the selected {nouns}. This cannot be undone.
          </p>
        ) : null}

        {action === "assignment-rules" ? (
          <p className="text-[13px] text-slate-600">
            Round-robin, territory, and product-based routing live under
            Workflow &amp; Automation.
          </p>
        ) : null}

        {action === "print" ? (
          <div className="max-h-56 overflow-auto rounded-md border border-slate-200 print:max-h-none">
            {printRows.length === 0 ? (
              <p className="px-3 py-4 text-center text-[13px] text-slate-500">
                No {noun}s to print.
              </p>
            ) : (
              <table className="w-full text-left text-[12px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">
                      {entityLabel}
                    </th>
                    <th className="px-2 py-1.5 font-medium">Owner</th>
                    <th className="px-2 py-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {printRows.slice(0, 80).map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{row.name}</td>
                      <td className="px-2 py-1.5 text-slate-500">{row.owner}</td>
                      <td className="px-2 py-1.5 text-slate-500">
                        {row.status ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {printRows.length > 80 ? (
              <p className="border-t border-slate-100 px-2 py-1.5 text-[11px] text-slate-400">
                Showing 80 of {printRows.length}
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {action === "assignment-rules" ? (
            <Button
              type="button"
              onClick={() => {
                router.push(
                  "/settings/workflow-and-automation/assignment-rules",
                );
                onClose();
              }}
            >
              Open assignment rules
            </Button>
          ) : null}
          {action === "print" ? (
            <Button
              type="button"
              disabled={printRows.length === 0}
              onClick={() => window.print()}
            >
              Print
            </Button>
          ) : null}
          {action === "transfer" ? (
            <Button
              type="button"
              disabled={!canSubmit || !ownerId}
              onClick={() =>
                void onTransfer(ownerId, selectedOwner?.name || ownerId)
              }
            >
              {busy ? "Transferring…" : "Transfer"}
            </Button>
          ) : null}
          {action === "delete" ? (
            <Button
              type="button"
              variant="destructive"
              disabled={!canSubmit}
              onClick={() => void onDelete()}
            >
              {busy ? "Deleting…" : "Delete"}
            </Button>
          ) : null}
          {action === "update" ? (
            <Button
              type="button"
              disabled={!canSubmit || !status}
              onClick={() => void onUpdate(status)}
            >
              {busy ? "Updating…" : "Update"}
            </Button>
          ) : null}
          {action === "tags" ? (
            <Button
              type="button"
              disabled={!canSubmit || !tag.trim()}
              onClick={() => void onAddTag(tag.trim())}
            >
              {busy ? "Saving…" : "Add tag"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
