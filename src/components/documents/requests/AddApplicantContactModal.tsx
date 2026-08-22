"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createContact } from "@/lib/contacts/store";
import { getRulesActor } from "@/lib/rules/actor";
import { cn } from "@/lib/utils";

export function AddApplicantContactModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (contact: { name: string; email: string }) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Enter first and last name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    const contact = createContact({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      status: "Active",
      owner: getRulesActor().name || "John Smith",
    });
    onCreated({ name: contact.name, email: contact.email });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-contact-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] rounded-2xl bg-white px-6 pt-6 pb-5 shadow-xl"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
        <h2
          id="add-contact-title"
          className="text-[18px] font-bold text-slate-900"
        >
          Add contact
        </h2>
        <p className="mt-1 text-[13px] text-slate-500">
          Create a new contact and add them as an applicant.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              First name
            </span>
            <input
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Last name
            </span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12"
            />
          </label>
          <label className="col-span-2 block">
            <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12"
            />
          </label>
          <label className="col-span-2 block">
            <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Phone
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12"
            />
          </label>
        </div>
        {error ? (
          <p className="mt-2 text-[12px] font-medium text-rose-500">{error}</p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="h-10 rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-black"
          >
            Save contact
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddClientButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-dashed border-[#5A32A3] bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-800 hover:bg-[#F3ECFB]",
      )}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EDE4FB] text-[#5A32A3]">
        +
      </span>
      Add client
    </button>
  );
}
