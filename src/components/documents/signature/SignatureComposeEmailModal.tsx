"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ComposeEmailModal,
  type ComposeEmailSendValues,
} from "@/components/sales/ComposeEmailModal";
import { sendCrmActivityEmail } from "@/lib/emails/compose-send";
import {
  filesFromSignatureRequest,
  signatureComposeRecipient,
  signatureRecipientEmails,
} from "@/lib/documents/signature/compose-email";
import { isEmailAddress } from "@/lib/emails/address";
import {
  getRequestDocuments,
  type SignatureRequest,
} from "@/lib/documents/signature/types";

export function SignatureComposeEmailModal({
  isOpen,
  onClose,
  req,
  documentName,
  toEmail,
  toName,
  onSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  req: SignatureRequest | null;
  documentName: string;
  toEmail?: string;
  toName?: string;
  onSent?: (message: string) => void;
}) {
  const recipient = useMemo(() => {
    const fallback = signatureComposeRecipient(req);
    const email = toEmail?.trim() || fallback.email;
    const name = toName?.trim() || fallback.name;
    return { name, email };
  }, [req, toEmail, toName]);
  const toList = useMemo(() => {
    if (toEmail?.trim() && isEmailAddress(toEmail.trim())) {
      return [toEmail.trim()];
    }
    return signatureRecipientEmails(req);
  }, [req, toEmail]);
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    if (!isOpen || !req) {
      setAttachments([]);
      return;
    }
    let cancelled = false;
    void filesFromSignatureRequest(req).then((files) => {
      if (!cancelled) setAttachments(files);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, req]);

  const first = recipient.name.trim().split(/\s+/)[0] || "there";
  const documentCount = req ? getRequestDocuments(req).length : 0;
  const copiesLabel =
    documentCount > 1
      ? `the signed copies of "${documentName}"`
      : `the signed copy of "${documentName}"`;

  async function handleSend(values: ComposeEmailSendValues) {
    const to = values.toList?.length
      ? values.toList
      : values.to
        ? values.to
            .split(/[,;]+/)
            .map((part) => part.trim())
            .filter(Boolean)
        : toList;
    const sent = await sendCrmActivityEmail({
      to,
      subject: values.subject || `Signed document: ${documentName}`,
      body: values.body || "",
      cc: values.ccList,
      bcc: values.bccList,
      relatedTo: `Signature: ${documentName}`,
      scheduledAt: values.sendAt,
      files: values.attachments,
    });
    onClose();
    onSent?.(
      values.sendAt
        ? "Email scheduled"
        : sent.to?.[0]
          ? `Email sent to ${sent.to[0]}`
          : "Email sent",
    );
  }

  if (!isOpen) return null;

  return (
    <ComposeEmailModal
      isOpen={isOpen}
      onClose={onClose}
      recipient={recipient}
      defaultTo={toList}
      defaultAttachments={attachments}
      defaultSubject={`Signed document: ${documentName}`}
      defaultGreeting={`Hi ${first}, please find ${copiesLabel}.`}
      onSend={handleSend}
    />
  );
}
