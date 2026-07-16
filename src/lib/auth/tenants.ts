import "server-only";

import type { AuthTenant, AuthUser } from "./types";

const DEFAULT_TENANT: AuthTenant = {
  id: "tenant_finconnex",
  slug: "finconnex",
  name: "FinConnex HQ",
};

const DEFAULT_USER: AuthUser = {
  id: "user_john",
  email: "admin@finconnex.com",
  name: "John Smith",
  role: "Manager",
};

export function getDefaultSession(): { user: AuthUser; tenant: AuthTenant } {
  return {
    user: DEFAULT_USER,
    tenant: DEFAULT_TENANT,
  };
}
