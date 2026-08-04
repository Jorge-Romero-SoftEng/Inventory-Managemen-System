import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTranslations } from "@/i18n/translations";
import { apiRequest, apiUrl, jsonRequest, withParams } from "./helpers";
import { getSession } from "@/lib/auth";
import {
  GET as listSales,
  POST as createSale,
} from "@/app/api/sales/route";
import { GET as getSale } from "@/app/api/sales/[id]/route";
import { POST as cancelSale } from "@/app/api/sales/[id]/cancel/route";

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    sale: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    saleItem: {
      create: vi.fn(),
    },
    stock: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    customer: {
      update: vi.fn(),
    },
    $transaction: vi.fn(async (arg: any) =>
      typeof arg === "function" ? arg(prismaMock) : Promise.all(arg)
    ),
  };
  return { prismaMock };
});

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

vi.mock("@/lib/policies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/policies")>();
  return { ...actual, requirePolicy: vi.fn(async () => null) };
});

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getSession: vi.fn(async () => ({ userId: 1 })) };
});

const t = getTranslations();

const items = [
  { productId: 1, quantity: 2, unitPrice: 10, discount: 0, lineTotal: 20 },
];

const createdSale = { id: 10, saleNumber: "INV-1", status: "completed" };

describe("sales API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue({ userId: 1 } as never);
  });

  describe("GET /api/sales", () => {
    it("returns sales and total count", async () => {
      prismaMock.sale.findMany.mockResolvedValue([createdSale]);
      prismaMock.sale.count.mockResolvedValue(1);

      const res = await listSales(apiRequest("/api/sales"));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ sales: [createdSale], total: 1 });
    });

    it("returns 500 when the query fails", async () => {
      prismaMock.sale.findMany.mockRejectedValue(new Error("db down"));

      const res = await listSales(apiRequest("/api/sales"));

      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe(t.api.failedFetchSales);
    });
  });

  describe("POST /api/sales", () => {
    it("creates a sale and adjusts stock", async () => {
      prismaMock.sale.create.mockResolvedValue(createdSale);
      prismaMock.saleItem.create.mockResolvedValue({ id: 1 });
      prismaMock.stock.findFirst.mockResolvedValue({ id: 1, quantity: 50 });
      prismaMock.stock.update.mockResolvedValue({ id: 1 });
      prismaMock.stockMovement.create.mockResolvedValue({ id: 1 });

      const res = await createSale(
        jsonRequest(apiUrl("/api/sales"), {
          customerId: null,
          items,
          paymentMethod: "cash",
          discount: 0,
          tax: 0,
        })
      );

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual(createdSale);
      expect(prismaMock.saleItem.create).toHaveBeenCalled();
      expect(prismaMock.stockMovement.create).toHaveBeenCalled();
    });

    it("returns 400 when there are no items", async () => {
      const res = await createSale(
        jsonRequest(apiUrl("/api/sales"), {
          customerId: null,
          items: [],
          paymentMethod: "cash",
        })
      );

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(t.api.atLeastOneItem);
    });

    it("returns 400 when the payment method is missing", async () => {
      const res = await createSale(
        jsonRequest(apiUrl("/api/sales"), { customerId: null, items })
      );

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(t.api.paymentMethodRequired);
    });

    it("returns 401 without a session", async () => {
      vi.mocked(getSession).mockResolvedValue(null as never);

      const res = await createSale(
        jsonRequest(apiUrl("/api/sales"), {
          customerId: null,
          items,
          paymentMethod: "cash",
        })
      );

      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe(t.api.unauthorized);
    });

    it("returns 500 when creation fails", async () => {
      prismaMock.sale.create.mockRejectedValue(new Error("db down"));

      const res = await createSale(
        jsonRequest(apiUrl("/api/sales"), {
          customerId: null,
          items,
          paymentMethod: "cash",
        })
      );

      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe(t.api.failedCreateSale);
    });
  });

  describe("GET /api/sales/:id", () => {
    it("returns a sale", async () => {
      prismaMock.sale.findUnique.mockResolvedValue(createdSale);

      const res = await getSale(apiRequest("/api/sales/10"), withParams(10));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(createdSale);
    });

    it("returns 404 when the sale does not exist", async () => {
      prismaMock.sale.findUnique.mockResolvedValue(null);

      const res = await getSale(apiRequest("/api/sales/10"), withParams(10));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.saleNotFound);
    });
  });

  describe("POST /api/sales/:id/cancel", () => {
    it("cancels a completed sale and restores stock", async () => {
      prismaMock.sale.findUnique.mockResolvedValue({
        id: 10,
        status: "completed",
        paymentMethod: "cash",
        customerId: null,
        mpOrderId: null,
        total: 20,
        items: [{ productId: 1, quantity: 2 }],
      });
      prismaMock.sale.update.mockResolvedValue({ id: 10 });
      prismaMock.stock.findFirst.mockResolvedValue({ id: 1, quantity: 50 });
      prismaMock.stock.update.mockResolvedValue({ id: 1 });
      prismaMock.stockMovement.create.mockResolvedValue({ id: 1 });

      const res = await cancelSale(apiRequest("/api/sales/10/cancel"), withParams(10));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(prismaMock.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ movementType: "return" }) })
      );
    });

    it("returns 400 when the sale is already cancelled", async () => {
      prismaMock.sale.findUnique.mockResolvedValue({
        id: 10,
        status: "cancelled",
        items: [],
      });

      const res = await cancelSale(apiRequest("/api/sales/10/cancel"), withParams(10));

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(t.api.saleAlreadyCancelled);
    });

    it("returns 404 when the sale does not exist", async () => {
      prismaMock.sale.findUnique.mockResolvedValue(null);

      const res = await cancelSale(apiRequest("/api/sales/10/cancel"), withParams(10));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.saleNotFound);
    });
  });
});
