"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import type { Product } from "@/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    barcode: "",
    sku: "",
    name: "",
    categoryId: "",
    unit: "bag",
    packSize: "1",
    cost: "0",
  });

  const loadProducts = useCallback(async () => {
    const res = await fetch(`/api/products?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setProducts(data);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(loadProducts, 300);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  function openNew() {
    setEditingProduct(null);
    setForm({ barcode: "", sku: "", name: "", categoryId: "", unit: "bag", packSize: "1", cost: "0" });
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setForm({
      barcode: p.barcode || "",
      sku: p.sku || "",
      name: p.name,
      categoryId: p.categoryId?.toString() || "",
      unit: p.unit,
      packSize: p.packSize.toString(),
      cost: p.cost.toString(),
    });
    setShowForm(true);
  }

  async function handleSave() {
    const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
    const method = editingProduct ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setShowForm(false);
    loadProducts();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    loadProducts();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Products</h1>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />
              New Product
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Pack</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.sku || p.barcode}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.category?.name || "-"}</TableCell>
                      <TableCell>{p.unit}</TableCell>
                      <TableCell>{p.packSize}</TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(p.cost).toLocaleString("es-PY")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.active ? "default" : "destructive"}>
                          {p.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Barcode</label>
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">SKU</label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Unit</label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Pack Size</label>
                <Input type="number" value={form.packSize} onChange={(e) => setForm({ ...form, packSize: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Cost</label>
              <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave}>{editingProduct ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
