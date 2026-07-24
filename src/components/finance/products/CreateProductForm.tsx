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
import { FINANCE_OWNERS, formatFinanceDate } from "@/lib/finance/shared";
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
  layoutId: string;
  redirect: boolean;
}

export function CreateProductForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<ProductType>("Service");
  const [unitPrice, setUnitPrice] = useState("0");
  const [taxRate, setTaxRate] = useState("10");
  const [unit, setUnit] = useState("unit");
  const [description, setDescription] = useState("");
  const [createdBy, setCreatedBy] = useState<string>(FINANCE_OWNERS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (Number(unitPrice) < 0) next.unitPrice = "Price must be ≥ 0";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextProductIds();
    const created = upsertProduct({
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
    if (createAnother) {
      setName("");
      setDescription("");
      setErrors({});
      return;
    }
    router.push("/finance/products");
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
      cardDescription="SRS §20.5 — maintain pricing in one place"
      listHref="/finance/products"
      saveLabel="Save item"
      onSave={onSave}
    >
      <Field label="Name" required error={errors.name} className="sm:col-span-2">
        <InputShell icon={Package} error={!!errors.name}>
          <input
            className={elevatedInputClass(true)}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Home loan packaging"
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
            placeholder="package / fee / hour"
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
            {FINANCE_OWNERS.map((o) => (
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
    </CreateEntityFormShell>
  );
}
