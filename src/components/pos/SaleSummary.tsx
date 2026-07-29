"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useTranslations } from "@/i18n";
import { User, CreditCard, Trash2 } from "lucide-react";
import type { CartItem, Customer, PriceList } from "@/types";

interface SaleSummaryProps {
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  totalQuantity: number;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  selectedPriceList: number;
  priceLists: PriceList[];
  onSelectPriceList: (id: number) => void;
  onPayment: () => void;
  onClear: () => void;
}

export function SaleSummary({
  items,
  subtotal,
  discount,
  tax,
  total,
  totalQuantity,
  selectedCustomer,
  onSelectCustomer,
  selectedPriceList,
  priceLists,
  onSelectPriceList,
  onPayment,
  onClear,
}: SaleSummaryProps) {
  const t = useTranslations();
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomers, setShowCustomers] = useState(false);

  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) {
      setCustomers([]);
      setShowCustomers(false);
      return;
    }
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setCustomers(data);
      setShowCustomers(true);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(customerSearch), 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  return (
    <div className="border-t border-border bg-card p-3">
      <div className="grid grid-cols-4 gap-3">
        {/* Customer */}
        <div className="col-span-1 relative">
          <label className="text-xs text-muted-foreground mb-1 block">{t.pos.customer}</label>
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-secondary p-2 rounded">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <div>
                  <div className="text-sm font-medium">{selectedCustomer.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.pos.balance} {formatCurrency(Number(selectedCustomer.balance))}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onSelectCustomer(null)}
                aria-label="Remove customer"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <Input
                placeholder={t.pos.searchCustomer}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onFocus={() => customerSearch && setShowCustomers(true)}
                className="h-9 text-sm"
              />
              {showCustomers && customers.length > 0 && (
                <div className="absolute left-0 right-0 bottom-full mb-1 z-50 max-h-48 overflow-auto rounded border border-border bg-card shadow-lg">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-secondary/50"
                      onClick={() => {
                        onSelectCustomer(c);
                        setCustomerSearch("");
                        setShowCustomers(false);
                      }}
                      aria-label={c.name}
                    >
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.phone || c.taxId}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Price List */}
        <div className="col-span-1">
          <label className="text-xs text-muted-foreground mb-1 block">{t.pos.priceList}</label>
          <Select
            value={selectedPriceList}
            onChange={(e) => onSelectPriceList(parseInt(e.target.value))}
            className="h-9 text-sm"
          >
            {priceLists.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Totals */}
        <div className="col-span-1 space-y-1">
          <label className="text-xs text-muted-foreground mb-1 block">{t.pos.summary}</label>
          <div className="bg-secondary/50 rounded p-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.common.subtotal}</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-400">
                <span>{t.common.discount}</span>
                <span className="font-mono">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.common.tax}</span>
              <span className="font-mono">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-border pt-1">
              <span>{t.common.total}</span>
              <span className="font-mono text-green-400 text-lg">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex flex-col gap-2 justify-end">
          <div className="text-xs text-muted-foreground text-right">
            {items.length} {t.pos.items} | {totalQuantity} {t.pos.units}
          </div>
          <Button
            onClick={onPayment}
            disabled={items.length === 0}
            className="h-12 text-base font-bold"
            aria-label={t.pos.pay}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            {t.pos.pay}
          </Button>
          <Button variant="outline" onClick={onClear} disabled={items.length === 0} className="h-9" aria-label={t.pos.clear}>
            <Trash2 className="h-4 w-4 mr-1" />
            {t.pos.clear}
          </Button>
        </div>
      </div>
    </div>
  );
}
