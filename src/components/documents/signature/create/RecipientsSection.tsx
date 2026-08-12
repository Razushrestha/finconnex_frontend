import React from "react";
import { Users, UserPlus, GripVertical, Trash2 } from "lucide-react";
import {
  SignatureSigner,
  SignerRole,
  SIGNER_COLORS,
} from "@/lib/documents/signature/types";

interface RecipientsSectionProps {
  signers: SignatureSigner[];
  onChange: (signers: SignatureSigner[]) => void;
  signingOrder: "sequential" | "parallel";
  onToggleOrder: (order: "sequential" | "parallel") => void;
}

export function RecipientsSection({
  signers,
  onChange,
  signingOrder,
  onToggleOrder,
}: RecipientsSectionProps) {
  const handleAddSigner = () => {
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
    onChange([...signers, newSigner]);
  };

  const handleRemoveSigner = (id: string) => {
    if (signers.length <= 1) return; // Keep at least one recipient
    const updated = signers
      .filter((s) => s.id !== id)
      .map((s, idx) => ({
        ...s,
        order: idx + 1,
        colorIndex: idx % SIGNER_COLORS.length,
      }));
    onChange(updated);
  };

  const handleUpdateSigner = (
    id: string,
    field: keyof SignatureSigner,
    value: any,
  ) => {
    const updated = signers.map((s) => {
      if (s.id !== id) return s;
      return { ...s, [field]: value };
    });
    onChange(updated);
  };

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center space-x-2 text-gray-900 font-semibold">
          <Users className="w-5 h-5 text-violet-600" />
          <span>Recipients</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-gray-100 p-1 rounded-lg text-xs font-medium text-gray-600">
            <button
              type="button"
              onClick={() => onToggleOrder("sequential")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                signingOrder === "sequential"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "hover:text-gray-900"
              }`}
            >
              Sequential Order
            </button>
            <button
              type="button"
              onClick={() => onToggleOrder("parallel")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                signingOrder === "parallel"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "hover:text-gray-900"
              }`}
            >
              Anyone can sign
            </button>
          </div>
          <button
            type="button"
            onClick={handleAddSigner}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-gray-500" />
            <span>Add bulk recipients</span>
          </button>
        </div>
      </div>

      {/* Recipient Rows */}
      <div className="space-y-3">
        {signers.map((signer, index) => {
          const color =
            SIGNER_COLORS[signer.colorIndex ?? index % SIGNER_COLORS.length];
          return (
            <div
              key={signer.id}
              className="flex items-center space-x-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 transition-all hover:border-slate-300"
            >
              {/* Drag Handle & Order Badge */}
              <div className="flex items-center space-x-2 text-gray-400">
                <GripVertical className="w-4 h-4 cursor-grab active:cursor-grabbing" />
                <span
                  className={`w-7 h-7 flex items-center justify-center rounded-lg font-bold text-xs ${color.bg} ${color.text} border ${color.border}`}
                >
                  {signer.order}
                </span>
              </div>

              {/* Email Address Field */}
              <div className="flex-1 space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Email Address
                </label>
                <input
                  type="email"
                  value={signer.email}
                  onChange={(e) =>
                    handleUpdateSigner(signer.id, "email", e.target.value)
                  }
                  placeholder="Enter the email address"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                />
              </div>

              {/* Name Field */}
              <div className="flex-1 space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Name
                </label>
                <input
                  type="text"
                  value={signer.name}
                  onChange={(e) =>
                    handleUpdateSigner(signer.id, "name", e.target.value)
                  }
                  placeholder="Recipient's name"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                />
              </div>

              {/* Role Selector */}
              <div className="w-44 space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Role
                </label>
                <select
                  value={signer.role}
                  onChange={(e) =>
                    handleUpdateSigner(
                      signer.id,
                      "role",
                      e.target.value as SignerRole,
                    )
                  }
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                >
                  <option value="Signer">Needs to sign</option>
                  <option value="Approver">Needs to approve</option>
                  <option value="CC">Receives a copy</option>
                </select>
              </div>

              {/* Delete / Remove Action */}
              <div className="pt-5">
                <button
                  type="button"
                  onClick={() => handleRemoveSigner(signer.id)}
                  disabled={signers.length <= 1}
                  className={`p-2 rounded-lg border transition-all ${
                    signers.length <= 1
                      ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-300 bg-white"
                      : "border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 bg-white"
                  }`}
                  title="Remove recipient"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Another Recipient Button */}
      <div>
        <button
          type="button"
          onClick={handleAddSigner}
          className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4 text-violet-600" />
          <span>Add another recipient</span>
        </button>
      </div>
    </div>
  );
}
