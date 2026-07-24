import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const stock = await prisma.stock.findMany({
      include: { product: { include: { category: true } } },
      orderBy: { product: { name: "asc" } },
    });
    return NextResponse.json(stock);
  } catch (error) {
    console.error("Get stock error:", error);
    return NextResponse.json({ error: "Failed to fetch stock" }, { status: 500 });
  }
}
