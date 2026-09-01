export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "follow-up",
    name: "Follow-up",
    category: "Pipeline",
    subject: "Following up",
    body: "I wanted to follow up on our last conversation and see if you had any questions. I am happy to walk through next steps whenever it suits you.",
  },
  {
    id: "intro",
    name: "Introduction",
    category: "New enquiry",
    subject: "Nice to meet you — FinConnex",
    body: "Thank you for getting in touch. I would like to understand your goals and outline a clear path forward. Are you free for a brief call this week?",
  },
  {
    id: "meeting-recap",
    name: "Meeting recap",
    category: "Meetings",
    subject: "Recap and next steps",
    body: "Thank you for your time today. As discussed, the next steps are to confirm documents, review options, and lock in timing. I will follow up if anything is outstanding.",
  },
  {
    id: "proposal",
    name: "Proposal follow-up",
    category: "Pipeline",
    subject: "Proposal for your review",
    body: "Please find the proposal we discussed. I have highlighted the recommended structure, timing, and what we would need from you to proceed.",
  },
  {
    id: "documents",
    name: "Document request",
    category: "Compliance",
    subject: "Documents still needed",
    body: "To keep your application moving, we still need the outstanding documents. Once received, we can complete the assessment and confirm next steps.",
  },
  {
    id: "rate-lock",
    name: "Rate lock confirmation",
    category: "Loan",
    subject: "Rate lock confirmation",
    body: "This confirms the rate lock is in place. Please review the details and reply if anything does not look correct.",
  },
  {
    id: "pre-approval",
    name: "Pre-approval update",
    category: "Loan",
    subject: "Pre-approval update",
    body: "Your pre-approval is progressing. I will confirm lender timing once the remaining items are in. Please reply if your purchase timeline has changed.",
  },
  {
    id: "settlement",
    name: "Settlement reminder",
    category: "Loan",
    subject: "Settlement reminder",
    body: "This is a reminder of the upcoming settlement. I will confirm the final figures and any last documents required so everything is ready on the day.",
  },
  {
    id: "thank-you",
    name: "Thank you",
    category: "Relationship",
    subject: "Thank you",
    body: "Thank you for your time and trust. I am here if anything comes up, and I will keep you updated as we progress.",
  },
];

export function searchEmailTemplates(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return EMAIL_TEMPLATES;
  return EMAIL_TEMPLATES.filter((item) =>
    `${item.name} ${item.category} ${item.subject} ${item.body}`.toLowerCase().includes(q),
  );
}
