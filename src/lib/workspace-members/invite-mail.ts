import { sendCrmActivityEmail } from "@/lib/emails/compose-send";

export async function sendWorkspaceInviteMail(input: {
  to: string;
  name?: string;
  role: string;
  team?: string;
  password?: string;
}): Promise<void> {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const acceptUrl = `${origin}/invite/accept`;
  const loginUrl = `${origin}/login`;
  const who = input.name?.trim() || input.to;
  const teamLine = input.team?.trim()
    ? `Team: ${input.team.trim()}`
    : "";
  await sendCrmActivityEmail({
    to: [input.to],
    subject: "Invitation to join FinConnex",
    body: [
      `Hi ${who},`,
      "",
      `You have been invited to FinConnex as ${input.role}.`,
      teamLine,
      input.password?.trim()
        ? `Temporary password: ${input.password.trim()}`
        : "",
      "",
      "Use the secure invitation link from this workspace if you received one.",
      `You can also open: ${acceptUrl}`,
      `Sign in: ${loginUrl}`,
    ]
      .filter((line) => line !== "")
      .join("\n")
      .replace(/\n{3,}/g, "\n\n"),
  });
}
