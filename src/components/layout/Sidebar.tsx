"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n";
import { useMe } from "@/hooks/useMe";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  Package,
  Users,
  Receipt,
  BarChart3,
  LayoutDashboard,
  LogOut,
  Tags,
  Shield,
  UserCog,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const { me, loading } = useMe();
  const policies = new Set(me?.policies ?? []);
  const gate = (key: string) => policies.has(key);

  const navItems = [
    { href: "/pos", label: t.nav.pos, icon: ShoppingCart, policy: "sales.create" },
    { href: "/products", label: t.nav.products, icon: Package, policy: "products.view" },
    { href: "/categories", label: t.nav.categories, icon: Tags, policy: "categories.view" },
    { href: "/customers", label: t.nav.customers, icon: Users, policy: "customers.view" },
    { href: "/sales", label: t.nav.sales, icon: Receipt, policy: "sales.view" },
    { href: "/reports", label: t.nav.reports, icon: BarChart3, policy: "reports.view" },
    { href: "/users", label: t.nav.users, icon: UserCog, policy: "users.view" },
    { href: "/roles", label: t.nav.roles, icon: Shield, policy: "roles.view" },
  ].filter((item) => gate(item.policy));

  return (
    <aside className="group w-14 hover:w-56 [@media(hover:none)]:w-56 transition-all duration-200 border-r border-border bg-card flex flex-col overflow-hidden whitespace-nowrap">
      <div className="p-4 border-b border-border">
        <Link href="/" className="flex items-center justify-center group-hover:justify-start [@media(hover:none)]:justify-start gap-2" aria-label={t.layout.brand} title={t.layout.brand}>
          <LayoutDashboard className="h-6 w-6 text-primary shrink-0" />
          <span className="font-bold text-lg hidden group-hover:inline [@media(hover:none)]:inline">{t.layout.brand}</span>
        </Link>
      </div>
      <nav className="flex-1 p-2">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-center group-hover:justify-start [@media(hover:none)]:justify-start gap-3 px-3 py-2 mb-1">
                <Skeleton className="h-4 w-4 rounded shrink-0" />
                <Skeleton className="h-4 w-24 hidden group-hover:block [@media(hover:none)]:block" />
              </div>
            ))
          : navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  className={cn(
                    "flex items-center justify-center group-hover:justify-start [@media(hover:none)]:justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-1",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden group-hover:inline [@media(hover:none)]:inline">{item.label}</span>
                </Link>
              );
            })}
      </nav>
      <div className="p-2 border-t border-border">
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
          }}
          className="flex items-center justify-center group-hover:justify-start [@media(hover:none)]:justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground w-full"
          aria-label={t.nav.logout}
          title={t.nav.logout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden group-hover:inline [@media(hover:none)]:inline">{t.nav.logout}</span>
        </button>
      </div>
    </aside>
  );
}
