"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useTranslations } from "@/i18n";

interface TopBarProps {
  saleNumber?: string;
  user?: string;
  isOnline?: boolean;
}

export function TopBar({ saleNumber, user = "Admin", isOnline = true }: TopBarProps) {
  const t = useTranslations();
  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-bold tracking-wide">{t.layout.headerBrand}</span>
        {saleNumber && (
          <span className="text-xs bg-secondary px-2 py-1 rounded font-mono">
            {saleNumber}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground">{user}</span>
        <div className="flex items-center gap-1">
          {isOnline ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" />
          )}
          <span className="text-xs">{isOnline ? t.layout.online : t.layout.offline}</span>
        </div>
      </div>
    </header>
  );
}
