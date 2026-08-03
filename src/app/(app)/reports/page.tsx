"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useTranslations } from "@/i18n";
import { TrendingDown, Users, ShoppingCart, AlertTriangle } from "lucide-react";

interface DailyReport {
  date: string;
  summary: { count: number; subtotal: number; discount: number; tax: number; total: number };
  sales: Array<{ id: number; saleNumber: string; customer?: { name: string }; total: number; paymentMethod: string }>;
}

interface LowStockItem {
  id: number;
  quantity: number;
  product: { name: string; barcode: string | null; category?: { name: string } };
}

interface BalanceReport {
  totalBalance: number;
  customers: Array<{ id: number; name: string; balance: number; creditLimit: number }>;
}

export default function ReportsPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<"daily" | "stock" | "balances">("daily");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [balanceReport, setBalanceReport] = useState<BalanceReport | null>(null);

  useEffect(() => {
    if (activeTab === "daily") {
      fetch(`/api/reports/daily-sales?date=${date}`)
        .then((r) => r.json())
        .then(setDailyReport)
        .catch(console.error);
    } else if (activeTab === "stock") {
      fetch("/api/reports/low-stock?threshold=20")
        .then((r) => r.json())
        .then(setLowStock)
        .catch(console.error);
    } else if (activeTab === "balances") {
      fetch("/api/reports/balances")
        .then((r) => r.json())
        .then(setBalanceReport)
        .catch(console.error);
    }
  }, [activeTab, date]);

  return (
    <>
      <TopBar />
      <div className="flex-1 overflow-auto p-4">
          <h1 className="text-2xl font-bold mb-4">{t.reports.title}</h1>

          <div className="flex gap-2 mb-4">
            <Button variant={activeTab === "daily" ? "default" : "outline"} onClick={() => setActiveTab("daily")} aria-label={t.reports.dailySales}>
              <ShoppingCart className="h-4 w-4 mr-1" />
              {t.reports.dailySales}
            </Button>
            <Button variant={activeTab === "stock" ? "default" : "outline"} onClick={() => setActiveTab("stock")} aria-label={t.reports.lowStock}>
              <AlertTriangle className="h-4 w-4 mr-1" />
              {t.reports.lowStock}
            </Button>
            <Button variant={activeTab === "balances" ? "default" : "outline"} onClick={() => setActiveTab("balances")} aria-label={t.reports.balances}>
              <Users className="h-4 w-4 mr-1" />
              {t.reports.balances}
            </Button>
          </div>

          {activeTab === "daily" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-48"
                />
              </div>
              {dailyReport && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    <Card>
                      <CardHeader className="pb-1">
                        <CardTitle className="text-sm text-muted-foreground">{t.reports.salesCount}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{dailyReport.summary.count}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-1">
                        <CardTitle className="text-sm text-muted-foreground">{t.common.subtotal}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold font-mono">{formatCurrency(Number(dailyReport.summary.subtotal))}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-1">
                        <CardTitle className="text-sm text-muted-foreground">{t.common.discount}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold font-mono text-red-400">{formatCurrency(Number(dailyReport.summary.discount))}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-1">
                        <CardTitle className="text-sm text-muted-foreground">{t.common.total}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold font-mono text-green-400">{formatCurrency(Number(dailyReport.summary.total))}</div>
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t.sales.invoice}</TableHead>
                            <TableHead>{t.sales.customer}</TableHead>
                            <TableHead>{t.sales.payment}</TableHead>
                            <TableHead className="text-right">{t.common.total}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailyReport.sales.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="font-mono text-xs">{s.saleNumber}</TableCell>
                              <TableCell>{s.customer?.name || t.common.walkIn}</TableCell>
                              <TableCell><Badge variant="secondary">{s.paymentMethod}</Badge></TableCell>
                              <TableCell className="text-right font-mono font-bold">{formatCurrency(Number(s.total))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {activeTab === "stock" && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.products.barcode}</TableHead>
                      <TableHead>{t.pos.product}</TableHead>
                      <TableHead>{t.products.category}</TableHead>
                      <TableHead className="text-right">{t.common.quantity}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStock.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.product.barcode || "-"}</TableCell>
                        <TableCell className="font-medium">{item.product.name}</TableCell>
                        <TableCell>{item.product.category?.name || "-"}</TableCell>
                        <TableCell className="text-right font-mono text-orange-400 font-bold">
                          {Number(item.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {activeTab === "balances" && balanceReport && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t.reports.totalOutstanding} <span className="font-mono text-orange-400">{formatCurrency(Number(balanceReport.totalBalance))}</span></CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.sales.customer}</TableHead>
                        <TableHead className="text-right">{t.customers.balance}</TableHead>
                        <TableHead className="text-right">{t.reports.creditLimit}</TableHead>
                        <TableHead>{t.common.status}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balanceReport.customers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-right font-mono text-orange-400">{formatCurrency(Number(c.balance))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(Number(c.creditLimit))}</TableCell>
                          <TableCell>
                            <Badge variant={Number(c.balance) > Number(c.creditLimit) * 0.8 ? "destructive" : "secondary"}>
                              {Number(c.balance) > Number(c.creditLimit) * 0.8 ? t.common.nearLimit : t.common.ok}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
    </>
  );
}
