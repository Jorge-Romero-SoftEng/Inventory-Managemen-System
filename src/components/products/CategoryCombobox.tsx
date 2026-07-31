"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n";
import type { Category } from "@/types";

interface CategoryComboboxProps {
  value: number | null;
  onChange: (id: number | null) => void;
}

export function CategoryCombobox({ value, onChange }: CategoryComboboxProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error("Load categories error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = categories.find((c) => c.id === value) || null;
  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    const created = await res.json();
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    onChange(created.id);
    setOpen(false);
    setCreating(false);
    setNewName("");
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.name : t.products.categoryPlaceholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
          <div className="p-2">
            <Input
              placeholder={t.products.categorySearch}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCreating(false);
              }}
              autoFocus
            />
          </div>

          {creating ? (
            <div className="p-2 space-y-2">
              <Input
                placeholder={t.products.categoryNewPlaceholder}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setCreating(false)}>
                  {t.common.cancel}
                </Button>
                <Button size="sm" className="flex-1" onClick={handleCreate}>
                  {t.common.create}
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-h-48 overflow-auto pb-1">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-secondary/50",
                  value === null && "bg-secondary"
                )}
              >
                {t.products.noCategory}
                {value === null && <Check className="h-4 w-4" />}
              </button>
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-secondary/50",
                    c.id === value && "bg-secondary"
                  )}
                >
                  {c.name}
                  {c.id === value && <Check className="h-4 w-4" />}
                </button>
              ))}
              {!query.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setCreating(true);
                    setNewName("");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-secondary/50"
                >
                  <Plus className="h-4 w-4" />
                  {t.products.createCategory}
                </button>
              )}
              {query.trim() && !filtered.some((c) => c.name.toLowerCase() === query.toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => {
                    setNewName(query);
                    setCreating(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-secondary/50"
                >
                  <Plus className="h-4 w-4" />
                  {t.products.createCategory} "{query.trim()}"
                </button>
              )}
              {loading && categories.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">{t.common.loading}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
