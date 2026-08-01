import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";

export async function POST(request: NextRequest) {
  const denied = await requirePolicy(POLICY.salesCreate);
  if (denied) return denied;

  try {
    const { saleId, method, amount, reference } = await request.json();

    if (!saleId || !method || !amount) {
      return NextResponse.json({ error: "saleId, method, and amount are required" }, { status: 400 });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          saleId: parseInt(saleId),
          method,
          amount: parseFloat(amount),
          reference: reference || null,
        },
      });

      const sale = await tx.sale.findUnique({ where: { id: parseInt(saleId) } });
      if (sale && sale.paymentMethod === "credit" && sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { balance: { decrement: parseFloat(amount) } },
        });
      }

      return newPayment;
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
