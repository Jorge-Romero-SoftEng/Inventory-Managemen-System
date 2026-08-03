import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

const t = getTranslations();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.salesView);
  if (denied) return denied;

  try {
    const { id } = await params;
    const sale = await prisma.sale.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        user: true,
        items: { include: { product: true } },
        payments: true,
      },
    });

    if (!sale) return NextResponse.json({ error: t.api.saleNotFound }, { status: 404 });
    return NextResponse.json(sale);
  } catch (error) {
    console.error("Get sale error:", error);
    return NextResponse.json({ error: t.api.failedFetchSale }, { status: 500 });
  }
}
