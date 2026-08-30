// "use client";

// import { useEffect, useState } from "react";
// import {
//   applySignerDecline,
//   applySignerSignature,
//   applySignerViewed,
//   canSignerAccess,
//   DEMO_SIGNER_IP,
//   getSignatureByToken,
//   type SignatureField,
//   type SignatureRequest,
//   type SignatureSigner,
// } from "@/lib/documents/signature/types";
// import { syncQuotationFromSignature } from "@/lib/finance/quotations/signatureBridge";
// import { persistSignedPackage } from "@/lib/documents/signed-artifacts";
// import { SignatureDocPreview } from "./SignatureDocPreview";
// import { SignatureModal } from "./SignatureModal";
// import { CheckCircle2, Clock, PenLine, Sparkles, Send, ShieldCheck, X, AlertCircle } from "lucide-react";
// import { cn } from "@/lib/utils";

// export function PublicSignClient({ token }: { token: string }) {
//   const [req, setReq] = useState<SignatureRequest | null>(null);
//   const [signer, setSigner] = useState<SignatureSigner | null>(null);
//   const [hydrated, setHydrated] = useState(false);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [pendingSignatureData, setPendingSignatureData] = useState<string | null>(null);

//   // Top Consent & Disclosure state
//   const [hasAgreedConsent, setHasAgreedConsent] = useState(false);
//   const [isDisclosureModalOpen, setIsDisclosureModalOpen] = useState(false);
//   const [consentError, setConsentError] = useState(false);

//   useEffect(() => {
//     const hit = getSignatureByToken(token);
//     if (!hit) {
//       setReq(null);
//       setSigner(null);
//       setHydrated(true);
//       return;
//     }

//     let liveReq = hit.request;
//     let liveSigner = hit.signer;

//     if (
//       liveReq.status !== "Draft" &&
//       liveReq.status !== "Cancelled" &&
//       liveReq.status !== "Expired" &&
//       liveSigner.status !== "Signed" &&
//       liveSigner.status !== "Declined" &&
//       canSignerAccess(liveReq, liveSigner.id)
//     ) {
//       liveReq = applySignerViewed(liveReq, liveSigner.id);
//       liveSigner =
//         liveReq.signers.find((s) => s.id === liveSigner.id) ?? liveSigner;
//     }

//     setReq(liveReq);
//     setSigner(liveSigner);
//     setHydrated(true);
//   }, [token]);

//   function afterPersist(next: SignatureRequest) {
//     setReq(next);
//     const nextSigner = next.signers.find((s) => s.id === signer?.id) ?? signer;
//     setSigner(nextSigner);
//     if (next.status === "Signed" || next.status === "Declined") {
//       syncQuotationFromSignature(next);
//     }
//     if (next.status === "Signed") {
//       persistSignedPackage(next);
//     }
//   }

//   function handleSaveSignature(signatureData: string) {
//     if (!req || !signer) return;
//     const today = new Date().toLocaleDateString("en-GB");

//     // Display signature and auto-update date fields live ONLY for fields assigned to current signer
//     const updatedFields = req.fields.map((f) => {
//       if (f.signerId !== signer.id) return f;

//       const isDateKind =
//         f.kind === "date" ||
//         (f as any).kind === "sign_date" ||
//         f.label?.toLowerCase().includes("date");
//       const isSigKind =
//         f.kind === "signature" ||
//         f.kind === "initials" ||
//         (f as any).kind === "sign" ||
//         f.label?.toLowerCase().includes("signature");
//       const isNameKind =
//         f.kind === "name" || f.label?.toLowerCase().includes("name");

//       if (isSigKind) {
//         return { ...f, value: signatureData };
//       }
//       if (isDateKind) {
//         return { ...f, value: today };
//       }
//       if (isNameKind) {
//         return { ...f, value: signer.name };
//       }
//       return f;
//     });

//     setReq({ ...req, fields: updatedFields });
//     setPendingSignatureData(signatureData);
//   }

//   function handleFinalSubmit() {
//     if (!req || !signer || !pendingSignatureData) return;
//     if (!hasAgreedConsent) {
//       setConsentError(true);
//       return;
//     }
//     const next = applySignerSignature(req, signer.id, pendingSignatureData);
//     afterPersist(next);
//   }

//   function handleFieldClick(fieldId: string) {
//     if (!req || !signer) return;
//     const targetField = req.fields.find((f) => f.id === fieldId);
//     if (!targetField) return;

//     // Do not allow editing another signer's fields
//     if (targetField.signerId !== signer.id) return;

//     if (!hasAgreedConsent) {
//       setConsentError(true);
//       return;
//     }

//     const isDateKind =
//       targetField.kind === "date" ||
//       (targetField as any).kind === "sign_date" ||
//       targetField.label?.toLowerCase().includes("date");

//     if (isDateKind) {
//       // Auto-fill exact date for current signer's date fields only
//       const today = new Date().toLocaleDateString("en-GB");
//       const updatedFields = req.fields.map((f) =>
//         f.signerId === signer.id &&
//         (f.id === fieldId ||
//           f.kind === "date" ||
//           (f as any).kind === "sign_date" ||
//           f.label?.toLowerCase().includes("date"))
//           ? { ...f, value: today }
//           : f,
//       );
//       setReq({ ...req, fields: updatedFields });
//     } else {
//       // Open signature modal for signature or initials fields
//       setIsModalOpen(true);
//     }
//   }

//   function decline() {
//     if (!req || !signer) return;
//     const next = applySignerDecline(req, signer.id);
//     afterPersist(next);
//   }

//   if (!hydrated) {
//     return (
//       <div className="flex min-h-dvh items-center justify-center text-[13px] text-slate-400">
//         Loading…
//       </div>
//     );
//   }

//   if (!req || !signer) {
//     return (
//       <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
//         <PenLine className="mb-3 h-10 w-10 text-slate-300" />
//         <h1 className="text-lg font-bold text-slate-900">Link invalid</h1>
//         <p className="mt-1 text-[13px] text-slate-500">
//           This signature link is expired or incorrect.
//         </p>
//       </div>
//     );
//   }

//   if (req.status === "Draft") {
//     return (
//       <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
//         <Clock className="mb-3 h-10 w-10 text-slate-300" />
//         <h1 className="text-lg font-bold text-slate-900">Not sent yet</h1>
//         <p className="mt-1 text-[13px] text-slate-500">
//           This document has not been sent for signature.
//         </p>
//       </div>
//     );
//   }

//   if (req.status === "Cancelled" || req.status === "Expired") {
//     return (
//       <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
//         <h1 className="text-lg font-bold text-slate-900">
//           Link no longer active
//         </h1>
//         <p className="mt-1 text-[13px] text-slate-500">
//           This request is {req.status.toLowerCase()}.
//         </p>
//       </div>
//     );
//   }

//   if (signer.status === "Declined" || req.status === "Declined") {
//     return (
//       <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
//         <h1 className="text-xl font-bold text-slate-900">Declined</h1>
//         <p className="mt-1 text-[13px] text-slate-500">
//           You declined to sign {req.documentName}.
//         </p>
//       </div>
//     );
//   }

//   if (signer.status === "Signed") {
//     const waitingOthers =
//       req.status !== "Signed" &&
//       req.signers.some(
//         (s) => s.role !== "CC" && s.id !== signer.id && s.status !== "Signed",
//       );
//     return (
//       <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
//         <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500" />
//         <h1 className="text-xl font-bold text-slate-900">
//           {waitingOthers ? "You're done" : "Document signed"}
//         </h1>
//         <p className="mt-1 text-[13px] text-slate-500">
//           {req.documentName}
//           <br />
//           {waitingOthers
//             ? "Waiting for the remaining signers."
//             : "A copy has been recorded in FinConnex."}
//         </p>
//         {signer.signatureData?.startsWith("typed:") ? (
//           <p className="mt-4 font-serif text-2xl text-slate-800">
//             {signer.signatureData.replace(/^typed:/, "")}
//           </p>
//         ) : signer.signatureData?.startsWith("data:") ? (
//           // eslint-disable-next-line @next/next/no-img-element
//           <img
//             src={signer.signatureData}
//             alt="Your signature"
//             className="mt-4 h-16 object-contain"
//           />
//         ) : null}
//       </div>
//     );
//   }

//   if (!canSignerAccess(req, signer.id)) {
//     const earlier = [...req.signers]
//       .filter((s) => s.role !== "CC")
//       .sort((a, b) => a.order - b.order)
//       .find((s) => s.status !== "Signed" && s.status !== "Declined");
//     return (
//       <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
//         <Clock className="mb-3 h-10 w-10 text-amber-400" />
//         <h1 className="text-lg font-bold text-slate-900">Not your turn yet</h1>
//         <p className="mt-1 text-[13px] text-slate-500">
//           This request uses sequential signing.
//           {earlier
//             ? ` Waiting for ${earlier.name} to sign first.`
//             : " Please check back later."}
//         </p>
//       </div>
//     );
//   }

//   const myFields: SignatureField[] = req.fields.filter(
//     (f) => f.signerId === signer.id,
//   );

//   return (
//     <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-4 py-6">
//       {/* Electronic Record & Signature Disclosure Top Consent Bar */}
//       <div
//         className={cn(
//           "sticky top-2 z-30 mb-6 rounded-2xl border bg-white/95 backdrop-blur-md p-4 shadow-md transition-all dark:bg-zinc-900/95",
//           consentError && !hasAgreedConsent
//             ? "border-rose-400 ring-2 ring-rose-400/30 bg-rose-50/40"
//             : "border-slate-200/90 dark:border-zinc-800",
//         )}
//       >
//         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//           <label className="flex items-start gap-3 cursor-pointer select-none">
//             <input
//               type="checkbox"
//               checked={hasAgreedConsent}
//               onChange={(e) => {
//                 setHasAgreedConsent(e.target.checked);
//                 if (e.target.checked) setConsentError(false);
//               }}
//               className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0"
//             />
//             <span className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
//               I confirm that I have read and understood the{" "}
//               <button
//                 type="button"
//                 onClick={() => setIsDisclosureModalOpen(true)}
//                 className="font-semibold text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
//               >
//                 Electronic Record and Signature Disclosure
//               </button>{" "}
//               and consent to use electronic records and signatures.
//             </span>
//           </label>

//           <div className="flex items-center gap-2 shrink-0">
//             <button
//               type="button"
//               onClick={() => {
//                 if (!hasAgreedConsent) {
//                   setConsentError(true);
//                 } else {
//                   setIsModalOpen(true);
//                 }
//               }}
//               className={cn(
//                 "h-9 rounded-xl px-4 text-xs font-semibold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer",
//                 hasAgreedConsent
//                   ? "bg-emerald-600 hover:bg-emerald-700"
//                   : "bg-emerald-600/80 opacity-90",
//               )}
//             >
//               <CheckCircle2 className="h-3.5 w-3.5" />
//               Agree &amp; Continue
//             </button>
//           </div>
//         </div>

//         {consentError && !hasAgreedConsent && (
//           <p className="mt-2 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
//             <AlertCircle className="h-3.5 w-3.5" />
//             Please check the box above to consent before signing.
//           </p>
//         )}
//       </div>

//       <div className="mb-6 text-center">
//         <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">
//           FinConnex
//         </p>
//         <h1 className="mt-1 text-2xl font-bold text-slate-900">
//           Review &amp; sign
//         </h1>
//         <p className="mt-1 text-sm text-slate-500">{req.documentName}</p>
//         <p className="mt-0.5 text-xs text-slate-400">
//           Signing as {signer.name} · Requested by {req.createdBy} · Expires{" "}
//           {req.expiryDate}
//         </p>
//       </div>

//       <div className="mb-6">
//         <SignatureDocPreview
//           fileName={req.documentFile}
//           fileUrl={req.documentFileUrl}
//           fields={myFields}
//           signers={req.signers}
//           highlightSignerId={signer.id}
//           interactive={true}
//           onFieldClick={handleFieldClick}
//           className="shadow-sm"
//         />
//         {myFields.length ? (
//           <p className="mt-2 text-center text-xs text-slate-500">
//             {hasAgreedConsent
//               ? `Click on highlighted fields to sign or auto-fill · ${myFields.length} assigned to you`
//               : "Check consent agreement at top to enable field signing"}
//           </p>
//         ) : null}
//       </div>

//       <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
//         {pendingSignatureData ? (
//           <div className="space-y-3">
//             <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 border border-emerald-200">
//               <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
//                 <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
//                 <span>Signature &amp; date applied to fields above.</span>
//               </div>
//               <button
//                 type="button"
//                 onClick={() => setIsModalOpen(true)}
//                 className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
//               >
//                 Change Signature
//               </button>
//             </div>

//             <button
//               type="button"
//               onClick={handleFinalSubmit}
//               className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all cursor-pointer"
//             >
//               <Send className="h-4 w-4" />
//               Finalize &amp; Submit Document
//             </button>

//             <button
//               type="button"
//               onClick={decline}
//               className="mt-1 h-8 w-full text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors"
//             >
//               Decline Request
//             </button>
//           </div>
//         ) : (
//           <div>
//             <button
//               type="button"
//               onClick={() => {
//                 if (!hasAgreedConsent) {
//                   setConsentError(true);
//                 } else {
//                   setIsModalOpen(true);
//                 }
//               }}
//               className={cn(
//                 "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-md transition-all cursor-pointer",
//                 hasAgreedConsent
//                   ? "bg-violet-600 shadow-violet-600/20 hover:bg-violet-700"
//                   : "bg-slate-400 shadow-none cursor-pointer",
//               )}
//             >
//               <PenLine className="h-4 w-4" />
//               Click to Sign Document
//             </button>

//             <button
//               type="button"
//               onClick={decline}
//               className="mt-3 h-9 w-full text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors"
//             >
//               Decline Request
//             </button>
//           </div>
//         )}
//       </div>

//       <p className="mt-6 text-center text-[10px] text-slate-400">
//         By signing you agree this is your legal signature. IP {DEMO_SIGNER_IP}{" "}
//         will be recorded.
//       </p>

//       {/* Signature Creation Modal */}
//       <SignatureModal
//         isOpen={isModalOpen}
//         onClose={() => setIsModalOpen(false)}
//         initialName={signer.name}
//         onSaveSignature={handleSaveSignature}
//       />

//       {/* Electronic Record & Signature Disclosure Modal */}
//       {isDisclosureModalOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
//           <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
//             <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
//               <div className="flex items-center gap-2">
//                 <ShieldCheck className="h-5 w-5 text-emerald-600" />
//                 <h2 className="text-base font-bold text-slate-900 dark:text-white">
//                   Electronic Record and Signature Disclosure
//                 </h2>
//               </div>
//               <button
//                 onClick={() => setIsDisclosureModalOpen(false)}
//                 className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400"
//               >
//                 <X className="h-4 w-4" />
//               </button>
//             </div>

//             <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed pr-2">
//               <p>
//                 From time to time, FinConnex (we, us or Company) may be required by law to provide to you certain written notices or disclosures. Described below are the terms and conditions for providing to you such notices and disclosures electronically through the FinConnex eSign system.
//               </p>
//               <h4 className="font-semibold text-slate-800 dark:text-white mt-2">1. Getting Paper Copies</h4>
//               <p>
//                 At any time, you may request from us a paper copy of any record provided or made available electronically to you by us. You will have the ability to download and print documents sent to you through FinConnex.
//               </p>
//               <h4 className="font-semibold text-slate-800 dark:text-white mt-2">2. Withdrawing Your Consent</h4>
//               <p>
//                 If you decide to receive notices and disclosures from us electronically, you may at any time change your mind and tell us that thereafter you want to receive required notices and disclosures only in paper format.
//               </p>
//               <h4 className="font-semibold text-slate-800 dark:text-white mt-2">3. Legal Validity</h4>
//               <p>
//                 By checking the agreement box, you confirm that you consent to conduct electronic business transactions and execute documents with legally binding electronic signatures under standard E-SIGN / UETA laws.
//               </p>
//             </div>

//             <div className="mt-6 flex justify-end border-t border-slate-100 pt-4 dark:border-zinc-800">
//               <button
//                 type="button"
//                 onClick={() => {
//                   setHasAgreedConsent(true);
//                   setConsentError(false);
//                   setIsDisclosureModalOpen(false);
//                 }}
//                 className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-700"
//               >
//                 I Agree &amp; Accept
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import {
  applySignerDecline,
  applySignerSignature,
  applySignerViewed,
  canSignerAccess,
  DEMO_SIGNER_IP,
  getRequestDocuments,
  getSignatureByToken,
  type SignatureField,
  type SignatureRequest,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import {
  declineCrmSignatureRequest,
  isCrmSignatureRequestId,
  persistRemoteSignatureRequest,
  signCrmSignatureRequest,
  tryCrmSignatureRequest,
  viewCrmSignatureRequest,
} from "@/lib/documents/signature/api";
import { syncQuotationFromSignature } from "@/lib/finance/quotations/signatureBridge";
import { persistSignedPackage } from "@/lib/documents/signed-artifacts";
import { SignatureDocPreview } from "./SignatureDocPreview";
import { SignatureModal } from "./SignatureModal";
import {
  CheckCircle2,
  Clock,
  PenLine,
  Sparkles,
  Send,
  ShieldCheck,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function PublicSignClient({ token }: { token: string }) {
  const [req, setReq] = useState<SignatureRequest | null>(null);
  const [signer, setSigner] = useState<SignatureSigner | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingSignatureData, setPendingSignatureData] = useState<
    string | null
  >(null);

  // Top Consent & Disclosure state
  const [hasAgreedConsent, setHasAgreedConsent] = useState(false);
  const [isDisclosureModalOpen, setIsDisclosureModalOpen] = useState(false);
  const [consentError, setConsentError] = useState(false);

  // Which of the request's (possibly several) attached documents is
  // currently shown. Defaults to the first document once it's known.
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  useEffect(() => {
    const hit = getSignatureByToken(token);
    if (!hit) {
      setReq(null);
      setSigner(null);
      setHydrated(true);
      return;
    }

    let liveReq = hit.request;
    let liveSigner = hit.signer;

    if (
      liveReq.status !== "Draft" &&
      liveReq.status !== "Cancelled" &&
      liveReq.status !== "Expired" &&
      liveSigner.status !== "Signed" &&
      liveSigner.status !== "Declined" &&
      canSignerAccess(liveReq, liveSigner.id)
    ) {
      liveReq = applySignerViewed(liveReq, liveSigner.id);
      liveSigner =
        liveReq.signers.find((s) => s.id === liveSigner.id) ?? liveSigner;
    }

    setReq(liveReq);
    setSigner(liveSigner);
    setHydrated(true);
    if (isCrmSignatureRequestId(liveReq.id)) {
      void tryCrmSignatureRequest(() => viewCrmSignatureRequest(liveReq.id)).then(
        (remote) => {
          if (!remote) return;
          persistRemoteSignatureRequest(remote);
        },
      );
    }
  }, [token]);

  function afterPersist(next: SignatureRequest) {
    setReq(next);
    const nextSigner = next.signers.find((s) => s.id === signer?.id) ?? signer;
    setSigner(nextSigner);
    if (next.status === "Signed" || next.status === "Declined") {
      syncQuotationFromSignature(next);
    }
    if (next.status === "Signed") {
      persistSignedPackage(next);
    }
  }

  function handleSaveSignature(signatureData: string) {
    if (!req || !signer) return;
    const today = new Date().toLocaleDateString("en-GB");

    // Display signature and auto-update date fields live ONLY for fields assigned to current signer
    const updatedFields = req.fields.map((f) => {
      if (f.signerId !== signer.id) return f;

      const isDateKind =
        f.kind === "date" ||
        (f as any).kind === "sign_date" ||
        f.label?.toLowerCase().includes("date");
      const isSigKind =
        f.kind === "signature" ||
        f.kind === "initials" ||
        (f as any).kind === "sign" ||
        f.label?.toLowerCase().includes("signature");
      const isNameKind =
        f.kind === "name" || f.label?.toLowerCase().includes("name");

      if (isSigKind) {
        return { ...f, value: signatureData };
      }
      if (isDateKind) {
        return { ...f, value: today };
      }
      if (isNameKind) {
        return { ...f, value: signer.name };
      }
      return f;
    });

    setReq({ ...req, fields: updatedFields });
    setPendingSignatureData(signatureData);
  }

  function handleFinalSubmit() {
    if (!req || !signer || !pendingSignatureData) return;
    if (!hasAgreedConsent) {
      setConsentError(true);
      return;
    }
    const next = applySignerSignature(req, signer.id, pendingSignatureData);
    afterPersist(next);
    if (isCrmSignatureRequestId(req.id)) {
      void tryCrmSignatureRequest(() =>
        signCrmSignatureRequest(req.id, {
          signatureData: pendingSignatureData,
        }),
      ).then((remote) => {
        if (remote) persistRemoteSignatureRequest(remote);
      });
    }
  }

  function handleFieldClick(fieldId: string) {
    if (!req || !signer) return;
    const targetField = req.fields.find((f) => f.id === fieldId);
    if (!targetField) return;

    // Do not allow editing another signer's fields
    if (targetField.signerId !== signer.id) return;

    if (!hasAgreedConsent) {
      setConsentError(true);
      return;
    }

    const isDateKind =
      targetField.kind === "date" ||
      (targetField as any).kind === "sign_date" ||
      targetField.label?.toLowerCase().includes("date");

    if (isDateKind) {
      // Auto-fill exact date for current signer's date fields only
      const today = new Date().toLocaleDateString("en-GB");
      const updatedFields = req.fields.map((f) =>
        f.signerId === signer.id &&
        (f.id === fieldId ||
          f.kind === "date" ||
          (f as any).kind === "sign_date" ||
          f.label?.toLowerCase().includes("date"))
          ? { ...f, value: today }
          : f,
      );
      setReq({ ...req, fields: updatedFields });
    } else {
      // Open signature modal for signature or initials fields
      setIsModalOpen(true);
    }
  }

  function decline() {
    if (!req || !signer) return;
    const next = applySignerDecline(req, signer.id);
    afterPersist(next);
    if (isCrmSignatureRequestId(req.id)) {
      void tryCrmSignatureRequest(() =>
        declineCrmSignatureRequest(req.id),
      ).then((remote) => {
        if (remote) persistRemoteSignatureRequest(remote);
      });
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[13px] text-slate-400">
        Loading…
      </div>
    );
  }

  if (!req || !signer) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <PenLine className="mb-3 h-10 w-10 text-slate-300" />
        <h1 className="text-lg font-bold text-slate-900">Link invalid</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          This signature link is expired or incorrect.
        </p>
      </div>
    );
  }

  if (req.status === "Draft") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <Clock className="mb-3 h-10 w-10 text-slate-300" />
        <h1 className="text-lg font-bold text-slate-900">Not sent yet</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          This document has not been sent for signature.
        </p>
      </div>
    );
  }

  if (req.status === "Cancelled" || req.status === "Expired") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-lg font-bold text-slate-900">
          Link no longer active
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          This request is {req.status.toLowerCase()}.
        </p>
      </div>
    );
  }

  if (signer.status === "Declined" || req.status === "Declined") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">Declined</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          You declined to sign {req.documentName}.
        </p>
      </div>
    );
  }

  if (signer.status === "Signed") {
    const waitingOthers =
      req.status !== "Signed" &&
      req.signers.some(
        (s) => s.role !== "CC" && s.id !== signer.id && s.status !== "Signed",
      );
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500" />
        <h1 className="text-xl font-bold text-slate-900">
          {waitingOthers ? "You're done" : "Document signed"}
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          {req.documentName}
          <br />
          {waitingOthers
            ? "Waiting for the remaining signers."
            : "A copy has been recorded in FinConnex."}
        </p>
        {signer.signatureData?.startsWith("typed:") ? (
          <p className="mt-4 font-serif text-2xl text-slate-800">
            {signer.signatureData.replace(/^typed:/, "")}
          </p>
        ) : signer.signatureData?.startsWith("data:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signer.signatureData}
            alt="Your signature"
            className="mt-4 h-16 object-contain"
          />
        ) : null}
      </div>
    );
  }

  if (!canSignerAccess(req, signer.id)) {
    const earlier = [...req.signers]
      .filter((s) => s.role !== "CC")
      .sort((a, b) => a.order - b.order)
      .find((s) => s.status !== "Signed" && s.status !== "Declined");
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <Clock className="mb-3 h-10 w-10 text-amber-400" />
        <h1 className="text-lg font-bold text-slate-900">Not your turn yet</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          This request uses sequential signing.
          {earlier
            ? ` Waiting for ${earlier.name} to sign first.`
            : " Please check back later."}
        </p>
      </div>
    );
  }

  const myFields: SignatureField[] = req.fields.filter(
    (f) => f.signerId === signer.id,
  );

  const documents = getRequestDocuments(req);
  const activeDoc =
    documents.find((d) => d.id === activeDocId) ?? documents[0] ?? null;
  const activeDocFields = myFields.filter(
    (f) => (f.documentId ?? "primary") === (activeDoc?.id ?? "primary"),
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-4 py-6">
      {/* Electronic Record & Signature Disclosure Top Consent Bar */}
      <div
        className={cn(
          "sticky top-2 z-30 mb-6 rounded-2xl border bg-white/95 backdrop-blur-md p-4 shadow-md transition-all dark:bg-zinc-900/95",
          consentError && !hasAgreedConsent
            ? "border-rose-400 ring-2 ring-rose-400/30 bg-rose-50/40"
            : "border-slate-200/90 dark:border-zinc-800",
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasAgreedConsent}
              onChange={(e) => {
                setHasAgreedConsent(e.target.checked);
                if (e.target.checked) setConsentError(false);
              }}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0"
            />
            <span className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
              I confirm that I have read and understood the{" "}
              <button
                type="button"
                onClick={() => setIsDisclosureModalOpen(true)}
                className="font-semibold text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
              >
                Electronic Record and Signature Disclosure
              </button>{" "}
              and consent to use electronic records and signatures.
            </span>
          </label>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!hasAgreedConsent) {
                  setConsentError(true);
                } else {
                  setIsModalOpen(true);
                }
              }}
              className={cn(
                "h-9 rounded-xl px-4 text-xs font-semibold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer",
                hasAgreedConsent
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-emerald-600/80 opacity-90",
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Agree &amp; Continue
            </button>
          </div>
        </div>

        {consentError && !hasAgreedConsent && (
          <p className="mt-2 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Please check the box above to consent before signing.
          </p>
        )}
      </div>

      <div className="mb-6 text-center">
        <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">
          FinConnex
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Review &amp; sign
        </h1>
        <p className="mt-1 text-sm text-slate-500">{req.documentName}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          Signing as {signer.name} · Requested by {req.createdBy} · Expires{" "}
          {req.expiryDate}
        </p>
      </div>

      <div className="mb-6">
        {documents.length > 1 ? (
          <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
            {documents.map((doc, i) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setActiveDocId(doc.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                  (activeDoc?.id ?? documents[0].id) === doc.id
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-900/80 text-[9px] text-white">
                  {i + 1}
                </span>
                {doc.name}
              </button>
            ))}
          </div>
        ) : null}

        {activeDoc ? (
          <SignatureDocPreview
            key={activeDoc.id}
            fileName={activeDoc.fileName}
            fileUrl={activeDoc.fileUrl}
            fields={activeDocFields}
            signers={req.signers}
            highlightSignerId={signer.id}
            interactive={true}
            onFieldClick={handleFieldClick}
            className="shadow-sm"
          />
        ) : null}
        {myFields.length ? (
          <p className="mt-2 text-center text-xs text-slate-500">
            {hasAgreedConsent
              ? `Click on highlighted fields to sign or auto-fill · ${myFields.length} assigned to you${documents.length > 1 ? " across all documents" : ""}`
              : "Check consent agreement at top to enable field signing"}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        {pendingSignatureData ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 border border-emerald-200">
              <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Signature &amp; date applied to fields above.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                Change Signature
              </button>
            </div>

            <button
              type="button"
              onClick={handleFinalSubmit}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
              Finalize &amp; Submit Document
            </button>

            <button
              type="button"
              onClick={decline}
              className="mt-1 h-8 w-full text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors"
            >
              Decline Request
            </button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => {
                if (!hasAgreedConsent) {
                  setConsentError(true);
                } else {
                  setIsModalOpen(true);
                }
              }}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-md transition-all cursor-pointer",
                hasAgreedConsent
                  ? "bg-violet-600 shadow-violet-600/20 hover:bg-violet-700"
                  : "bg-slate-400 shadow-none cursor-pointer",
              )}
            >
              <PenLine className="h-4 w-4" />
              Click to Sign Document
            </button>

            <button
              type="button"
              onClick={decline}
              className="mt-3 h-9 w-full text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors"
            >
              Decline Request
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[10px] text-slate-400">
        By signing you agree this is your legal signature. IP {DEMO_SIGNER_IP}{" "}
        will be recorded.
      </p>

      {/* Signature Creation Modal */}
      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialName={signer.name}
        onSaveSignature={handleSaveSignature}
      />

      {/* Electronic Record & Signature Disclosure Modal */}
      {isDisclosureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Electronic Record and Signature Disclosure
                </h2>
              </div>
              <button
                onClick={() => setIsDisclosureModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed pr-2">
              <p>
                From time to time, FinConnex (we, us or Company) may be required
                by law to provide to you certain written notices or disclosures.
                Described below are the terms and conditions for providing to
                you such notices and disclosures electronically through the
                FinConnex eSign system.
              </p>
              <h4 className="font-semibold text-slate-800 dark:text-white mt-2">
                1. Getting Paper Copies
              </h4>
              <p>
                At any time, you may request from us a paper copy of any record
                provided or made available electronically to you by us. You will
                have the ability to download and print documents sent to you
                through FinConnex.
              </p>
              <h4 className="font-semibold text-slate-800 dark:text-white mt-2">
                2. Withdrawing Your Consent
              </h4>
              <p>
                If you decide to receive notices and disclosures from us
                electronically, you may at any time change your mind and tell us
                that thereafter you want to receive required notices and
                disclosures only in paper format.
              </p>
              <h4 className="font-semibold text-slate-800 dark:text-white mt-2">
                3. Legal Validity
              </h4>
              <p>
                By checking the agreement box, you confirm that you consent to
                conduct electronic business transactions and execute documents
                with legally binding electronic signatures under standard E-SIGN
                / UETA laws.
              </p>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setHasAgreedConsent(true);
                  setConsentError(false);
                  setIsDisclosureModalOpen(false);
                }}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-700"
              >
                I Agree &amp; Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
