"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  formatAUD,
  lineAmount,
  newLineItem,
  totalsFromLines,
  type FinanceLineItem,
} from "@/lib/finance/shared";
import {
  listActiveProducts,
  type FinanceProduct,
} from "@/lib/finance/products/types";
import {
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import { cn } from "@/lib/utils";

interface Props {
  items: FinanceLineItem[];
  onChange: (items: FinanceLineItem[]) => void;
  readOnly?: boolean;
}

export function LineItemsEditor({ items, onChange, readOnly }: Props) {
  const [products, setProducts] = useState<FinanceProduct[]>([]);
  const totals = totalsFromLines(items);

  useEffect(() => {
    setProducts(listActiveProducts());
  }, []);

  function update(id: string, patch: Partial<FinanceLineItem>) {
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function addBlank() {
    onChange([...items, newLineItem()]);
  }

  function addFromProduct(productId: string) {
    if (!productId) return;
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    onChange([
      ...items,
      newLineItem({
        productId: p.id,
        name: p.name,
        description: p.description,
        unitPrice: p.unitPrice,
        taxRate: p.taxRate,
        quantity: 1,
      }),
    ]);
  }

  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-3">
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={cn(elevatedSelectClass(false), "h-8 max-w-xs !text-[11px]")}
            defaultValue=""
            onChange={(e) => {
              addFromProduct(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">Add from catalogue…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {formatAUD(p.unitPrice)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addBlank}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Custom line
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200/80">
        <table className="w-full min-w-[640px] text-left text-[11px]">
          <thead className="bg-slate-50/80 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="w-20 px-2 py-2">Qty</th>
              <th className="w-28 px-2 py-2">Unit</th>
              <th className="w-20 px-2 py-2">Tax %</th>
              <th className="w-28 px-2 py-2 text-right">Amount</th>
              {!readOnly ? <th className="w-10 px-2 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 5 : 6}
                  className="px-3 py-6 text-center text-slate-400"
                >
                  No line items yet
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <div>
                        <div className="font-medium text-slate-800">{item.name}</div>
                        {item.description ? (
                          <div className="text-[10px] text-slate-400">
                            {item.description}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <input
                        className={cn(elevatedInputClass(false), "h-8 !text-[11px]")}
                        value={item.name}
                        placeholder="Item name"
                        onChange={(e) => update(item.id, { name: e.target.value })}
                      />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {readOnly ? (
                      item.quantity
                    ) : (
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className={cn(elevatedInputClass(false), "h-8 !text-[11px]")}
                        value={item.quantity}
                        onChange={(e) =>
                          update(item.id, {
                            quantity: Number(e.target.value) || 0,
                          })
                        }
                      />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {readOnly ? (
                      formatAUD(item.unitPrice)
                    ) : (
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className={cn(elevatedInputClass(false), "h-8 !text-[11px]")}
                        value={item.unitPrice}
                        onChange={(e) =>
                          update(item.id, {
                            unitPrice: Number(e.target.value) || 0,
                          })
                        }
                      />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {readOnly ? (
                      `${item.taxRate}%`
                    ) : (
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        className={cn(elevatedInputClass(false), "h-8 !text-[11px]")}
                        value={item.taxRate}
                        onChange={(e) =>
                          update(item.id, {
                            taxRate: Number(e.target.value) || 0,
                          })
                        }
                      />
                    )}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-slate-800">
                    {formatAUD(lineAmount(item))}
                  </td>
                  {!readOnly ? (
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                        aria-label="Remove line"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="ml-auto flex w-full max-w-xs flex-col gap-1 text-[12px]">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span>{formatAUD(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Tax</span>
          <span>{formatAUD(totals.tax)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-[13px] font-bold text-slate-900">
          <span>Total</span>
          <span>{formatAUD(totals.total)}</span>
        </div>
      </div>
    </div>
  );
}
