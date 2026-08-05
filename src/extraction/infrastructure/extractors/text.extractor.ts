import type { ITextExtractor, ExtractSource } from "@/extraction/application/contracts/text-extractor.port";
import { TextExtractionError } from "@/extraction/domain/errors";

/**
 * WhatsApp messages arrive as plain text pasted into the app. The buffer is
 * the UTF-8 encoded text; no further processing is needed. This keeps the
 * WhatsApp source on the same code path as every other source.
 */
export class WhatsAppTextExtractor implements ITextExtractor {
  async extract({ buffer }: ExtractSource): Promise<string> {
    if (!buffer) return "";
    return buffer.toString("utf8");
  }
}

export { TextExtractionError };
