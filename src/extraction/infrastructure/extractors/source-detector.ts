import { UnsupportedSourceError } from "@/extraction/domain/errors";
import type { ISourceDetector } from "@/extraction/application/contracts/text-extractor.port";
import type { InputSourceType } from "@/types/supplier";

/**
 * Decides which extractor handles an incoming document based on its file
 * metadata or URL. Detection order matters: a URL always wins (Google
 * Sheets), then PDF/Excel by extension or MIME type, and anything text-like
 * falls through to the WhatsApp/plain-text extractor.
 */
export class SourceDetector implements ISourceDetector {
  detect(input: {
    fileName?: string;
    mimeType?: string;
    url?: string;
    hasText?: boolean;
  }): InputSourceType {
    if (input.url) return "google_sheets";

    const name = input.fileName?.toLowerCase() ?? "";
    const mime = input.mimeType?.toLowerCase() ?? "";

    if (name.endsWith(".pdf") || mime === "application/pdf" || mime.includes("pdf")) {
      return "pdf";
    }
    if (
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mime === "application/vnd.ms-excel" ||
      mime.includes("spreadsheet")
    ) {
      return "xlsx";
    }
    if (input.hasText || mime.startsWith("text/") || (!name && !mime)) {
      return "whatsapp";
    }

    throw new UnsupportedSourceError(name || mime || "unknown");
  }
}
