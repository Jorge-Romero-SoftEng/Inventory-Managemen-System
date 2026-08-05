import { ExtractionPipelineService } from "@/extraction/application/services/extraction-pipeline.service";
import { SupplierService } from "@/extraction/application/services/supplier.service";
import { SourceDetector } from "@/extraction/infrastructure/extractors/source-detector";
import { WhatsAppTextExtractor } from "@/extraction/infrastructure/extractors/text.extractor";
import { PdfTextExtractor } from "@/extraction/infrastructure/extractors/pdf.extractor";
import { ExcelTextExtractor } from "@/extraction/infrastructure/extractors/excel.extractor";
import { GoogleSheetsTextExtractor } from "@/extraction/infrastructure/extractors/google-sheets.extractor";
import { GeminiClient } from "@/extraction/infrastructure/gemini/gemini-client";
import { LocalFileStorage } from "@/extraction/infrastructure/storage/local.storage";
import { PrismaExtractionRepository } from "@/extraction/infrastructure/repositories/prisma-extraction.repository";
import { PrismaSupplierRepository } from "@/extraction/infrastructure/repositories/prisma-supplier.repository";
import { PrismaPriceListRepository } from "@/extraction/infrastructure/repositories/prisma-price-list.repository";

/**
 * Composition root for the extraction module. This is the only place where
 * concrete implementations are wired together; every class above depends on
 * ports (interfaces) and receives its collaborators through constructors,
 * which is what enables clean-architecture testing and future swaps.
 */
export function buildExtractionContainer() {
  const detector = new SourceDetector();
  const extractors = {
    whatsapp: new WhatsAppTextExtractor(),
    pdf: new PdfTextExtractor(),
    xlsx: new ExcelTextExtractor(),
    google_sheets: new GoogleSheetsTextExtractor(process.env.GOOGLE_SHEETS_API_KEY ?? ""),
  };
  const ai = new GeminiClient(process.env.GEMINI_API_KEY ?? "");
  const storage = new LocalFileStorage(process.env.STORAGE_DIR);

  const supplierRepo = new PrismaSupplierRepository();
  const priceListRepo = new PrismaPriceListRepository();
  const docRepo = new PrismaExtractionRepository();

  const pipeline = new ExtractionPipelineService(
    detector,
    extractors,
    ai,
    storage,
    supplierRepo,
    priceListRepo,
    docRepo,
  );
  const suppliers = new SupplierService(supplierRepo, priceListRepo);

  return { pipeline, suppliers, storage, supplierRepo, priceListRepo, docRepo };
}

export type ExtractionContainer = ReturnType<typeof buildExtractionContainer>;
