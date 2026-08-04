import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

const t = getTranslations();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const denied = await requirePolicy(POLICY.stockView);
  if (denied) return denied;

  try {
    const { productId } = await params;
    const stock = await prisma.stock.findMany({
      where: { productId: parseInt(productId) },
      include: { product: true },
    });
    return NextResponse.json(stock);
  } catch (error) {
    console.error("Get stock by product error:", error);
    return NextResponse.json({ error: t.api.failedFetchStock }, { status: 500 });
  }
}
