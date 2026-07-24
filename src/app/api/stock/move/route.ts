import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { productId, quantity, movementType, referenceType, referenceId } = await request.json();

    if (!productId || !quantity || !movementType) {
      return NextResponse.json({ error: "ProductId, quantity, and movementType are required" }, { status: 400 });
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
    return NextResponse.json({ error: "Failed to record stock movement" }, { status: 500 });
  }
}
