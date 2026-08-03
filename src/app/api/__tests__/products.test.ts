import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTranslations } from "@/i18n/translations";
import { apiRequest, apiUrl, jsonRequest, withParams, prismaError } from "./helpers";
import {
  GET as listProducts,
  POST as createProduct,
} from "@/app/api/products/route";
import {
  GET as getProduct,
  PUT as updateProduct,
  DELETE as deleteProduct,
} from "@/app/api/products/[id]/route";

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    stock: {
      create: vi.fn(),
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

describe("products API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/products", () => {
    it("returns the list of products with pagination metadata", async () => {
      const products = [{ id: 1, name: "Harina" }];
      prismaMock.product.findMany.mockResolvedValue(products);
      prismaMock.product.count.mockResolvedValue(1);

      const res = await listProducts(apiRequest("/api/products"));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        products,
        total: 1,
        page: 1,
        pageSize: null,
      });
      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: undefined, take: undefined })
      );
    });

    it("applies skip/take when page and pageSize are provided", async () => {
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.product.count.mockResolvedValue(25);

      const res = await listProducts(
        apiRequest("/api/products?page=2&pageSize=10")
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        products: [],
        total: 25,
        page: 2,
        pageSize: 10,
      });
      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });

    it("returns all products when pageSize is all", async () => {
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.product.count.mockResolvedValue(25);

      const res = await listProducts(
        apiRequest("/api/products?pageSize=all")
      );

      expect(res.status).toBe(200);
      expect((await res.json()).pageSize).toBeNull();
      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: undefined, take: undefined })
      );
    });

    it("filters by categoryId", async () => {
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.product.count.mockResolvedValue(0);

      await listProducts(apiRequest("/api/products?categoryId=3"));

      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ categoryId: 3 }) })
      );
    });

    it("returns 500 when the query fails", async () => {
      prismaMock.product.findMany.mockRejectedValue(new Error("db down"));

      const res = await listProducts(apiRequest("/api/products"));

      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe(t.api.failedFetchProducts);
    });
  });

  describe("POST /api/products", () => {
    it("creates a product and its initial stock", async () => {
      prismaMock.product.create.mockResolvedValue({ id: 1, name: "Harina", cost: 100, active: true, categoryId: null, barcode: "779" });
      prismaMock.stock.create.mockResolvedValue({ id: 1 });

      const res = await createProduct(
        jsonRequest(apiUrl("/api/products"), { barcode: "779", name: "Harina", categoryId: 1, cost: "100", active: true })
      );

      expect(res.status).toBe(201);
      expect(prismaMock.product.create).toHaveBeenCalled();
      expect(prismaMock.stock.create).toHaveBeenCalledWith({
        data: { productId: 1, warehouse: "main", quantity: 0 },
      });
    });

    it("returns 400 when the name is missing", async () => {
      const res = await createProduct(
        jsonRequest(apiUrl("/api/products"), { barcode: "779" })
      );

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(t.api.nameRequired);
      expect(prismaMock.product.create).not.toHaveBeenCalled();
    });

    it("returns 409 when the barcode already exists", async () => {
      prismaMock.product.create.mockRejectedValue(prismaError("P2002"));

      const res = await createProduct(
        jsonRequest(apiUrl("/api/products"), { name: "Harina" })
      );

      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe(t.api.barcodeExists);
    });
  });

  describe("GET /api/products/:id", () => {
    it("returns a product", async () => {
      const product = { id: 1, name: "Harina" };
      prismaMock.product.findUnique.mockResolvedValue(product);

      const res = await getProduct(apiRequest("/api/products/1"), withParams(1));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(product);
    });

    it("returns 404 when the product does not exist", async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      const res = await getProduct(apiRequest("/api/products/1"), withParams(1));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.productNotFound);
    });
  });

  describe("PUT /api/products/:id", () => {
    it("updates a product", async () => {
      const updated = { id: 1, name: "Azucar" };
      prismaMock.product.update.mockResolvedValue(updated);

      const res = await updateProduct(
        jsonRequest(apiUrl("/api/products/1"), { name: "Azucar" }),
        withParams(1)
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(updated);
    });

    it("returns 409 when the barcode is already taken", async () => {
      prismaMock.product.update.mockRejectedValue(prismaError("P2002"));

      const res = await updateProduct(
        jsonRequest(apiUrl("/api/products/1"), { name: "Azucar" }),
        withParams(1)
      );

      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe(t.api.barcodeExists);
    });
  });

  describe("DELETE /api/products/:id", () => {
    it("soft-deletes a product", async () => {
      prismaMock.product.update.mockResolvedValue({ id: 1 });

      const res = await deleteProduct(apiRequest("/api/products/1"), withParams(1));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("returns 404 when the product does not exist", async () => {
      prismaMock.product.update.mockRejectedValue(prismaError("P2025"));

      const res = await deleteProduct(apiRequest("/api/products/1"), withParams(1));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.productNotFound);
    });
  });
});
