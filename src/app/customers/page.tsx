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
import { formatCurrency } from "@/lib/utils";
import type { Customer } from "@/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    name: "",
    taxId: "",
    address: "",
    phone: "",
    creditLimit: "0",
  });

  const loadCustomers = useCallback(async () => {
    const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setCustomers(data);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(loadCustomers, 300);
    return () => clearTimeout(timer);
  }, [loadCustomers]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", taxId: "", address: "", phone: "", creditLimit: "0" });
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      name: c.name,
      taxId: c.taxId || "",
      address: c.address || "",
      phone: c.phone || "",
      creditLimit: c.creditLimit.toString(),
    });
    setShowForm(true);
  }

  async function handleSave() {
    const url = editing ? `/api/customers/${editing.id}` : "/api/customers";
    const method = editing ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setShowForm(false);
    loadCustomers();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this customer?")) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    loadCustomers();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Customers</h1>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />
              New Customer
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
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
                    <TableHead>Name</TableHead>
                    <TableHead>Tax ID</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs">{c.taxId || "-"}</TableCell>
                      <TableCell>{c.phone || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{c.address || "-"}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(Number(c.creditLimit))}</TableCell>
                      <TableCell className="text-right font-mono text-orange-400">{formatCurrency(Number(c.balance))}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => handleDelete(c.id)}>
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
            <DialogTitle>{editing ? "Edit Customer" : "New Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Tax ID</label>
                <Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Address</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Credit Limit</label>
              <Input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
