"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryCombobox } from "@/components/products/CategoryCombobox";
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "@/i18n";
import { useMe } from "@/hooks/useMe";
import { formatNumber } from "@/lib/utils";
import type { Product, Category } from "@/types";

type PageSize = number | "all";

export default function ProductsPage() {
  const t = useTranslations();
  const { me } = useMe();
  const canCreate = me?.policies.includes("products.create") ?? false;
  const canUpdate = me?.policies.includes("products.update") ?? false;
  const canDelete = me?.policies.includes("products.delete") ?? false;
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    barcode: "",
    name: "",
    categoryId: null as number | null,
    cost: "0",
    active: true,
  });

  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams({ search });
    if (categoryFilter) params.set("categoryId", categoryFilter);
    if (pageSize !== "all") {
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
    }
    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();
    setProducts(data.products ?? []);
    setTotal(data.total ?? 0);
  }, [search, categoryFilter, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(loadProducts, 300);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: Category[]) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, pageSize]);

  useEffect(() => {
    if (pageSize === "all") return;
    const max = Math.max(1, Math.ceil(total / pageSize));
    if (page > max) setPage(max);
  }, [total, page, pageSize]);

  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(total / pageSize));

  function openNew() {
    setEditingProduct(null);
    setForm({ barcode: "", name: "", categoryId: null, cost: "0", active: true });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setForm({
      barcode: p.barcode || "",
      name: p.name,
      categoryId: p.categoryId,
      cost: p.cost.toString(),
      active: p.active,
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave() {
    const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
    const method = editingProduct ? "PUT" : "POST";

    setFormError("");
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "");
        return;
      }

      setShowForm(false);
      loadProducts();
    } catch {
      setFormError(t.login.connectionError);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t.products.deleteConfirm)) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    loadProducts();
  }

  return (
    <>
      <TopBar />
      <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{t.products.title}</h1>
            {canCreate && (
              <Button onClick={openNew} aria-label={t.products.newProduct}>
                <Plus className="h-4 w-4 mr-1" />
                {t.products.newProduct}
              </Button>
            )}
          </div>

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.products.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-56"
              aria-label={t.products.category}
            >
              <option value="">{t.products.allCategories}</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t.products.itemsPerPage}</span>
              <Select
                value={String(pageSize)}
                onChange={(e) =>
                  setPageSize(e.target.value === "all" ? "all" : Number(e.target.value))
                }
                className="w-24"
                aria-label={t.products.itemsPerPage}
              >
                <option value="10">10</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="all">{t.common.all}</option>
              </Select>
            </div>
            {pageSize !== "all" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  aria-label={t.common.previous}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t.common.page} {page} {t.common.of} {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  aria-label={t.common.next}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.products.barcode}</TableHead>
                    <TableHead>{t.common.name}</TableHead>
                    <TableHead>{t.products.category}</TableHead>
                    <TableHead className="text-right">{t.products.cost}</TableHead>
                    <TableHead>{t.common.status}</TableHead>
                    {(canUpdate || canDelete) && <TableHead className="w-20"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canUpdate || canDelete ? 6 : 5} className="text-center text-muted-foreground py-8">
                        {t.products.empty}
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.barcode || "-"}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.category?.name || "-"}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(Number(p.cost))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.active ? "default" : "destructive"}>
                            {p.active ? t.common.active : t.common.inactive}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(canUpdate || canDelete) && (
                          <div className="flex gap-1">
                            {canUpdate && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            )}
                            {canDelete && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => handleDelete(p.id)} aria-label={`Delete ${p.name}`}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            )}
                          </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? t.products.editProduct : t.products.newProduct}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">{formError}</div>
            )}
            <div>
              <label className="text-sm text-muted-foreground">{t.products.barcode}</label>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t.common.name}</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t.products.category}</label>
              <CategoryCombobox
                value={form.categoryId}
                onChange={(categoryId) => setForm({ ...form, categoryId })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t.products.cost}</label>
              <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="text-sm text-muted-foreground">{t.common.status}</label>
              <div className="flex items-center gap-2">
                <span className="text-sm">{form.active ? t.common.active : t.common.inactive}</span>
                <Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} aria-label={t.common.cancel}>{t.common.cancel}</Button>
              <Button className="flex-1" onClick={handleSave} aria-label={editingProduct ? t.common.update : t.common.create}>{editingProduct ? t.common.update : t.common.create}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
