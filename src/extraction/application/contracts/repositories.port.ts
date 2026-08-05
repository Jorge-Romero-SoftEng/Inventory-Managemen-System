import type { Prisma } from "@prisma/client";
import type {
  ExtractedDocument,
  InputSourceType,
  StandardExtraction,
  Supplier,
  SupplierPriceList,
} from "@/types/supplier";

export interface CreateDocumentData {
  supplierId: number | null;
  inputType: InputSourceType;
  fileName?: string | null;
  mimeType?: string | null;
  storagePath?: string | null;
  rawText: string;
  contentHash: string;
  status: "processed" | "error";
  errorMessage?: string | null;
  geminiResponse?: unknown;
}

export interface IExtractionRepository {
  findByContentHash(hash: string): Promise<ExtractedDocument | null>;
  findById(id: number): Promise<ExtractedDocument | null>;
  create(data: CreateDocumentData): Promise<ExtractedDocument>;
  updateStatus(
    id: number,
    data: { status: "processed" | "error"; errorMessage?: string | null; geminiResponse?: unknown },
  ): Promise<ExtractedDocument>;
  delete(id: number): Promise<void>;
  list(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ documents: ExtractedDocument[]; total: number }>;
  listBySupplier(supplierId: number): Promise<ExtractedDocument[]>;
}

export interface ISupplierRepository {
  findById(id: number): Promise<Supplier | null>;
  findByName(name: string): Promise<Supplier | null>;
  upsertByName(name: string): Promise<Supplier>;
  list(params?: { search?: string; active?: boolean }): Promise<Supplier[]>;
  create(data: { name: string; contact?: string | null; phone?: string | null; notes?: string | null }): Promise<Supplier>;
  update(
    id: number,
    data: { name?: string; contact?: string | null; phone?: string | null; notes?: string | null; active?: boolean },
  ): Promise<Supplier>;
  softDelete(id: number): Promise<Supplier>;
}

/**
 * Persists a validated extraction as a supplier price list with its line
 * items. Runs inside a single Prisma transaction so a partially written
 * price list is never left behind.
 */
export interface IPriceListRepository {
  persistExtraction(data: {
    supplierId: number;
    documentId: number;
    extraction: StandardExtraction;
  }): Promise<SupplierPriceList>;
  listBySupplier(supplierId: number): Promise<SupplierPriceList[]>;
  findByDocumentId(documentId: number): Promise<SupplierPriceList | null>;
}
