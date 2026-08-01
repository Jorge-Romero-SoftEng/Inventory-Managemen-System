import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePolicy, POLICY } from "@/lib/policies";
import {
  calculateSubtotal,
  calculateDiscountTotal,
  calculateTotal,
} from "@/lib/pricing";

export async function GET(request: NextRequest) {
  const denied = await requirePolicy(POLICY.salesView);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const customerId = searchParams.get("customerId");

    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = parseInt(customerId);

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({ sales, total });
  } catch (error) {
    console.error("Get sales error:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requirePolicy(POLICY.salesCreate);
  if (denied) return denied;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, items, paymentMethod, discount, tax, delivery } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method is required" }, { status: 400 });
    }

    const saleNumber = `INV-${Date.now()}`;

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

    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          saleNumber,
          customerId: customerId ? parseInt(customerId) : null,
          userId: session.userId,
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          total,
          paymentMethod,
          status: "completed",
          delivery: delivery || false,
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
            data: { quantity: Number(stockRecord.quantity) - parseFloat(item.quantity), updatedAt: new Date() },
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

      if (paymentMethod === "credit" && customerId) {
        await tx.customer.update({
          where: { id: parseInt(customerId) },
          data: { balance: { increment: total } },
        });
      }

      return newSale;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Create sale error:", error);
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
  }
}
