"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { CartItem } from "@/types";

interface SaleGridProps {
  items: CartItem[];
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onUpdateDiscount: (productId: number, discount: number) => void;
  onRemove: (productId: number) => void;
}

export function SaleGrid({ items, onUpdateQuantity, onUpdateDiscount, onRemove }: SaleGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-2">🛒</div>
          <div className="text-lg">Scan or search a product to begin</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary/50 border-b border-border">
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Product</th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Price</th>
            <th className="text-center px-3 py-2 font-medium text-muted-foreground w-28">Qty</th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Discount</th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground w-32">Total</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.product.id} className="border-b border-border hover:bg-secondary/20">
              <td className="px-3 py-2">
                <div className="font-medium">{item.product.name}</div>
                <div className="text-xs text-muted-foreground">{item.product.sku || item.product.barcode}</div>
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {item.unitPrice.toLocaleString("es-PY")}
              </td>
              <td className="px-3 py-2">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => onUpdateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                  className="h-8 text-center font-mono w-full"
                />
              </td>
              <td className="px-3 py-2">
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={item.discount}
                  onChange={(e) => onUpdateDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                  className="h-8 text-right font-mono w-full"
                />
              </td>
              <td className="px-3 py-2 text-right font-mono font-bold">
                {item.lineTotal.toLocaleString("es-PY")}
              </td>
              <td className="px-1 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:text-red-300"
                  onClick={() => onRemove(item.product.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
