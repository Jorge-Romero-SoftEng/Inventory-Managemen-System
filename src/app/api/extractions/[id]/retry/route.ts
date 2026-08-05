import { NextRequest, NextResponse } from "next/server";
import { POLICY, requirePolicy } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";
import { buildExtractionContainer } from "@/extraction/application/di/container";
import {
  DuplicateDocumentError,
  ExtractionError,
  GeminiError,
  TextExtractionError,
  UnsupportedSourceError,
  ValidationError,
} from "@/extraction/domain/errors";

const t = getTranslations();

function errorStatus(error: unknown): number {
  if (error instanceof DuplicateDocumentError) return 409;
  if (error instanceof ValidationError) return 422;
  if (error instanceof UnsupportedSourceError || error instanceof TextExtractionError) return 400;
  if (error instanceof GeminiError) return 502;
  if (error instanceof ExtractionError) return 400;
  return 500;
}

/**
 * Re-runs extraction for a failed document using its stored raw text, so a
 * transient Gemini/network error can be recovered without re-uploading.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.extractionsRetry);
  if (denied) return denied;

  try {
    const { id } = await params;
    const { docRepo, pipeline } = buildExtractionContainer();
    const document = await docRepo.findById(Number(id));
    if (!document) return NextResponse.json({ error: t.api.extractionNotFound }, { status: 404 });

    const result = await pipeline.run({
      text: document.rawText,
      buffer: Buffer.from(document.rawText, "utf8"),
      supplierId: document.supplierId ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Retry extraction error:", error);
    const message =
      error instanceof ExtractionError ? error.message : t.api.failedRetryExtraction;
    return NextResponse.json({ error: message }, { status: errorStatus(error) });
  }
}
