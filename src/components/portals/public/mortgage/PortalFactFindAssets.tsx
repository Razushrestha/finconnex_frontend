"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CurrencyInput } from "@/components/portals/public/mortgage/CurrencyInput";
import { GeoAddressField } from "@/components/portals/public/mortgage/GeoAddressField";
import {
  assetsTotal,
  emptyProperty,
  emptyVehicle,
  formatMoney,
  moneyNumber,
  parseProperties,
  parseVehicles,
  propertiesTotal,
  type FactFindProperty,
  type FactFindVehicle,
} from "@/lib/portals/mortgage";
import { cn } from "@/lib/utils";

const VEHICLE_TYPES = ["Car", "Motorcycle", "Boat", "Caravan", "Other"];
const YEARS = Array.from({ length: 40 }, (_, i) => String(new Date().getFullYear() - i));

export function PortalFactFindAssets({
  valueOf,
  disabled,
  showErrors,
  onChange,
}: {
  valueOf: (id: string) => string;
  disabled: boolean;
  showErrors?: boolean;
  onChange: (id: string, value: string) => void;
}) {
  const [open, setOpen] = useState<string | null>("savings");
  const answers = {
    savingsTotal: valueOf("savingsTotal"),
    sharesTotal: valueOf("sharesTotal"),
    superTotal: valueOf("superTotal"),
    superInstitution: valueOf("superInstitution"),
    assetPropertyValue: valueOf("assetPropertyValue"),
    propertiesJson: valueOf("propertiesJson"),
    vehiclesJson: valueOf("vehiclesJson"),
    homeContents: valueOf("homeContents"),
    otherAssets: valueOf("otherAssets"),
  };
  const vehicles = parseVehicles(answers.vehiclesJson);
  const properties = parseProperties(answers.propertiesJson, answers.assetPropertyValue);
  const combined = assetsTotal(answers);

  function setVehicles(next: FactFindVehicle[]) {
    onChange("vehiclesJson", JSON.stringify(next));
  }

  function setProperties(next: FactFindProperty[]) {
    onChange("propertiesJson", JSON.stringify(next));
    onChange("assetPropertyValue", String(propertiesTotal(next) || ""));
  }

  const savingsMissing = Boolean(showErrors && !answers.savingsTotal.trim());

  useEffect(() => {
    if (savingsMissing) setOpen("savings");
  }, [savingsMissing]);

  return (
    <div className="mt-6 space-y-3">
      <AssetCard
        id="savings"
        open={open === "savings"}
        invalid={savingsMissing}
        onToggle={() => setOpen((v) => (v === "savings" ? null : "savings"))}
        icon={<MoneyBagIcon />}
        title="Savings, shares & superannuation"
        total={
          moneyNumber(answers.savingsTotal) +
          moneyNumber(answers.sharesTotal) +
          moneyNumber(answers.superTotal)
        }
        disabled={disabled}
      >
        <MoneyField
          label="Total savings"
          required
          invalid={savingsMissing}
          value={answers.savingsTotal}
          disabled={disabled}
          onChange={(next) => onChange("savingsTotal", next)}
        />
        <MoneyField
          label="Total shares"
          value={answers.sharesTotal}
          disabled={disabled}
          onChange={(next) => onChange("sharesTotal", next)}
        />
        <MoneyField
          label="Total superannuation"
          value={answers.superTotal}
          disabled={disabled}
          onChange={(next) => onChange("superTotal", next)}
        />
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-slate-900">
            Primary superannuation institution
          </span>
          <input
            value={answers.superInstitution}
            disabled={disabled}
            onChange={(e) => onChange("superInstitution", e.target.value)}
            className={inputClass}
            placeholder="e.g. Australian Super"
          />
        </label>
      </AssetCard>

      <AssetCard
        id="properties"
        open={open === "properties"}
        onToggle={() => setOpen((v) => (v === "properties" ? null : "properties"))}
        icon={<HouseIcon />}
        title="Properties"
        total={propertiesTotal(properties)}
        disabled={disabled}
      >
        {properties.length === 0 ? (
          <p className="text-[13px] text-slate-500">No properties added yet.</p>
        ) : null}
        {properties.map((property, index) => (
          <div key={property.id} className="space-y-3 rounded-xl bg-[#F7F6F9] p-3">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-bold text-slate-900">Property {index + 1}</div>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => setProperties(properties.filter((item) => item.id !== property.id))}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-rose-600 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              ) : null}
            </div>
            <GeoAddressField
              label="Address of a property you own"
              value={property.address}
              disabled={disabled}
              placeholder="Enter an address"
              onChange={(next) =>
                setProperties(
                  properties.map((item) =>
                    item.id === property.id ? { ...item, address: next, addressGeo: "" } : item,
                  ),
                )
              }
              onPick={(hit) =>
                setProperties(
                  properties.map((item) =>
                    item.id === property.id
                      ? { ...item, address: hit.label, addressGeo: "1" }
                      : item,
                  ),
                )
              }
            />
            <MoneyField
              label="Estimated property value"
              value={property.value}
              disabled={disabled}
              onChange={(next) =>
                setProperties(
                  properties.map((item) =>
                    item.id === property.id ? { ...item, value: next } : item,
                  ),
                )
              }
            />
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_minmax(160px,200px)]">
              <div>
                <span className="mb-1.5 block text-[13px] font-semibold text-slate-900">
                  Current property usage
                </span>
                <div className="flex gap-2">
                  {["Owner occupied", "Investment"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        setProperties(
                          properties.map((item) =>
                            item.id === property.id
                              ? {
                                  ...item,
                                  usage: opt,
                                  rentalWeekly: opt === "Investment" ? item.rentalWeekly : "",
                                }
                              : item,
                          ),
                        )
                      }
                      className={cn(
                        "h-10 rounded-lg px-3 text-[12px] font-semibold",
                        property.usage === opt
                          ? "bg-[#EDE4F7] text-[#5A32A3] ring-1 ring-[#5A32A3]/30"
                          : "bg-white text-slate-600 ring-1 ring-black/5 hover:bg-violet-50",
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              {property.usage === "Investment" ? (
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-semibold text-slate-900">
                    Rental income weekly
                  </span>
                  <CurrencyInput
                    value={property.rentalWeekly ?? ""}
                    disabled={disabled}
                    onChange={(next) =>
                      setProperties(
                        properties.map((item) =>
                          item.id === property.id ? { ...item, rentalWeekly: next } : item,
                        ),
                      )
                    }
                  />
                </label>
              ) : null}
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-slate-900">
                What is your share of ownership?
              </span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={property.ownership}
                  disabled={disabled}
                  onChange={(e) =>
                    setProperties(
                      properties.map((item) =>
                        item.id === property.id ? { ...item, ownership: e.target.value } : item,
                      ),
                    )
                  }
                  className={cn(inputClass, "pr-8")}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-slate-400">
                  %
                </span>
              </div>
            </label>
          </div>
        ))}
        {!disabled ? (
          <div>
            <button
              type="button"
              onClick={() => setProperties([...properties, emptyProperty()])}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#5A32A3]/40 text-[13px] font-semibold text-[#5A32A3] hover:bg-violet-50"
            >
              <Plus className="h-4 w-4" />
              Add property
            </button>
            <p className="mt-1.5 text-[12px] text-slate-400">
              Add a property you already own, or skip this if you do not have one yet.
            </p>
          </div>
        ) : null}
      </AssetCard>

      <AssetCard
        id="vehicles"
        open={open === "vehicles"}
        onToggle={() => setOpen((v) => (v === "vehicles" ? null : "vehicles"))}
        icon={<CarIcon />}
        title="Vehicles"
        total={vehicles.reduce((sum, item) => sum + moneyNumber(item.value), 0)}
        disabled={disabled}
      >
        {vehicles.length === 0 ? (
          <p className="text-[13px] text-slate-500">No vehicles added yet.</p>
        ) : null}
        {vehicles.map((vehicle, index) => (
          <div key={vehicle.id} className="space-y-3 rounded-xl bg-[#F7F6F9] p-3">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-bold text-slate-900">
                {vehicle.type || "Vehicle"} {index + 1}
              </div>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => setVehicles(vehicles.filter((item) => item.id !== vehicle.id))}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-rose-600 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Type"
                value={vehicle.type}
                options={VEHICLE_TYPES}
                disabled={disabled}
                onChange={(next) =>
                  setVehicles(vehicles.map((item) => (item.id === vehicle.id ? { ...item, type: next } : item)))
                }
              />
              <MoneyField
                label="Value"
                value={vehicle.value}
                disabled={disabled}
                onChange={(next) =>
                  setVehicles(vehicles.map((item) => (item.id === vehicle.id ? { ...item, value: next } : item)))
                }
              />
              <TextField
                label="Manufacturer / Make"
                value={vehicle.make}
                disabled={disabled}
                onChange={(next) =>
                  setVehicles(vehicles.map((item) => (item.id === vehicle.id ? { ...item, make: next } : item)))
                }
              />
              <TextField
                label="Model"
                value={vehicle.model}
                disabled={disabled}
                onChange={(next) =>
                  setVehicles(vehicles.map((item) => (item.id === vehicle.id ? { ...item, model: next } : item)))
                }
              />
              <SelectField
                label="Year"
                value={vehicle.year}
                options={YEARS}
                disabled={disabled}
                onChange={(next) =>
                  setVehicles(vehicles.map((item) => (item.id === vehicle.id ? { ...item, year: next } : item)))
                }
              />
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-slate-900">
                  Share of ownership
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={vehicle.ownership}
                    disabled={disabled}
                    onChange={(e) =>
                      setVehicles(
                        vehicles.map((item) =>
                          item.id === vehicle.id ? { ...item, ownership: e.target.value } : item,
                        ),
                      )
                    }
                    className={cn(inputClass, "pr-8")}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-slate-400">
                    %
                  </span>
                </div>
              </label>
            </div>
          </div>
        ))}
        {!disabled ? (
          <button
            type="button"
            onClick={() => setVehicles([...vehicles, emptyVehicle()])}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#5A32A3]/40 text-[13px] font-semibold text-[#5A32A3] hover:bg-violet-50"
          >
            <Plus className="h-4 w-4" />
            Add vehicle
          </button>
        ) : null}
      </AssetCard>

      <AssetCard
        id="contents"
        open={open === "contents"}
        onToggle={() => setOpen((v) => (v === "contents" ? null : "contents"))}
        icon={<DiamondIcon />}
        title="Home contents & other assets"
        total={moneyNumber(answers.homeContents) + moneyNumber(answers.otherAssets)}
        disabled={disabled}
      >
        <MoneyField
          label="Home contents"
          hint="Include things like furniture, jewellery, art, and other personal belongings."
          value={answers.homeContents}
          disabled={disabled}
          onChange={(next) => onChange("homeContents", next)}
        />
        <MoneyField
          label="Other assets"
          hint="Include things like machinery, equipment or any other investments."
          value={answers.otherAssets}
          disabled={disabled}
          onChange={(next) => onChange("otherAssets", next)}
        />
      </AssetCard>

      <div className="flex items-center justify-between px-1 pt-2 text-[14px] font-bold text-slate-900">
        <span>Combined total</span>
        <span>{formatMoney(combined)}</span>
      </div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-lg bg-white px-3.5 text-[14px] text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.07)] outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-[#5A32A3] disabled:bg-slate-50";

function AssetCard({
  icon,
  title,
  total,
  open,
  invalid,
  onToggle,
  disabled,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  total: number;
  open: boolean;
  invalid?: boolean;
  onToggle: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      data-invalid={invalid || undefined}
      className={cn(
        "overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-black/5",
        invalid && "ring-2 ring-rose-400",
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        {icon}
        <div className="min-w-0 flex-1 text-[14px] font-bold text-slate-900">{title}</div>
        {!open ? <div className="text-[13px] font-bold text-slate-800">{formatMoney(total)}</div> : null}
        <button
          type="button"
          disabled={disabled && !open}
          onClick={onToggle}
          className="h-8 rounded-lg px-3 text-[12px] font-semibold text-[#5A32A3] ring-1 ring-slate-200 hover:bg-violet-50"
        >
          {open ? "Close" : "Edit"}
        </button>
      </div>
      {open ? <div className="space-y-3 border-t border-slate-100 px-4 py-4">{children}</div> : null}
    </section>
  );
}

function MoneyField({
  label,
  hint,
  value,
  disabled,
  required,
  invalid,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  disabled: boolean;
  required?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block" data-invalid={invalid || undefined}>
      <span className={cn("mb-1.5 block text-[13px] font-semibold", invalid ? "text-rose-700" : "text-slate-900")}>
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {hint ? <p className="-mt-1 mb-1.5 text-[12px] text-slate-400">{hint}</p> : null}
      <CurrencyInput value={value} disabled={disabled} invalid={invalid} onChange={onChange} />
      {invalid ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">Required</p> : null}
    </label>
  );
}

function TextField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-slate-900">{label}</span>
      <input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-slate-900">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function MoneyBagIcon() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-[16px]" aria-hidden>
      💰
    </span>
  );
}

function HouseIcon() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[16px]" aria-hidden>
      🏠
    </span>
  );
}

function CarIcon() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-[16px]" aria-hidden>
      🚗
    </span>
  );
}

function DiamondIcon() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-[16px]" aria-hidden>
      💎
    </span>
  );
}
