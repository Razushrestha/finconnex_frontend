"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, DollarSign, User, Hash } from "lucide-react";
import {
  PRODUCT_TYPES,
  nextProductIds,
  upsertProduct,
  type ProductType,
} from "@/lib/finance/products/types";
import {
  createCrmProduct,
  persistRemoteProduct,
  toCreateProductBody,
  tryCrmProduct,
} from "@/lib/finance/products/api";
import { formatFinanceDate } from "@/lib/finance/shared";
import {
  financeOwnerOptions,
  useFinanceDirectory,
} from "@/lib/finance/use-finance-directory";
import { defaultActorName } from "@/lib/rules/actor";
import { FinanceCreateDialog } from "@/components/finance/FinanceCreateDialog";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";

interface Props {
  layoutId?: string;
  redirect?: boolean;
  variant?: "page" | "modal";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateProductForm({
  layoutId: _l,
  redirect: _r,
  variant = "page",
  open = true,
  onOpenChange,
  onCreated,
}: Props) {
  void _l;
  void _r;
  const router = useRouter();
  const directory = useFinanceDirectory();
  const [name, setName] = useState("");
  const [type, setType] = useState<ProductType>("Service");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxRate, setTaxRate] = useState("10");
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");
  const [createdBy, setCreatedBy] = useState<string>(defaultActorName());
  const ownerOptions = financeOwnerOptions(directory.owners, createdBy);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (unitPrice.trim() === "" || Number(unitPrice) < 0) {
      next.unitPrice = "Enter a unit price";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextProductIds();
    const payload = toCreateProductBody({
      sku: ids.sku,
      name: name.trim(),
      type,
      status: "Active",
      description: description.trim() || undefined,
      unitPrice: Number(unitPrice) || 0,
      taxRate: Number(taxRate) || 0,
      unit: unit.trim() || "unit",
      createdBy,
    });

    const remote = await tryCrmProduct(() => createCrmProduct(payload));
    if (remote) {
      persistRemoteProduct(remote);
    } else {
      upsertProduct({
        id: ids.id,
        sku: ids.sku,
        name: name.trim(),
        type,
        status: "Active",
        description: description.trim() || undefined,
        unitPrice: Number(unitPrice) || 0,
        taxRate: Number(taxRate) || 0,
        unit: unit.trim() || "unit",
        createdBy,
        createdAt: formatFinanceDate(),
      });
    }

    if (createAnother) {
      setName("");
      setDescription("");
      setErrors({});
      return;
    }
    if (variant === "modal") {
      onCreated?.();
      onOpenChange?.(false);
      return;
    }
    router.push("/finance/products");
  }

  const fields = (
    <>
      <Field label="Name" required error={errors.name} className="col-span-full">
        <InputShell icon={Package} error={!!errors.name}>
          <input
            className={elevatedInputClass(true)}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name of the product or service"
          />
        </InputShell>
      </Field>
      <Field label="Type" required>
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={type}
            onChange={(e) => setType(e.target.value as ProductType)}
          >
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Unit">
        <InputShell icon={Hash}>
          <input
            className={elevatedInputClass(true)}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. hour, package, fee"
          />
        </InputShell>
      </Field>
      <Field label="Unit price (AUD)" required error={errors.unitPrice}>
        <InputShell icon={DollarSign} error={!!errors.unitPrice}>
          <input
            type="number"
            min={0}
            step={0.01}
            className={elevatedInputClass(true)}
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Tax %">
        <InputShell>
          <input
            type="number"
            min={0}
            step={0.1}
            className={elevatedInputClass(false)}
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Created by">
        <InputShell icon={User}>
          <select
            className={elevatedSelectClass(true)}
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
          >
            <option value="">Select a person</option>
            {ownerOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Description" className="col-span-full">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </TextAreaShell>
      </Field>
    </>
  );

  if (variant === "modal") {
    return (
      <FinanceCreateDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Add Product / Service"
        icon={Package}
        saveLabel="Save item"
        onSave={onSave}
        wide={false}
      >
        {fields}
      </FinanceCreateDialog>
    );
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{
        label: "Products & Services",
        href: "/finance/products",
      }}
      badge="§13.6"
      title="Add Product / Service"
      subtitle="Shared catalogue pricing for estimates, quotations, and invoices."
      tip="Name is required. Active items appear in line-item pickers."
      cardIcon={Package}
      cardTitle="Catalogue item"
      cardDescription="SRS §20.5: maintain pricing in one place"
      listHref="/finance/products"
      saveLabel="Save item"
      onSave={(again) => void onSave(again)}
    >
      {fields}
    </CreateEntityFormShell>
  );
}
