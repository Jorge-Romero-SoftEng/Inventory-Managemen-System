"use client";

import { useState, useEffect, forwardRef, useCallback, useRef, useImperativeHandle } from "react";
import { Input } from "@/components/ui/input";
import { Search, ScanBarcode } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n";
import { formatNumber } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductSearchProps {
  onSelectProduct: (product: Product) => void;
  priceListId: number;
}

type SearchMode = "scan" | "manual";

const MODE_KEY = "pos-scan-mode";

export const ProductSearch = forwardRef<HTMLInputElement, ProductSearchProps>(
  ({ onSelectProduct, priceListId }, ref) => {
    const t = useTranslations();
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current!);

    const [mode, setMode] = useState<SearchMode>(() => {
      if (typeof window === "undefined") return "scan";
      return window.localStorage.getItem(MODE_KEY) === "manual" ? "manual" : "scan";
    });
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Product[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scanError, setScanError] = useState(false);
    const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      try {
        window.localStorage.setItem(MODE_KEY, mode);
      } catch {
        // ignore storage errors
      }
    }, [mode]);

    useEffect(() => {
      return () => {
        if (errorTimer.current) clearTimeout(errorTimer.current);
      };
    }, []);

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
      if (mode !== "manual") return;
      const timer = setTimeout(() => search(query), 200);
      return () => clearTimeout(timer);
    }, [query, search, mode]);

    const showScanError = useCallback(() => {
      setScanError(true);
      if (errorTimer.current) clearTimeout(errorTimer.current);
      errorTimer.current = setTimeout(() => setScanError(false), 2500);
    }, []);

    const scanBarcode = useCallback(
      async (value: string) => {
        const barcode = value.trim();
        if (!barcode) return;
        try {
          const res = await fetch(`/api/products?barcode=${encodeURIComponent(barcode)}&active=true`);
          const data = await res.json();
          if (data.length > 0) {
            onSelectProduct(data[0]);
            setScanError(false);
          } else {
            showScanError();
          }
        } catch (error) {
          console.error("Barcode scan error:", error);
          showScanError();
        }
        setQuery("");
        setShowDropdown(false);
        inputRef.current?.focus();
      },
      [onSelectProduct, showScanError]
    );

    function changeMode(m: SearchMode) {
      setMode(m);
      setQuery("");
      setResults([]);
      setShowDropdown(false);
      setScanError(false);
      inputRef.current?.focus();
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (mode === "scan") {
        if (e.key === "Enter") {
          e.preventDefault();
          scanBarcode(query);
        }
        return;
      }

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
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            {mode === "scan" ? (
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              ref={inputRef}
              placeholder={mode === "scan" ? t.pos.scanPlaceholder : t.pos.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "pl-10 h-12 text-base font-mono",
                scanError && "border-red-500 focus-visible:ring-red-500"
              )}
              autoFocus
            />
          </div>
          <div className="flex shrink-0 rounded-md border border-input overflow-hidden">
            <button
              type="button"
              onClick={() => changeMode("scan")}
              aria-pressed={mode === "scan"}
              title={t.pos.scanMode}
              aria-label={t.pos.scanMode}
              className={cn(
                "flex items-center justify-center h-12 w-10 transition-colors",
                mode === "scan"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50"
              )}
            >
              <ScanBarcode className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => changeMode("manual")}
              aria-pressed={mode === "manual"}
              title={t.pos.manualMode}
              aria-label={t.pos.manualMode}
              className={cn(
                "flex items-center justify-center h-12 w-10 transition-colors",
                mode === "manual"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50"
              )}
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>

        {scanError && (
          <div className="mt-2 text-sm text-red-400 font-medium">{t.pos.productNotFound}</div>
        )}

        {mode === "manual" && showDropdown && results.length > 0 && (
          <div className="absolute left-2 right-2 top-full z-50 mt-1 max-h-80 overflow-auto rounded-md border border-border bg-card shadow-lg">
            {results.map((product, index) => (
              <button
                key={product.id}
                className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-secondary/50 transition-colors ${
                  index === selectedIndex ? "bg-secondary" : ""
                }`}
                onClick={() => handleSelect(product)}
                aria-label={product.name}
              >
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {product.barcode || "-"} | {product.stock?.[0]?.quantity || 0} {t.pos.inStock}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-green-400">
                    {formatNumber(getPrice(product))}
                  </div>
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
