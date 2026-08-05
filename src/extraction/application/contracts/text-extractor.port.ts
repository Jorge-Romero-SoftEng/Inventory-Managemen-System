import type { InputSourceType } from "@/types/supplier";

/** Raw material an extractor can consume, regardless of source type. */
export interface ExtractSource {
  buffer?: Buffer;
  fileName?: string;
  mimeType?: string;
  /** Present only for google_sheets sources. */
  url?: string;
}

/**
 * Port for turning a binary/textual document into plain text.
 * Each supported input source implements its own extractor.
 */
export interface ITextExtractor {
  extract(source: ExtractSource): Promise<string>;
}

/**
 * Detection port: decides which extractor to use from file metadata or URL.
 * Kept as a port so tests can inject deterministic behavior.
 */
export interface ISourceDetector {
  detect(input: {
    fileName?: string;
    mimeType?: string;
    url?: string;
    hasText?: boolean;
  }): InputSourceType;
}
