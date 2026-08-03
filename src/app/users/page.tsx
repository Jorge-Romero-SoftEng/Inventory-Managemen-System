"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useTranslations } from "@/i18n";
import { useMe } from "@/hooks/useMe";

interface RoleOption {
  id: number;
  name: string;
}

interface UserRow {
  id: number;
  name: string;
  email: string | null;
  active: boolean;
  roleId: number | null;
  role: { id: number; name: string } | null;
}

export default function UsersPage() {
  const t = useTranslations();
  const { me } = useMe();
  const canManage = me?.policies.includes("users.manage") ?? false;

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
    active: true,
  });

  const loadUsers = useCallback(async () => {
    const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  }, [search]);

  const loadRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(Array.isArray(data) ? data : []);
      }
    } catch {
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", email: "", password: "", roleId: roles[0] ? String(roles[0].id) : "", active: true });
    setShowForm(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email || "",
      password: "",
      roleId: u.roleId ? String(u.roleId) : "",
      active: u.active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    const url = editing ? `/api/users/${editing.id}` : "/api/users";
    const method = editing ? "PUT" : "POST";
    const body = editing
      ? {
          name: form.name,
          email: form.email,
          roleId: form.roleId ? parseInt(form.roleId) : null,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        }
      : {
          name: form.name,
          email: form.email,
          password: form.password,
          roleId: form.roleId ? parseInt(form.roleId) : null,
          active: form.active,
        };

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setShowForm(false);
    loadUsers();
  }

  async function toggleActive(u: UserRow) {
    if (!canManage) return;
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    loadUsers();
  }

  async function handleDelete(id: number) {
    if (!confirm(t.users.deleteConfirm)) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    loadUsers();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{t.users.title}</h1>
            {canManage && (
              <Button onClick={openNew} aria-label={t.users.newUser}>
                <Plus className="h-4 w-4 mr-1" />
                {t.users.newUser}
              </Button>
            )}
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.users.searchPlaceholder}
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
                    <TableHead>{t.common.email}</TableHead>
                    <TableHead>{t.users.role}</TableHead>
                    <TableHead>{t.users.status}</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email || "-"}</TableCell>
                      <TableCell>{u.role?.name ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={u.active}
                            disabled={!canManage}
                            onCheckedChange={() => toggleActive(u)}
                            aria-label={u.active ? t.users.disable : t.users.enable}
                          />
                          <span className="text-xs">
                            {u.active ? t.users.active : t.users.inactive}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={!canManage}
                            onClick={() => openEdit(u)}
                            aria-label={`Edit ${u.name}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400"
                            disabled={!canManage}
                            onClick={() => handleDelete(u.id)}
                            aria-label={`Delete ${u.name}`}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t.users.editUser : t.users.newUser}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">{t.common.name}</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t.common.email}</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                {t.users.password} {editing ? `(${t.users.passwordHint})` : ""}
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editing}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t.users.role}</label>
              <Select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                <option value="">-</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <span className="text-sm">{form.active ? t.users.active : t.users.inactive}</span>
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
