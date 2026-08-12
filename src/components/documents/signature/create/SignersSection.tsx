import React, { useState } from "react";
import { Users, GripVertical, Trash2, Plus } from "lucide-react";
import {
  SignatureSigner,
  SIGNER_COLORS,
} from "@/lib/documents/signature/types";

interface SignersSectionProps {
  signers: SignatureSigner[];
  onChangeSigners: (signers: SignatureSigner[]) => void;
  signingOrder: "sequential" | "parallel";
  onChangeSigningOrder: (mode: "sequential" | "parallel") => void;
}

export const SignersSection: React.FC<SignersSectionProps> = ({
  signers,
  onChangeSigners,
  signingOrder,
  onChangeSigningOrder,
}) => {
  const [touchedIds, setTouchedIds] = useState<Record<string, boolean>>({});

  const handleAddSigner = () => {
    // Check if any existing signer has an empty name or email
    const hasEmptyFields = signers.some(
      (s) => !s.name.trim() || !s.email.trim(),
    );

    if (hasEmptyFields) {
      const allTouched: Record<string, boolean> = {};
      signers.forEach((s) => {
        allTouched[s.id] = true;
      });
      setTouchedIds(allTouched);
      return;
    }

    const newOrder = signers.length + 1;
    const newSigner: SignatureSigner = {
      id: `sg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: "",
      email: "",
      order: newOrder,
      role: "Signer",
      status: "Pending",
      token: `sig-signer-${Date.now()}`,
      colorIndex: (newOrder - 1) % SIGNER_COLORS.length,
    };
    onChangeSigners([...signers, newSigner]);
  };

  const handleRemoveSigner = (id: string) => {
    if (signers.length <= 1) return;
    const updated = signers
      .filter((s) => s.id !== id)
      .map((s, idx) => ({
        ...s,
        order: idx + 1,
        colorIndex: idx % SIGNER_COLORS.length,
      }));
    onChangeSigners(updated);
  };

  const handleUpdateSigner = (
    id: string,
    field: "name" | "email",
    value: string,
  ) => {
    const updated = signers.map((s) =>
      s.id === id ? { ...s, [field]: value } : s,
    );
    onChangeSigners(updated);
  };

  const handleBlur = (id: string) => {
    setTouchedIds((prev) => ({ ...prev, [id]: true }));
  };

  const handleOnlyMe = () => {
    if (signers.length > 0) {
      onChangeSigners([
        {
          ...signers[0],
          order: 1,
        },
      ]);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Users className="w-5 h-5 text-indigo-600" />
          <h2>Signer</h2>
        </div>
        <button
          type="button"
          onClick={handleOnlyMe}
          className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
        >
          I'm the only signer
        </button>
      </div>

      <div className="space-y-3">
        {signers.map((signer, index) => {
          const color =
            SIGNER_COLORS[signer.colorIndex ?? index % SIGNER_COLORS.length];

          const isTouched = touchedIds[signer.id];
          const isEmailEmpty = !signer.email.trim();
          const isNameEmpty = !signer.name.trim();

          const emailError = isTouched && isEmailEmpty;
          const nameError = isTouched && isNameEmpty;

          return (
            <div
              key={signer.id}
              className={`p-4 rounded-xl border ${color.border} ${color.bg}/30 transition-all space-y-2`}
            >
              <div className="flex items-center gap-3">
                <div className="text-slate-400 cursor-grab">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div
                  className={`w-7 h-7 rounded-lg ${color.bg} ${color.text} flex items-center justify-center font-bold text-xs shrink-0`}
                >
                  {signer.order}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={signer.email}
                      onChange={(e) =>
                        handleUpdateSigner(signer.id, "email", e.target.value)
                      }
                      onBlur={() => handleBlur(signer.id)}
                      placeholder="Enter the email address"
                      className={`w-full px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 text-xs text-slate-800 ${
                        emailError
                          ? "border-rose-400 focus:ring-rose-500/20"
                          : "border-slate-200 focus:ring-indigo-500/20"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={signer.name}
                      onChange={(e) =>
                        handleUpdateSigner(signer.id, "name", e.target.value)
                      }
                      onBlur={() => handleBlur(signer.id)}
                      placeholder="Signer's name"
                      className={`w-full px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 text-xs text-slate-800 ${
                        nameError
                          ? "border-rose-400 focus:ring-rose-500/20"
                          : "border-slate-200 focus:ring-indigo-500/20"
                      }`}
                    />
                  </div>
                </div>

                {signers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSigner(signer.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors mt-5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dynamic Error Messaging based on which field(s) are missing */}
              {isTouched && (isEmailEmpty || isNameEmpty) && (
                <div className="text-[11px] text-rose-500 ml-10 space-y-0.5">
                  {isEmailEmpty && isNameEmpty ? (
                    <p>⚠ Both signer email address and name are required.</p>
                  ) : isEmailEmpty ? (
                    <p>⚠ Signer email address is required.</p>
                  ) : (
                    <p>⚠ Signer name is required.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Recipient Button */}
      <button
        type="button"
        onClick={handleAddSigner}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs w-full justify-center md:w-auto"
      >
        <Plus className="w-4 h-4 text-indigo-600" />
        <span>Add another signer</span>
      </button>
    </div>
  );
};
