import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTranslations } from "@/i18n/translations";
import { apiRequest, apiUrl, jsonRequest, withParams, prismaError } from "./helpers";
import {
  GET as listCustomers,
  POST as createCustomer,
} from "@/app/api/customers/route";
import {
  GET as getCustomer,
  PUT as updateCustomer,
  DELETE as deleteCustomer,
} from "@/app/api/customers/[id]/route";

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    customer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

describe("customers API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/customers", () => {
    it("returns the list of customers", async () => {
      const customers = [{ id: 1, name: "Almacen Central" }];
      prismaMock.customer.findMany.mockResolvedValue(customers);

      const res = await listCustomers(apiRequest("/api/customers"));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(customers);
    });

    it("returns 500 when the query fails", async () => {
      prismaMock.customer.findMany.mockRejectedValue(new Error("db down"));

      const res = await listCustomers(apiRequest("/api/customers"));

      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe(t.api.failedFetchCustomers);
    });
  });

  describe("POST /api/customers", () => {
    it("creates a customer", async () => {
      prismaMock.customer.create.mockResolvedValue({ id: 1, name: "Almacen Central" });

      const res = await createCustomer(
        jsonRequest(apiUrl("/api/customers"), { name: "Almacen Central", taxId: "8001", creditLimit: "50000" })
      );

      expect(res.status).toBe(201);
      expect(prismaMock.customer.create).toHaveBeenCalled();
    });

    it("returns 400 when the name is missing", async () => {
      const res = await createCustomer(
        jsonRequest(apiUrl("/api/customers"), { taxId: "8001" })
      );

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(t.api.nameRequired);
      expect(prismaMock.customer.create).not.toHaveBeenCalled();
    });

    it("returns 500 when creation fails", async () => {
      prismaMock.customer.create.mockRejectedValue(new Error("db down"));

      const res = await createCustomer(
        jsonRequest(apiUrl("/api/customers"), { name: "Almacen Central" })
      );

      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe(t.api.failedCreateCustomer);
    });
  });

  describe("GET /api/customers/:id", () => {
    it("returns a customer", async () => {
      const customer = { id: 1, name: "Almacen Central" };
      prismaMock.customer.findUnique.mockResolvedValue(customer);

      const res = await getCustomer(apiRequest("/api/customers/1"), withParams(1));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(customer);
    });

    it("returns 404 when the customer does not exist", async () => {
      prismaMock.customer.findUnique.mockResolvedValue(null);

      const res = await getCustomer(apiRequest("/api/customers/1"), withParams(1));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.customerNotFound);
    });
  });

  describe("PUT /api/customers/:id", () => {
    it("updates a customer", async () => {
      const updated = { id: 1, name: "Almacen Central", phone: "555" };
      prismaMock.customer.update.mockResolvedValue(updated);

      const res = await updateCustomer(
        jsonRequest(apiUrl("/api/customers/1"), { name: "Almacen Central", phone: "555" }),
        withParams(1)
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(updated);
    });

    it("returns 404 when the customer does not exist", async () => {
      prismaMock.customer.update.mockRejectedValue(prismaError("P2025"));

      const res = await updateCustomer(
        jsonRequest(apiUrl("/api/customers/1"), { name: "Almacen Central" }),
        withParams(1)
      );

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.customerNotFound);
    });
  });

  describe("DELETE /api/customers/:id", () => {
    it("soft-deletes a customer", async () => {
      prismaMock.customer.update.mockResolvedValue({ id: 1 });

      const res = await deleteCustomer(apiRequest("/api/customers/1"), withParams(1));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(prismaMock.customer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("returns 404 when the customer does not exist", async () => {
      prismaMock.customer.update.mockRejectedValue(prismaError("P2025"));

      const res = await deleteCustomer(apiRequest("/api/customers/1"), withParams(1));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.customerNotFound);
    });
  });
});
