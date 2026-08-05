import type { ISupplierRepository, IPriceListRepository } from "@/extraction/application/contracts/repositories.port";
import type { Supplier, SupplierPriceList } from "@/types/supplier";

export interface SupplierInput {
  name: string;
  contact?: string | null;
  phone?: string | null;
  notes?: string | null;
}

/**
 * Application service exposing supplier management operations to the API
 * layer. Kept thin: business invariants live here, persistence is delegated
 * to repositories.
 */
export class SupplierService {
  constructor(
    private readonly supplierRepo: ISupplierRepository,
    private readonly priceListRepo: IPriceListRepository,
  ) {}

  async list(params?: { search?: string; active?: boolean }): Promise<Supplier[]> {
    return this.supplierRepo.list(params);
  }

  async getById(id: number): Promise<Supplier | null> {
    return this.supplierRepo.findById(id);
  }

  async create(data: SupplierInput): Promise<Supplier> {
    const name = data.name.trim();
    if (!name) throw new Error("Supplier name is required");
    return this.supplierRepo.create({ ...data, name });
  }

  async update(id: number, data: Partial<SupplierInput> & { active?: boolean }): Promise<Supplier> {
    return this.supplierRepo.update(id, data);
  }

  async remove(id: number): Promise<Supplier> {
    return this.supplierRepo.softDelete(id);
  }

  async priceLists(supplierId: number): Promise<SupplierPriceList[]> {
    return this.priceListRepo.listBySupplier(supplierId);
  }
}
