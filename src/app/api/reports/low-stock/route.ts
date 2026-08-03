import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

const t = getTranslations();

export async function GET(request: NextRequest) {
  const denied = await requirePolicy(POLICY.reportsView);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const threshold = parseFloat(searchParams.get("threshold") || "10");

    const lowStock = await prisma.stock.findMany({
      where: { quantity: { lte: threshold }, product: { deletedAt: null } },
      include: { product: { include: { category: true } } },
      orderBy: { quantity: "asc" },
    });

    return NextResponse.json(lowStock);
  } catch (error) {
    console.error("Low stock report error:", error);
    return NextResponse.json({ error: t.api.failedGenerateReport }, { status: 500 });
  }
}
