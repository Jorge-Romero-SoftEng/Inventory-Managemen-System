import type { ExtractionInput, InputSourceType } from "@/types/supplier";
import { standardExtractionSchema } from "@/extraction/validation/schemas";
import type { IAiExtractor } from "@/extraction/application/contracts/ai.port";
import type {
  IExtractionRepository,
  IPriceListRepository,
  ISupplierRepository,
} from "@/extraction/application/contracts/repositories.port";
import type { IFileStorage } from "@/extraction/application/contracts/storage.port";
import type { ISourceDetector, ITextExtractor } from "@/extraction/application/contracts/text-extractor.port";
import {
  DuplicateDocumentError,
  ExtractionError,
  GeminiError,
  TextExtractionError,
  UnsupportedSourceError,
  ValidationError,
} from "@/extraction/domain/errors";
import type { ExtractionResult } from "@/extraction/domain/entities";
import type { StandardExtraction } from "@/types/supplier";
import { hashText } from "@/extraction/infrastructure/hash";

/**
 * Orchestrates the full extraction pipeline described in the spec:
 *   1. detect input type
 *   2. extract raw text from the source
 *   3. send the text to Gemini for structured extraction
 *   4. validate the AI output against the standard JSON schema (Zod)
 *   5. persist supplier / products / price list / document
 *   6. keep the original document for auditing
 *   7. log extraction errors (persisted as "error" documents)
 *
 * All collaborators are injected via constructor (dependency injection), so
 * the AI engine, extractors, storage and database can be swapped for fakes
 * in tests or alternative implementations in production.
 */
export class ExtractionPipelineService {
  constructor(
    private readonly detector: ISourceDetector,
    private readonly extractors: Record<string, ITextExtractor>,
    private readonly ai: IAiExtractor,
    private readonly storage: IFileStorage,
    private readonly supplierRepo: ISupplierRepository,
    private readonly priceListRepo: IPriceListRepository,
    private readonly docRepo: IExtractionRepository,
  ) {}

  async run(input: ExtractionInput): Promise<ExtractionResult> {
    const type = this.detector.detect({
      fileName: input.fileName,
      mimeType: input.mimeType,
      url: input.sheetUrl,
      hasText: !!input.text,
    });

    const extractor = this.extractors[type];
    if (!extractor) throw new UnsupportedSourceError(type);

    const text = await this.extractText(extractor, input, type);

    // Dedupe against previously *successfully processed* content. Failed
    // extractions keep their hash so a retry is allowed.
    const contentHash = hashText(text);
    const existing = await this.docRepo.findByContentHash(contentHash);
    if (existing && existing.status === "processed") {
      throw new DuplicateDocumentError(contentHash);
    }

    // Keep the original bytes for auditing (spec requirement 4). Google
    // Sheets has no local bytes; the URL is preserved as the "file name".
    let storagePath: string | undefined;
    if (input.buffer) {
      const fileName = input.fileName || `${type}-${contentHash.slice(0, 8)}.bin`;
      storagePath = await this.storage.save(input.buffer, fileName);
    }

    const raw = await this.requestAi(text, input, type, contentHash, storagePath);

    const parsed = standardExtractionSchema.safeParse(raw);
    if (!parsed.success) {
      const message = `Extraction output did not match the standard schema: ${parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; ")}`;
      await this.recordFailure(contentHash, input, type, text, storagePath, raw, message);
      throw new ValidationError(message);
    }
    const parsedExtraction = parsed.data;
    // The standard schema allows an omitted date; normalize to "today"
    // before persisting and returning so downstream code always has one.
    const extraction: StandardExtraction = {
      ...parsedExtraction,
      effective_date:
        parsedExtraction.effective_date ?? new Date().toISOString().slice(0, 10),
    };

    const supplier = await this.resolveSupplier(input, extraction.supplier);

    // A previous failed attempt holds the same hash; drop it so the unique
    // constraint on content_hash accepts the new processed document.
    if (existing && existing.status === "error") {
      await this.docRepo.delete(existing.id);
    }

    const doc = await this.docRepo.create({
      supplierId: supplier.id,
      inputType: type,
      fileName: input.fileName ?? input.sheetUrl ?? null,
      mimeType: input.mimeType ?? null,
      storagePath: storagePath ?? null,
      rawText: text,
      contentHash,
      status: "processed",
      geminiResponse: raw,
    });

    const priceList = await this.priceListRepo.persistExtraction({
      supplierId: supplier.id,
      documentId: doc.id,
      extraction,
    });

    return {
      extraction,
      documentId: doc.id,
      supplierId: supplier.id,
      priceListId: priceList.id,
    };
  }

  private async extractText(
    extractor: ITextExtractor,
    input: ExtractionInput,
    type: string,
  ): Promise<string> {
    try {
      const text = await extractor.extract({
        buffer: input.buffer,
        fileName: input.fileName,
        mimeType: input.mimeType,
        url: input.sheetUrl,
      });
      const trimmed = text.trim();
      if (!trimmed) throw new TextExtractionError("No text could be extracted from the source");
      return trimmed;
    } catch (error) {
      if (error instanceof ExtractionError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new TextExtractionError(`Failed to extract text from ${type}: ${message}`);
    }
  }

  private async requestAi(
    text: string,
    input: ExtractionInput,
    type: InputSourceType,
    contentHash: string,
    storagePath: string | undefined,
  ): Promise<unknown> {
    try {
      return await this.ai.extract(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.recordFailure(contentHash, input, type, text, storagePath, null, message);
      throw error instanceof ExtractionError ? error : new GeminiError(message);
    }
  }

  private async recordFailure(
    contentHash: string,
    input: ExtractionInput,
    type: InputSourceType,
    text: string,
    storagePath: string | undefined,
    geminiResponse: unknown,
    errorMessage: string,
  ): Promise<void> {
    // Design decision: errors are persisted as documents with status
    // "error" so the UI can list failures and retry them (audit trail).
    const existing = await this.docRepo.findByContentHash(contentHash);
    if (existing) {
      await this.docRepo.updateStatus(existing.id, {
        status: "error",
        errorMessage,
        geminiResponse,
      });
      return;
    }
    await this.docRepo.create({
      supplierId: input.supplierId ?? null,
      inputType: type,
      fileName: input.fileName ?? input.sheetUrl ?? null,
      mimeType: input.mimeType ?? null,
      storagePath: storagePath ?? null,
      rawText: text,
      contentHash,
      status: "error",
      errorMessage,
      geminiResponse,
    });
  }

  private async resolveSupplier(input: ExtractionInput, aiSupplierName: string) {
    // Explicit selection wins over the name Gemini inferred from the list.
    if (input.supplierId) {
      const found = await this.supplierRepo.findById(input.supplierId);
      if (!found || !found.active) {
        throw new ExtractionError(`Supplier ${input.supplierId} not found or inactive`, "SUPPLIER_NOT_FOUND");
      }
      return found;
    }
    const name = input.supplierName?.trim() || aiSupplierName;
    if (!name) {
      throw new ValidationError("Could not determine the supplier for this document");
    }
    return this.supplierRepo.upsertByName(name);
  }
}
