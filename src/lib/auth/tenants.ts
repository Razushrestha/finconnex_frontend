import "server-only";

import type { AuthTenant, AuthUser } from "./types";

interface TenantRecord extends AuthTenant {
  users: Array<AuthUser & { password: string }>;
}

/** Demo multi-tenant credentials — replace with database lookups in production. */
const TENANTS: TenantRecord[] = [
  {
    id: "tenant_finconnex",
    slug: "finconnex",
    name: "FinConnex HQ",
    users: [
      {
        id: "user_john",
        email: "admin@finconnex.com",
        password: "Admin@123",
        name: "John Smith",
        role: "Manager",
      },
      {
        id: "user_jane",
        email: "jane@finconnex.com",
        password: "Admin@123",
        name: "Jane Doe",
        role: "Sales Lead",
      },
    ],
  },
  {
    id: "tenant_acme",
    slug: "acme-corp",
    name: "Acme Corporation",
    users: [
      {
        id: "user_sarah",
        email: "admin@acme.com",
        password: "Admin@123",
        name: "Sarah Chen",
        role: "Admin",
      },
    ],
  },
  {
    id: "tenant_globex",
    slug: "globex",
    name: "Globex Industries",
    users: [
      {
        id: "user_mike",
        email: "user@globex.com",
        password: "Admin@123",
        name: "Mike Wilson",
        role: "Sales Rep",
      },
    ],
  },
];

export function getPublicTenants(): AuthTenant[] {
  return TENANTS.map(({ id, slug, name }) => ({ id, slug, name }));
}

export function authenticateUser(
  tenantSlug: string,
  email: string,
  password: string,
): { user: AuthUser; tenant: AuthTenant } | null {
  const normalizedSlug = tenantSlug.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  const tenant = TENANTS.find((t) => t.slug === normalizedSlug);
  if (!tenant) return null;

  const user = tenant.users.find(
    (u) => u.email === normalizedEmail && u.password === password,
  );
  if (!user) return null;

  const { password: _, ...safeUser } = user;
  return {
    user: safeUser,
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
  };
}
