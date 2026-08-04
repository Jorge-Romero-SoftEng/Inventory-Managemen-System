import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getMercadoPagoOrder } from "@/lib/mercadopago";
import { getTranslations } from "@/i18n/translations";
import { randomUUID } from "crypto";
import {
  calculateSubtotal,
  calculateDiscountTotal,
  calculateTotal,
} from "@/lib/pricing";

const t = getTranslations();

export async function POST(request: NextRequest) {
  const denied = await requirePolicy(POLICY.salesCreate);
  if (denied) return denied;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, items, discount, tax } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: t.api.atLeastOneItem }, { status: 400 });
    }

    const subtotal = calculateSubtotal(
      items.map((item: { unitPrice: number; quantity: number }) => ({
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
      }))
    );
    const discountAmount = calculateDiscountTotal(
      items.map((item: { discount: number }) => ({
        discount: Number(item.discount || 0),
      }))
    );
    const taxAmount = Number(tax || 0);
    const total = calculateTotal(subtotal, discountAmount, taxAmount);

    const saleNumber = `INV-${Date.now()}`;

    // 1. Create pending sale and reserve stock in a transaction
    const sale = await prisma.$transaction(async (tx: any) => {
      const newSale = await tx.sale.create({
        data: {
          saleNumber,
          customerId: customerId ? parseInt(customerId) : null,
          userId: session.userId,
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          total,
          paymentMethod: "qr",
          status: "pending",
          delivery: false,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });

      for (const item of items) {
        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            productId: item.productId,
            quantity: parseFloat(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount || 0),
            lineTotal: Number(item.lineTotal),
          },
        });

        const stockRecord = await tx.stock.findFirst({
          where: { productId: item.productId, warehouse: "main" },
        });

        if (stockRecord) {
          await tx.stock.update({
            where: { id: stockRecord.id },
            data: {
              quantity: Number(stockRecord.quantity) - parseFloat(item.quantity),
              updatedAt: new Date(),
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "sale",
            quantity: parseFloat(item.quantity),
            referenceType: "sale",
            referenceId: newSale.id,
          },
        });
      }

      return newSale;
    });

    // 2. Create Mercado Pago order with dynamic QR
    const order = getMercadoPagoOrder();
    const idempotencyKey = randomUUID();

    const mpItems = items.map((item: { productId: number; productName?: string; quantity: number; unitPrice: number }) => ({
      title: item.productName || `Item #${item.productId}`,
      unit_price: String(item.unitPrice),
      quantity: item.quantity,
      unit_measure: "unit",
      external_code: String(item.productId),
    }));

    const mpOrder = await order.create({
      body: {
        type: "qr",
        total_amount: String(total.toFixed(2)),
        external_reference: sale.saleNumber,
        expiration_time: "PT15M",
        description: `Sale ${sale.saleNumber}`,

        transactions: {
          payments: [
            {
              amount: String(total.toFixed(2)),
            },
          ],
        },
        items: mpItems,
      },
      requestOptions: {
        idempotencyKey,
      },
    });

    // 3. Update sale with MP order data
    const mpOrderId = mpOrder.id;
    const mpQrData = mpOrder.type_response?.qr_data;

    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        mpOrderId: mpOrderId || null,
        mpQrData: mpQrData || null,
      },
    });

    return NextResponse.json({
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      mpOrderId,
      qrData: mpQrData,
      total,
      expiresAt: sale.expiresAt,
    });
  } catch (error) {
    console.error("Create QR order error:", error);
    return NextResponse.json(
      { error: t.api.failedCreateQROrder },
      { status: 500 }
    );
  }
}
