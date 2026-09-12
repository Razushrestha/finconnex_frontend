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
import { CRM_LEAD_STATUSES, type CrmLeadStatus } from "@/lib/leads/api/types";
import {
  assignableOwnerLabel,
  listAssignableOwnersLocal,
  loadAssignableOwners,
  type AssignableOwner,
} from "@/lib/users/assignable";

export type LeadMassAction =
  | "transfer"
  | "delete"
  | "update"
  | "tags"
  | "assignment-rules"
  | "print";

export type PrintLeadRow = {
  id: string;
  name: string;
  owner: string;
  email: string;
  status?: string;
};

const TITLES: Record<LeadMassAction, string> = {
  transfer: "Mass Transfer",
  delete: "Mass Delete",
  update: "Mass Update",
  tags: "Manage Tags",
  "assignment-rules": "Assignment Rules",
  print: "Print View",
};

type Props = {
  action: LeadMassAction | null;
  onClose: () => void;
  selectedCount: number;
  crmLive: boolean;
  crmLoading: boolean;
  busy?: boolean;
  error?: string | null;
  printRows: PrintLeadRow[];
  onTransfer: (ownerId: string, ownerName: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onUpdate: (status: CrmLeadStatus) => void | Promise<void>;
  onAddTag: (tag: string) => void | Promise<void>;
};

export function LeadBoardMassActionDialog({
  action,
  onClose,
  selectedCount,
  crmLive,
  crmLoading,
  busy = false,
  error,
  printRows,
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
  const [status, setStatus] = useState<CrmLeadStatus>("CONTACTED");
  const [tag, setTag] = useState("");

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
    setStatus("CONTACTED");
  }, [action]);

  const selectedOwner = useMemo(
    () => owners.find((row) => row.id === ownerId),
    [owners, ownerId],
  );

  const blockedReason = !action
    ? null
    : crmLoading
      ? "Still connecting to CRM. Try again in a moment."
      : !crmLive && action !== "print" && action !== "assignment-rules"
        ? "CRM is offline. Reconnect, then try again — this would not sync."
        : action !== "assignment-rules" &&
            action !== "print" &&
            selectedCount === 0
          ? `Select one or more leads on the board, then choose ${TITLES[action]}.`
          : null;

  const canSubmit = !blockedReason && !busy;

  return (
    <Dialog open={Boolean(action)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="lead-mass-action-dialog"
      >
        <DialogTitle>{action ? TITLES[action] : ""}</DialogTitle>
        <DialogDescription>
          {action === "print"
            ? "Print the leads currently on this board."
            : action === "assignment-rules"
              ? "Lead routing is configured in Settings."
              : selectedCount
                ? `${selectedCount} lead${selectedCount === 1 ? "" : "s"} selected.`
                : "No leads selected."}
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
            CRM status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CrmLeadStatus)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-[13px] font-normal"
            >
              {CRM_LEAD_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
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
              placeholder="e.g. vip"
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-[13px] font-normal"
            />
          </label>
        ) : null}

        {action === "delete" && !blockedReason ? (
          <p className="text-[13px] text-slate-600">
            This will soft-delete the selected lead
            {selectedCount === 1 ? "" : "s"} in CRM. You can restore from
            archived records if needed.
          </p>
        ) : null}

        {action === "assignment-rules" ? (
          <p className="text-[13px] text-slate-600">
            Round-robin, territory, and product-based routing live under
            Workflow &amp; Automation.
          </p>
        ) : null}

        {action === "print" ? (
          <div className="max-h-56 overflow-auto rounded-md border border-slate-200">
            {printRows.length === 0 ? (
              <p className="px-3 py-4 text-center text-[13px] text-slate-500">
                No leads to print.
              </p>
            ) : (
              <table className="w-full text-left text-[12px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Lead</th>
                    <th className="px-2 py-1.5 font-medium">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {printRows.slice(0, 50).map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{row.name}</td>
                      <td className="px-2 py-1.5 text-slate-500">{row.owner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {printRows.length > 50 ? (
              <p className="border-t border-slate-100 px-2 py-1.5 text-[11px] text-slate-400">
                Showing 50 of {printRows.length}
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
              disabled={!canSubmit}
              onClick={() => void onUpdate(status)}
            >
              {busy ? "Updating…" : "Update status"}
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
