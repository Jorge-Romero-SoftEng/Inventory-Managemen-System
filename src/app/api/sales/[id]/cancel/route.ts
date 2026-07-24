import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const saleId = parseInt(id);

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true },
    });

    if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    if (sale.status === "cancelled") return NextResponse.json({ error: "Sale already cancelled" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: saleId },
        data: { status: "cancelled" },
      });

      for (const item of sale.items) {
        const stockRecord = await tx.stock.findFirst({
          where: { productId: item.productId, warehouse: "main" },
        });

        if (stockRecord) {
          await tx.stock.update({
            where: { id: stockRecord.id },
            data: { quantity: Number(stockRecord.quantity) + Number(item.quantity), updatedAt: new Date() },
          });
        }

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "return",
            quantity: item.quantity,
            referenceType: "sale_cancel",
            referenceId: saleId,
          },
        });
      }

      if (sale.customerId && sale.paymentMethod === "credit") {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { balance: { decrement: sale.total } },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel sale error:", error);
    return NextResponse.json({ error: "Failed to cancel sale" }, { status: 500 });
  }
}
