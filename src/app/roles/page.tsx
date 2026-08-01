"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, ShieldCheck } from "lucide-react";
import { useTranslations } from "@/i18n";
import { getLocale } from "@/i18n/translations";
import { useMe } from "@/hooks/useMe";

interface PolicyEntry {
  key: string;
  module: string;
  nameEs: string;
  nameEn: string;
}

interface RoleRow {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { users: number; rolePolicies: number };
}

interface RoleDetail extends RoleRow {
  rolePolicies: { policy: PolicyEntry }[];
}

export default function RolesPage() {
  const t = useTranslations();
  const me = useMe();
  const canManage = me?.policies.includes("roles.manage") ?? false;
  const lang = getLocale();

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [policies, setPolicies] = useState<PolicyEntry[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RoleDetail | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const loadRoles = useCallback(async () => {
    const res = await fetch("/api/roles");
    const data = await res.json();
    setRoles(Array.isArray(data) ? data : []);
  }, []);

  const loadPolicies = useCallback(async () => {
    try {
      const res = await fetch("/api/policies");
      if (res.ok) {
        const data = await res.json();
        setPolicies(Array.isArray(data) ? data : []);
      }
    } catch {
      setPolicies([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadRoles, 300);
    return () => clearTimeout(timer);
  }, [loadRoles]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const modules = Array.from(new Set(policies.map((p) => p.module)));

  function policyName(p: PolicyEntry) {
    return lang === "en" ? p.nameEn : p.nameEs;
  }

  async function openNew() {
    setEditing(null);
    setForm({ name: "", description: "" });
    setSelectedKeys([]);
    setShowForm(true);
  }

  async function openEdit(r: RoleRow) {
    const res = await fetch(`/api/roles/${r.id}`);
    if (!res.ok) return;
    const detail: RoleDetail = await res.json();
    setEditing(detail);
    setForm({ name: detail.name, description: detail.description || "" });
    setSelectedKeys(detail.rolePolicies.map((rp) => rp.policy.key));
    setShowForm(true);
  }

  function toggleKey(key: string) {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleSave() {
    const url = editing ? `/api/roles/${editing.id}` : "/api/roles";
    const method = editing ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        policies: selectedKeys,
      }),
    });

    setShowForm(false);
    loadRoles();
  }

  async function handleDelete(id: number) {
    if (!confirm(t.roles.deleteConfirm)) return;
    await fetch(`/api/roles/${id}`, { method: "DELETE" });
    loadRoles();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{t.roles.title}</h1>
            {canManage && (
              <Button onClick={openNew} aria-label={t.roles.newRole}>
                <Plus className="h-4 w-4 mr-1" />
                {t.roles.newRole}
              </Button>
            )}
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.roles.searchPlaceholder}
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
                    <TableHead>{t.roles.description}</TableHead>
                    <TableHead className="text-right">{t.roles.policies}</TableHead>
                    <TableHead className="text-right">{t.roles.users}</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles
                    .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
                    .map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {r.isSystem && (
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-label={t.roles.systemRole} />
                            )}
                            {r.name}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">
                          {r.description || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <Badge variant="secondary">{r._count.rolePolicies}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{r._count.users}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={!canManage}
                              onClick={() => openEdit(r)}
                              aria-label={`Edit ${r.name}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400"
                              disabled={!canManage || r.isSystem}
                              onClick={() => handleDelete(r.id)}
                              aria-label={`Delete ${r.name}`}
                            >
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t.roles.editRole : t.roles.newRole}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">{t.common.name}</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t.roles.description}</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t.roles.selectPolicies}</label>
              <div className="mt-2 max-h-64 overflow-auto border border-border rounded-md p-3 space-y-3">
                {modules.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t.roles.noPolicies}</p>
                )}
                {modules.map((module) => (
                  <div key={module}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      {module}
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {policies
                        .filter((p) => p.module === module)
                        .map((p) => (
                          <label
                            key={p.key}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-secondary/50 rounded px-1 py-0.5"
                          >
                            <Checkbox
                              checked={selectedKeys.includes(p.key)}
                              onCheckedChange={() => toggleKey(p.key)}
                            />
                            {policyName(p)}
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
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
