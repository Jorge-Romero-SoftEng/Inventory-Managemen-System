"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, ReceiptText } from "lucide-react";
import { useTranslations } from "@/i18n";
import { useMe } from "@/hooks/useMe";
import type { Supplier, SupplierPriceList } from "@/types/supplier";

export default function ProvidersPage() {
  const t = useTranslations();
  const { me } = useMe();
  const canManage = me?.policies.includes("suppliers.manage") ?? false;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    contact: "",
    phone: "",
    notes: "",
    active: true,
  });

  const [showLists, setShowLists] = useState<Supplier | null>(null);
  const [priceLists, setPriceLists] = useState<SupplierPriceList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/suppliers?${params.toString()}`);
    const data = await res.json();
    setSuppliers(Array.isArray(data) ? data : []);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", contact: "", phone: "", notes: "", active: true });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name,
      contact: s.contact || "",
      phone: s.phone || "",
      notes: s.notes || "",
      active: s.active,
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave() {
    const url = editing ? `/api/suppliers/${editing.id}` : "/api/suppliers";
    const method = editing ? "PUT" : "POST";
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
      load();
    } catch {
      setFormError(t.login.connectionError);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t.providers.deleteConfirm)) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    load();
  }

  async function openPriceLists(s: Supplier) {
    setShowLists(s);
    setPriceLists([]);
    setListsLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${s.id}/price-lists`);
      const data = await res.json();
      setPriceLists(Array.isArray(data) ? data : []);
    } catch {
      setPriceLists([]);
    } finally {
      setListsLoading(false);
    }
  }

  return (
    <>
      <TopBar />
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{t.providers.title}</h1>
          {canManage && (
            <Button onClick={openNew} aria-label={t.providers.newProvider}>
              <Plus className="h-4 w-4 mr-1" />
              {t.providers.newProvider}
            </Button>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.providers.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.name}</TableHead>
                  <TableHead>{t.providers.contact}</TableHead>
                  <TableHead>{t.providers.phone}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {t.providers.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.contact || "-"}</TableCell>
                      <TableCell>{s.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={s.active ? "default" : "destructive"}>
                          {s.active ? t.common.active : t.common.inactive}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openPriceLists(s)}
                            title={t.providers.priceLists}
                            aria-label={t.providers.priceLists}
                          >
                            <ReceiptText className="h-3 w-3" />
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(s)}
                                aria-label={`Edit ${s.name}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-400"
                                onClick={() => handleDelete(s.id)}
                                aria-label={`Delete ${s.name}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
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
            <DialogTitle>{editing ? t.providers.editProvider : t.providers.newProvider}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {formError && <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">{formError}</div>}
            <div>
              <label className="text-sm text-muted-foreground">{t.common.name}</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t.providers.contact}</label>
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t.providers.phone}</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t.providers.notes}</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="text-sm text-muted-foreground">{t.common.status}</label>
              <div className="flex items-center gap-2">
                <span className="text-sm">{form.active ? t.common.active : t.common.inactive}</span>
                <Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} aria-label={t.common.cancel}>
                {t.common.cancel}
              </Button>
              <Button className="flex-1" onClick={handleSave} aria-label={editing ? t.common.update : t.common.create}>
                {editing ? t.common.update : t.common.create}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLists !== null} onOpenChange={(open) => !open && setShowLists(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t.providers.priceLists} — {showLists?.name}
            </DialogTitle>
          </DialogHeader>
          {listsLoading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">{t.common.loading}</div>
          ) : priceLists.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">{t.extractions.empty}</div>
          ) : (
            <div className="max-h-[60vh] overflow-auto space-y-4">
              {priceLists.map((pl) => (
                <div key={pl.id} className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      {new Date(pl.effectiveDate).toLocaleDateString()} — {pl.currency || "ARS"}
                    </span>
                    <Badge variant={pl.status === "extracted" ? "default" : "destructive"}>{pl.status}</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.extractions.name}</TableHead>
                        <TableHead>{t.extractions.unit}</TableHead>
                        <TableHead className="text-right">{t.extractions.price}</TableHead>
                        <TableHead>{t.extractions.availability}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(pl.items ?? []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product?.name || "-"}</TableCell>
                          <TableCell>{item.product?.unit || "-"}</TableCell>
                          <TableCell className="text-right font-mono">
                            {item.currency ? `${item.currency} ` : ""}
                            {Number(item.price).toLocaleString()}
                          </TableCell>
                          <TableCell>{item.availability}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
