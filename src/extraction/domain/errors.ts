/**
 * Domain error hierarchy for the extraction pipeline.
 * Errors are typed so the API layer can map them to HTTP status codes and
 * the pipeline can persist a stable errorMessage for auditing.
 */
export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly code = "EXTRACTION_ERROR",
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

export class UnsupportedSourceError extends ExtractionError {
  constructor(source: string) {
    super(`Unsupported or undetectable input source: "${source}"`, "UNSUPPORTED_SOURCE");
  }
}

export class TextExtractionError extends ExtractionError {
  constructor(message: string) {
    super(message, "TEXT_EXTRACTION");
  }
}

export class GeminiError extends ExtractionError {
  constructor(message: string, readonly status?: number) {
    super(message, "GEMINI_ERROR");
  }
}

export class ValidationError extends ExtractionError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}

export class DuplicateDocumentError extends ExtractionError {
  constructor(hash: string) {
    super(`Document already processed (hash ${hash.slice(0, 12)}…)`, "DUPLICATE_DOCUMENT");
  }
}
