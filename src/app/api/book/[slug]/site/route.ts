import { NextResponse } from "next/server";
import { crmAuthBaseUrl } from "@/lib/auth/public-api";
import {
  callPublicCrm,
  publicBookingSitePath,
} from "@/lib/booking/public-crm";
import {
  crmFailureResponse,
  notConnectedResponse,
  publishedCrmRef,
  rejectForeignRequest,
} from "@/lib/booking/public-crm-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const rejected = rejectForeignRequest(request);
  if (rejected) return rejected;

  const { slug } = await context.params;
  const ref = await publishedCrmRef(slug);
  if (!ref) return notConnectedResponse();

  const result = await callPublicCrm(
    crmAuthBaseUrl(),
    publicBookingSitePath(ref.workspaceSlug),
  );
  if (!result.ok) return crmFailureResponse(result);
  return NextResponse.json(result.data);
}
