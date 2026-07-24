import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      where: { balance: { gt: 0 } },
      orderBy: { balance: "desc" },
    });

    const totalBalance = await prisma.customer.aggregate({
      where: { balance: { gt: 0 } },
      _sum: { balance: true },
    });

    return NextResponse.json({
      customers,
      totalBalance: totalBalance._sum.balance || 0,
    });
  } catch (error) {
    console.error("Balances report error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
