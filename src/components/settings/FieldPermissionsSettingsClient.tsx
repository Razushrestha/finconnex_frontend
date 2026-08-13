"use client";

import { useEffect, useState } from "react";
import {
  ROLES,
  getRulesActor,
  listFieldGrants,
  saveFieldGrants,
  SENSITIVE_LEAD_FIELDS,
  type PermissionGrant,
} from "@/lib/rules";

/** Settings → Users & Access → Permissions (field ACL) */
export function FieldPermissionsSettingsClient() {
  const [grants, setGrants] = useState<PermissionGrant[]>(() =>
    listFieldGrants(),
  );
  const [message, setMessage] = useState<string | null>(null);
  const actor = getRulesActor();

  useEffect(() => {
    setGrants(listFieldGrants());
  }, []);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2400);
  }

  function toggle(role: string, resource: string) {
    const list = [...grants];
    const i = list.findIndex((g) => g.role === role && g.resource === resource);
    if (i >= 0) {
      list[i] = { ...list[i]!, allowed: !list[i]!.allowed };
    } else {
      list.unshift({
        id: `fg-${Date.now()}`,
        role: role as PermissionGrant["role"],
        scope: "field",
        resource,
        allowed: false,
      });
    }
    setGrants(saveFieldGrants(list));
    flash("Field grants saved");
  }

  const roles = ROLES.map((r) => r.name).filter(
    (r) => r !== "System Admin" && r !== "Org Admin",
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-[16px] font-bold text-slate-900">
          Field-level permissions
        </h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Hide or allow sensitive lead fields. Org Admin+ always allowed. You
          are{" "}
          <span className="font-semibold text-slate-700">
            {actor.name} ({actor.role})
          </span>
          .
        </p>
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
                    {f.resource}
                  </p>
                </td>
                {roles.map((role) => {
                  const g = grants.find(
                    (x) => x.role === role && x.resource === f.resource,
                  );
                  const allowed =
                    g?.allowed ??
                    (role !== "User" && role !== "Read Only");
                  return (
                    <td key={role} className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggle(role, f.resource)}
                        className={
                          allowed
                            ? "rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
                            : "rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700"
                        }
                      >
                        {allowed ? "Allow" : "Deny"}
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
