export const INPUT_SOURCE_TYPES = ["whatsapp", "pdf", "xlsx", "google_sheets"] as const;
export type InputSourceType = (typeof INPUT_SOURCE_TYPES)[number];

export const AVAILABILITY = ["available", "out_of_stock", "unknown"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const EXTRACTION_STATUS = ["processed", "error"] as const;
export type ExtractionStatus = (typeof EXTRACTION_STATUS)[number];

export interface Supplier {
  id: number;
  name: string;
  contact: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierProduct {
  id: number;
  supplierId: number;
  name: string;
  unit: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierPriceList {
  id: number;
  supplierId: number;
  effectiveDate: Date;
  currency: string | null;
  sourceDocumentId: number | null;
  status: string;
  createdAt: Date;
  supplier?: Supplier;
  items?: SupplierPriceListItem[];
  sourceDocument?: ExtractedDocument | null;
}

export interface SupplierPriceListItem {
  id: number;
  priceListId: number;
  productId: number;
  price: number;
  currency: string | null;
  availability: Availability;
  product?: SupplierProduct;
}

export interface ExtractedDocument {
  id: number;
  supplierId: number | null;
  inputType: InputSourceType;
  fileName: string | null;
  mimeType: string | null;
  storagePath: string | null;
  rawText: string;
  contentHash: string;
  status: ExtractionStatus;
  errorMessage: string | null;
  geminiResponse: unknown | null;
  createdAt: Date;
  /** Injected by list queries that join the supplier. */
  supplier?: { id: number; name: string } | null;
}

/** The standardized JSON schema that Gemini must return. */
export interface StandardExtraction {
  supplier: string;
  effective_date: string;
  products: StandardExtractedProduct[];
}

export interface StandardExtractedProduct {
  name: string;
  unit: string;
  price: number | null;
  currency: string | null;
  availability: Availability;
}

/** Payload accepted by POST /api/extractions. */
export interface ExtractionInput {
  /** Overrides source detection; normally inferred from file metadata. */
  inputType?: InputSourceType;
  text?: string;
  fileName?: string;
  mimeType?: string;
  buffer?: Buffer;
  sheetUrl?: string;
  supplierId?: number;
  supplierName?: string;
}
