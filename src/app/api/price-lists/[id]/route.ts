import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { nameEs, nameEn, active } = await request.json();
    const priceList = await prisma.priceList.update({
      where: { id: parseInt(id) },
      data: {
        ...(nameEs !== undefined && { nameEs }),
        ...(nameEn !== undefined && { nameEn }),
        ...(active !== undefined && { active }),
      },
    });
    return NextResponse.json(priceList);
  } catch (error) {
    console.error("Update price list error:", error);
    return NextResponse.json({ error: "Failed to update price list" }, { status: 500 });
  }
}
