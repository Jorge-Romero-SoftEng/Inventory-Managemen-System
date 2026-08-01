import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const POLICY = {
  productsView: "products.view",
  productsCreate: "products.create",
  productsUpdate: "products.update",
  productsDelete: "products.delete",
  categoriesView: "categories.view",
  categoriesCreate: "categories.create",
  categoriesUpdate: "categories.update",
  categoriesDelete: "categories.delete",
  customersView: "customers.view",
  customersCreate: "customers.create",
  customersUpdate: "customers.update",
  customersDelete: "customers.delete",
  priceListsView: "priceLists.view",
  priceListsManage: "priceLists.manage",
  salesCreate: "sales.create",
  salesView: "sales.view",
  salesCancel: "sales.cancel",
  stockView: "stock.view",
  stockAdjust: "stock.adjust",
  reportsView: "reports.view",
  usersView: "users.view",
  usersManage: "users.manage",
  rolesView: "roles.view",
  rolesManage: "roles.manage",
} as const;

export interface PolicyCatalogEntry {
  key: string;
  module: string;
  nameEs: string;
  nameEn: string;
}

export const POLICY_CATALOG: PolicyCatalogEntry[] = [
  { key: POLICY.productsView, nameEs: "Ver productos", nameEn: "View products", module: "products" },
  { key: POLICY.productsCreate, nameEs: "Crear productos", nameEn: "Create products", module: "products" },
  { key: POLICY.productsUpdate, nameEs: "Editar productos", nameEn: "Edit products", module: "products" },
  { key: POLICY.productsDelete, nameEs: "Eliminar productos", nameEn: "Delete products", module: "products" },
  { key: POLICY.categoriesView, nameEs: "Ver categorias", nameEn: "View categories", module: "categories" },
  { key: POLICY.categoriesCreate, nameEs: "Crear categorias", nameEn: "Create categories", module: "categories" },
  { key: POLICY.categoriesUpdate, nameEs: "Editar categorias", nameEn: "Edit categories", module: "categories" },
  { key: POLICY.categoriesDelete, nameEs: "Eliminar categorias", nameEn: "Delete categories", module: "categories" },
  { key: POLICY.customersView, nameEs: "Ver clientes", nameEn: "View customers", module: "customers" },
  { key: POLICY.customersCreate, nameEs: "Crear clientes", nameEn: "Create customers", module: "customers" },
  { key: POLICY.customersUpdate, nameEs: "Editar clientes", nameEn: "Edit customers", module: "customers" },
  { key: POLICY.customersDelete, nameEs: "Eliminar clientes", nameEn: "Delete customers", module: "customers" },
  { key: POLICY.priceListsView, nameEs: "Ver listas de precios", nameEn: "View price lists", module: "priceLists" },
  { key: POLICY.priceListsManage, nameEs: "Gestionar listas de precios", nameEn: "Manage price lists", module: "priceLists" },
  { key: POLICY.salesCreate, nameEs: "Realizar ventas", nameEn: "Create sales", module: "sales" },
  { key: POLICY.salesView, nameEs: "Ver ventas", nameEn: "View sales", module: "sales" },
  { key: POLICY.salesCancel, nameEs: "Cancelar ventas", nameEn: "Cancel sales", module: "sales" },
  { key: POLICY.stockView, nameEs: "Ver stock", nameEn: "View stock", module: "stock" },
  { key: POLICY.stockAdjust, nameEs: "Ajustar stock", nameEn: "Adjust stock", module: "stock" },
  { key: POLICY.reportsView, nameEs: "Ver reportes", nameEn: "View reports", module: "reports" },
  { key: POLICY.usersView, nameEs: "Ver usuarios", nameEn: "View users", module: "users" },
  { key: POLICY.usersManage, nameEs: "Gestionar usuarios", nameEn: "Manage users", module: "users" },
  { key: POLICY.rolesView, nameEs: "Ver roles", nameEn: "View roles", module: "roles" },
  { key: POLICY.rolesManage, nameEs: "Gestionar roles", nameEn: "Manage roles", module: "roles" },
];

export interface SessionUser {
  id: number;
  name: string;
  email: string | null;
  role: string | null;
  roleId: number | null;
  active: boolean;
  policies: string[];
}

async function loadUser(sessionUserId: number) {
  return prisma.user.findUnique({
    where: { id: sessionUserId },
    include: {
      role: {
        include: {
          rolePolicies: { include: { policy: { select: { key: true } } } },
        },
      },
    },
  });
}

/**
 * Returns the current session user with role and policies, or null when
 * unauthenticated, inactive or deleted. Used by /api/auth/me.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await loadUser(session.userId);
  if (!user || !user.active || user.deletedAt) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role?.name ?? null,
    roleId: user.roleId,
    active: user.active,
    policies: user.role?.rolePolicies.map((rp) => rp.policy.key) ?? [],
  };
}

/**
 * Guards an API route by policy. Returns a NextResponse error when the
 * request is not authorized, or null to continue.
 */
export async function requirePolicy(policyKey: string): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await loadUser(session.userId);
  if (!user || !user.active || user.deletedAt) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = new Set(user.role?.rolePolicies.map((rp) => rp.policy.key) ?? []);
  if (!keys.has(policyKey)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
