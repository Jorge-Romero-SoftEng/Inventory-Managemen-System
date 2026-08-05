import type {
  Availability,
  InputSourceType,
  StandardExtraction,
  StandardExtractedProduct,
} from "@/types/supplier";

export type { Availability, InputSourceType, StandardExtraction, StandardExtractedProduct };

/**
 * Normalized source material handed to the extraction pipeline.
 * The pipeline always reduces the incoming document (WhatsApp text, PDF,
 * Excel, Google Sheets) to plain text plus a content hash before touching
 * the AI layer, so all sources share a single code path.
 */
export interface SourceInput {
  type: InputSourceType;
  text: string;
  fileName?: string;
  mimeType?: string;
  /** SHA-256 of the normalized raw text; used to skip duplicate ingests. */
  contentHash: string;
  /** Filesystem path where the original bytes are archived for auditing. */
  storagePath?: string;
}

/** Result surfaced by the pipeline and returned by the API. */
export interface ExtractionResult {
  extraction: StandardExtraction;
  documentId: number;
  supplierId: number;
  priceListId: number;
}
