"use client";

import { useEffect, useState } from "react";
import {
  ROLES,
  SENSITIVE_LEAD_FIELDS,
} from "@/lib/rules";
import {
  deleteCrmFieldPermission,
  FIELD_RESOURCE_TO_CRM,
  listCrmFieldPermissions,
  tryCrmFieldPermissions,
  UI_ROLE_TO_CRM,
  upsertCrmFieldPermission,
  type CrmFieldPermission,
  type CrmWorkspaceRole,
} from "@/lib/settings/field-permissions-api";
import { cn } from "@/lib/utils";

/** Settings → Users & Access → Permissions (field ACL) */
export function FieldPermissionsSettingsClient() {
  const [rows, setRows] = useState<CrmFieldPermission[]>([]);
  const [source, setSource] = useState<"api" | "demo">("demo");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const roles = ROLES.map((r) => r.name).filter(
    (r) => UI_ROLE_TO_CRM[r],
  );

  async function refresh() {
    const remote = await tryCrmFieldPermissions(() =>
      listCrmFieldPermissions("LEAD"),
    );
    if (remote) {
      setRows(remote);
      setSource("api");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2400);
  }

  function allowed(role: string, resource: string) {
    const crmRole = UI_ROLE_TO_CRM[role as keyof typeof UI_ROLE_TO_CRM];
    const fieldName = FIELD_RESOURCE_TO_CRM[resource];
    if (!crmRole || !fieldName) return true;
    const hit = rows.find(
      (row) => row.role === crmRole && row.fieldName === fieldName,
    );
    if (!hit) return true;
    return hit.canRead !== false;
  }

  async function toggle(role: string, resource: string) {
    const crmRole = UI_ROLE_TO_CRM[role as keyof typeof UI_ROLE_TO_CRM];
    const fieldName = FIELD_RESOURCE_TO_CRM[resource];
    if (!crmRole || !fieldName) return;
    const currently = allowed(role, resource);
    setBusy(true);
    try {
      if (currently) {
        const saved = await upsertCrmFieldPermission({
          entityType: "LEAD",
          fieldName,
          role: crmRole as CrmWorkspaceRole,
          canRead: false,
          canWrite: false,
        });
        setRows((list) => {
          const next = list.filter(
            (row) => !(row.role === crmRole && row.fieldName === fieldName),
          );
          next.push(saved);
          return next;
        });
        setSource("api");
        flash("Field hidden for this role");
      } else {
        const hit = rows.find(
          (row) => row.role === crmRole && row.fieldName === fieldName,
        );
        if (hit?.id) await deleteCrmFieldPermission(hit.id);
        setRows((list) =>
          list.filter(
            (row) => !(row.role === crmRole && row.fieldName === fieldName),
          ),
        );
        flash("Field restored for this role");
      }
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not update field ACL");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-[16px] font-bold text-slate-900">
          Field-level permissions
        </h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          PUT /v1/field-permissions. OWNER and ADMIN are never restricted. No
          row means the field is visible.
        </p>
        <span
          className={cn(
            "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
            source === "api"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {source === "api" ? "Live CRM" : "Not loaded"}
        </span>
        {message ? (
          <p className="mt-2 text-[12px] font-medium text-violet-700">{message}</p>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[12px]">
          <thead className="bg-slate-50 text-[10px] tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Field</th>
              {roles.map((r) => (
                <th key={r} className="px-3 py-2.5 font-semibold">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {SENSITIVE_LEAD_FIELDS.map((f) => (
              <tr key={f.resource}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800">{f.label}</p>
                  <p className="font-mono text-[10px] text-slate-400">
                    {FIELD_RESOURCE_TO_CRM[f.resource] ?? f.resource}
                  </p>
                </td>
                {roles.map((role) => {
                  const on = allowed(role, f.resource);
                  return (
                    <td key={role} className="px-3 py-3">
                      <button
                        type="button"
                        disabled={busy || source !== "api"}
                        onClick={() => void toggle(role, f.resource)}
                        className={
                          on
                            ? "rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 disabled:opacity-50"
                            : "rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 disabled:opacity-50"
                        }
                      >
                        {on ? "Allow" : "Deny"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
