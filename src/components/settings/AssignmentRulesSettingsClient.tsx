"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  createLeadAssignmentRule,
  deleteLeadAssignmentRule,
  listLeadAssignmentRules,
  reorderLeadAssignmentRules,
  updateLeadAssignmentRule,
} from "@/lib/lead-assignment/api";
import type {
  LeadAssignmentMatchType,
  LeadAssignmentRule,
} from "@/lib/lead-assignment/types";
import { COMPANY_SIZE_OPTIONS } from "@/lib/lead-assignment/types";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";
import type { WorkspaceMember } from "@/lib/workspace-members/types";
import { cn } from "@/lib/utils";

type Draft = {
  name: string;
  matchType: LeadAssignmentMatchType;
  regions: string;
  countries: string;
  postalCodePrefixes: string;
  industries: string;
  companySizes: string[];
  productInterests: string;
  memberUserIds: string[];
  reassignOnInactiveOwner: boolean;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  matchType: "ALL",
  regions: "",
  countries: "",
  postalCodePrefixes: "",
  industries: "",
  companySizes: [],
  productInterests: "",
  memberUserIds: [],
  reassignOnInactiveOwner: true,
};

function csvToList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function listToCsv(value?: string[]): string {
  return (value ?? []).join(", ");
}

function draftFromRule(rule: LeadAssignmentRule): Draft {
  return {
    name: rule.name,
    matchType: rule.matchType,
    regions: listToCsv(rule.matchConfig.regions),
    countries: listToCsv(rule.matchConfig.countries),
    postalCodePrefixes: listToCsv(rule.matchConfig.postalCodePrefixes),
    industries: listToCsv(rule.matchConfig.industries),
    companySizes: rule.matchConfig.companySizes ?? [],
    productInterests: listToCsv(rule.matchConfig.productInterests),
    memberUserIds: rule.memberUserIds,
    reassignOnInactiveOwner: rule.reassignOnInactiveOwner,
  };
}

function draftToPayload(draft: Draft) {
  return {
    name: draft.name.trim(),
    matchType: draft.matchType,
    territoryMatch:
      draft.matchType === "TERRITORY"
        ? {
            regions: csvToList(draft.regions),
            countries: csvToList(draft.countries),
            postalCodePrefixes: csvToList(draft.postalCodePrefixes),
            industries: csvToList(draft.industries),
            companySizes: draft.companySizes,
          }
        : undefined,
    productMatch:
      draft.matchType === "PRODUCT"
        ? { productInterests: csvToList(draft.productInterests) }
        : undefined,
    memberUserIds: draft.memberUserIds,
    reassignOnInactiveOwner: draft.reassignOnInactiveOwner,
  };
}

function matchSummary(rule: LeadAssignmentRule): string {
  if (rule.matchType === "ALL") return "Every lead (catch-all)";
  if (rule.matchType === "TERRITORY") {
    const parts = [
      rule.matchConfig.regions?.length
        ? `regions: ${rule.matchConfig.regions.join(", ")}`
        : null,
      rule.matchConfig.countries?.length
        ? `countries: ${rule.matchConfig.countries.join(", ")}`
        : null,
      rule.matchConfig.postalCodePrefixes?.length
        ? `postcodes: ${rule.matchConfig.postalCodePrefixes.join(", ")}`
        : null,
      rule.matchConfig.industries?.length
        ? `industries: ${rule.matchConfig.industries.join(", ")}`
        : null,
      rule.matchConfig.companySizes?.length
        ? `size: ${rule.matchConfig.companySizes.join(", ")}`
        : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : "No criteria set (never matches)";
  }
  return rule.matchConfig.productInterests?.length
    ? `product: ${rule.matchConfig.productInterests.join(", ")}`
    : "No product set (never matches)";
}

export function AssignmentRulesSettingsClient() {
  const [rules, setRules] = useState<LeadAssignmentRule[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ruleRows, memberRows] = await Promise.all([
        listLeadAssignmentRules(),
        listCrmWorkspaceMembers().catch(() => []),
      ]);
      setRules(ruleRows);
      setMembers(memberRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeMembers = useMemo(
    () => members.filter((m) => m.status !== "Inactive"),
    [members],
  );

  function memberLabel(userId: string): string {
    const member = members.find((m) => m.userId === userId);
    return member ? member.name || member.email : userId;
  }

  function startCreate() {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setCreating(true);
  }

  function startEdit(rule: LeadAssignmentRule) {
    setDraft(draftFromRule(rule));
    setEditingId(rule.id);
    setCreating(false);
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  function toggleMember(userId: string) {
    setDraft((prev) => ({
      ...prev,
      memberUserIds: prev.memberUserIds.includes(userId)
        ? prev.memberUserIds.filter((id) => id !== userId)
        : [...prev.memberUserIds, userId],
    }));
  }

  function toggleCompanySize(size: string) {
    setDraft((prev) => ({
      ...prev,
      companySizes: prev.companySizes.includes(size)
        ? prev.companySizes.filter((s) => s !== size)
        : [...prev.companySizes, size],
    }));
  }

  async function submitDraft() {
    if (!draft.name.trim()) {
      flash("Name is required");
      return;
    }
    if (!draft.memberUserIds.length) {
      flash("Select at least one member for the round-robin pool");
      return;
    }
    setBusy(true);
    try {
      const payload = draftToPayload(draft);
      if (editingId) {
        await updateLeadAssignmentRule(editingId, payload);
        flash("Rule updated");
      } else {
        await createLeadAssignmentRule(payload);
        flash("Rule created");
      }
      cancelForm();
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(rule: LeadAssignmentRule) {
    setBusy(true);
    try {
      await updateLeadAssignmentRule(rule.id, { isActive: !rule.isActive });
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(rule: LeadAssignmentRule) {
    if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
    setBusy(true);
    try {
      await deleteLeadAssignmentRule(rule.id);
      flash("Rule deleted");
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...rules];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRules(next);
    setBusy(true);
    try {
      await reorderLeadAssignmentRules(next.map((r) => r.id));
    } catch (err) {
      flash(err instanceof Error ? err.message : "Reorder failed");
      await load();
    } finally {
      setBusy(false);
    }
  }

  const showForm = creating || editingId !== null;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">
              Lead assignment rules
            </h2>
            <p className="mt-0.5 max-w-xl text-[12px] text-slate-500">
              New leads are routed round-robin through the first matching
              active rule, in the order below. Territory and product rules
              only apply to leads matching their criteria; an &quot;every
              lead&quot; rule is a good catch-all placed last. Deactivating a
              member automatically hands their leads back to the rotation.
            </p>
            {error ? (
              <p className="mt-1 text-[11px] text-rose-600">{error}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              New rule
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-[12px] text-slate-400">
            Loading…
          </div>
        ) : rules.length === 0 ? (
          <div className="px-5 py-8 text-center text-[12px] text-slate-400">
            No assignment rules yet. New leads will stay unowned until you
            create one.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rules.map((rule, index) => (
              <li key={rule.id} className="flex items-start gap-3 px-5 py-4">
                <div className="flex flex-col gap-1 pt-0.5">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => void move(index, -1)}
                    className="rounded border border-slate-200 p-0.5 text-slate-500 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === rules.length - 1}
                    onClick={() => void move(index, 1)}
                    className="rounded border border-slate-200 p-0.5 text-slate-500 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(rule)}
                      className="text-[13px] font-semibold text-slate-900 hover:text-violet-700"
                    >
                      {rule.name}
                    </button>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        rule.matchType === "ALL"
                          ? "bg-slate-100 text-slate-600"
                          : rule.matchType === "TERRITORY"
                            ? "bg-sky-50 text-sky-700"
                            : "bg-amber-50 text-amber-700",
                      )}
                    >
                      {rule.matchType}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleActive(rule)}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        rule.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-400",
                      )}
                    >
                      {rule.isActive ? "Active" : "Paused"}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {matchSummary(rule)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Pool ({rule.memberUserIds.length}):{" "}
                    {rule.memberUserIds.map(memberLabel).join(", ") || "—"}
                  </p>
                  {!rule.reassignOnInactiveOwner ? (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Reassignment on deactivation is off for this rule.
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(rule)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:border-rose-200 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showForm ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="text-[13px] font-bold text-slate-900">
            {editingId ? "Edit rule" : "New rule"}
          </h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">
                Name
              </span>
              <input
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. NSW mortgage leads"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px]"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">
                Match type
              </span>
              <select
                value={draft.matchType}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    matchType: e.target.value as LeadAssignmentMatchType,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px]"
              >
                <option value="ALL">Every lead (catch-all)</option>
                <option value="TERRITORY">Territory</option>
                <option value="PRODUCT">Product interest</option>
              </select>
            </label>
          </div>

          {draft.matchType === "TERRITORY" ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-600">
                  Regions / states (comma-separated)
                </span>
                <input
                  value={draft.regions}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, regions: e.target.value }))
                  }
                  placeholder="NSW, VIC"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-600">
                  Countries (comma-separated)
                </span>
                <input
                  value={draft.countries}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      countries: e.target.value,
                    }))
                  }
                  placeholder="Australia"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-600">
                  Postal code prefixes (comma-separated)
                </span>
                <input
                  value={draft.postalCodePrefixes}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      postalCodePrefixes: e.target.value,
                    }))
                  }
                  placeholder="2000, 2010"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-600">
                  Industries (comma-separated)
                </span>
                <input
                  value={draft.industries}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      industries: e.target.value,
                    }))
                  }
                  placeholder="Healthcare, Retail"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px]"
                />
              </label>
              <div className="sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Company size
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {COMPANY_SIZE_OPTIONS.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleCompanySize(size)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px] font-semibold",
                        draft.companySizes.includes(size)
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-slate-200 text-slate-600",
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {draft.matchType === "PRODUCT" ? (
            <label className="mt-3 block">
              <span className="text-[11px] font-semibold text-slate-600">
                Product interests (comma-separated)
              </span>
              <input
                value={draft.productInterests}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    productInterests: e.target.value,
                  }))
                }
                placeholder="Refinance, First home buyer"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px]"
              />
            </label>
          ) : null}

          <div className="mt-3">
            <span className="text-[11px] font-semibold text-slate-600">
              Round-robin pool
            </span>
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {activeMembers.length === 0 ? (
                <p className="px-1 py-2 text-[11px] text-slate-400">
                  No active workspace members found.
                </p>
              ) : (
                activeMembers.map((member) => (
                  <label
                    key={member.userId}
                    className="flex items-center gap-2 rounded px-1 py-1 text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={draft.memberUserIds.includes(member.userId)}
                      onChange={() => toggleMember(member.userId)}
                    />
                    {member.name || member.email}
                    <span className="text-[10px] text-slate-400">
                      {member.role}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 text-[12px] text-slate-700">
            <input
              type="checkbox"
              checked={draft.reassignOnInactiveOwner}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  reassignOnInactiveOwner: e.target.checked,
                }))
              }
            />
            Automatically reassign this rule&apos;s leads when a pool member
            is deactivated
          </label>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitDraft()}
              className="h-9 rounded-lg bg-violet-600 px-4 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {editingId ? "Save changes" : "Create rule"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="h-9 rounded-lg border border-slate-200 px-4 text-[12px] font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed right-4 bottom-4 rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
