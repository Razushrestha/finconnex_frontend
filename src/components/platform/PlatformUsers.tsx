"use client";

import { useState, type FormEvent } from "react";
import { deleteAdminUser } from "@/lib/admin/api";
import { isUuid } from "@/lib/activity-timeline/auth";

export function PlatformUsers() {
  const [userId, setUserId] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setNote(null);
    setError(null);
    const id = userId.trim();
    if (!isUuid(id)) {
      setError("Enter the user’s UUID from Nest (User.id).");
      return;
    }
    if (confirm.trim().toUpperCase() !== "DELETE") {
      setError('Type DELETE to confirm. This cannot be undone from the UI.');
      return;
    }
    setBusy(true);
    try {
      await deleteAdminUser(id);
      setNote(`Deleted user ${id}.`);
      setUserId("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Platform users</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Nest does not expose a directory of every user. This page only calls{" "}
          <span className="font-mono text-[12px]">DELETE /v1/admin/user/:id</span>
          . Workspace membership is managed inside each tenant after you enter
          it.
        </p>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4 rounded-3xl border border-rose-100 bg-white p-6 shadow-sm"
      >
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          This removes the global user record, not a single workspace
          membership. Use it only when you already know the UUID.
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">User id</span>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
            className="h-11 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:border-[#5A32A3] focus:ring-2 focus:ring-[#5A32A3]/15"
            disabled={busy}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">
            Type DELETE to confirm
          </span>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
            disabled={busy}
          />
        </label>
        {error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : null}
        {note ? (
          <p className="text-sm text-emerald-700">{note}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 items-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Delete user"}
        </button>
      </form>
    </div>
  );
}
