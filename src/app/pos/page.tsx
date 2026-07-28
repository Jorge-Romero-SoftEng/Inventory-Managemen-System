"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useState, useEffect, useCallback, useRef } from "react";
import { ProductSearch } from "@/components/pos/ProductSearch";
import { SaleGrid } from "@/components/pos/SaleGrid";
import { SaleSummary } from "@/components/pos/SaleSummary";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import { useTranslations } from "@/i18n";
import { getLocale } from "@/i18n/translations";
import type { Product, Customer, CartItem, PriceList } from "@/types";

interface QRData {
  saleId: number;
  saleNumber: string;
  mpOrderId: string;
  qrData: string;
  total: number;
  expiresAt: string;
}

export default function POSPage() {
  const t = useTranslations();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedPriceList, setSelectedPriceList] = useState<number>(1);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [saleCount, setSaleCount] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/price-lists?lang=${getLocale()}`)
      .then((r) => r.json())
      .then((data) => setPriceLists(data))
      .catch(console.error);
  }, []);

  const nextInvoice = `INV-${String(saleCount + 1).padStart(6, "0")}`;

  const addToCart = useCallback(
    (product: Product) => {
      setCart((prev) => {
        const existing = prev.find((item) => item.product.id === product.id);
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  lineTotal: (item.quantity + 1) * item.unitPrice - item.discount,
                }
              : item
          );
        }

        const priceEntry = product.prices?.find((p) => p.priceListId === selectedPriceList);
        const unitPrice = priceEntry ? Number(priceEntry.price) : Number(product.cost) * 1.3;

        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice,
            discount: 0,
            lineTotal: unitPrice,
          },
        ];
      });
      searchRef.current?.focus();
    },
    [selectedPriceList]
  );

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity, lineTotal: quantity * item.unitPrice - item.discount }
          : item
      )
    );
  }, []);

  const updateDiscount = useCallback((productId: number, discount: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, discount, lineTotal: item.quantity * item.unitPrice - discount }
          : item
      )
    );
  }, []);

  const removeItem = useCallback((productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedCustomer(null);
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const taxRate = 0.0;
  const tax = (subtotal - totalDiscount) * taxRate;
  const total = subtotal - totalDiscount + tax;

  async function handlePayment(method: string, amount: number, reference?: string) {
    try {
      const saleData = {
        customerId: selectedCustomer?.id || null,
        userId: 1,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          lineTotal: item.lineTotal,
        })),
        paymentMethod: method,
        discount: totalDiscount,
        tax,
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      });

      if (!res.ok) throw new Error("Failed to create sale");

      const sale = await res.json();

      if (method === "credit" && selectedCustomer) {
        const partialAmount = amount - total;
        if (partialAmount > 0) {
          await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              saleId: sale.id,
              method: "cash",
              amount: partialAmount,
            }),
          });
        }
      }

      setSaleCount((prev) => prev + 1);
      clearCart();
      setShowPayment(false);
    } catch (error) {
      console.error("Payment error:", error);
      alert(t.pos.errorPayment);
    }
  }

  async function handleGenerateQR(): Promise<QRData> {
    const res = await fetch("/api/payments/create-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: selectedCustomer?.id || null,
        userId: 1,
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          lineTotal: item.lineTotal,
        })),
        discount: totalDiscount,
        tax,
      }),
    });

    if (!res.ok) throw new Error("Failed to create QR order");

    const data = await res.json();
    return data;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar saleNumber={nextInvoice} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <ProductSearch ref={searchRef} onSelectProduct={addToCart} priceListId={selectedPriceList} />
          <div className="flex-1 overflow-auto p-2">
            <SaleGrid
              items={cart}
              onUpdateQuantity={updateQuantity}
              onUpdateDiscount={updateDiscount}
              onRemove={removeItem}
            />
          </div>
          <SaleSummary
            items={cart}
            subtotal={subtotal}
            discount={totalDiscount}
            tax={tax}
            total={total}
            totalQuantity={totalQuantity}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            selectedPriceList={selectedPriceList}
            priceLists={priceLists}
            onSelectPriceList={setSelectedPriceList}
            onPayment={() => setShowPayment(true)}
            onClear={clearCart}
          />
        </div>
      </div>
      <PaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        total={total}
        onPay={handlePayment}
        onGenerateQR={handleGenerateQR}
        customer={selectedCustomer}
      />
    </div>
  );
}
