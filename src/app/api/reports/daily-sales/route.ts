import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const start = new Date(date + "T00:00:00");
    const end = new Date(date + "T23:59:59");

    const [sales, totals] = await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte: start, lte: end }, status: { not: "cancelled" } },
        include: { customer: true, items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: start, lte: end }, status: { not: "cancelled" } },
        _sum: { subtotal: true, discount: true, tax: true, total: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      date,
      sales,
      summary: {
        count: totals._count,
        subtotal: totals._sum.subtotal || 0,
        discount: totals._sum.discount || 0,
        tax: totals._sum.tax || 0,
        total: totals._sum.total || 0,
      },
    });
  } catch (error) {
    console.error("Daily sales report error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
