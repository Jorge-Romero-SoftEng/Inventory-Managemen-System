import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTranslations } from "@/i18n/translations";
import { apiRequest, apiUrl } from "./helpers";
import { GET as dailySales } from "@/app/api/reports/daily-sales/route";
import { GET as lowStock } from "@/app/api/reports/low-stock/route";
import { GET as balances } from "@/app/api/reports/balances/route";

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    sale: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    stock: {
      findMany: vi.fn(),
    },
    customer: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
  };
  return { prismaMock };
});

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

vi.mock("@/lib/policies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/policies")>();
  return { ...actual, requirePolicy: vi.fn(async () => null) };
});

const t = getTranslations();

describe("reports API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/reports/daily-sales", () => {
    it("returns the sales for the day with a summary", async () => {
      const sales = [{ id: 1, total: 100 }];
      prismaMock.sale.findMany.mockResolvedValue(sales);
      prismaMock.sale.aggregate.mockResolvedValue({
        _count: 1,
        _sum: { subtotal: 100, discount: 0, tax: 0, total: 100 },
      });

      const res = await dailySales(
        apiRequest("/api/reports/daily-sales?date=2026-08-03")
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.date).toBe("2026-08-03");
      expect(body.sales).toEqual(sales);
      expect(body.summary).toEqual({ count: 1, subtotal: 100, discount: 0, tax: 0, total: 100 });
      expect(prismaMock.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: { not: "cancelled" } }) })
      );
    });

    it("defaults the summary values to 0 when aggregate returns null", async () => {
      prismaMock.sale.findMany.mockResolvedValue([]);
      prismaMock.sale.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { subtotal: null, discount: null, tax: null, total: null },
      });

      const res = await dailySales(apiRequest("/api/reports/daily-sales"));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.summary).toEqual({ count: 0, subtotal: 0, discount: 0, tax: 0, total: 0 });
    });

    it("returns 500 when the query fails", async () => {
      prismaMock.sale.findMany.mockRejectedValue(new Error("db down"));

      const res = await dailySales(apiRequest("/api/reports/daily-sales"));

      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe(t.api.failedGenerateReport);
    });
  });

  describe("GET /api/reports/low-stock", () => {
    it("returns products below the threshold", async () => {
      const items = [{ id: 1, quantity: 5 }];
      prismaMock.stock.findMany.mockResolvedValue(items);

      const res = await lowStock(
        apiRequest("/api/reports/low-stock?threshold=10")
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(items);
      expect(prismaMock.stock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ quantity: { lte: 10 } }) })
      );
    });

    it("returns 500 when the query fails", async () => {
      prismaMock.stock.findMany.mockRejectedValue(new Error("db down"));

      const res = await lowStock(apiRequest("/api/reports/low-stock"));

      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe(t.api.failedGenerateReport);
    });
  });

  describe("GET /api/reports/balances", () => {
    it("returns customers with outstanding balances", async () => {
      const customers = [{ id: 1, balance: 5000 }];
      prismaMock.customer.findMany.mockResolvedValue(customers);
      prismaMock.customer.aggregate.mockResolvedValue({ _sum: { balance: 5000 } });

      const res = await balances();

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ customers, totalBalance: 5000 });
      expect(prismaMock.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ balance: { gt: 0 } }) })
      );
    });

    it("returns 500 when the query fails", async () => {
      prismaMock.customer.findMany.mockRejectedValue(new Error("db down"));

      const res = await balances();

      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe(t.api.failedGenerateReport);
    });
  });
});
