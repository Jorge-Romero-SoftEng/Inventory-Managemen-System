import { NextRequest, NextResponse } from "next/server";
import { POLICY, requirePolicy } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";
import { buildExtractionContainer } from "@/extraction/application/di/container";

const t = getTranslations();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.extractionsView);
  if (denied) return denied;

  try {
    const { id } = await params;
    const { docRepo, priceListRepo } = buildExtractionContainer();
    const document = await docRepo.findById(Number(id));
    if (!document) return NextResponse.json({ error: t.api.extractionNotFound }, { status: 404 });

    const priceList = await priceListRepo.findByDocumentId(Number(id));
    const mapped = priceList
      ? {
          ...priceList,
          items: (priceList.items ?? []).map((item) => ({
            ...item,
            price: Number(item.price),
          })),
        }
      : null;

    return NextResponse.json({ document, priceList: mapped });
  } catch (error) {
    console.error("Get extraction error:", error);
    return NextResponse.json({ error: t.api.failedFetchExtraction }, { status: 500 });
  }
}
