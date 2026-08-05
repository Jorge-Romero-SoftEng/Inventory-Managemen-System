import { PDFParse } from "pdf-parse";
import type { ITextExtractor, ExtractSource } from "@/extraction/application/contracts/text-extractor.port";
import { TextExtractionError } from "@/extraction/domain/errors";

/**
 * PDF text extraction backed by pdf-parse v2. Supplier price PDFs are usually
 * text-based (not scanned), so a text pass-through is sufficient; scanned
 * documents would require OCR, which is out of scope.
 */
export class PdfTextExtractor implements ITextExtractor {
  async extract({ buffer }: ExtractSource): Promise<string> {
    if (!buffer) throw new TextExtractionError("PDF buffer is missing");
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text ?? "";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new TextExtractionError(`Could not parse PDF: ${message}`);
    }
  }
}
