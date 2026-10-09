import type {
  SignatureRequest,
  SignatureSigner,
  SignatureStatus,
  SignerStatus,
} from "@/lib/documents/signature/types";

export const DEMO_SIGNATURE_PREFIX = "demo-esign-";

export function isDemoSignatureRequest(row: { id?: string }) {
  return Boolean(row.id?.startsWith(DEMO_SIGNATURE_PREFIX));
}

function atDaysAgo(days: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 20, 0, 0);
  return date;
}

function auDate(date: Date) {
  return date.toLocaleDateString("en-AU");
}

function signer(
  id: string,
  name: string,
  email: string,
  status: SignerStatus,
  order = 1,
): SignatureSigner {
  return {
    id,
    name,
    email,
    order,
    role: "Signer",
    status,
    token: `demo-token-${id}`,
    deliveryMethod: "email",
    colorIndex: (order - 1) % 2,
  };
}

function demo(input: {
  id: string;
  name: string;
  file: string;
  status: SignatureStatus;
  signerStatus: SignerStatus;
  people: { name: string; email: string }[];
  owner: string;
  relatedTo: string;
  daysAgo: number;
  hour: number;
  sent?: boolean;
}): SignatureRequest {
  const when = atDaysAgo(input.daysAgo, input.hour);
  const people = input.people.map((person, index) =>
    signer(
      `${input.id}-s${index + 1}`,
      person.name,
      person.email,
      input.status === "Draft" ? "Pending" : input.signerStatus,
      index + 1,
    ),
  );
  const primary = people[0];
  return {
    id: `${DEMO_SIGNATURE_PREFIX}${input.id}`,
    signatureRequestId: `SR-24${input.id}`,
    documentName: input.name,
    documentFile: input.file,
    recordType: "document",
    signer: primary?.name ?? "",
    signerEmail: primary?.email ?? "",
    signers: people,
    fields: [],
    signingOrder: people.length > 1 ? "sequential" : "parallel",
    relatedTo: input.relatedTo,
    status: input.status,
    sentDate: input.sent ? auDate(when) : undefined,
    sentAt: input.sent ? when.toISOString() : undefined,
    signedDate:
      input.status === "Signed" ? auDate(when) : undefined,
    expiryDate: auDate(
      atDaysAgo(input.status === "Expired" ? input.daysAgo : input.daysAgo - 14, input.hour),
    ),
    createdBy: input.owner,
    manageToken: `demo-manage-${input.id}`,
    updatedAt: when.toISOString(),
    audit: [
      {
        id: `${input.id}-audit`,
        at: when.toISOString(),
        action:
          input.status === "Draft"
            ? "Draft saved"
            : input.status === "Signed"
              ? "Signed"
              : input.status === "Expired"
                ? "Expired"
                : "Sent for signature",
        actor: input.owner,
      },
    ],
  };
}

/** Sample rows for an empty e-signature workspace. */
export function demoSignatureRequests(): SignatureRequest[] {
  return [
    demo({
      id: "02",
      name: "Privacy Consent",
      file: "privacy-consent.pdf",
      status: "Viewed",
      signerStatus: "Viewed",
      people: [{ name: "Olivia Grant", email: "olivia.grant@example.com" }],
      owner: "Nepatronix Web",
      relatedTo: "Lead · Grant refinance",
      daysAgo: 0,
      hour: 8,
      sent: true,
    }),
    demo({
      id: "05",
      name: "Fact Find",
      file: "fact-find.pdf",
      status: "Draft",
      signerStatus: "Pending",
      people: [{ name: "Mia Thompson", email: "mia.thompson@example.com" }],
      owner: "Nepatronix Web",
      relatedTo: "Lead · Thompson first home",
      daysAgo: 0,
      hour: 11,
    }),
    demo({
      id: "01",
      name: "Home Loan Application",
      file: "home-loan-application.pdf",
      status: "Sent",
      signerStatus: "Sent",
      people: [
        { name: "Priya Shah", email: "priya.shah@example.com" },
        { name: "James Cole", email: "james.cole@example.com" },
      ],
      owner: "Amelia Chen",
      relatedTo: "Deal · Patel purchase",
      daysAgo: 1,
      hour: 9,
      sent: true,
    }),
    demo({
      id: "03",
      name: "Credit Guide",
      file: "credit-guide.pdf",
      status: "Signed",
      signerStatus: "Signed",
      people: [{ name: "Sophie Nguyen", email: "sophie.nguyen@example.com" }],
      owner: "Amelia Chen",
      relatedTo: "Contact · Sophie Nguyen",
      daysAgo: 2,
      hour: 15,
      sent: true,
    }),
    demo({
      id: "04",
      name: "Broker Service Agreement",
      file: "broker-service-agreement.pdf",
      status: "Signed",
      signerStatus: "Signed",
      people: [
        { name: "Daniel Brooks", email: "daniel.brooks@example.com" },
        { name: "Harper Lee", email: "harper.lee@example.com" },
      ],
      owner: "James Okonkwo",
      relatedTo: "Deal · Brooks investment",
      daysAgo: 4,
      hour: 11,
      sent: true,
    }),
    demo({
      id: "06",
      name: "Rate Lock Authority",
      file: "rate-lock-authority.pdf",
      status: "Expired",
      signerStatus: "Sent",
      people: [{ name: "Mia Thompson", email: "mia.thompson@example.com" }],
      owner: "Amelia Chen",
      relatedTo: "Deal · Thompson first home",
      daysAgo: 12,
      hour: 16,
      sent: true,
    }),
    demo({
      id: "07",
      name: "Loan Variation Request",
      file: "loan-variation.pdf",
      status: "Declined",
      signerStatus: "Declined",
      people: [{ name: "Ethan Walsh", email: "ethan.walsh@example.com" }],
      owner: "James Okonkwo",
      relatedTo: "Deal · Walsh top-up",
      daysAgo: 6,
      hour: 13,
      sent: true,
    }),
    demo({
      id: "08",
      name: "Offset Account Authority",
      file: "offset-account-authority.pdf",
      status: "Draft",
      signerStatus: "Pending",
      people: [{ name: "Luca Martin", email: "luca.martin@example.com" }],
      owner: "Amelia Chen",
      relatedTo: "Lead · Martin pre-approval",
      daysAgo: 3,
      hour: 10,
    }),
  ];
}
