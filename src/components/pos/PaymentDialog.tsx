"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Customer } from "@/types";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onPay: (method: string, amount: number, reference?: string) => void;
  customer: Customer | null;
}

const paymentMethods = [
  { id: "cash", label: "Cash", color: "bg-green-600 hover:bg-green-500" },
  { id: "transfer", label: "Transfer", color: "bg-blue-600 hover:bg-blue-500" },
  { id: "credit", label: "Credit Account", color: "bg-orange-600 hover:bg-orange-500" },
  { id: "partial", label: "Partial", color: "bg-purple-600 hover:bg-purple-500" },
];

export function PaymentDialog({ open, onOpenChange, total, onPay, customer }: PaymentDialogProps) {
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(total);
  const [reference, setReference] = useState("");

  function handlePay() {
    onPay(method, amount || total, reference || undefined);
    setMethod("cash");
    setAmount(total);
    setReference("");
  }

  function handleMethodChange(m: string) {
    setMethod(m);
    if (m === "credit" && customer) {
      setAmount(total);
    } else {
      setAmount(total);
    }
  }

  const canPay =
    method === "cash" ||
    method === "transfer"
      ? amount >= total
      : method === "credit"
      ? customer !== null
      : amount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center p-4 bg-secondary rounded-lg">
            <div className="text-sm text-muted-foreground">Amount Due</div>
            <div className="text-3xl font-bold font-mono text-green-400">
              {formatCurrency(total)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((pm) => (
              <button
                key={pm.id}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                  method === pm.id ? pm.color + " text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                } ${pm.id === "credit" && !customer ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => pm.id !== "credit" || customer ? handleMethodChange(pm.id) : null}
                disabled={pm.id === "credit" && !customer}
              >
                {pm.label}
              </button>
            ))}
          </div>

          {(method === "cash" || method === "transfer" || method === "partial") && (
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Amount</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="text-xl font-mono h-12"
                min="0"
              />
              {method === "cash" && amount > total && (
                <div className="text-sm text-muted-foreground mt-1">
                  Change: <span className="text-green-400 font-mono">{formatCurrency(amount - total)}</span>
                </div>
              )}
            </div>
          )}

          {method === "transfer" && (
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Reference Number</label>
              <Input
                placeholder="Transfer reference..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}

          {method === "credit" && customer && (
            <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <div className="text-sm font-medium text-orange-400">Credit Account Sale</div>
              <div className="text-xs text-muted-foreground mt-1">
                Current balance: {formatCurrency(Number(customer.balance))} | 
                Credit limit: {formatCurrency(Number(customer.creditLimit))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                New balance: {formatCurrency(Number(customer.balance) + total)}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1 h-12 text-base font-bold" onClick={handlePay} disabled={!canPay}>
              Confirm Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
