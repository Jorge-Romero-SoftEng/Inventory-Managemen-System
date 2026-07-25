"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Sale } from "@/types";

export default function SalesPage() {
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
    if (!confirm("Cancel this sale? Stock will be restored.")) return;
    await fetch(`/api/sales/${id}/cancel`, { method: "POST" });
    loadSales();
    setSelectedSale(null);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Sales History</h1>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.saleNumber}</TableCell>
                      <TableCell>{s.customer?.name || "Walk-in"}</TableCell>
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
                        {new Date(s.createdAt).toLocaleDateString("es-PY")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewSale(s.id)}>
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
      </div>

      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border p-6 max-w-lg w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{selectedSale.saleNumber}</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedSale(null)}>
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div>Customer: {selectedSale.customer?.name || "Walk-in"}</div>
              <div>Payment: {selectedSale.paymentMethod}</div>
              {selectedSale.mpOrderId && (
                <div className="text-xs text-muted-foreground">
                  MP Order: <span className="font-mono">{selectedSale.mpOrderId}</span>
                </div>
              )}
              <div>Date: {new Date(selectedSale.createdAt).toLocaleString("es-PY")}</div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedSale.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product?.name}</TableCell>
                    <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                    <TableCell className="text-right font-mono">{Number(item.unitPrice).toLocaleString("es-PY")}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{Number(item.lineTotal).toLocaleString("es-PY")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 space-y-1 text-sm border-t border-border pt-2">
              <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">{formatCurrency(Number(selectedSale.subtotal))}</span></div>
              {Number(selectedSale.discount) > 0 && (
                <div className="flex justify-between text-red-400"><span>Discount</span><span className="font-mono">-{formatCurrency(Number(selectedSale.discount))}</span></div>
              )}
              <div className="flex justify-between"><span>Tax</span><span className="font-mono">{formatCurrency(Number(selectedSale.tax))}</span></div>
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="font-mono text-green-400">{formatCurrency(Number(selectedSale.total))}</span></div>
            </div>
            {(selectedSale.status === "completed" || selectedSale.status === "pending") && (
              <Button variant="destructive" className="w-full mt-4" onClick={() => cancelSale(selectedSale.id)}>
                {selectedSale.status === "pending" ? "Cancel Pending QR Sale" : "Cancel Sale"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
