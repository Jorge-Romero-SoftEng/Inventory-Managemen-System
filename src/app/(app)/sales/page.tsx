"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useTranslations } from "@/i18n";
import { useMe } from "@/hooks/useMe";
import type { Sale } from "@/types";

export default function SalesPage() {
  const t = useTranslations();
  const { me } = useMe();
  const canCancel = me?.policies.includes("sales.cancel") ?? false;
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const loadSales = useCallback(async () => {
    const res = await fetch("/api/sales?limit=100");
    const data = await res.json();
    setSales(data.sales || []);
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  async function viewSale(id: number) {
    const res = await fetch(`/api/sales/${id}`);
    const data = await res.json();
    setSelectedSale(data);
  }

  async function cancelSale(id: number) {
    if (!confirm(t.sales.cancelConfirm)) return;
    await fetch(`/api/sales/${id}/cancel`, { method: "POST" });
    loadSales();
    setSelectedSale(null);
  }

  return (
    <>
      <TopBar />
      <div className="flex-1 overflow-auto p-4">
          <h1 className="text-2xl font-bold mb-4">{t.sales.title}</h1>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.sales.invoice}</TableHead>
                    <TableHead>{t.sales.customer}</TableHead>
                    <TableHead className="text-right">{t.common.total}</TableHead>
                    <TableHead>{t.sales.payment}</TableHead>
                    <TableHead>{t.common.status}</TableHead>
                    <TableHead>{t.sales.date}</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.saleNumber}</TableCell>
                      <TableCell>{s.customer?.name || t.common.walkIn}</TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatCurrency(Number(s.total))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.status === "completed"
                              ? "default"
                              : s.status === "pending"
                              ? "outline"
                              : "destructive"
                          }
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewSale(s.id)} aria-label={`View ${s.saleNumber}`}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border p-6 max-w-lg w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{selectedSale.saleNumber}</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedSale(null)} aria-label={t.common.close || "Close"}>
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div>{t.sales.customer}: {selectedSale.customer?.name || t.common.walkIn}</div>
              <div>{t.sales.payment}: {selectedSale.paymentMethod}</div>
              {selectedSale.mpOrderId && (
                <div className="text-xs text-muted-foreground">
                  {t.sales.mpOrder} <span className="font-mono">{selectedSale.mpOrderId}</span>
                </div>
              )}
              <div>{t.sales.date}: {new Date(selectedSale.createdAt).toLocaleString("es-AR")}</div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.sales.product}</TableHead>
                  <TableHead className="text-right">{t.pos.qty}</TableHead>
                  <TableHead className="text-right">{t.common.price}</TableHead>
                  <TableHead className="text-right">{t.common.total}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedSale.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product?.name}</TableCell>
                    <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                    <TableCell className="text-right font-mono">{Number(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{Number(item.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 space-y-1 text-sm border-t border-border pt-2">
              <div className="flex justify-between"><span>{t.common.subtotal}</span><span className="font-mono">{formatCurrency(Number(selectedSale.subtotal))}</span></div>
              {Number(selectedSale.discount) > 0 && (
                <div className="flex justify-between text-red-400"><span>{t.common.discount}</span><span className="font-mono">-{formatCurrency(Number(selectedSale.discount))}</span></div>
              )}
              <div className="flex justify-between"><span>{t.common.tax}</span><span className="font-mono">{formatCurrency(Number(selectedSale.tax))}</span></div>
              <div className="flex justify-between font-bold text-lg"><span>{t.common.total}</span><span className="font-mono text-green-400">{formatCurrency(Number(selectedSale.total))}</span></div>
            </div>
            {canCancel && (selectedSale.status === "completed" || selectedSale.status === "pending") && (
              <Button variant="destructive" className="w-full mt-4" onClick={() => cancelSale(selectedSale.id)} aria-label={selectedSale.status === "pending" ? t.sales.cancelPendingQR : t.sales.cancelSale}>
                {selectedSale.status === "pending" ? t.sales.cancelPendingQR : t.sales.cancelSale}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
