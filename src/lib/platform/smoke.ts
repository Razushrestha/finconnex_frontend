/**
 * Platform console wiring. Run via vitest:
 * src/lib/platform/__tests__/platform.smoke.test.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isPlatformAdminRole } from "@/lib/auth/platform";

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokePlatformWiring() {
  if (!isPlatformAdminRole("ADMIN") || !isPlatformAdminRole("DEVELOPER")) {
    throw new Error("ADMIN and DEVELOPER must be platform admins");
  }
  if (isPlatformAdminRole("USER") || isPlatformAdminRole("OWNER")) {
    throw new Error("workspace OWNER/USER must not be treated as platform admin");
  }

  const login = readSrc("src/app/api/auth/login/route.ts");
  if (!login.includes("isPlatformAdmin")) {
    throw new Error("login route must flag platform admins");
  }
  if (!login.includes("crmListMyWorkspaces")) {
    throw new Error("platform login must not auto-select a tenant");
  }

  const form = readSrc("src/components/auth/LoginForm.tsx");
  if (!form.includes('"/platform"')) {
    throw new Error("LoginForm must send platform admins to /platform");
  }

  const dash = readSrc("src/app/(dashboard)/layout.tsx");
  if (!dash.includes('redirect("/platform")')) {
    throw new Error("dashboard must send workspace-less platform admins to /platform");
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"admin"')) {
    throw new Error("BFF must allow /v1/admin");
  }
  if (!bff.includes("Platform admin access required")) {
    throw new Error("BFF must gate admin routes on globalRole");
  }

  const users = readSrc("src/components/settings/UsersSettingsClient.tsx");
  if (users.includes("deleteAdminUser")) {
    throw new Error("tenant Users settings must not call platform user delete");
  }

  const enter = readSrc("src/lib/admin/api.ts");
  if (!enter.includes("adoptCrmWorkspaceClient")) {
    throw new Error("enterWorkspace must adopt the new CRM browser session");
  }

  const activate = readSrc("src/lib/auth/crm-server.ts");
  if (activate.includes("crmListAdminWorkspaces(accessToken")) {
    throw new Error("activateWorkspace must not fall back to admin workspaces");
  }

  for (const rel of [
    "src/app/(platform)/platform/page.tsx",
    "src/app/(platform)/platform/workspaces/page.tsx",
    "src/app/(platform)/platform/users/page.tsx",
    "src/components/platform/PlatformShell.tsx",
  ]) {
    if (!existsSync(path.join(repoRoot(), rel))) {
      throw new Error(`missing ${rel}`);
    }
  }
}
