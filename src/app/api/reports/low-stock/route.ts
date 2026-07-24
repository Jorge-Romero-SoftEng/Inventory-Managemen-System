import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const threshold = parseFloat(searchParams.get("threshold") || "10");

    const lowStock = await prisma.stock.findMany({
      where: { quantity: { lte: threshold } },
      include: { product: { include: { category: true } } },
      orderBy: { quantity: "asc" },
    });

    return NextResponse.json(lowStock);
  } catch (error) {
    console.error("Low stock report error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
