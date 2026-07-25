import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMercadoPagoOrder } from "@/lib/mercadopago";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const resourceType = body.type;
    const resourceId = body.data?.id;

    if (!resourceId) {
      return NextResponse.json({ error: "Missing resource ID" }, { status: 400 });
    }

    // Only process order notifications
    if (resourceType !== "order") {
      return NextResponse.json({ success: true });
    }

    // Fetch full order details from Mercado Pago
    const order = getMercadoPagoOrder();
    const mpOrder = await order.get({ id: resourceId });

    if (!mpOrder.id || !mpOrder.external_reference) {
      return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
    }

    // Find the sale by sale number (stored as external_reference)
    const sale = await prisma.sale.findFirst({
      where: { saleNumber: mpOrder.external_reference },
      include: { items: true },
    });

    if (!sale) {
      console.error("Webhook: Sale not found for", mpOrder.external_reference);
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const mpStatus = mpOrder.status;
    const mpStatusDetail = mpOrder.status_detail;

    // Map MP status to our sale status
    let newStatus: string | null = null;

    if (mpStatus === "processed" && mpStatusDetail === "accredited") {
      newStatus = "completed";
    } else if (mpStatus === "cancelled") {
      newStatus = "cancelled";
    } else if (mpStatus === "expired") {
      newStatus = "cancelled";
    } else if (mpStatus === "refunded") {
      newStatus = "cancelled";
    }

    if (!newStatus || newStatus === sale.status) {
      return NextResponse.json({ success: true });
    }

    // Update sale status
    if (newStatus === "completed") {
      await prisma.$transaction(async (tx) => {
        await tx.sale.update({
          where: { id: sale.id },
          data: { status: "completed" },
        });

        // Create payment record
        const paymentId = mpOrder.transactions?.payments?.[0]?.id;
        await tx.payment.create({
          data: {
            saleId: sale.id,
            method: "qr",
            amount: sale.total,
            reference: paymentId || mpOrder.id,
          },
        });
      });
    } else if (newStatus === "cancelled") {
      await prisma.$transaction(async (tx) => {
        await tx.sale.update({
          where: { id: sale.id },
          data: { status: "cancelled" },
        });

        // Restore stock
        for (const item of sale.items) {
          const stockRecord = await tx.stock.findFirst({
            where: { productId: item.productId, warehouse: "main" },
          });

          if (stockRecord) {
            await tx.stock.update({
              where: { id: stockRecord.id },
              data: {
                quantity: Number(stockRecord.quantity) + Number(item.quantity),
                updatedAt: new Date(),
              },
            });
          }

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: "return",
              quantity: item.quantity,
              referenceType: "sale_cancel",
              referenceId: sale.id,
            },
          });
        }

        // Reverse credit if applicable
        if (sale.customerId && sale.paymentMethod === "credit") {
          await tx.customer.update({
            where: { id: sale.customerId },
            data: { balance: { decrement: sale.total } },
          });
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
