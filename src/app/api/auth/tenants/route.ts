import { NextResponse } from "next/server";
import { getPublicTenants } from "@/lib/auth/tenants";

export async function GET() {
  return NextResponse.json({ tenants: getPublicTenants() });
}
