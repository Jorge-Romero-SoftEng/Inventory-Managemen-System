"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useTranslations } from "@/i18n";
import type { Category } from "@/types";

interface CategoryWithCount extends Category {
  _count?: { products: number };
}

export default function CategoriesPage() {
  const t = useTranslations();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");

  const loadCategories = useCallback(async () => {
    const res = await fetch(`/api/categories?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setCategories(data);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(loadCategories, 300);
    return () => clearTimeout(timer);
  }, [loadCategories]);

  function openNew() {
    setEditing(null);
    setName("");
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setName(c.name);
    setShowForm(true);
  }

  async function handleSave() {
    const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
    const method = editing ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setShowForm(false);
    loadCategories();
  }

  async function handleDelete(id: number) {
    if (!confirm(t.categories.deleteConfirm)) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    loadCategories();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{t.categories.title}</h1>
            <Button onClick={openNew} aria-label={t.categories.newCategory}>
              <Plus className="h-4 w-4 mr-1" />
              {t.categories.newCategory}
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.categories.searchPlaceholder}
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
                    <TableHead>{t.common.name}</TableHead>
                    <TableHead className="text-right">{t.categories.products}</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{c._count?.products ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} aria-label={`Edit ${c.name}`}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => handleDelete(c.id)} aria-label={`Delete ${c.name}`}>
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
            <DialogTitle>{editing ? t.categories.editCategory : t.categories.newCategory}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">{t.common.name}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} aria-label={t.common.cancel}>{t.common.cancel}</Button>
              <Button className="flex-1" onClick={handleSave} aria-label={editing ? t.common.update : t.common.create}>{editing ? t.common.update : t.common.create}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
