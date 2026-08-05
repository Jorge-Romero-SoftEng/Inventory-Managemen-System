import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ISupplierRepository } from "@/extraction/application/contracts/repositories.port";
import type { Supplier } from "@/types/supplier";

function mapSupplier(d: {
  id: number;
  name: string;
  contact: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Supplier {
  return { ...d };
}

/** Prisma-backed supplier repository. Soft-deleted rows are never returned. */
export class PrismaSupplierRepository implements ISupplierRepository {
  private baseWhere = { deletedAt: null };

  async findById(id: number): Promise<Supplier | null> {
    const row = await prisma.supplier.findFirst({ where: { id, ...this.baseWhere } });
    return row ? mapSupplier(row) : null;
  }

  async findByName(name: string): Promise<Supplier | null> {
    const row = await prisma.supplier.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, ...this.baseWhere },
    });
    return row ? mapSupplier(row) : null;
  }

  async upsertByName(name: string): Promise<Supplier> {
    const existing = await this.findByName(name);
    if (existing) return existing;
    // Unique-name race guarded: on conflict we return the winning row.
    try {
      const row = await prisma.supplier.create({ data: { name } });
      return mapSupplier(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const row = await this.findByName(name);
        if (row) return row;
      }
      throw error;
    }
  }

  async list(params?: { search?: string; active?: boolean }): Promise<Supplier[]> {
    const rows = await prisma.supplier.findMany({
      where: {
        ...this.baseWhere,
        ...(params?.search ? { name: { contains: params.search, mode: "insensitive" } } : {}),
        ...(params?.active !== undefined ? { active: params.active } : {}),
      },
      orderBy: { name: "asc" },
    });
    return rows.map(mapSupplier);
  }

  async create(data: { name: string; contact?: string | null; phone?: string | null; notes?: string | null }): Promise<Supplier> {
    const row = await prisma.supplier.create({
      data: { name: data.name, contact: data.contact ?? null, phone: data.phone ?? null, notes: data.notes ?? null },
    });
    return mapSupplier(row);
  }

  async update(
    id: number,
    data: { name?: string; contact?: string | null; phone?: string | null; notes?: string | null; active?: boolean },
  ): Promise<Supplier> {
    const row = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        contact: data.contact ?? null,
        phone: data.phone ?? null,
        notes: data.notes ?? null,
        active: data.active,
      },
    });
    return mapSupplier(row);
  }

  async softDelete(id: number): Promise<Supplier> {
    const row = await prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
    return mapSupplier(row);
  }
}
