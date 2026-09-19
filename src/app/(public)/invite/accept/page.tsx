import { redirect } from "next/navigation";

/** Retired invitation link — see /accept-invitation. */
export default function AcceptWorkspaceInviteRetiredPage() {
  redirect("/login?reason=invitation_retired");
}
