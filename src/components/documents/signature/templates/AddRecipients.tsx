"use client";

import React from "react";
import { GripVertical, Plus, Trash2, SlidersHorizontal } from "lucide-react";
import type { SignatureSigner } from "@/lib/documents/signature/types";

interface AddRecipientsProps {
  signers: SignatureSigner[];
  onChange: (signers: SignatureSigner[]) => void;
  signingOrder: "sequential" | "parallel";
  onToggleOrder: (order: "sequential" | "parallel") => void;
}

export default function AddRecipients({
  signers,
  onChange,
  signingOrder,
  onToggleOrder,
}: AddRecipientsProps) {
  // Mock current user data for the "Add me" feature
  const currentUser = {
    name: "John Doe",
    email: "john.doe@example.com",
    role: "Signer",
  };

  const handleAddMe = () => {
    if (signers.length > 0) {
      const updated = [...signers];
      updated[0] = {
        ...updated[0],
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role as any,
      };
      onChange(updated);
    } else {
      onChange([
        {
          id: `role-${Date.now()}`,
          name: currentUser.name,
          email: currentUser.email,
          colorIndex: 0,
          order: 1,
          role: currentUser.role as any,
          status: "Pending",
          token: "",
          deliveryMethod: "email",
        },
      ]);
    }
  };

  const handleInputChange = (
    index: number,
    field: keyof SignatureSigner,
    value: any,
  ) => {
    const updated = [...signers];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange(updated);
  };

  const handleAddRecipient = () => {
    onChange([
      ...signers,
      {
        id: `role-${Date.now()}`,
        name: "",
        email: "",
        colorIndex: signers.length % 5,
        order: signers.length + 1,
        role: "" as any,
        status: "Pending",
        token: "",
        deliveryMethod: "email",
      },
    ]);
  };

  const handleRemoveRecipient = (index: number) => {
    const updated = signers.filter((_, i) => i !== index);
    const reindexed = updated.map((recipient, i) => ({
      ...recipient,
      order: i + 1,
    }));
    onChange(reindexed);
  };

  return (
    <div className="w-full mx-auto p-4 bg-white rounded-lg shadow-sm font-sans">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Add recipients
      </h2>

      {/* Top Actions */}
      <div className="flex items-center gap-3 mb-6">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 select-none bg-emerald-50/50 border border-emerald-200 px-3 py-1.5 rounded-md">
          <input
            type="checkbox"
            checked={signingOrder === "sequential"}
            onChange={(e) =>
              onToggleOrder(e.target.checked ? "sequential" : "parallel")
            }
            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 accent-emerald-600"
          />
          Send in order
        </label>

        <button
          type="button"
          onClick={handleAddMe}
          className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-2xs"
        >
          Add me
        </button>
      </div>

      {/* Recipient List */}
      <div className="space-y-4 mb-6">
        {signers.map((recipient, index) => (
          <div
            key={recipient.id || index}
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-2xs relative overflow-hidden"
          >
            {/* Blue indicator bar on the left */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600" />

            <div className="cursor-grab text-gray-400 hover:text-gray-600 pl-1">
              <GripVertical size={18} />
            </div>

            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded text-sm font-medium text-gray-600 shrink-0">
              {index + 1}
            </div>

            <div className="flex-1 flex flex-col gap-2.5">
              {/* Row 1: Role input spanning full width */}
              <div>
                <input
                  type="text"
                  placeholder="Role"
                  value={recipient.role || ""}
                  onChange={(e) =>
                    handleInputChange(index, "role", e.target.value)
                  }
                  className="max-w-40 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* Row 2: Email, Name, Action Selectors */}
              <div className="flex items-center gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={recipient.email || ""}
                  onChange={(e) =>
                    handleInputChange(index, "email", e.target.value)
                  }
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Name"
                  value={recipient.name || ""}
                  onChange={(e) =>
                    handleInputChange(index, "name", e.target.value)
                  }
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
                />

                <select
                  value={(recipient as any).actionType || "Needs to sign"}
                  onChange={(e) =>
                    handleInputChange(
                      index,
                      "actionType" as any,
                      e.target.value,
                    )
                  }
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-700 shrink-0"
                >
                  <option value="Needs to sign">Needs to sign</option>
                  <option value="Receives a copy">Receives a copy</option>
                  <option value="In person signer">In person signer</option>
                </select>

                <select
                  value={recipient.deliveryMethod || "email"}
                  onChange={(e) =>
                    handleInputChange(index, "deliveryMethod", e.target.value)
                  }
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-700 shrink-0"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
            </div>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => handleRemoveRecipient(index)}
              disabled={signers.length === 1}
              className={`p-2 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-gray-50 shrink-0 ${
                signers.length === 1
                  ? "opacity-40 cursor-not-allowed hover:text-gray-400 hover:bg-transparent"
                  : ""
              }`}
              title={
                signers.length === 1
                  ? "At least one role is required"
                  : "Remove role"
              }
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Recipient Button */}
      <button
        type="button"
        onClick={handleAddRecipient}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-2xs"
      >
        <Plus size={16} />
        Add recipient
      </button>
    </div>
  );
}
