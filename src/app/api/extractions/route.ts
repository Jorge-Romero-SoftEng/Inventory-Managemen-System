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
import type { ExtractionInput } from "@/types/supplier";

const t = getTranslations();

/** Maps extraction domain errors to HTTP status codes. */
function errorStatus(error: unknown): number {
  if (error instanceof DuplicateDocumentError) return 409;
  if (error instanceof ValidationError) return 422;
  if (error instanceof UnsupportedSourceError || error instanceof TextExtractionError) return 400;
  if (error instanceof GeminiError) return 502;
  if (error instanceof ExtractionError) return 400;
  return 500;
}

export async function GET(request: NextRequest) {
  const denied = await requirePolicy(POLICY.extractionsView);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20") || 20));
    const { docRepo } = buildExtractionContainer();
    const { documents, total } = await docRepo.list({ status, page, pageSize });
    return NextResponse.json({ documents, total, page, pageSize });
  } catch (error) {
    console.error("Get extractions error:", error);
    return NextResponse.json({ error: t.api.failedFetchExtractions }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requirePolicy(POLICY.extractionsCreate);
  if (denied) return denied;

  try {
    const form = await request.formData();

    const rawText = form.get("text");
    const rawSheetUrl = form.get("sheetUrl");
    const rawSupplierId = form.get("supplierId");
    const rawSupplierName = form.get("supplierName");
    const file = form.get("file");

    const input: ExtractionInput = {
      text: typeof rawText === "string" && rawText.trim() ? rawText.trim() : undefined,
      sheetUrl: typeof rawSheetUrl === "string" && rawSheetUrl.trim() ? rawSheetUrl.trim() : undefined,
      supplierId: rawSupplierId !== null ? Number(rawSupplierId) || undefined : undefined,
      supplierName:
        typeof rawSupplierName === "string" && rawSupplierName.trim() ? rawSupplierName.trim() : undefined,
    };

    if (file instanceof File) {
      input.buffer = Buffer.from(await file.arrayBuffer());
      input.fileName = file.name || undefined;
      input.mimeType = file.type || undefined;
    }

    // WhatsApp plain text is archived as a .txt file, so it shares the same
    // extraction path as every other source.
    if (!input.buffer && input.text) {
      input.buffer = Buffer.from(input.text, "utf8");
    }

    if (!input.buffer && !input.sheetUrl) {
      return NextResponse.json({ error: t.api.extractionInputRequired }, { status: 400 });
    }

    const { pipeline } = buildExtractionContainer();
    const result = await pipeline.run(input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create extraction error:", error);
    const message =
      error instanceof ExtractionError ? error.message : t.api.failedCreateExtraction;
    return NextResponse.json({ error: message }, { status: errorStatus(error) });
  }
}
