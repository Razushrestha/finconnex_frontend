export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
}

function firstName(recipient?: string) {
  const raw = recipient?.trim();
  if (!raw || raw.includes("@")) return "";
  return raw.split(/\s+/)[0] ?? "";
}

function withName(text: string, recipient?: string) {
  const name = firstName(recipient);
  const hi = name || "there";
  return text.replaceAll("{first}", hi).replaceAll("{name}", name || hi);
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "follow-up",
    name: "Follow-up",
    category: "Pipeline",
    subject: "Following up",
    body: `Hi {first},

I wanted to follow up on our last conversation and see if you had any questions. I am happy to walk through next steps whenever it suits you.

Kind regards
FinConnex`,
  },
  {
    id: "intro",
    name: "Introduction",
    category: "New enquiry",
    subject: "Nice to meet you — FinConnex",
    body: `Hi {first},

Nice to meet you, and thank you for connecting with FinConnex. I would like to understand your goals and how we can help.

Are you free for a brief call this week?

Kind regards
FinConnex`,
  },
  {
    id: "meeting-recap",
    name: "Meeting recap",
    category: "Meetings",
    subject: "Recap and next steps",
    body: `Hi {first},

Thank you for your time today. As discussed, the next steps are to confirm documents, review options, and lock in timing. I will follow up if anything is outstanding.

Kind regards
FinConnex`,
  },
  {
    id: "proposal",
    name: "Proposal follow-up",
    category: "Pipeline",
    subject: "Proposal for your review",
    body: `Hi {first},

Please find the proposal we discussed. I have highlighted the recommended structure, timing, and what we would need from you to proceed.

Kind regards
FinConnex`,
  },
  {
    id: "documents",
    name: "Document request",
    category: "Compliance",
    subject: "Documents still needed",
    body: `Hi {first},

To keep your application moving, we still need the outstanding documents. Once received, we can complete the assessment and confirm next steps.

Kind regards
FinConnex`,
  },
  {
    id: "rate-lock",
    name: "Rate lock confirmation",
    category: "Loan",
    subject: "Rate lock confirmation",
    body: `Hi {first},

This confirms the rate lock is in place. Please review the details and reply if anything does not look correct.

Kind regards
FinConnex`,
  },
  {
    id: "pre-approval",
    name: "Pre-approval update",
    category: "Loan",
    subject: "Pre-approval update",
    body: `Hi {first},

Your pre-approval is progressing. I will confirm lender timing once the remaining items are in. Please reply if your purchase timeline has changed.

Kind regards
FinConnex`,
  },
  {
    id: "settlement",
    name: "Settlement reminder",
    category: "Loan",
    subject: "Settlement reminder",
    body: `Hi {first},

This is a reminder of the upcoming settlement. I will confirm the final figures and any last documents required so everything is ready on the day.

Kind regards
FinConnex`,
  },
  {
    id: "thank-you",
    name: "Thank you",
    category: "Relationship",
    subject: "Thank you",
    body: `Hi {first},

Thank you for your time and trust. I am here if anything comes up, and I will keep you updated as we progress.

Kind regards
FinConnex`,
  },
];

export function searchEmailTemplates(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return EMAIL_TEMPLATES;
  return EMAIL_TEMPLATES.filter((item) =>
    `${item.name} ${item.category} ${item.subject} ${item.body}`
      .toLowerCase()
      .includes(q),
  );
}

/** Full replacement HTML for compose. Never merges with the previous draft. */
export function renderEmailTemplateHtml(
  item: EmailTemplate,
  recipientName?: string,
): string {
  const text = withName(item.body, recipientName).trim();
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks
    .map((block) => {
      const escaped = block
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      return `<p>${escaped}</p>`;
    })
    .join("");
}

export function filledTemplateSubject(
  item: EmailTemplate,
  recipientName?: string,
) {
  return withName(item.subject, recipientName);
}
