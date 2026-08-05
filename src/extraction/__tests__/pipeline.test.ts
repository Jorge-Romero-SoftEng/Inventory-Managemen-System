import { describe, it, expect } from "vitest";
import { ExtractionPipelineService } from "../application/services/extraction-pipeline.service";
import type { IAiExtractor } from "../application/contracts/ai.port";
import type {
  CreateDocumentData,
  IExtractionRepository,
  IPriceListRepository,
  ISupplierRepository,
} from "../application/contracts/repositories.port";
import type { IFileStorage } from "../application/contracts/storage.port";
import type { ISourceDetector, ITextExtractor, ExtractSource } from "../application/contracts/text-extractor.port";
import { GeminiError } from "../domain/errors";
import type { ExtractedDocument, StandardExtraction, Supplier, SupplierPriceList } from "@/types/supplier";
import type { ExtractionInput } from "@/types/supplier";

class FakeDetector implements ISourceDetector {
  detect(): "whatsapp" {
    return "whatsapp";
  }
}

class FakeExtractor implements ITextExtractor {
  async extract({ buffer }: ExtractSource): Promise<string> {
    return buffer?.toString("utf8") ?? "";
  }
}

class FakeAi implements IAiExtractor {
  constructor(
    private result: unknown,
    private error?: Error,
  ) {}
  setResult(result: unknown, error?: Error) {
    this.result = result;
    this.error = error;
  }
  async extract(): Promise<unknown> {
    if (this.error) throw this.error;
    return this.result;
  }
}

class FakeStorage implements IFileStorage {
  saved: { buffer: Buffer; fileName: string }[] = [];
  async save(buffer: Buffer, fileName: string): Promise<string> {
    this.saved.push({ buffer, fileName });
    return `/tmp/${fileName}`;
  }
  async load(): Promise<Buffer> {
    return Buffer.from("");
  }
}

class FakeDocRepo implements IExtractionRepository {
  docs: ExtractedDocument[] = [];
  nextId = 1;

  async findByContentHash(hash: string) {
    return this.docs.find((d) => d.contentHash === hash) ?? null;
  }
  async findById(id: number) {
    return this.docs.find((d) => d.id === id) ?? null;
  }
  async create(data: CreateDocumentData) {
    const doc: ExtractedDocument = {
      id: this.nextId++,
      supplierId: data.supplierId,
      inputType: data.inputType,
      fileName: data.fileName ?? null,
      mimeType: data.mimeType ?? null,
      storagePath: data.storagePath ?? null,
      rawText: data.rawText,
      contentHash: data.contentHash,
      status: data.status,
      errorMessage: data.errorMessage ?? null,
      geminiResponse: data.geminiResponse ?? null,
      createdAt: new Date(),
    };
    this.docs.push(doc);
    return doc;
  }
  async updateStatus(id: number, data: { status: "processed" | "error"; errorMessage?: string | null; geminiResponse?: unknown }) {
    const doc = this.docs.find((d) => d.id === id)!;
    doc.status = data.status;
    doc.errorMessage = data.errorMessage ?? null;
    if (data.geminiResponse !== undefined) doc.geminiResponse = data.geminiResponse;
    return doc;
  }
  async delete(id: number) {
    this.docs = this.docs.filter((d) => d.id !== id);
  }
  async list() {
    return { documents: this.docs, total: this.docs.length };
  }
  async listBySupplier() {
    return this.docs;
  }
}

class FakeSupplierRepo implements ISupplierRepository {
  suppliers: Supplier[] = [];
  nextId = 1;

  async findById(id: number) {
    return this.suppliers.find((s) => s.id === id) ?? null;
  }
  async findByName(name: string) {
    return this.suppliers.find((s) => s.name.toLowerCase() === name.toLowerCase()) ?? null;
  }
  async upsertByName(name: string) {
    const existing = await this.findByName(name);
    if (existing) return existing;
    const supplier: Supplier = {
      id: this.nextId++,
      name,
      contact: null,
      phone: null,
      notes: null,
      active: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.suppliers.push(supplier);
    return supplier;
  }
  async list() {
    return this.suppliers;
  }
  async create(data: { name: string }) {
    const supplier: Supplier = {
      id: this.nextId++,
      ...data,
      contact: null,
      phone: null,
      notes: null,
      active: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.suppliers.push(supplier);
    return supplier;
  }
  async update(id: number, data: Partial<Supplier>) {
    const supplier = this.suppliers.find((s) => s.id === id)!;
    Object.assign(supplier, data);
    return supplier;
  }
  async softDelete(id: number) {
    const supplier = this.suppliers.find((s) => s.id === id)!;
    supplier.deletedAt = new Date();
    return supplier;
  }
}

class FakePriceListRepo implements IPriceListRepository {
  lists: SupplierPriceList[] = [];
  nextId = 1;

  async persistExtraction(data: { supplierId: number; documentId: number; extraction: StandardExtraction }) {
    const list = {
      id: this.nextId++,
      supplierId: data.supplierId,
      sourceDocumentId: data.documentId,
      effectiveDate: new Date(),
      currency: "ARS",
      status: "extracted",
      createdAt: new Date(),
      items: data.extraction.products.map((p, i) => ({
        id: i,
        priceListId: this.nextId,
        productId: i,
        price: p.price ?? 0,
        currency: p.currency,
        availability: p.availability,
        product: { id: i, supplierId: data.supplierId, name: p.name, unit: p.unit },
      })),
    } as unknown as SupplierPriceList;
    this.lists.push(list);
    return list;
  }
  async listBySupplier() {
    return this.lists;
  }
  async findByDocumentId(documentId: number) {
    return this.lists.find((l) => l.sourceDocumentId === documentId) ?? null;
  }
}

function buildPipeline(ai: IAiExtractor, supplierId?: number) {
  const docRepo = new FakeDocRepo();
  const supplierRepo = new FakeSupplierRepo();
  const priceListRepo = new FakePriceListRepo();
  const pipeline = new ExtractionPipelineService(
    new FakeDetector(),
    { whatsapp: new FakeExtractor() },
    ai,
    new FakeStorage(),
    supplierRepo,
    priceListRepo,
    docRepo,
  );
  return { pipeline, docRepo, supplierRepo, priceListRepo };
}

const VALID_OUTPUT = {
  supplier: "Molino San Luis",
  effective_date: "2026-08-01",
  products: [
    { name: "Harina 000", unit: "kg", price: 1250.5, currency: "ARS", availability: "available" },
  ],
};

describe("ExtractionPipelineService", () => {
  it("runs the happy path and persists a price list", async () => {
    const { pipeline, docRepo, supplierRepo, priceListRepo } = buildPipeline(new FakeAi(VALID_OUTPUT));
    const result = await pipeline.run({ text: "Harina 000 1.250,50", inputType: "whatsapp", buffer: Buffer.from("Harina 000 1.250,50") } as ExtractionInput);

    expect(result.documentId).toBeGreaterThan(0);
    expect(result.priceListId).toBeGreaterThan(0);
    expect(result.extraction.supplier).toBe("Molino San Luis");
    expect(supplierRepo.suppliers).toHaveLength(1);
    expect(priceListRepo.lists).toHaveLength(1);
    expect(docRepo.docs[0].status).toBe("processed");
  });

  it("uses an explicitly selected supplier over the AI name", async () => {
    const { pipeline, supplierRepo } = buildPipeline(new FakeAi(VALID_OUTPUT));
    const supplier = await supplierRepo.upsertByName("Proveedor Fijo");

    await pipeline.run({ text: "x", inputType: "whatsapp", buffer: Buffer.from("x"), supplierId: supplier.id } as ExtractionInput);

    expect(supplierRepo.suppliers).toHaveLength(1);
    expect(supplierRepo.suppliers[0].name).toBe("Proveedor Fijo");
  });

  it("throws DuplicateDocumentError for repeated content", async () => {
    const { pipeline } = buildPipeline(new FakeAi(VALID_OUTPUT));
    await pipeline.run({ text: "Lista unica", inputType: "whatsapp", buffer: Buffer.from("Lista unica") } as ExtractionInput);
    await expect(
      pipeline.run({ text: "Lista unica", inputType: "whatsapp", buffer: Buffer.from("Lista unica") } as ExtractionInput),
    ).rejects.toMatchObject({ code: "DUPLICATE_DOCUMENT" });
  });

  it("persists an error document when the AI call fails", async () => {
    const { pipeline, docRepo } = buildPipeline(new FakeAi(null, new GeminiError("boom")));
    await expect(
      pipeline.run({ text: "Lista", inputType: "whatsapp", buffer: Buffer.from("Lista") } as ExtractionInput),
    ).rejects.toThrow(GeminiError);
    expect(docRepo.docs).toHaveLength(1);
    expect(docRepo.docs[0].status).toBe("error");
  });

  it("persists an error document when the output is invalid", async () => {
    const { pipeline, docRepo } = buildPipeline(new FakeAi({ supplier: "Molino" }));
    await expect(
      pipeline.run({ text: "Lista", inputType: "whatsapp", buffer: Buffer.from("Lista") } as ExtractionInput),
    ).rejects.toThrow();
    expect(docRepo.docs).toHaveLength(1);
    expect(docRepo.docs[0].status).toBe("error");
    expect(docRepo.docs[0].errorMessage).toContain("standard schema");
  });

  it("allows a retry after a failure", async () => {
    const ai = new FakeAi(null, new GeminiError("boom"));
    const { pipeline, docRepo, priceListRepo } = buildPipeline(ai);

    await expect(
      pipeline.run({ text: "Lista retry", inputType: "whatsapp", buffer: Buffer.from("Lista retry") } as ExtractionInput),
    ).rejects.toThrow();
    expect(docRepo.docs.some((d) => d.status === "error")).toBe(true);

    ai.setResult(VALID_OUTPUT);
    const result = await pipeline.run({ text: "Lista retry", inputType: "whatsapp", buffer: Buffer.from("Lista retry") } as ExtractionInput);
    expect(result.documentId).toBeGreaterThan(0);
    expect(docRepo.docs.some((d) => d.status === "error")).toBe(false);
    expect(priceListRepo.lists).toHaveLength(1);
  });
});
