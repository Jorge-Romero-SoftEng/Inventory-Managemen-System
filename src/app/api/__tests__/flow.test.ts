import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTranslations } from "@/i18n/translations";
import { apiRequest, apiUrl, jsonRequest, withParams } from "./helpers";
import { getSession } from "@/lib/auth";
import { GET as getProducts, POST as createProduct } from "@/app/api/products/route";
import { GET as getProduct } from "@/app/api/products/[id]/route";
import { POST as adjustStock } from "@/app/api/stock/adjust/route";
import { GET as getStock } from "@/app/api/stock/route";
import { POST as createSale } from "@/app/api/sales/route";
import { GET as getSale } from "@/app/api/sales/[id]/route";
import { POST as cancelSale } from "@/app/api/sales/[id]/cancel/route";

const { db, reset, products, stock, stockMovements, sales } = vi.hoisted(() => {
  type ProductRow = {
    id: number;
    barcode: string | null;
    name: string;
    categoryId: number | null;
    cost: number;
    active: boolean;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  type StockRow = {
    id: number;
    productId: number;
    warehouse: string;
    quantity: number;
    updatedAt: Date;
  };
  type StockMovementRow = {
    id: number;
    productId: number;
    movementType: string;
    quantity: number;
    referenceType: string | null;
    referenceId: number | null;
  };
  type SaleRow = {
    id: number;
    saleNumber: string;
    customerId: number | null;
    userId: number;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: string;
    status: string;
    delivery: boolean;
    mpOrderId: string | null;
  };
  type SaleItemRow = {
    id: number;
    saleId: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    discount: number;
    lineTotal: number;
  };

  const products: ProductRow[] = [];
  const stock: StockRow[] = [];
  const stockMovements: StockMovementRow[] = [];
  const sales: SaleRow[] = [];
  const saleItems: SaleItemRow[] = [];

  const productIds = { current: 0, next: () => ++productIds.current };
  const stockIds = { current: 0, next: () => ++stockIds.current };
  const movementIds = { current: 0, next: () => ++movementIds.current };
  const saleIds = { current: 0, next: () => ++saleIds.current };
  const saleItemIds = { current: 0, next: () => ++saleItemIds.current };

  const matchProduct = (row: ProductRow, where: any): boolean => {
    if (!where) return true;
    if ("deletedAt" in where && (row.deletedAt === null) !== (where.deletedAt === null)) {
      return false;
    }
    if (where.barcode !== undefined && row.barcode !== where.barcode) return false;
    if (where.categoryId !== undefined && row.categoryId !== where.categoryId) return false;
    if (where.active !== undefined && row.active !== where.active) return false;
    if (where.OR) {
      const nameCond = where.OR[0]?.name?.contains;
      const barcodeCond = where.OR[1]?.barcode?.contains;
      const nameHit =
        nameCond && row.name.toLowerCase().includes(String(nameCond).toLowerCase());
      const barcodeHit =
        barcodeCond &&
        row.barcode !== null &&
        row.barcode.toLowerCase().includes(String(barcodeCond).toLowerCase());
      if (!nameHit && !barcodeHit) return false;
    }
    return true;
  };

  const withProductIncludes = (row: ProductRow) => ({
    ...row,
    category: null,
    prices: [],
    stock: stock
      .filter((s) => s.productId === row.id)
      .map((s) => ({ ...s })),
  });

  let db: any;

  db = {
    product: {
      create: async ({ data }: any) => {
        const row: ProductRow = {
          id: productIds.next(),
          barcode: data.barcode ?? null,
          name: data.name,
          categoryId: data.categoryId ?? null,
          cost: data.cost ?? 0,
          active: data.active ?? true,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        products.push(row);
        return { ...row };
      },
      findMany: async ({ where, skip, take }: any) => {
        let rows = products.filter((r) => matchProduct(r, where));
        rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
        if (take !== undefined && take !== null) {
          rows = rows.slice(skip ?? 0, (skip ?? 0) + take);
        }
        return rows.map(withProductIncludes);
      },
      findUnique: async ({ where }: any) => {
        const row = products.find((p) => p.id === where.id && p.deletedAt === null);
        return row ? withProductIncludes(row) : null;
      },
      count: async ({ where }: any) => products.filter((r) => matchProduct(r, where)).length,
      update: async ({ where, data }: any) => {
        const row = products.find((p) => p.id === where.id);
        if (!row) {
          const err = new Error("Prisma error");
          (err as { code?: string }).code = "P2025";
          throw err;
        }
        Object.assign(row, data, { updatedAt: data.updatedAt ?? row.updatedAt });
        return { ...row };
      },
    },
    stock: {
      create: async ({ data }: any) => {
        const row: StockRow = {
          id: stockIds.next(),
          productId: data.productId,
          warehouse: data.warehouse,
          quantity: data.quantity,
          updatedAt: new Date(),
        };
        stock.push(row);
        return { ...row };
      },
      findUnique: async ({ where }: any) => {
        if (where.id !== undefined) return stock.find((s) => s.id === where.id) ?? null;
        const { productId, warehouse } = where.productId_warehouse;
        return stock.find((s) => s.productId === productId && s.warehouse === warehouse) ?? null;
      },
      findFirst: async ({ where }: any) => {
        const row = stock.find(
          (s) =>
            (where.productId === undefined || s.productId === where.productId) &&
            (where.warehouse === undefined || s.warehouse === where.warehouse)
        );
        return row ? { ...row } : null;
      },
      findMany: async () =>
        stock
          .filter((s) => {
            const product = products.find((p) => p.id === s.productId);
            return product && product.deletedAt === null;
          })
          .map((s) => ({
            ...s,
            product: withProductIncludes(products.find((p) => p.id === s.productId)!),
          })),
      update: async ({ where, data }: any) => {
        const row = stock.find((s) => s.id === where.id);
        if (!row) throw new Error("stock not found");
        row.quantity = data.quantity;
        row.updatedAt = data.updatedAt ?? row.updatedAt;
        return { ...row };
      },
    },
    stockMovement: {
      create: async ({ data }: any) => {
        const row: StockMovementRow = {
          id: movementIds.next(),
          productId: data.productId,
          movementType: data.movementType,
          quantity: data.quantity,
          referenceType: data.referenceType ?? null,
          referenceId: data.referenceId ?? null,
        };
        stockMovements.push(row);
        return { ...row };
      },
    },
    sale: {
      create: async ({ data }: any) => {
        const row: SaleRow = {
          id: saleIds.next(),
          saleNumber: data.saleNumber,
          customerId: data.customerId ?? null,
          userId: data.userId,
          subtotal: data.subtotal,
          discount: data.discount ?? 0,
          tax: data.tax ?? 0,
          total: data.total,
          paymentMethod: data.paymentMethod,
          status: data.status ?? "completed",
          delivery: data.delivery ?? false,
          mpOrderId: data.mpOrderId ?? null,
        };
        sales.push(row);
        return { ...row };
      },
      findUnique: async ({ where, include }: any) => {
        const row = sales.find((s) => s.id === where.id);
        if (!row) return null;
        const result: any = { ...row };
        if (include?.items) {
          result.items = saleItems.filter((i) => i.saleId === row.id).map((i) => ({ ...i }));
        }
        return result;
      },
      update: async ({ where, data }: any) => {
        const row = sales.find((s) => s.id === where.id);
        if (!row) throw new Error("sale not found");
        Object.assign(row, data);
        return { ...row };
      },
    },
    saleItem: {
      create: async ({ data }: any) => {
        const row: SaleItemRow = {
          id: saleItemIds.next(),
          saleId: data.saleId,
          productId: data.productId,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          discount: data.discount ?? 0,
          lineTotal: data.lineTotal,
        };
        saleItems.push(row);
        return { ...row };
      },
    },
    customer: {
      update: async ({ where }: any) => ({ id: where.id }),
    },
    $transaction: async (arg: any) =>
      typeof arg === "function" ? arg(db) : Promise.all(arg),
  };

  const reset = () => {
    products.length = 0;
    stock.length = 0;
    stockMovements.length = 0;
    sales.length = 0;
    saleItems.length = 0;
    productIds.current = 0;
    stockIds.current = 0;
    movementIds.current = 0;
    saleIds.current = 0;
    saleItemIds.current = 0;
  };

  return { db, reset, products, stock, stockMovements, sales };
});

vi.mock("@/lib/db", () => ({ prisma: db }));

vi.mock("@/lib/policies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/policies")>();
  return { ...actual, requirePolicy: vi.fn(async () => null) };
});

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getSession: vi.fn(async () => ({ userId: 1 })) };
});

const t = getTranslations();

describe("flow: create product until it is sold", () => {
  beforeEach(() => {
    reset();
    vi.mocked(getSession).mockResolvedValue({ userId: 1 } as never);
  });

  it("creates a product with an initial zero-stock record", async () => {
    const res = await createProduct(
      jsonRequest(apiUrl("/api/products"), {
        barcode: "77900001",
        name: "Harina Premium",
        categoryId: null,
        cost: "100",
        active: true,
      })
    );

    expect(res.status).toBe(201);
    const product = await res.json();
    expect(product.id).toBe(1);
    expect(product.name).toBe("Harina Premium");

    const stockRes = await getStock();
    expect(stockRes.status).toBe(200);
    const stockList = await stockRes.json();
    expect(stockList).toHaveLength(1);
    expect(stockList[0]).toMatchObject({ productId: 1, warehouse: "main", quantity: 0 });
  });

  it("adds stock and makes it visible by barcode", async () => {
    await createProduct(
      jsonRequest(apiUrl("/api/products"), {
        barcode: "77900001",
        name: "Harina Premium",
        cost: "100",
        active: true,
      })
    );

    const adjust = await adjustStock(
      jsonRequest(apiUrl("/api/stock/adjust"), {
        productId: 1,
        quantity: 50,
        reason: "initial stock",
      })
    );
    expect(adjust.status).toBe(200);
    expect(await adjust.json()).toEqual({ success: true });

    const search = await getProducts(apiRequest("/api/products?barcode=77900001"));
    expect(search.status).toBe(200);
    const body = await search.json();
    expect(body.products).toHaveLength(1);
    expect(body.products[0].stock).toEqual([expect.objectContaining({ quantity: 50 })]);
  });

  it("sells the product, decrements stock and records a sale movement", async () => {
    await createProduct(
      jsonRequest(apiUrl("/api/products"), {
        barcode: "77900001",
        name: "Harina Premium",
        cost: "100",
        active: true,
      })
    );
    await adjustStock(
      jsonRequest(apiUrl("/api/stock/adjust"), { productId: 1, quantity: 50, reason: "initial stock" })
    );

    const res = await createSale(
      jsonRequest(apiUrl("/api/sales"), {
        customerId: null,
        items: [{ productId: 1, quantity: 2, unitPrice: 120, discount: 0, lineTotal: 240 }],
        paymentMethod: "cash",
        discount: 0,
        tax: 0,
      })
    );

    expect(res.status).toBe(201);
    const sale = await res.json();
    expect(sale.id).toBe(1);
    expect(sale.status).toBe("completed");
    expect(sale.subtotal).toBe(240);
    expect(sale.total).toBe(240);

    const saleRes = await getSale(apiRequest("/api/sales/1"), withParams(1));
    expect(saleRes.status).toBe(200);
    expect((await saleRes.json()).id).toBe(1);

    const prod = await getProduct(apiRequest("/api/products/1"), withParams(1));
    expect(prod.status).toBe(200);
    const product = await prod.json();
    expect(product.stock).toEqual([expect.objectContaining({ quantity: 48 })]);

    expect(stockMovements).toContainEqual(
      expect.objectContaining({
        productId: 1,
        movementType: "sale",
        quantity: 2,
        referenceType: "sale",
        referenceId: 1,
      })
    );
  });

  it("cancels the sale and restores stock", async () => {
    await createProduct(
      jsonRequest(apiUrl("/api/products"), {
        barcode: "77900001",
        name: "Harina Premium",
        cost: "100",
        active: true,
      })
    );
    await adjustStock(
      jsonRequest(apiUrl("/api/stock/adjust"), { productId: 1, quantity: 50, reason: "initial stock" })
    );
    await createSale(
      jsonRequest(apiUrl("/api/sales"), {
        customerId: null,
        items: [{ productId: 1, quantity: 2, unitPrice: 120, discount: 0, lineTotal: 240 }],
        paymentMethod: "cash",
        discount: 0,
        tax: 0,
      })
    );

    const res = await cancelSale(apiRequest("/api/sales/1/cancel"), withParams(1));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(sales[0].status).toBe("cancelled");
    expect(stock[0].quantity).toBe(50);
    expect(stockMovements).toContainEqual(
      expect.objectContaining({
        productId: 1,
        movementType: "return",
        referenceType: "sale_cancel",
        referenceId: 1,
      })
    );
  });

  it("sells an unknown product without stock validation (current behavior)", async () => {
    const res = await createSale(
      jsonRequest(apiUrl("/api/sales"), {
        customerId: null,
        items: [{ productId: 999, quantity: 1, unitPrice: 10, discount: 0, lineTotal: 10 }],
        paymentMethod: "cash",
        discount: 0,
        tax: 0,
      })
    );

    expect(res.status).toBe(201);
    expect(stock).toHaveLength(0);
    expect(stockMovements).toContainEqual(
      expect.objectContaining({ productId: 999, movementType: "sale" })
    );
  });

  it("returns the expected error when listing stock fails", async () => {
    const originalFindMany = db.stock.findMany;
    db.stock.findMany = async () => {
      throw new Error("db down");
    };

    const res = await getStock();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe(t.api.failedFetchStock);

    db.stock.findMany = originalFindMany;
  });
});
