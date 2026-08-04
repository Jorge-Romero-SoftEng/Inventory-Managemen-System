import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

const t = getTranslations();

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.priceListsManage);
  if (denied) return denied;

  try {
    const { id } = await params;
    const { nameEs, nameEn, active } = await request.json();
    const priceList = await prisma.priceList.update({
      where: { id: parseInt(id) },
      data: {
        ...(nameEs !== undefined && { nameEs }),
        ...(nameEn !== undefined && { nameEn }),
        ...(active !== undefined && { active }),
      },
    });
    return NextResponse.json(priceList);
  } catch (error) {
    console.error("Update price list error:", error);
    return NextResponse.json({ error: t.api.failedUpdatePriceList }, { status: 500 });
  }
}
