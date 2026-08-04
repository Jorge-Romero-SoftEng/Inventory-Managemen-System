import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

const t = getTranslations();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ saleId: string }> }) {
  const denied = await requirePolicy(POLICY.salesView);
  if (denied) return denied;

  try {
    const { saleId } = await params;
    const payments = await prisma.payment.findMany({
      where: { saleId: parseInt(saleId) },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json({ error: t.api.failedFetchPayments }, { status: 500 });
  }
}
