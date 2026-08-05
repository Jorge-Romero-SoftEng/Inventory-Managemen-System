import { NextRequest, NextResponse } from "next/server";
import { POLICY, requirePolicy } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";
import { buildExtractionContainer } from "@/extraction/application/di/container";

const t = getTranslations();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.suppliersView);
  if (denied) return denied;

  try {
    const { id } = await params;
    const { suppliers } = buildExtractionContainer();
    const supplier = await suppliers.getById(Number(id));
    if (!supplier) return NextResponse.json({ error: t.api.supplierNotFound }, { status: 404 });
    const priceLists = await suppliers.priceLists(Number(id));
    // Serialize Decimals to numbers for the client.
    const mapped = priceLists.map((pl) => ({
      ...pl,
      items: (pl.items ?? []).map((item) => ({
        ...item,
        price: Number(item.price),
      })),
    }));
    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Get supplier price lists error:", error);
    return NextResponse.json({ error: t.api.failedFetchSupplierPriceLists }, { status: 500 });
  }
}
