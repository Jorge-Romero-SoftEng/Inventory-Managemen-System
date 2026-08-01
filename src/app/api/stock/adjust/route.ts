import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";

export async function POST(request: NextRequest) {
  const denied = await requirePolicy(POLICY.stockAdjust);
  if (denied) return denied;

  try {
    const { productId, warehouse, quantity, reason } = await request.json();

    if (!productId || quantity === undefined) {
      return NextResponse.json({ error: "ProductId and quantity are required" }, { status: 400 });
    }

    const wh = warehouse || "main";
    const qty = parseFloat(quantity);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.stock.findUnique({
        where: { productId_warehouse: { productId: parseInt(productId), warehouse: wh } },
      });

      if (existing) {
        await tx.stock.update({
          where: { id: existing.id },
            data: { quantity: Number(existing.quantity) + qty, updatedAt: new Date() },
        });
      } else {
        await tx.stock.create({
          data: { productId: parseInt(productId), warehouse: wh, quantity: qty },
        });
      }

      await tx.stockMovement.create({
        data: {
          productId: parseInt(productId),
          movementType: qty > 0 ? "adjustment_in" : "adjustment_out",
          quantity: Math.abs(qty),
          referenceType: reason || "adjustment",
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Adjust stock error:", error);
    return NextResponse.json({ error: "Failed to adjust stock" }, { status: 500 });
  }
}
