import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

const t = getTranslations();

export async function POST(request: NextRequest) {
  const denied = await requirePolicy(POLICY.stockAdjust);
  if (denied) return denied;

  try {
    const { productId, quantity, movementType, referenceType, referenceId } = await request.json();

    if (!productId || !quantity || !movementType) {
      return NextResponse.json({ error: t.api.stockMoveRequired }, { status: 400 });
    }

    const qty = parseFloat(quantity);

    await prisma.stockMovement.create({
      data: {
        productId: parseInt(productId),
        movementType,
        quantity: Math.abs(qty),
        referenceType: referenceType || null,
        referenceId: referenceId ? parseInt(referenceId) : null,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Stock move error:", error);
    return NextResponse.json({ error: t.api.failedRecordMovement }, { status: 500 });
  }
}
