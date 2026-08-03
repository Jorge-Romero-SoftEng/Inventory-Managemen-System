import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTranslations } from "@/i18n/translations";
import { apiRequest, apiUrl, jsonRequest, withParams, prismaError } from "./helpers";
import {
  GET as listCategories,
  POST as createCategory,
} from "@/app/api/categories/route";
import {
  GET as getCategory,
  PUT as updateCategory,
  DELETE as deleteCategory,
} from "@/app/api/categories/[id]/route";

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    product: {
      updateMany: vi.fn(),
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

const t = getTranslations();

describe("categories API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/categories", () => {
    it("returns the list of categories", async () => {
      const categories = [{ id: 1, name: "Harinas" }];
      prismaMock.category.findMany.mockResolvedValue(categories);

      const res = await listCategories(apiRequest("/api/categories"));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(categories);
    });

    it("returns 500 when the query fails", async () => {
      prismaMock.category.findMany.mockRejectedValue(new Error("db down"));

      const res = await listCategories(apiRequest("/api/categories"));

      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe(t.api.failedFetchCategories);
    });
  });

  describe("POST /api/categories", () => {
    it("creates a category", async () => {
      prismaMock.category.create.mockResolvedValue({ id: 1, name: "Harinas" });

      const res = await createCategory(
        jsonRequest(apiUrl("/api/categories"), { name: "Harinas" })
      );

      expect(res.status).toBe(201);
      expect(prismaMock.category.create).toHaveBeenCalledWith({ data: { name: "Harinas" } });
    });

    it("returns 400 when the name is missing", async () => {
      const res = await createCategory(
        jsonRequest(apiUrl("/api/categories"), { name: "  " })
      );

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(t.api.nameRequired);
      expect(prismaMock.category.create).not.toHaveBeenCalled();
    });

    it("returns 409 when the name already exists", async () => {
      prismaMock.category.create.mockRejectedValue(prismaError("P2002"));

      const res = await createCategory(
        jsonRequest(apiUrl("/api/categories"), { name: "Harinas" })
      );

      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe(t.api.categoryExists);
    });
  });

  describe("GET /api/categories/:id", () => {
    it("returns a category", async () => {
      const category = { id: 1, name: "Harinas" };
      prismaMock.category.findUnique.mockResolvedValue(category);

      const res = await getCategory(apiRequest("/api/categories/1"), withParams(1));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(category);
    });

    it("returns 404 when the category does not exist", async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      const res = await getCategory(apiRequest("/api/categories/1"), withParams(1));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.categoryNotFound);
    });
  });

  describe("PUT /api/categories/:id", () => {
    it("updates a category", async () => {
      const updated = { id: 1, name: "Yerbas" };
      prismaMock.category.update.mockResolvedValue(updated);

      const res = await updateCategory(
        jsonRequest(apiUrl("/api/categories/1"), { name: "Yerbas" }),
        withParams(1)
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(updated);
    });

    it("returns 409 when the name is already taken", async () => {
      prismaMock.category.update.mockRejectedValue(prismaError("P2002"));

      const res = await updateCategory(
        jsonRequest(apiUrl("/api/categories/1"), { name: "Yerbas" }),
        withParams(1)
      );

      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe(t.api.categoryExists);
    });

    it("returns 404 when the category does not exist", async () => {
      prismaMock.category.update.mockRejectedValue(prismaError("P2025"));

      const res = await updateCategory(
        jsonRequest(apiUrl("/api/categories/1"), { name: "Yerbas" }),
        withParams(1)
      );

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.categoryNotFound);
    });
  });

  describe("DELETE /api/categories/:id", () => {
    it("soft-deletes a category and unlinks its products", async () => {
      prismaMock.product.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.category.update.mockResolvedValue({ id: 1 });

      const res = await deleteCategory(apiRequest("/api/categories/1"), withParams(1));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(prismaMock.product.updateMany).toHaveBeenCalledWith({
        where: { categoryId: 1 },
        data: { categoryId: null },
      });
    });

    it("returns 404 when the category does not exist", async () => {
      prismaMock.product.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.category.update.mockRejectedValue(prismaError("P2025"));

      const res = await deleteCategory(apiRequest("/api/categories/1"), withParams(1));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.categoryNotFound);
    });
  });
});
