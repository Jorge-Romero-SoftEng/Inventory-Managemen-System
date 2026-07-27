"use client";

import { useState, useEffect, forwardRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useTranslations } from "@/i18n";
import { formatNumber } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductSearchProps {
  onSelectProduct: (product: Product) => void;
  priceListId: number;
}

export const ProductSearch = forwardRef<HTMLInputElement, ProductSearchProps>(
  ({ onSelectProduct, priceListId }, ref) => {
    const t = useTranslations();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Product[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const search = useCallback(async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&active=true`);
        const data = await res.json();
        setResults(data);
        setShowDropdown(data.length > 0);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Search error:", error);
      }
    }, []);

    useEffect(() => {
      const timer = setTimeout(() => search(query), 200);
      return () => clearTimeout(timer);
    }, [query, search]);

    function handleKeyDown(e: React.KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        onSelectProduct(results[selectedIndex]);
        setQuery("");
        setShowDropdown(false);
      } else if (e.key === "Escape") {
        setShowDropdown(false);
      }
    }

    function handleSelect(product: Product) {
      onSelectProduct(product);
      setQuery("");
      setShowDropdown(false);
    }

    function getPrice(product: Product): number {
      const priceEntry = product.prices?.find((p) => p.priceListId === priceListId);
      return priceEntry ? Number(priceEntry.price) : Number(product.cost) * 1.3;
    }

    return (
      <div className="relative p-2 border-b border-border bg-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={ref}
            placeholder={t.pos.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 h-12 text-base font-mono"
            autoFocus
          />
        </div>
        {showDropdown && results.length > 0 && (
          <div className="absolute left-2 right-2 top-full z-50 mt-1 max-h-80 overflow-auto rounded-md border border-border bg-card shadow-lg">
            {results.map((product, index) => (
              <button
                key={product.id}
                className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-secondary/50 transition-colors ${
                  index === selectedIndex ? "bg-secondary" : ""
                }`}
                onClick={() => handleSelect(product)}
              >
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {product.sku || product.barcode} | {product.stock?.[0]?.quantity || 0} {t.pos.inStock}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-green-400">
                    {formatNumber(getPrice(product))}
                  </div>
                  <div className="text-xs text-muted-foreground">{product.unit}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

ProductSearch.displayName = "ProductSearch";
