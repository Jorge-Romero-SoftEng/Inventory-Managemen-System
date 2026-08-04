import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

const t = getTranslations();

export async function GET() {
  const denied = await requirePolicy(POLICY.reportsView);
  if (denied) return denied;

  try {
    const customers = await prisma.customer.findMany({
      where: { balance: { gt: 0 }, deletedAt: null },
      orderBy: { balance: "desc" },
    });

    const totalBalance = await prisma.customer.aggregate({
      where: { balance: { gt: 0 }, deletedAt: null },
      _sum: { balance: true },
    });

    return NextResponse.json({
      customers,
      totalBalance: totalBalance._sum.balance || 0,
    });
  } catch (error) {
    console.error("Balances report error:", error);
    return NextResponse.json({ error: t.api.failedGenerateReport }, { status: 500 });
  }
}
