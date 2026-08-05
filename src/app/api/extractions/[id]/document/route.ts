import { NextRequest, NextResponse } from "next/server";
import { POLICY, requirePolicy } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";
import { buildExtractionContainer } from "@/extraction/application/di/container";

const t = getTranslations();

/**
 * Serves the original source document stored during extraction, so users
 * can audit what the AI actually parsed.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.extractionsView);
  if (denied) return denied;

  try {
    const { id } = await params;
    const { docRepo, storage } = buildExtractionContainer();
    const document = await docRepo.findById(Number(id));
    if (!document) return NextResponse.json({ error: t.api.extractionNotFound }, { status: 404 });
    if (!document.storagePath) {
      return NextResponse.json({ error: t.api.extractionNotFound }, { status: 404 });
    }

    const buffer = await storage.load(document.storagePath);
    const fileName = document.fileName || `extraction-${document.id}.bin`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName.replace(/["\\]/g, "")}"`,
      },
    });
  } catch (error) {
    console.error("Get extraction document error:", error);
    return NextResponse.json({ error: t.api.failedFetchExtraction }, { status: 500 });
  }
}
