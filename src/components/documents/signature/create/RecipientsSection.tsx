"use client";

import React, { useState } from "react";
import { Users, UserPlus, GripVertical, Trash2, Plus } from "lucide-react";
import {
  SignatureSigner,
  SignerRole,
  SIGNER_COLORS,
  DeliveryMethod,
} from "@/lib/documents/signature/types";

export type CrmEntityType =
  | "email"
  | "contact"
  | "lead"
  | "deal"
  | "organization";

interface CrmEntityOption {
  id: string;
  name: string;
  email: string;
  type: CrmEntityType;
  subtitle?: string;
}

export interface CcRecipient {
  id: string;
  name: string;
  email: string;
  entityType: CrmEntityType;
  deliveryMethod: DeliveryMethod;
}

interface SignersSectionProps {
  signers: SignatureSigner[];
  onChange: React.Dispatch<React.SetStateAction<SignatureSigner[]>>;
  signingOrder: "sequential" | "parallel";
  onToggleOrder: (order: "sequential" | "parallel") => void;
  currentUser?: { name: string; email: string };
  ccRecipients: CcRecipient[];
  setCcRecipients: React.Dispatch<React.SetStateAction<CcRecipient[]>>;
  searchCrmEntities?: (
    type: CrmEntityType,
    query: string,
  ) => Promise<CrmEntityOption[]> | CrmEntityOption[];
}

export function RecipientsSection({
  signers = [],
  onChange,
  signingOrder,
  onToggleOrder,
  currentUser = { name: "Harry", email: "harry@example.com" },
  ccRecipients = [],
  setCcRecipients,
  searchCrmEntities,
}: SignersSectionProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [crmResults, setCrmResults] = useState<CrmEntityOption[]>([]);
  const [signerSearchQueries, setSignerSearchQueries] = useState<
    Record<string, string>
  >({});

  const [activeCcDropdownId, setActiveCcDropdownId] = useState<string | null>(
    null,
  );
  const [ccCrmResults, setCcCrmResults] = useState<CrmEntityOption[]>([]);
  const [ccSearchQueries, setCcSearchQueries] = useState<
    Record<string, string>
  >({});

  // Ensure there is always at least 1 default signer if empty
  React.useEffect(() => {
    if (!signers || signers.length === 0) {
      const defaultSigner: SignatureSigner & { entityType?: CrmEntityType } = {
        id: `sg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: "",
        email: "",
        order: 1,
        role: "Signer",
        deliveryMethod: "email",
        status: "Pending",
        token: `sig-signer-${Date.now()}`,
        colorIndex: 0,
        entityType: "email",
      };
      onChange([defaultSigner]);
    }
  }, [signers, onChange]);

  const handleAddSigner = () => {
    onChange((prev) => {
      const newSigner: SignatureSigner & { entityType?: CrmEntityType } = {
        id: `sg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: "",
        email: "",
        order: prev.length + 1,
        role: "Signer",
        deliveryMethod: "email",
        status: "Pending",
        token: `sig-signer-${Date.now()}`,
        colorIndex: 0,
        entityType: "email",
      };
      return [...prev, newSigner].map((s, idx) => ({
        ...s,
        order: idx + 1,
        colorIndex: idx % SIGNER_COLORS.length,
      }));
    });
  };

  const handleRemoveSigner = (id: string) => {
    onChange((prev) => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter((s) => s.id !== id);

      if (filtered.length === 0) {
        return [
          {
            id: `sg-${Date.now()}`,
            name: "",
            email: "",
            order: 1,
            role: "Signer",
            deliveryMethod: "email",
            status: "Pending",
            token: `sig-signer-${Date.now()}`,
            colorIndex: 0,
            entityType: "email",
          },
        ];
      }

      return filtered.map((s, idx) => ({
        ...s,
        order: idx + 1,
        colorIndex: idx % SIGNER_COLORS.length,
      }));
    });
  };

  const handleUpdateSigner = (
    id: string,
    field: keyof SignatureSigner | "entityType",
    value: any,
  ) => {
    if (field === "entityType") {
      setSignerSearchQueries((prevQueries) => ({
        ...(prevQueries || {}),
        [id]: "",
      }));
    }

    onChange((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (field === "entityType") {
          return { ...s, entityType: value, email: "", name: "" };
        }
        return { ...s, [field]: value };
      }),
    );

    if (field === "entityType") {
      setActiveDropdownId(null);
    }
  };

  const handleSearchCrm = async (signer: any, query: string) => {
    setSignerSearchQueries((prevQueries) => ({
      ...(prevQueries || {}),
      [signer.id]: query,
    }));

    if (!query.trim()) {
      onChange((prev) =>
        prev.map((s) =>
          s.id === signer.id ? { ...s, name: "", email: "" } : s,
        ),
      );
      setCrmResults([]);
      setActiveDropdownId(null);
      return;
    }

    if (searchCrmEntities) {
      const results = await searchCrmEntities(signer.entityType, query);
      setCrmResults(results);
    } else {
      const mockDb: CrmEntityOption[] = [
        {
          id: "c1",
          name: "Sarah Connor",
          email: "sarah@cyberdyne.io",
          type: "contact",
          subtitle: "Tech Contact",
        },
        {
          id: "l1",
          name: "Michael Bluth",
          email: "mbluth@bluthcompany.com",
          type: "lead",
          subtitle: "Inbound Lead",
        },
        {
          id: "d1",
          name: "Acme Renewal",
          email: "billing@acmerenewal.com",
          type: "deal",
          subtitle: "Q4 Deal",
        },
        {
          id: "o1",
          name: "Stark Industries",
          email: "contracts@stark.com",
          type: "organization",
          subtitle: "Enterprise Account",
        },
      ];
      const filtered = mockDb.filter(
        (item) =>
          item.type === signer.entityType &&
          (item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.email.toLowerCase().includes(query.toLowerCase())),
      );
      setCrmResults(filtered);
    }
    setActiveDropdownId(signer.id);
  };

  const handleSelectEntity = (signerId: string, entity: CrmEntityOption) => {
    setSignerSearchQueries((prevQueries) => ({
      ...(prevQueries || {}),
      [signerId]: entity.email,
    }));
    onChange((prev) =>
      prev.map((s) =>
        s.id === signerId
          ? { ...s, name: entity.name, email: entity.email }
          : s,
      ),
    );
    setActiveDropdownId(null);
  };

  const handleAddMe = () => {
    if (!currentUser) return;

    onChange((prev) => {
      const alreadyAdded = prev.some(
        (s) => s.email.toLowerCase() === currentUser.email.toLowerCase(),
      );
      if (alreadyAdded) return prev;

      const emptySigner = prev.find((s) => !s.email && !s.name);
      if (emptySigner) {
        return prev.map((s) =>
          s.id === emptySigner.id
            ? {
                ...s,
                name: currentUser.name,
                email: currentUser.email,
                entityType: "email" as CrmEntityType,
              }
            : s,
        );
      }

      const newSigner: SignatureSigner & { entityType?: CrmEntityType } = {
        id: `sg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: currentUser.name,
        email: currentUser.email,
        order: prev.length + 1,
        role: "Signer",
        deliveryMethod: "email",
        status: "Pending",
        token: `sig-signer-${Date.now()}`,
        colorIndex: 0,
        entityType: "email",
      };
      return [...prev, newSigner].map((s, idx) => ({
        ...s,
        order: idx + 1,
        colorIndex: idx % SIGNER_COLORS.length,
      }));
    });
  };

  // --- CC Handlers ---
  const handleAddCc = () => {
    setCcRecipients([
      ...ccRecipients,
      {
        id: `cc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: "",
        email: "",
        entityType: "email",
        deliveryMethod: "email",
      },
    ]);
  };

  const handleUpdateCc = (id: string, field: keyof CcRecipient, value: any) => {
    if (field === "entityType") {
      setCcSearchQueries((prevQueries) => ({
        ...(prevQueries || {}),
        [id]: "",
      }));
    }

    setCcRecipients(
      ccRecipients.map((cc) => {
        if (cc.id !== id) return cc;
        if (field === "entityType") {
          return { ...cc, entityType: value, email: "", name: "" };
        }
        return { ...cc, [field]: value };
      }),
    );

    if (field === "entityType") {
      setActiveCcDropdownId(null);
    }
  };

  const handleSearchCcCrm = async (cc: CcRecipient, query: string) => {
    setCcSearchQueries((prevQueries) => ({
      ...(prevQueries || {}),
      [cc.id]: query,
    }));

    if (!query.trim()) {
      setCcRecipients(
        ccRecipients.map((item) =>
          item.id === cc.id ? { ...item, name: "", email: "" } : item,
        ),
      );
      setCcCrmResults([]);
      setActiveCcDropdownId(null);
      return;
    }

    if (searchCrmEntities) {
      const results = await searchCrmEntities(cc.entityType, query);
      setCcCrmResults(results);
    } else {
      const mockDb: CrmEntityOption[] = [
        {
          id: "c1",
          name: "Sarah Connor",
          email: "sarah@cyberdyne.io",
          type: "contact",
          subtitle: "Tech Contact",
        },
        {
          id: "l1",
          name: "Michael Bluth",
          email: "mbluth@bluthcompany.com",
          type: "lead",
          subtitle: "Inbound Lead",
        },
        {
          id: "d1",
          name: "Acme Renewal",
          email: "billing@acmerenewal.com",
          type: "deal",
          subtitle: "Q4 Deal",
        },
        {
          id: "o1",
          name: "Stark Industries",
          email: "contracts@stark.com",
          type: "organization",
          subtitle: "Enterprise Account",
        },
      ];
      const filtered = mockDb.filter(
        (item) =>
          item.type === cc.entityType &&
          (item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.email.toLowerCase().includes(query.toLowerCase())),
      );
      setCcCrmResults(filtered);
    }
    setActiveCcDropdownId(cc.id);
  };

  const handleSelectCcEntity = (ccId: string, entity: CrmEntityOption) => {
    setCcSearchQueries((prevQueries) => ({
      ...(prevQueries || {}),
      [ccId]: entity.email,
    }));
    setCcRecipients(
      ccRecipients.map((cc) =>
        cc.id === ccId ? { ...cc, name: entity.name, email: entity.email } : cc,
      ),
    );
    setActiveCcDropdownId(null);
  };

  const handleRemoveCc = (id: string) => {
    setCcRecipients(ccRecipients.filter((cc) => cc.id !== id));
  };

  // --- Drag to reorder ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragOverId) setDragOverId(id);
  };
  const handleDragLeave = () => setDragOverId(null);
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    onChange((prev) => {
      const fromIndex = prev.findIndex((s) => s.id === draggedId);
      const toIndex = prev.findIndex((s) => s.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const reordered = [...prev];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      return reordered.map((s, idx) => ({
        ...s,
        order: idx + 1,
        colorIndex: idx % SIGNER_COLORS.length,
      }));
    });
    setDraggedId(null);
  };
  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center space-x-2 text-gray-900 font-semibold">
          <Users className="w-5 h-5 text-violet-600" />
          <span>Signer</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleAddMe}
            className={`px-3 py-1.5 rounded-md transition-all text-sm bg-white border border-border text-gray-700 hover:text-gray-900 ${
              !currentUser ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            Add me
          </button>

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
            <span>Add bulk signer</span>
          </button>
        </div>
      </div>

      {/* Recipient Rows */}
      <div className="space-y-3">
        {(signers || []).map((signer: any, index) => {
          const color = SIGNER_COLORS[index % SIGNER_COLORS.length];
          const isDragging = draggedId === signer.id;
          const isDragOver =
            dragOverId === signer.id && draggedId !== signer.id;
          const currentEntityType = signer.entityType || "email";
          const hasSelectedCrmEntity =
            currentEntityType !== "email" && Boolean(signer.name);

          return (
            <div
              key={signer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, signer.id)}
              onDragOver={(e) => handleDragOver(e, signer.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, signer.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center space-x-3 bg-slate-50/70 border rounded-xl p-3.5 transition-all relative ${
                isDragOver
                  ? "border-violet-400 ring-2 ring-violet-200"
                  : "border-slate-200/80 hover:border-slate-300"
              } ${isDragging ? "opacity-40" : ""}`}
            >
              <div className="flex items-center space-x-2 text-gray-400">
                <GripVertical className="w-4 h-4 cursor-grab active:cursor-grabbing" />
                <span
                  className={`w-7 h-7 flex items-center justify-center rounded-lg font-bold text-xs ${color.bg} ${color.text} border ${color.border}`}
                >
                  {signer.order}
                </span>
              </div>

              <div className="w-32 space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Recipient Source
                </label>
                <select
                  value={currentEntityType}
                  onChange={(e) =>
                    handleUpdateSigner(
                      signer.id,
                      "entityType",
                      e.target.value as CrmEntityType,
                    )
                  }
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                >
                  <option value="email">Direct Email</option>
                  <option value="contact">Contact</option>
                  <option value="lead">Lead</option>
                  <option value="deal">Deal</option>
                  <option value="organization">Organization</option>
                </select>
              </div>

              {/* Email Address Field (Always labeled "Email Address") */}
              <div className="flex-1 space-y-1 relative">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Email Address
                </label>

                <input
                  type={currentEntityType === "email" ? "email" : "text"}
                  value={
                    currentEntityType === "email"
                      ? signer.email
                      : hasSelectedCrmEntity
                        ? signer.email
                        : signerSearchQueries[signer.id] !== undefined
                          ? signerSearchQueries[signer.id]
                          : ""
                  }
                  onChange={(e) => {
                    if (currentEntityType === "email") {
                      handleUpdateSigner(signer.id, "email", e.target.value);
                    } else {
                      handleSearchCrm(signer, e.target.value);
                    }
                  }}
                  placeholder={
                    currentEntityType === "email"
                      ? "Enter the email address"
                      : `Search ${currentEntityType} by name or email...`
                  }
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                />

                {activeDropdownId === signer.id &&
                  crmResults.length > 0 &&
                  currentEntityType !== "email" && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto divide-y divide-gray-50">
                      <div className="p-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50">
                        Matching {currentEntityType}s
                      </div>
                      {crmResults.map((result) => (
                        <div
                          key={result.id}
                          onClick={() => handleSelectEntity(signer.id, result)}
                          className="flex items-center justify-between px-3 py-2 hover:bg-violet-50 cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="text-xs font-semibold text-gray-800">
                              {result.name}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {result.email}
                            </div>
                          </div>
                          {result.subtitle && (
                            <div className="text-[10px] text-gray-400">
                              {result.subtitle}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              {/* Name Field (Hidden for CRM sources until an entity is selected) */}
              {(currentEntityType === "email" || hasSelectedCrmEntity) && (
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
              )}

              <div className="w-36 space-y-1">
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

              <div className="w-36 space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Deliver via
                </label>
                <select
                  value={signer.deliveryMethod}
                  onChange={(e) =>
                    handleUpdateSigner(
                      signer.id,
                      "deliveryMethod",
                      e.target.value as DeliveryMethod,
                    )
                  }
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                >
                  <option value="email">Email</option>
                  <option value="sms">Email + SMS</option>
                </select>
              </div>

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
                  title={
                    signers.length <= 1
                      ? "At least one recipient is required"
                      : "Remove recipient"
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <button
          type="button"
          onClick={handleAddSigner}
          className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4 text-violet-600" />
          <span>Add another signer</span>
        </button>
      </div>

      {/* CCs */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          CCs <span className="text-slate-400 font-normal">(optional)</span>
        </label>

        {ccRecipients.length > 0 && (
          <div className="space-y-3">
            {ccRecipients.map((cc) => {
              const currentCcEntityType = cc.entityType || "email";
              const hasSelectedCcCrmEntity =
                currentCcEntityType !== "email" && Boolean(cc.name);

              return (
                <div
                  key={cc.id}
                  className="flex items-center space-x-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 transition-all relative"
                >
                  <div className="w-32 space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Recipient Source
                    </label>
                    <select
                      value={currentCcEntityType}
                      onChange={(e) =>
                        handleUpdateCc(
                          cc.id,
                          "entityType",
                          e.target.value as CrmEntityType,
                        )
                      }
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    >
                      <option value="email">Direct Email</option>
                      <option value="contact">Contact</option>
                      <option value="lead">Lead</option>
                      <option value="deal">Deal</option>
                      <option value="organization">Organization</option>
                    </select>
                  </div>

                  <div className="flex-1 space-y-1 relative">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Email Address
                    </label>

                    <input
                      type={currentCcEntityType === "email" ? "email" : "text"}
                      value={
                        currentCcEntityType === "email"
                          ? cc.email
                          : hasSelectedCcCrmEntity
                            ? cc.email
                            : ccSearchQueries[cc.id] !== undefined
                              ? ccSearchQueries[cc.id]
                              : ""
                      }
                      onChange={(e) => {
                        if (currentCcEntityType === "email") {
                          handleUpdateCc(cc.id, "email", e.target.value);
                        } else {
                          handleSearchCcCrm(cc, e.target.value);
                        }
                      }}
                      placeholder={
                        currentCcEntityType === "email"
                          ? "Enter CC email address"
                          : `Search ${currentCcEntityType} by name or email...`
                      }
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    />

                    {activeCcDropdownId === cc.id &&
                      ccCrmResults.length > 0 &&
                      currentCcEntityType !== "email" && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto divide-y divide-gray-50">
                          <div className="p-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50">
                            Matching {currentCcEntityType}s
                          </div>
                          {ccCrmResults.map((result) => (
                            <div
                              key={result.id}
                              onClick={() =>
                                handleSelectCcEntity(cc.id, result)
                              }
                              className="flex items-center justify-between px-3 py-2 hover:bg-violet-50 cursor-pointer transition-colors"
                            >
                              <div>
                                <div className="text-xs font-semibold text-gray-800">
                                  {result.name}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {result.email}
                                </div>
                              </div>
                              {result.subtitle && (
                                <div className="text-[10px] text-gray-400">
                                  {result.subtitle}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  {(currentCcEntityType === "email" ||
                    hasSelectedCcCrmEntity) && (
                    <div className="flex-1 space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Name
                      </label>
                      <input
                        type="text"
                        value={cc.name}
                        onChange={(e) =>
                          handleUpdateCc(cc.id, "name", e.target.value)
                        }
                        placeholder="Recipient's name"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      />
                    </div>
                  )}

                  <div className="w-36 space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Deliver via
                    </label>
                    <select
                      value={cc.deliveryMethod}
                      onChange={(e) =>
                        handleUpdateCc(
                          cc.id,
                          "deliveryMethod",
                          e.target.value as DeliveryMethod,
                        )
                      }
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    >
                      <option value="email">Email</option>
                      <option value="sms">Email + SMS</option>
                    </select>
                  </div>

                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={() => handleRemoveCc(cc.id)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 bg-white transition-all"
                      title="Remove CC recipient"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={handleAddCc}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-600" />
          <span>Add CC recipient</span>
        </button>
      </div>
    </div>
  );
}
