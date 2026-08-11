/**
 * Lightweight smoke checks for multi-signer signature helpers.
 * Run: npx tsx scripts/smoke-signature.ts
 */
import {
  applySignerViewed,
  buildSignersFromDraft,
  canSignerAccess,
  computeOverallStatus,
  ensureDefaultFields,
  getActiveSigner,
  normalizeSignatureRequest,
  type SignatureRequest,
} from "../src/lib/documents/signature/types";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const signers = buildSignersFromDraft([
  { name: "Alice", email: "a@example.com" },
  { name: "Bob", email: "b@example.com" },
]);

const draft = ensureDefaultFields({
  id: "smoke-1",
  signatureRequestId: "ES-SMOKE",
  documentName: "Smoke Doc",
  documentFile: "smoke.pdf",
  signer: signers[0].name,
  signerEmail: signers[0].email,
  signers,
  fields: [],
  signingOrder: "sequential",
  status: "Draft",
  expiryDate: "01/01/2027",
  createdBy: "Tester",
  manageToken: signers[0].token,
  audit: [],
});

assert(draft.fields.length >= 2, "default fields for both signers");
assert(draft.status === "Draft", "starts draft");

const legacy = normalizeSignatureRequest({
  id: "legacy-1",
  signatureRequestId: "ES-LEGACY",
  documentName: "Legacy Doc",
  documentFile: "legacy.pdf",
  signer: "Legacy User",
  signerEmail: "legacy@example.com",
  signers: [],
  fields: [],
  signingOrder: "sequential",
  status: "Sent",
  expiryDate: "01/01/2027",
  createdBy: "Tester",
  manageToken: "sig-legacy",
  audit: [],
});
assert(legacy.signers.length === 1, "empty signers rebuilds primary");
assert(legacy.signers[0].email === "legacy@example.com", "legacy email");
assert(legacy.fields.length >= 1, "legacy gets default field");

const sentShape: SignatureRequest = {
  ...draft,
  status: "Sent",
  signers: draft.signers.map((s, i) => ({
    ...s,
    status: i === 0 ? "Sent" : "Pending",
  })),
};

assert(getActiveSigner(sentShape)?.name === "Alice", "Alice is active first");
assert(canSignerAccess(sentShape, sentShape.signers[0].id), "Alice can access");
assert(
  !canSignerAccess(sentShape, sentShape.signers[1].id),
  "Bob blocked until Alice signs",
);

const afterAliceView: SignatureRequest = {
  ...sentShape,
  signers: sentShape.signers.map((s, i) =>
    i === 0 ? { ...s, status: "Viewed" } : s,
  ),
};
assert(computeOverallStatus(afterAliceView) === "Viewed", "viewed overall");

const afterAliceSign: SignatureRequest = {
  ...sentShape,
  signers: sentShape.signers.map((s, i) =>
    i === 0
      ? { ...s, status: "Signed", signatureData: "typed:Alice" }
      : { ...s, status: "Sent" },
  ),
};
assert(getActiveSigner(afterAliceSign)?.name === "Bob", "Bob becomes active");
assert(
  canSignerAccess(afterAliceSign, afterAliceSign.signers[1].id),
  "Bob can access",
);
assert(
  computeOverallStatus(afterAliceSign) === "Viewed",
  "partial still in progress",
);

const allSigned: SignatureRequest = {
  ...afterAliceSign,
  signers: afterAliceSign.signers.map((s) => ({
    ...s,
    status: "Signed",
    signatureData: s.signatureData ?? "typed:Bob",
  })),
};
assert(computeOverallStatus(allSigned) === "Signed", "all signed");

const parallel: SignatureRequest = {
  ...sentShape,
  signingOrder: "parallel",
  signers: sentShape.signers.map((s) => ({ ...s, status: "Sent" })),
};
assert(
  canSignerAccess(parallel, parallel.signers[1].id),
  "parallel Bob can access",
);

const alreadyViewed = {
  ...sentShape,
  signers: sentShape.signers.map((s, i) =>
    i === 0 ? { ...s, status: "Viewed" as const } : s,
  ),
  audit: [
    {
      id: "a-view-1",
      at: "01/01/2026",
      action: "Viewed by Alice",
      actor: "Alice",
    },
  ],
};
const viewedAgain = applySignerViewed(
  alreadyViewed,
  alreadyViewed.signers[0].id,
);
assert(
  viewedAgain.audit.length === alreadyViewed.audit.length,
  "no duplicate viewed audit when already viewed",
);

console.log("signature smoke OK");
