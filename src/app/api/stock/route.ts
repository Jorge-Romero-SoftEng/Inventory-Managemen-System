import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";

export async function GET() {
  const denied = await requirePolicy(POLICY.stockView);
  if (denied) return denied;

  try {
    const stock = await prisma.stock.findMany({
      where: { product: { deletedAt: null } },
      include: { product: { include: { category: true } } },
      orderBy: { product: { name: "asc" } },
    });
    return NextResponse.json(stock);
  } catch (error) {
    console.error("Get stock error:", error);
    return NextResponse.json({ error: "Failed to fetch stock" }, { status: 500 });
  }
}
