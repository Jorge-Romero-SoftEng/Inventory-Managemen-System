"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { useTranslations } from "@/i18n";
import type { Customer } from "@/types";

interface QRData {
  saleId: number;
  saleNumber: string;
  mpOrderId: string;
  qrData: string;
  total: number;
  expiresAt: string;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onPay: (method: string, amount: number, reference?: string) => void;
  onGenerateQR: () => Promise<QRData>;
  customer: Customer | null;
}

type QRState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "display"; qrData: string; saleId: number }
  | { status: "polling"; saleId: number }
  | { status: "success" }
  | { status: "expired" }
  | { status: "error"; message: string };

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  onPay,
  onGenerateQR,
  customer,
}: PaymentDialogProps) {
  const t = useTranslations();
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(total);
  const [reference, setReference] = useState("");
  const [qrState, setQrState] = useState<QRState>({ status: "idle" });

  const paymentMethods = [
    { id: "cash", label: t.payment.cash, color: "bg-green-600 hover:bg-green-500" },
    { id: "transfer", label: t.payment.transfer, color: "bg-blue-600 hover:bg-blue-500" },
    { id: "qr", label: t.payment.qrCode, color: "bg-teal-600 hover:bg-teal-500" },
    { id: "credit", label: t.payment.creditAccount, color: "bg-orange-600 hover:bg-orange-500" },
  ];

  const resetQr = useCallback(() => {
    setQrState({ status: "idle" });
  }, []);

  useEffect(() => {
    if (!open) {
      resetQr();
    }
  }, [open, resetQr]);

  const pollSaleStatus = useCallback(
    async (saleId: number) => {
      const maxAttempts = 180;
      let attempts = 0;

      const poll = async (): Promise<void> => {
        attempts++;
        if (attempts > maxAttempts) {
          setQrState({ status: "expired" });
          return;
        }

        try {
          const res = await fetch(`/api/sales/${saleId}`);
          const sale = await res.json();

          if (sale.status === "completed") {
            setQrState({ status: "success" });
            setTimeout(() => {
              onPay("qr", total);
              onOpenChange(false);
            }, 1500);
            return;
          }

          if (sale.status === "cancelled") {
            setQrState({ status: "expired" });
            return;
          }

          setTimeout(poll, 5000);
        } catch {
          setTimeout(poll, 5000);
        }
      };

      poll();
    },
    [onPay, total, onOpenChange]
  );

  async function handleQRGenerate() {
    setQrState({ status: "loading" });

    try {
      const data = await onGenerateQR();

      if (!data.qrData) {
        throw new Error("No QR data returned from Mercado Pago");
      }

      setQrState({ status: "polling", saleId: data.saleId });
      pollSaleStatus(data.saleId);
    } catch (error) {
      console.error("QR generation error:", error);
      setQrState({ status: "error", message: t.payment.qrErrorMsg });
    }
  }

  function handlePay() {
    if (method === "qr") {
      handleQRGenerate();
      return;
    }
    onPay(method, amount || total, reference || undefined);
    setMethod("cash");
    setAmount(total);
    setReference("");
  }

  function handleMethodChange(m: string) {
    setMethod(m);
    setAmount(total);
    if (m !== "qr") {
      resetQr();
    }
  }

  const canPay =
    method === "cash" || method === "transfer"
      ? amount >= total
      : method === "credit"
      ? customer !== null
      : method === "qr"
      ? true
      : amount > 0;

  const isQrFlow = qrState.status !== "idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isQrFlow ? t.payment.scanQR : t.payment.processPayment}</DialogTitle>
        </DialogHeader>

        {/* QR Flow States */}
        {isQrFlow && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-secondary rounded-lg">
              <div className="text-sm text-muted-foreground">{t.payment.amountDue}</div>
              <div className="text-3xl font-bold font-mono text-green-400">
                {formatCurrency(total)}
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 p-4">
              {qrState.status === "loading" && (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
                  <div className="text-sm text-muted-foreground">{t.payment.generatingQR}</div>
                </div>
              )}

              {qrState.status === "display" && qrState.qrData && (
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={qrState.qrData} size={200} level="M" />
                </div>
              )}

              {qrState.status === "polling" && (
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-full h-12 w-12 bg-teal-500/20 flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full bg-teal-500 animate-pulse"></div>
                  </div>
                  <div className="text-sm text-muted-foreground">{t.payment.waitingPayment}</div>
                  <div className="text-xs text-muted-foreground">{t.payment.scanInstruction}</div>
                </div>
              )}

              {qrState.status === "success" && (
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-full h-16 w-16 bg-green-500/20 flex items-center justify-center">
                    <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-lg font-bold text-green-400">{t.payment.paymentConfirmed}</div>
                  <div className="text-sm text-muted-foreground">{t.payment.saleCompleted}</div>
                </div>
              )}

              {(qrState.status === "expired" || qrState.status === "error") && (
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-full h-16 w-16 bg-red-500/20 flex items-center justify-center">
                    <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="text-lg font-bold text-red-400">
                    {qrState.status === "expired" ? t.payment.qrExpired : t.payment.error}
                  </div>
                  <div className="text-sm text-muted-foreground text-center">
                    {qrState.status === "expired"
                      ? t.payment.qrExpiredMsg
                      : qrState.message}
                  </div>
                </div>
              )}
            </div>

            {(qrState.status === "expired" || qrState.status === "error") && (
              <Button variant="outline" className="w-full" onClick={resetQr}>
                {t.payment.tryAgain}
              </Button>
            )}

            {qrState.status === "loading" || qrState.status === "polling" ? (
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                {t.common.cancel}
              </Button>
            ) : null}
          </div>
        )}

        {/* Payment Method Selection */}
        {!isQrFlow && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-secondary rounded-lg">
              <div className="text-sm text-muted-foreground">{t.payment.amountDue}</div>
              <div className="text-3xl font-bold font-mono text-green-400">
                {formatCurrency(total)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.id}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    method === pm.id
                      ? pm.color + " text-white"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
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
                <label className="text-sm text-muted-foreground mb-1 block">{t.payment.amount}</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="text-xl font-mono h-12"
                  min="0"
                />
                {method === "cash" && amount > total && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {t.payment.change} <span className="text-green-400 font-mono">{formatCurrency(amount - total)}</span>
                  </div>
                )}
              </div>
            )}

            {method === "transfer" && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t.payment.referenceNumber}</label>
                <Input
                  placeholder={t.payment.transferRefPlaceholder}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            )}

            {method === "credit" && customer && (
              <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <div className="text-sm font-medium text-orange-400">{t.payment.creditSale}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t.payment.currentBalance} {formatCurrency(Number(customer.balance))} | {t.payment.creditLimit}{" "}
                  {formatCurrency(Number(customer.creditLimit))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t.payment.newBalance} {formatCurrency(Number(customer.balance) + total)}
                </div>
              </div>
            )}

            {method === "qr" && (
              <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
                <div className="text-sm font-medium text-teal-400">{t.payment.qrPayment}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t.payment.qrDesc1}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t.payment.qrDesc2}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                {t.common.cancel}
              </Button>
              <Button className="flex-1 h-12 text-base font-bold" onClick={handlePay} disabled={!canPay}>
                {method === "qr" ? t.payment.generateQR : t.payment.confirmPayment}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
