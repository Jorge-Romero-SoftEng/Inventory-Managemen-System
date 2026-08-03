import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTranslations } from "@/i18n/translations";
import { apiRequest, apiUrl, jsonRequest, withParams, prismaError } from "./helpers";
import { getSession } from "@/lib/auth";
import {
  GET as listUsers,
  POST as createUser,
} from "@/app/api/users/route";
import {
  GET as getUser,
  PUT as updateUser,
  DELETE as deleteUser,
} from "@/app/api/users/[id]/route";

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    user: {
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

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getSession: vi.fn(async () => ({ userId: 1 })) };
});

const t = getTranslations();

const validUser = {
  id: 1,
  name: "Juan",
  email: "juan@example.com",
  active: true,
  roleId: 2,
};

describe("users API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue({ userId: 1 } as never);
  });

  describe("GET /api/users", () => {
    it("returns the list of users", async () => {
      prismaMock.user.findMany.mockResolvedValue([validUser]);

      const res = await listUsers();

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([validUser]);
    });

    it("returns 500 when the query fails", async () => {
      prismaMock.user.findMany.mockRejectedValue(new Error("db down"));

      const res = await listUsers();

      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe(t.api.failedFetchUsers);
    });
  });

  describe("POST /api/users", () => {
    it("creates a user", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(validUser);

      const res = await createUser(
        jsonRequest(apiUrl("/api/users"), { name: "Juan", email: "juan@example.com", password: "secret", roleId: 2 })
      );

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual(validUser);
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it("returns 400 when name, email or password are missing", async () => {
      const res = await createUser(
        jsonRequest(apiUrl("/api/users"), { email: "juan@example.com" })
      );

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(t.api.nameEmailPasswordRequired);
    });

    it("returns 400 when the role is missing", async () => {
      const res = await createUser(
        jsonRequest(apiUrl("/api/users"), { name: "Juan", email: "juan@example.com", password: "secret" })
      );

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(t.api.roleRequired);
    });

    it("returns 409 when the email is already registered", async () => {
      prismaMock.user.findUnique.mockResolvedValue(validUser);

      const res = await createUser(
        jsonRequest(apiUrl("/api/users"), { name: "Juan", email: "juan@example.com", password: "secret", roleId: 2 })
      );

      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe(t.api.emailRegistered);
    });

    it("returns 409 when a unique constraint fires", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockRejectedValue(prismaError("P2002"));

      const res = await createUser(
        jsonRequest(apiUrl("/api/users"), { name: "Juan", email: "juan@example.com", password: "secret", roleId: 2 })
      );

      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe(t.api.emailRegistered);
    });
  });

  describe("GET /api/users/:id", () => {
    it("returns a user", async () => {
      prismaMock.user.findUnique.mockResolvedValue(validUser);

      const res = await getUser(apiRequest("/api/users/1"), withParams(1));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(validUser);
    });

    it("returns 404 when the user does not exist", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await getUser(apiRequest("/api/users/1"), withParams(1));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.userNotFound);
    });
  });

  describe("PUT /api/users/:id", () => {
    it("updates a user", async () => {
      prismaMock.user.update.mockResolvedValue(validUser);

      const res = await updateUser(
        jsonRequest(apiUrl("/api/users/1"), { name: "Juan", active: true }),
        withParams(1)
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(validUser);
    });

    it("returns 409 when the email is already taken", async () => {
      prismaMock.user.update.mockRejectedValue(prismaError("P2002"));

      const res = await updateUser(
        jsonRequest(apiUrl("/api/users/1"), { email: "juan@example.com" }),
        withParams(1)
      );

      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe(t.api.emailRegistered);
    });

    it("returns 404 when the user does not exist", async () => {
      prismaMock.user.update.mockRejectedValue(prismaError("P2025"));

      const res = await updateUser(
        jsonRequest(apiUrl("/api/users/1"), { name: "Juan" }),
        withParams(1)
      );

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.userNotFound);
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("soft-deletes another user", async () => {
      prismaMock.user.update.mockResolvedValue({ id: 2 });

      const res = await deleteUser(apiRequest("/api/users/2"), withParams(2));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { deletedAt: expect.any(Date), active: false },
      });
    });

    it("returns 400 when deleting your own account", async () => {
      const res = await deleteUser(apiRequest("/api/users/1"), withParams(1));

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(t.api.cannotDeleteOwnAccount);
    });

    it("returns 401 without a session", async () => {
      vi.mocked(getSession).mockResolvedValue(null as never);

      const res = await deleteUser(apiRequest("/api/users/2"), withParams(2));

      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe(t.api.unauthorized);
    });

    it("returns 404 when the user does not exist", async () => {
      prismaMock.user.update.mockRejectedValue(prismaError("P2025"));

      const res = await deleteUser(apiRequest("/api/users/2"), withParams(2));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t.api.userNotFound);
    });
  });
});
