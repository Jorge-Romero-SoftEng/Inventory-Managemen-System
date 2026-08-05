import { describe, it, expect } from "vitest";
import { MOCK_SUPPLIERS } from "./fixtures/mock-suppliers";
import { coerceAvailability, coercePrice, standardExtractionSchema } from "../validation/schemas";
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
  constructor(private result: unknown) {}
  async extract(): Promise<unknown> {
    return this.result;
  }
}

class FakeStorage implements IFileStorage {
  async save(_buffer: Buffer, fileName: string): Promise<string> {
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

function buildPipeline(ai: IAiExtractor) {
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

describe("mock supplier fixtures", () => {
  it("contains 10 suppliers with 10-50 products each", () => {
    expect(MOCK_SUPPLIERS).toHaveLength(10);
    for (const fixture of MOCK_SUPPLIERS) {
      expect(fixture.expected.products.length).toBeGreaterThanOrEqual(10);
      expect(fixture.expected.products.length).toBeLessThanOrEqual(50);
      expect(fixture.expected.supplier).toBe(fixture.name);
    }
  });

  it("covers clean and messy profiles", () => {
    expect(MOCK_SUPPLIERS.filter((s) => s.profile === "clean")).toHaveLength(4);
    expect(MOCK_SUPPLIERS.filter((s) => s.profile === "messy")).toHaveLength(6);
  });

  it("has unique supplier names and fixture ids", () => {
    const names = MOCK_SUPPLIERS.map((s) => s.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    const ids = MOCK_SUPPLIERS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every expected extraction validates against the standard schema", () => {
    for (const fixture of MOCK_SUPPLIERS) {
      const result = standardExtractionSchema.safeParse(fixture.expected);
      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error(`${fixture.id}: ${JSON.stringify(result.error.issues)}`);
      }
    }
  });

  it("normalized values round-trip through the coercion helpers", () => {
    for (const fixture of MOCK_SUPPLIERS) {
      for (const product of fixture.expected.products) {
        expect(coercePrice(product.price)).toBe(product.price);
        expect(coerceAvailability(product.availability)).toBe(product.availability);
      }
    }
  });

  it("messy fixtures exercise the real-world edge cases", () => {
    const messy = MOCK_SUPPLIERS.filter((s) => s.profile === "messy");
    const products = messy.flatMap((s) => s.expected.products);
    expect(products.some((p) => p.price === null)).toBe(true);
    expect(products.some((p) => p.availability === "out_of_stock")).toBe(true);
    expect(products.some((p) => p.availability === "unknown")).toBe(true);
    expect(products.some((p) => p.currency === "USD")).toBe(true);
    expect(messy.some((s) => s.expected.effective_date === null)).toBe(true);
  });

  it("every representation has content (WhatsApp, Excel, PDF, Sheets)", () => {
    for (const fixture of MOCK_SUPPLIERS) {
      expect(fixture.whatsapp.trim().length).toBeGreaterThan(10);
      expect(fixture.excel.length).toBeGreaterThan(1);
      expect(fixture.pdf.length).toBeGreaterThan(1);
      expect(fixture.googleSheets.rows.length).toBeGreaterThan(1);
      expect(fixture.googleSheets.url).toMatch(/\/spreadsheets\/d\//);
    }
  });
});

describe("pipeline against mock fixtures", () => {
  it("persists every fixture end-to-end when the AI returns the expected JSON", async () => {
    for (const fixture of MOCK_SUPPLIERS) {
      const { pipeline, docRepo, supplierRepo, priceListRepo } = buildPipeline(
        new FakeAi(fixture.expected),
      );

      const result = await pipeline.run({
        text: fixture.whatsapp,
        inputType: "whatsapp",
        buffer: Buffer.from(fixture.whatsapp),
      } as ExtractionInput);

      expect(result.documentId).toBeGreaterThan(0);
      expect(result.priceListId).toBeGreaterThan(0);
      expect(result.extraction.supplier).toBe(fixture.name);
      expect(result.extraction.products).toHaveLength(fixture.expected.products.length);
      expect(supplierRepo.suppliers.some((s) => s.name === fixture.name)).toBe(true);
      expect(priceListRepo.lists).toHaveLength(1);
      expect(docRepo.docs[0].status).toBe("processed");
      expect(docRepo.docs[0].rawText).toBe(fixture.whatsapp);
    }
  });

  it("normalizes an omitted effective_date to today", async () => {
    const withoutDate = MOCK_SUPPLIERS.filter((s) => s.expected.effective_date === null);
    expect(withoutDate.length).toBeGreaterThan(0);

    for (const fixture of withoutDate) {
      const { pipeline } = buildPipeline(new FakeAi(fixture.expected));
      const result = await pipeline.run({
        text: fixture.whatsapp,
        inputType: "whatsapp",
        buffer: Buffer.from(fixture.whatsapp),
      } as ExtractionInput);
      expect(result.extraction.effective_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.extraction.effective_date).toBe(new Date().toISOString().slice(0, 10));
    }
  });

  it("keeps explicit effective dates from the source", async () => {
    const withDate = MOCK_SUPPLIERS.filter(
      (s) => s.expected.effective_date !== null,
    );
    expect(withDate.length).toBeGreaterThan(0);

    for (const fixture of withDate) {
      const { pipeline } = buildPipeline(new FakeAi(fixture.expected));
      const result = await pipeline.run({
        text: fixture.whatsapp,
        inputType: "whatsapp",
        buffer: Buffer.from(fixture.whatsapp),
      } as ExtractionInput);
      expect(result.extraction.effective_date).toBe(fixture.expected.effective_date);
    }
  });
});
