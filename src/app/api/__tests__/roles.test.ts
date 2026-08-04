import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTranslations } from "@/i18n/translations";
import { apiRequest, apiUrl, jsonRequest, withParams, prismaError } from "./helpers";
import {
  GET as listRoles,
  POST as createRole,
} from "@/app/api/roles/route";
import {
  GET as getRole,
  PUT as updateRole,
  DELETE as deleteRole,
} from "@/app/api/roles/[id]/route";

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    role: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    policy: {
      findMany: vi.fn(),
    },
    rolePolicy: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
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

describe("roles API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/roles", () => {
    it("returns the list of roles", async () => {
      const roles = [{ id: 1, name: "Admin" }];
      prismaMock.role.findMany.mockResolvedValue(roles);

      const res = await listRoles();

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(roles);
    });

    it("returns 500 when the query fails", async () => {
      prismaMock.role.findMany.mockRejectedValue(new Error("db down"));

      const res = await listRoles();

      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe(t.api.failedFetchRoles);
    });
  });

  describe("POST /api/roles", () => {
    it("creates a role with policies", async () => {
      prismaMock.role.create.mockResolvedValue({ id: 3, name: "Vendedor" });
      prismaMock.policy.findMany.mockResolvedValue([{ id: 10 }]);

      const res = await createRole(
        jsonRequest(apiUrl("/api/roles"), { name: "Vendedor", policies: ["sales.create"] })
      );

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ id: 3, name: "Vendedor" });
      expect(prismaMock.rolePolicy.createMany).toHaveBeenCalled();
    });

    it("returns 400 when the name is missing", async () => {
      const res = await createRole(
        jsonRequest(apiUrl("/api/roles"), { name: "  " })
      );

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(t.api.nameRequired);
      expect(prismaMock.role.create).not.toHaveBeenCalled();
    });

    it("returns 409 when the name already exists", async () => {
      prismaMock.role.create.mockRejectedValue(prismaError("P2002"));

      const res = await createRole(
        jsonRequest(apiUrl("/api/roles"), { name: "Vendedor" })
      );

      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe(t.api.roleExists);
    });
  });

  describe("GET /api/roles/:id", () => {
    it("returns a role", async () => {
      const role = { id: 1, name: "Admin" };
      prismaMock.role.findUnique.mockResolvedValue(role);

      const res = await getRole(apiRequest("/api/roles/1"), withParams(1));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(role);
    });

    it("returns 404 when the role does not exist", async () => {
      prismaMock.role.findUnique.mockResolvedValue(null);

      const res = await getRole(apiRequest("/api/roles/1"), withParams(1));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.roleNotFound);
    });
  });

  describe("PUT /api/roles/:id", () => {
    it("updates a role", async () => {
      prismaMock.role.findUnique.mockResolvedValue({ id: 3, deletedAt: null });
      prismaMock.role.update.mockResolvedValue({ id: 3, name: "Vendedor" });

      const res = await updateRole(
        jsonRequest(apiUrl("/api/roles/3"), { name: "Vendedor" }),
        withParams(3)
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ id: 3, name: "Vendedor" });
    });

    it("returns 404 when the role does not exist", async () => {
      prismaMock.role.findUnique.mockResolvedValue(null);

      const res = await updateRole(
        jsonRequest(apiUrl("/api/roles/3"), { name: "Vendedor" }),
        withParams(3)
      );

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.roleNotFound);
    });
  });

  describe("DELETE /api/roles/:id", () => {
    it("soft-deletes a role and unassigns its users", async () => {
      prismaMock.role.findUnique.mockResolvedValue({ id: 3, deletedAt: null, isSystem: false });
      prismaMock.user.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.role.update.mockResolvedValue({ id: 3 });

      const res = await deleteRole(apiRequest("/api/roles/3"), withParams(3));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(prismaMock.user.updateMany).toHaveBeenCalled();
    });

    it("returns 404 when the role does not exist", async () => {
      prismaMock.role.findUnique.mockResolvedValue(null);

      const res = await deleteRole(apiRequest("/api/roles/3"), withParams(3));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.roleNotFound);
    });

    it("returns 400 for system roles", async () => {
      prismaMock.role.findUnique.mockResolvedValue({ id: 1, deletedAt: null, isSystem: true });

      const res = await deleteRole(apiRequest("/api/roles/1"), withParams(1));

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(t.api.cannotDeleteSystemRole);
    });
  });
});
